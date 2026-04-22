"""
认证 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
import asyncpg
from datetime import datetime
import logging

from models.user import UserCreate, UserLogin, UserResponse, TokenResponse, TokenRefresh
from models.email_code import EmailCodeRequest, EmailCodeVerify, EmailCodeResponse
from services.auth import AuthService
from services.email_code import email_code_service
from services.email import email_service
from database.connection import get_db_connection
from middleware.auth import get_current_user, security

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    用户注册
    
    - **email**: 邮箱地址（必须唯一）
    - **username**: 用户名（3-50 字符）
    - **password**: 密码（至少 8 字符）
    """
    try:
        user = await AuthService.register_user(conn, user_data)
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            created_at=user.created_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    login_data: UserLogin,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    用户登录
    
    - **email**: 邮箱地址
    - **password**: 密码
    
    返回访问令牌和刷新令牌
    """
    try:
        user = await AuthService.authenticate_user(conn, login_data.email, login_data.password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # 创建令牌
        access_token, expires_in = AuthService.create_access_token(user.id, user.email)
        refresh_token = AuthService.create_refresh_token(user.id, user.email)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in
        )
    
    except ValueError as e:
        # 账户被锁定
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: TokenRefresh,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    刷新访问令牌
    
    - **refresh_token**: 刷新令牌
    
    返回新的访问令牌和刷新令牌
    """
    # 验证刷新令牌
    payload = AuthService.verify_token(refresh_data.refresh_token, "refresh")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 检查令牌是否在黑名单中
    if await AuthService.is_token_blacklisted(conn, refresh_data.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 创建新令牌
    user_id = payload["sub"]
    email = payload["email"]
    
    access_token, expires_in = AuthService.create_access_token(user_id, email)
    new_refresh_token = AuthService.create_refresh_token(user_id, email)
    
    # 将旧的刷新令牌加入黑名单
    exp_timestamp = datetime.fromtimestamp(payload["exp"])
    await AuthService.add_token_to_blacklist(conn, refresh_data.refresh_token, exp_timestamp)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=expires_in
    )


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    用户登出
    
    将当前访问令牌加入黑名单
    需要在请求头中提供有效的访问令牌
    """
    token = credentials.credentials
    
    # 将令牌加入黑名单
    await AuthService.blacklist_token(conn, token)
    
    logger.info(f"User {current_user['email']} logged out")


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取当前用户信息
    
    需要在请求头中提供有效的访问令牌
    """
    user_id = current_user["user_id"]
    
    row = await conn.fetchrow("""
        SELECT id, email, username, created_at
        FROM users WHERE id = $1::uuid
    """, user_id)
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(row['id']),
        email=row['email'],
        username=row['username'],
        created_at=row['created_at']
    )


@router.post("/auth/send-code", response_model=EmailCodeResponse)
async def send_verification_code(
    request: EmailCodeRequest,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    发送邮箱验证码

    - **email**: 邮箱地址

    返回验证码发送结果
    """
    email = request.email

    allowed, wait_seconds = email_code_service.check_rate_limit(email)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请在 {wait_seconds} 秒后重试"
        )

    count = email_code_service.increment_rate_limit(email)
    if count > email_code_service.MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="请求过于频繁，请稍后再试"
        )

    user_exists = await conn.fetchrow("SELECT id FROM users WHERE email = $1", email)
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="该邮箱尚未注册"
        )

    code = email_code_service.generate_and_store_code(email)
    email_service.send_verification_code(email, code)

    return EmailCodeResponse(
        message="验证码已发送",
        expires_in=300
    )


@router.post("/auth/login-with-code", response_model=TokenResponse)
async def login_with_code(
    verify_data: EmailCodeVerify,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    使用邮箱验证码登录

    - **email**: 邮箱地址
    - **code**: 验证码

    返回访问令牌和刷新令牌
    """
    email = verify_data.email
    code = verify_data.code

    success, error_msg = email_code_service.verify_code(email, code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    try:
        user = await AuthService.authenticate_user_by_email(conn, email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token, expires_in = AuthService.create_access_token(user.id, user.email)
        refresh_token = AuthService.create_refresh_token(user.id, user.email)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Login with code error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录失败"
        )
