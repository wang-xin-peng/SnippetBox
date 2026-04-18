"""
分享 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import asyncpg
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from models.share import ShareCreate, ShareResponse, ShareAccess, ShareDetail, ShareInfo, ShareStats
from services.shortlink import ShortLinkService
from services.auth import AuthService
from middleware.auth import get_current_user, get_optional_user
from database.connection import get_db_connection
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# 模板配置（用于短链接访问页面）
import os
from jinja2 import FileSystemLoader

template_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "templates")

# 创建一个简单的无操作缓存类
class NoOpCache:
    """不执行任何缓存操作的缓存类"""
    def get(self, key):
        return None
    
    def __getitem__(self, key):
        raise KeyError(key)
    
    def __setitem__(self, key, value):
        pass

templates = Jinja2Templates(directory=template_dir)
# 使用无操作缓存替代默认缓存
templates.env.cache = NoOpCache()


@router.post("/api/v1/share", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def create_share(
    share_request: ShareCreate,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    创建短链接分享
    
    - **snippet_id**: 片段 ID
    - **expires_in_days**: 过期天数（1-365，默认 7）
    - **password**: 密码保护（可选）
    
    需要认证
    """
    user_id = current_user["user_id"]
    
    try:
        # 检查片段是否存在且属于当前用户
        snippet = await conn.fetchrow("""
            SELECT id FROM cloud_snippets
            WHERE id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
        """, share_request.snippet_id, user_id)
        
        if not snippet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Snippet not found"
            )
        
        # 生成唯一短码
        short_code = await ShortLinkService.create_unique_short_code(conn)
        
        # 计算过期时间
        expires_at = datetime.utcnow() + timedelta(days=share_request.expires_in_days)
        
        # 处理密码
        password_hash = None
        if share_request.password:
            password_hash = AuthService.hash_password(share_request.password)
        
        # 创建分享记录
        await conn.execute("""
            INSERT INTO shared_snippets (short_code, snippet_id, user_id, password_hash, expires_at)
            VALUES ($1, $2::uuid, $3::uuid, $4, $5)
        """, short_code, share_request.snippet_id, user_id, password_hash, expires_at)
        
        # 构建短链接 URL
        short_url = f"{settings.BASE_URL}/s/{short_code}"
        
        return ShareResponse(
            short_code=short_code,
            short_url=short_url,
            expires_at=expires_at
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Create share error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create share"
        )


@router.get("/s/{short_code}", response_class=HTMLResponse)
async def access_share_page(
    request: Request,
    short_code: str,
    password: Optional[str] = Query(None),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    访问短链接（HTML 页面）
    
    公开访问，不需要认证
    """
    try:
        logger.info(f"Accessing share: {short_code}")
        
        # 获取分享信息
        share = await conn.fetchrow("""
            SELECT ss.id, ss.short_code, ss.snippet_id, ss.user_id, ss.password_hash,
                   ss.expires_at, ss.view_count, ss.created_at,
                   cs.title, cs.language, cs.code, cs.description
            FROM shared_snippets ss
            JOIN cloud_snippets cs ON ss.snippet_id = cs.id
            WHERE ss.short_code = $1
        """, short_code)
        
        logger.info(f"Share found: {share is not None}")
        
        if not share:
            template = templates.env.get_template("share_not_found.html")
            html_content = template.render({"request": request, "message": "分享不存在或已被删除"})
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=html_content, status_code=404)
        
        # 检查是否过期
        if share['expires_at'] < datetime.utcnow():
            template = templates.env.get_template("share_expired.html")
            html_content = template.render({"request": request, "message": "分享已过期"})
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=html_content, status_code=410)
        
        # 检查密码
        if share['password_hash']:
            if not password:
                template = templates.env.get_template("share_password.html")
                html_content = template.render({"request": request, "short_code": short_code})
                from fastapi.responses import HTMLResponse
                return HTMLResponse(content=html_content, status_code=200)
            
            if not AuthService.verify_password(password, share['password_hash']):
                template = templates.env.get_template("share_password.html")
                html_content = template.render({"request": request, "short_code": short_code, "error": "密码错误"})
                from fastapi.responses import HTMLResponse
                return HTMLResponse(content=html_content, status_code=401)
        
        # 增加访问计数
        await conn.execute("""
            UPDATE shared_snippets
            SET view_count = view_count + 1, last_accessed = CURRENT_TIMESTAMP
            WHERE short_code = $1
        """, short_code)
        
        logger.info(f"Rendering template for: {share['title']}")
        
        # 返回片段内容页面
        context = {
            "request": request,
            "snippet": {
                "title": str(share['title']),
                "language": str(share['language']),
                "code": str(share['code']),
                "description": str(share['description']) if share['description'] else ""
            },
            "view_count": int(share['view_count']) + 1,
            "created_at": share['created_at']  # 保持datetime对象
        }
        
        logger.info(f"Template context prepared: {list(context.keys())}")
        
        # 直接使用Jinja2渲染，避免Starlette的TemplateResponse问题
        template = templates.env.get_template("share.html")
        html_content = template.render(context)
        
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content, status_code=200)
    
    except Exception as e:
        logger.error(f"Access share error: {e}", exc_info=True)
        template = templates.env.get_template("share_error.html")
        html_content = template.render({"request": request, "message": "访问出错，请稍后重试"})
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content, status_code=500)


@router.get("/api/v1/share/{short_code}/info", response_model=ShareInfo)
async def get_share_info(
    short_code: str,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取分享信息（不包含片段内容）
    
    需要认证，只能查看自己的分享
    """
    user_id = current_user["user_id"]
    
    share = await conn.fetchrow("""
        SELECT id, short_code, snippet_id, user_id, password_hash,
               expires_at, view_count, created_at
        FROM shared_snippets
        WHERE short_code = $1 AND user_id = $2::uuid
    """, short_code, user_id)
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )
    
    return ShareInfo(
        short_code=share['short_code'],
        snippet_id=str(share['snippet_id']),
        user_id=str(share['user_id']),
        expires_at=share['expires_at'],
        view_count=share['view_count'],
        created_at=share['created_at'],
        has_password=share['password_hash'] is not None
    )


@router.get("/api/v1/shares", response_model=List[ShareInfo])
async def list_shares(
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取用户的所有分享
    
    需要认证
    """
    user_id = current_user["user_id"]
    
    rows = await conn.fetch("""
        SELECT id, short_code, snippet_id, user_id, password_hash,
               expires_at, view_count, created_at
        FROM shared_snippets
        WHERE user_id = $1::uuid
        ORDER BY created_at DESC
    """, user_id)
    
    return [
        ShareInfo(
            short_code=row['short_code'],
            snippet_id=str(row['snippet_id']),
            user_id=str(row['user_id']),
            expires_at=row['expires_at'],
            view_count=row['view_count'],
            created_at=row['created_at'],
            has_password=row['password_hash'] is not None
        )
        for row in rows
    ]


@router.delete("/api/v1/share/{short_code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_share(
    short_code: str,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    删除分享
    
    需要认证，只能删除自己的分享
    """
    user_id = current_user["user_id"]
    
    result = await conn.execute("""
        DELETE FROM shared_snippets
        WHERE short_code = $1 AND user_id = $2::uuid
    """, short_code, user_id)
    
    if result == "DELETE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )


@router.get("/api/v1/share/{short_code}/stats", response_model=ShareStats)
async def get_share_stats(
    short_code: str,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取分享统计
    
    需要认证，只能查看自己的分享统计
    """
    user_id = current_user["user_id"]
    
    share = await conn.fetchrow("""
        SELECT short_code, view_count, created_at, expires_at, last_accessed
        FROM shared_snippets
        WHERE short_code = $1 AND user_id = $2::uuid
    """, short_code, user_id)
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )
    
    return ShareStats(
        short_code=share['short_code'],
        view_count=share['view_count'],
        created_at=share['created_at'],
        expires_at=share['expires_at'],
        last_accessed=share['last_accessed']
    )
