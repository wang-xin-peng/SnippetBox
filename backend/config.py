"""
配置管理
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import os
import json


class Settings(BaseSettings):
    """应用配置"""
    
    # 基础配置
    APP_NAME: str = "SnippetBox API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS 配置
    CORS_ORIGINS: Union[List[str], str] = ["*"]
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # 如果不是 JSON，按逗号分割
                return [origin.strip() for origin in v.split(',')]
        return v
    
    # 数据库配置
    DATABASE_URL: str = "postgresql://snippetbox:snippetbox@localhost:5432/snippetbox"
    
    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300  # 5 分钟
    
    # 向量搜索配置
    VECTOR_SEARCH_LIMIT: int = 10
    VECTOR_SIMILARITY_THRESHOLD: float = 0.7
    
    # 速率限制
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # JWT 配置
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION_IMMEDIATELY")
    JWT_ALGORITHM: str = "HS256"
    
    # 短链接配置
    BASE_URL: str = "http://localhost:8000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # 允许额外的字段


settings = Settings()
