"""
邮箱验证码服务
"""
import redis
import random
import string
import logging
from datetime import timedelta
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)


class EmailCodeService:
    """邮箱验证码服务类"""

    REDIS_KEY_PREFIX = "email_code:"
    CODE_LENGTH = 6
    CODE_EXPIRE_MINUTES = 5
    MAX_ATTEMPTS = 5
    MAX_REQUESTS_PER_MINUTE = 3

    def __init__(self):
        self._redis_client: Optional[redis.Redis] = None

    @property
    def redis_client(self) -> redis.Redis:
        """获取Redis客户端（延迟初始化）"""
        if self._redis_client is None:
            self._redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
        return self._redis_client

    def _generate_code(self) -> str:
        """生成6位数字验证码"""
        return ''.join(random.choices(string.digits, k=self.CODE_LENGTH))

    def _get_rate_limit_key(self, email: str) -> str:
        """获取频率限制的Redis键"""
        return f"email_code_rate:{email}"

    def _get_code_key(self, email: str) -> str:
        """获取验证码的Redis键"""
        return f"{self.REDIS_KEY_PREFIX}{email}"

    def _get_attempts_key(self, email: str) -> str:
        """获取尝试次数的Redis键"""
        return f"email_code_attempts:{email}"

    def check_rate_limit(self, email: str) -> tuple[bool, int]:
        """
        检查频率限制
        返回: (是否允许, 剩余等待秒数)
        """
        key = self._get_rate_limit_key(email)
        current = self.redis_client.get(key)

        if current is None:
            return True, 0

        ttl = self.redis_client.ttl(key)
        return False, max(0, ttl)

    def increment_rate_limit(self, email: str) -> int:
        """
        增加频率限制计数
        返回: 当前请求次数
        """
        key = self._get_rate_limit_key(email)
        pipe = self.redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, 60)
        results = pipe.execute()
        return results[0]

    def generate_and_store_code(self, email: str) -> str:
        """
        生成验证码并存储
        返回: 生成的验证码
        """
        code = self._generate_code()

        code_key = self._get_code_key(email)
        attempts_key = self._get_attempts_key(email)

        pipe = self.redis_client.pipeline()
        pipe.setex(code_key, timedelta(minutes=self.CODE_EXPIRE_MINUTES), code)
        pipe.setex(attempts_key, timedelta(minutes=self.CODE_EXPIRE_MINUTES), 0)
        pipe.execute()

        logger.info(f"Generated verification code for {email}")
        return code

    def verify_code(self, email: str, code: str) -> tuple[bool, str]:
        """
        验证验证码
        返回: (是否成功, 错误消息)
        """
        code_key = self._get_code_key(email)
        attempts_key = self._get_attempts_key(email)

        stored_code = self.redis_client.get(code_key)

        if stored_code is None:
            return False, "验证码已过期，请重新获取"

        attempts = self.redis_client.get(attempts_key)
        if attempts and int(attempts) >= self.MAX_ATTEMPTS:
            return False, "验证码尝试次数过多，请重新获取"

        if stored_code != code:
            pipe = self.redis_client.pipeline()
            pipe.incr(attempts_key)
            pipe.expire(attempts_key, timedelta(minutes=self.CODE_EXPIRE_MINUTES))
            pipe.execute()
            return False, "验证码错误"

        self.redis_client.delete(code_key)
        self.redis_client.delete(attempts_key)
        return True, ""

    def get_stored_code(self, email: str) -> Optional[str]:
        """获取存储的验证码（用于测试/调试）"""
        key = self._get_code_key(email)
        return self.redis_client.get(key)


email_code_service = EmailCodeService()
