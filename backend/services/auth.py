"""
认证服务
"""
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional, Tuple
import logging
import asyncpg

from config import settings
from models.user import UserCreate, User

logger = logging.getLogger(__name__)


class AuthService:
    """认证服务类"""
    
    # JWT 配置
    SECRET_KEY = settings.JWT_SECRET_KEY
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 小时
    REFRESH_TOKEN_EXPIRE_DAYS = 7  # 7 天
    MAX_FAILED_ATTEMPTS = 5  # 最大失败尝试次数
    
    @staticmethod
    def hash_password(password: str) -> str:
        """哈希密码"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """验证密码"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    
    @staticmethod
    def create_access_token(user_id: str, email: str) -> Tuple[str, int]:
        """创建访问令牌"""
        expires_delta = timedelta(minutes=AuthService.ACCESS_TOKEN_EXPIRE_MINUTES)
        expire = datetime.utcnow() + expires_delta
        
        payload = {
            "sub": user_id,
            "email": email,
            "exp": expire,
            "type": "access"
        }
        
        token = jwt.encode(payload, AuthService.SECRET_KEY, algorithm=AuthService.ALGORITHM)
        return token, int(expires_delta.total_seconds())
    
    @staticmethod
    def create_refresh_token(user_id: str, email: str) -> str:
        """创建刷新令牌"""
        expires_delta = timedelta(days=AuthService.REFRESH_TOKEN_EXPIRE_DAYS)
        expire = datetime.utcnow() + expires_delta
        
        payload = {
            "sub": user_id,
            "email": email,
            "exp": expire,
            "type": "refresh"
        }
        
        return jwt.encode(payload, AuthService.SECRET_KEY, algorithm=AuthService.ALGORITHM)
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
        """验证令牌"""
        try:
            payload = jwt.decode(token, AuthService.SECRET_KEY, algorithms=[AuthService.ALGORITHM])
            
            # 检查令牌类型
            if payload.get("type") != token_type:
                return None
            
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
    
    @staticmethod
    async def register_user(conn: asyncpg.Connection, user_data: UserCreate) -> User:
        """注册用户"""
        # 检查邮箱是否已存在
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            user_data.email
        )
        if existing:
            raise ValueError("Email already registered")
        
        # 哈希密码
        password_hash = AuthService.hash_password(user_data.password)
        
        # 创建用户
        row = await conn.fetchrow("""
            INSERT INTO users (email, username, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, email, username, created_at, updated_at, is_active, 
                      failed_login_attempts, last_login
        """, user_data.email, user_data.username, password_hash)
        
        return User(
            id=str(row['id']),
            email=row['email'],
            username=row['username'],
            password_hash=password_hash,
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            is_active=row['is_active'],
            failed_login_attempts=row['failed_login_attempts'],
            last_login=row['last_login']
        )
    
    @staticmethod
    async def authenticate_user(conn: asyncpg.Connection, email: str, password: str) -> Optional[User]:
        """认证用户"""
        # 获取用户
        row = await conn.fetchrow("""
            SELECT id, email, username, password_hash, created_at, updated_at, 
                   is_active, failed_login_attempts, last_login
            FROM users WHERE email = $1
        """, email)
        
        if not row:
            return None
        
        # 检查账户是否被锁定
        if row['failed_login_attempts'] >= AuthService.MAX_FAILED_ATTEMPTS:
            logger.warning(f"Account locked for email: {email}")
            raise ValueError("Account locked due to too many failed login attempts")
        
        # 验证密码
        if not AuthService.verify_password(password, row['password_hash']):
            # 增加失败次数
            await conn.execute("""
                UPDATE users 
                SET failed_login_attempts = failed_login_attempts + 1
                WHERE email = $1
            """, email)
            return None
        
        # 重置失败次数并更新最后登录时间
        await conn.execute("""
            UPDATE users 
            SET failed_login_attempts = 0, last_login = CURRENT_TIMESTAMP
            WHERE email = $1
        """, email)
        
        return User(
            id=str(row['id']),
            email=row['email'],
            username=row['username'],
            password_hash=row['password_hash'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            is_active=row['is_active'],
            failed_login_attempts=0,
            last_login=datetime.utcnow()
        )

    @staticmethod
    async def authenticate_user_by_email(conn: asyncpg.Connection, email: str) -> Optional[User]:
        """通过邮箱获取用户（用于验证码登录）"""
        row = await conn.fetchrow("""
            SELECT id, email, username, password_hash, created_at, updated_at,
                   is_active, failed_login_attempts, last_login
            FROM users WHERE email = $1
        """, email)

        if not row:
            return None

        if row['failed_login_attempts'] >= AuthService.MAX_FAILED_ATTEMPTS:
            logger.warning(f"Account locked for email: {email}")
            raise ValueError("Account locked due to too many failed login attempts")

        await conn.execute("""
            UPDATE users
            SET failed_login_attempts = 0, last_login = CURRENT_TIMESTAMP
            WHERE email = $1
        """, email)

        return User(
            id=str(row['id']),
            email=row['email'],
            username=row['username'],
            password_hash=row['password_hash'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            is_active=row['is_active'],
            failed_login_attempts=0,
            last_login=datetime.utcnow()
        )
    
    @staticmethod
    async def blacklist_token(conn: asyncpg.Connection, token: str):
        """
        将令牌加入黑名单（自动解析过期时间）
        用于登出功能
        """
        # 解析令牌获取过期时间
        payload = AuthService.verify_token(token, "access")
        if not payload:
            logger.warning("Attempted to blacklist invalid token")
            return
        
        expires_at = datetime.fromtimestamp(payload["exp"])
        await AuthService.add_token_to_blacklist(conn, token, expires_at)
        logger.info(f"Token blacklisted, expires at {expires_at}")
    
    @staticmethod
    async def add_token_to_blacklist(conn: asyncpg.Connection, token: str, expires_at: datetime):
        """将令牌加入黑名单"""
        await conn.execute("""
            INSERT INTO token_blacklist (token, expires_at)
            VALUES ($1, $2)
            ON CONFLICT (token) DO NOTHING
        """, token, expires_at)
    
    @staticmethod
    async def is_token_blacklisted(conn: asyncpg.Connection, token: str) -> bool:
        """检查令牌是否在黑名单中"""
        row = await conn.fetchrow("""
            SELECT id FROM token_blacklist 
            WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
        """, token)
        return row is not None
    
    @staticmethod
    async def clean_expired_tokens(conn: asyncpg.Connection):
        """清理过期的黑名单令牌"""
        result = await conn.execute("""
            DELETE FROM token_blacklist 
            WHERE expires_at <= CURRENT_TIMESTAMP
        """)
        logger.info(f"Cleaned expired tokens: {result}")
