"""
配置管理
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """应用配置"""
    
    # 基础配置
    APP_NAME: str = "SnippetBox API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS 配置
    CORS_ORIGINS: List[str] = ["*"]
    
    # 数据库配置
    DATABASE_URL: str = "postgresql://snippetbox:snippetbox@localhost:5432/snippetbox"
    
    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300  # 5 分钟
    
    # 嵌入模型配置
    MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    MODEL_CACHE_DIR: str = "./models"
    MODEL_DEVICE: str = "cpu"  # cpu 或 cuda
    EMBEDDING_DIMENSION: int = 384
    
    # 向量搜索配置
    VECTOR_SEARCH_LIMIT: int = 10
    VECTOR_SIMILARITY_THRESHOLD: float = 0.7
    
    # 速率限制
    RATE_LIMIT_PER_MINUTE: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
