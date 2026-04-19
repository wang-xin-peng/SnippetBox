"""
短链接服务
"""
import random
import string
import asyncpg
import logging

logger = logging.getLogger(__name__)


class ShortLinkService:
    """短链接服务类"""
    
    # Base62 字符集（数字 + 大小写字母）
    BASE62_CHARS = string.digits + string.ascii_lowercase + string.ascii_uppercase
    SHORT_CODE_LENGTH = 6
    MAX_RETRIES = 5
    
    @staticmethod
    def generate_short_code() -> str:
        """生成短码（Base62，6 位字符）"""
        return ''.join(random.choices(ShortLinkService.BASE62_CHARS, k=ShortLinkService.SHORT_CODE_LENGTH))
    
    @staticmethod
    async def create_unique_short_code(conn: asyncpg.Connection) -> str:
        """生成唯一的短码（带碰撞检测）"""
        for _ in range(ShortLinkService.MAX_RETRIES):
            short_code = ShortLinkService.generate_short_code()
            
            # 检查是否已存在
            existing = await conn.fetchrow("""
                SELECT id FROM shared_snippets WHERE short_code = $1
            """, short_code)
            
            if not existing:
                return short_code
        
        # 如果重试多次仍然碰撞，抛出异常
        raise ValueError("Failed to generate unique short code after multiple retries")
