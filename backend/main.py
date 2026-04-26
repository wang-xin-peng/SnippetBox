"""
SnippetBox Backend API
FastAPI 应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from api.v1 import auth, snippets, sync, share

from database.connection import init_db, close_db_pool
from config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("Starting SnippetBox API...")
    
    # 初始化数据库
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
    
    yield
    
    # 关闭时
    logger.info("Shutting down SnippetBox API...")
    
    # 关闭数据库连接池
    await close_db_pool()


# 创建 FastAPI 应用
app = FastAPI(
    title="SnippetBox API",
    description="代码片段管理工具后端 API",
    version="1.0.0",
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "SnippetBox API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "snippetbox-api"
    }


# 注册路由
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(snippets.router, prefix="/api/v1", tags=["snippets"])
app.include_router(sync.router, prefix="/api/v1", tags=["sync"])

# 分享路由（包含公开访问的短链接）
app.include_router(share.router, tags=["share"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
