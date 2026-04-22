"""
认证中间件
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg
from typing import Optional
import logging

from services.auth import AuthService
from database.connection import get_db_connection

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    conn: asyncpg.Connection = Depends(get_db_connection)
) -> dict:
    """获取当前用户（依赖注入）"""
    token = credentials.credentials
    
    # 验证令牌
    payload = AuthService.verify_token(token, "access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 检查令牌是否在黑名单中
    if await AuthService.is_token_blacklisted(conn, token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {
        "user_id": payload["sub"],
        "email": payload["email"]
    }


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    conn: asyncpg.Connection = Depends(get_db_connection)
) -> Optional[dict]:
    """获取当前用户（可选，用于公开端点）"""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = AuthService.verify_token(token, "access")
    
    if not payload:
        return None
    
    if await AuthService.is_token_blacklisted(conn, token):
        return None
    
    return {
        "user_id": payload["sub"],
        "email": payload["email"]
    }
