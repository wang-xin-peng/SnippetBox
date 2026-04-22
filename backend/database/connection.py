"""
数据库连接管理
"""
import asyncpg
from typing import Optional
import logging

from config import settings

logger = logging.getLogger(__name__)

# 全局连接池
_pool: Optional[asyncpg.Pool] = None


async def get_db_pool() -> asyncpg.Pool:
    """获取数据库连接池"""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        logger.info("Database connection pool created")
    return _pool


async def get_db_connection():
    """获取数据库连接（用于依赖注入）"""
    pool = await get_db_pool()
    async with pool.acquire() as connection:
        yield connection


async def close_db_pool():
    """关闭数据库连接池"""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")


async def init_db():
    """初始化数据库（创建表）"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # 启用 pgvector 扩展
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        
        # 创建用户表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(50) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                failed_login_attempts INTEGER DEFAULT 0,
                last_login TIMESTAMP
            )
        """)
        
        # 创建云端片段表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS cloud_snippets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                language VARCHAR(50) NOT NULL,
                code TEXT NOT NULL,
                description TEXT,
                category VARCHAR(100),
                tags TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
            )
        """)
        
        # 创建云端分类表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS cloud_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                color VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, name)
            )
        """)
        
        # 创建云端标签表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS cloud_tags (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, name)
            )
        """)
        
        # 创建分享表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS shared_snippets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                short_code VARCHAR(10) UNIQUE NOT NULL,
                snippet_id UUID NOT NULL REFERENCES cloud_snippets(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                password_hash VARCHAR(255),
                expires_at TIMESTAMP NOT NULL,
                view_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_accessed TIMESTAMP
            )
        """)
        
        # 创建云端向量表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS cloud_snippet_vectors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                snippet_id UUID NOT NULL REFERENCES cloud_snippets(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                vector vector(768),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(snippet_id)
            )
        """)
        
        # 创建令牌黑名单表（用于登出）
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS token_blacklist (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token VARCHAR(500) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 创建索引
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_snippets_user_id ON cloud_snippets(user_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_snippets_updated_at ON cloud_snippets(updated_at)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_categories_user_id ON cloud_categories(user_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_user_id ON cloud_tags(user_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_shared_short_code ON shared_snippets(short_code)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_shared_expires_at ON shared_snippets(expires_at)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_vectors_snippet_id ON cloud_snippet_vectors(snippet_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_vectors_user_id ON cloud_snippet_vectors(user_id)")
        
        logger.info("Database initialized successfully")
