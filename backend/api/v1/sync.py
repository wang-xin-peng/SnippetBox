"""
同步 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
from typing import List
from datetime import datetime
import logging

from models.sync import SyncRequest, SyncResponse, SnippetChange, Conflict, MetadataSyncRequest, MetadataSyncResponse
from middleware.auth import get_current_user
from database.connection import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/sync", response_model=SyncResponse)
async def sync_snippets(
    sync_request: SyncRequest,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    增量同步片段
    - **last_sync_time**: 上次同步时间（可选，首次同步为 None）
    - **changes**: 客户端的变更列表
    返回服务器的变更和冲突
    需要认证
    """
    user_id = current_user["user_id"]
    server_changes: List[SnippetChange] = []
    conflicts: List[Conflict] = []
    
    try:
        # 1. 处理客户端变更
        for change in sync_request.changes:
            snippet_id = change.snippet_id
            
            # 检查服务器上是否存在该片段
            server_snippet = await conn.fetchrow("""
                SELECT id, title, language, code, description, category, tags,
                       created_at, updated_at, deleted_at
                FROM cloud_snippets
                WHERE id = $1::uuid AND user_id = $2::uuid
            """, snippet_id, user_id)
            
            if change.action == "create":
                # 创建新片段
                if server_snippet:
                    # 服务器已存在，检测冲突
                    conflicts.append(Conflict(
                        snippet_id=snippet_id,
                        local_version=change.data,
                        cloud_version={
                            "id": str(server_snippet['id']),
                            "title": server_snippet['title'],
                            "language": server_snippet['language'],
                            "code": server_snippet['code'],
                            "description": server_snippet['description'],
                            "category": server_snippet['category'],
                            "tags": server_snippet['tags'] or [],
                            "updated_at": server_snippet['updated_at'].isoformat()
                        },
                        conflict_type="update"
                    ))
                else:
                    # 创建片段
                    data = change.data
                    await conn.execute("""
                        INSERT INTO cloud_snippets 
                        (id, user_id, title, language, code, description, category, tags, created_at, updated_at)
                        VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)
                    """, snippet_id, user_id, data['title'], data['language'], data['code'],
                        data.get('description'), data.get('category'), data.get('tags', []),
                        change.timestamp, change.timestamp)
            
            elif change.action == "update":
                if not server_snippet:
                    # 服务器不存在，当作创建处理
                    data = change.data
                    await conn.execute("""
                        INSERT INTO cloud_snippets 
                        (id, user_id, title, language, code, description, category, tags, created_at, updated_at)
                        VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)
                    """, snippet_id, user_id, data['title'], data['language'], data['code'],
                        data.get('description'), data.get('category'), data.get('tags', []),
                        change.timestamp, change.timestamp)
                else:
                    # 检查是否有冲突（服务器版本更新）
                    if server_snippet['updated_at'] > change.timestamp:
                        conflicts.append(Conflict(
                            snippet_id=snippet_id,
                            local_version=change.data,
                            cloud_version={
                                "id": str(server_snippet['id']),
                                "title": server_snippet['title'],
                                "language": server_snippet['language'],
                                "code": server_snippet['code'],
                                "description": server_snippet['description'],
                                "category": server_snippet['category'],
                                "tags": server_snippet['tags'] or [],
                                "updated_at": server_snippet['updated_at'].isoformat()
                            },
                            conflict_type="update"
                        ))
                    else:
                        # 更新片段
                        data = change.data
                        await conn.execute("""
                            UPDATE cloud_snippets
                            SET title = $1, language = $2, code = $3, description = $4,
                                category = $5, tags = $6, updated_at = $7
                            WHERE id = $8::uuid AND user_id = $9::uuid
                        """, data['title'], data['language'], data['code'],
                            data.get('description'), data.get('category'), data.get('tags', []),
                            change.timestamp, snippet_id, user_id)
            
            elif change.action == "delete":
                if server_snippet:
                    # 检查是否有冲突（服务器版本更新）
                    if server_snippet['updated_at'] > change.timestamp:
                        conflicts.append(Conflict(
                            snippet_id=snippet_id,
                            local_version={"deleted": True},
                            cloud_version={
                                "id": str(server_snippet['id']),
                                "title": server_snippet['title'],
                                "language": server_snippet['language'],
                                "code": server_snippet['code'],
                                "description": server_snippet['description'],
                                "category": server_snippet['category'],
                                "tags": server_snippet['tags'] or [],
                                "updated_at": server_snippet['updated_at'].isoformat()
                            },
                            conflict_type="delete"
                        ))
                    else:
                        # 软删除片段
                        await conn.execute("""
                            UPDATE cloud_snippets
                            SET deleted_at = $1, updated_at = $1
                            WHERE id = $2::uuid AND user_id = $3::uuid
                        """, change.timestamp, snippet_id, user_id)
        
        # 2. 获取服务器变更（自上次同步以来的变更）
        if sync_request.last_sync_time:
            rows = await conn.fetch("""
                SELECT id, title, language, code, description, category, tags,
                       created_at, updated_at, deleted_at
                FROM cloud_snippets
                WHERE user_id = $1::uuid AND updated_at > $2
                ORDER BY updated_at ASC
            """, user_id, sync_request.last_sync_time)
        else:
            # 首次同步，返回空列表，避免客户端恢复旧数据
            rows = []
        
        for row in rows:
            if row['deleted_at']:
                server_changes.append(SnippetChange(
                    snippet_id=str(row['id']),
                    action="delete",
                    data=None,
                    timestamp=row['updated_at']
                ))
            else:
                # 判断是创建还是更新
                action = "create" if row['created_at'] == row['updated_at'] else "update"
                server_changes.append(SnippetChange(
                    snippet_id=str(row['id']),
                    action=action,
                    data={
                        "id": str(row['id']),
                        "title": row['title'],
                        "language": row['language'],
                        "code": row['code'],
                        "description": row['description'],
                        "category": row['category'],
                        "tags": row['tags'] or [],
                        "created_at": row['created_at'].isoformat(),
                        "updated_at": row['updated_at'].isoformat()
                    },
                    timestamp=row['updated_at']
                ))
        
        return SyncResponse(
            server_changes=server_changes,
            conflicts=conflicts,
            sync_time=datetime.utcnow()
        )
    
    except Exception as e:
        logger.error(f"Sync error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Sync failed"
        )


@router.get("/categories")
async def list_categories(
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取用户的分类
    需要认证
    """
    user_id = current_user["user_id"]
    
    rows = await conn.fetch("""
        SELECT id, name, color, created_at, updated_at
        FROM cloud_categories
        WHERE user_id = $1::uuid
        ORDER BY name
    """, user_id)
    
    return [
        {
            "id": str(row['id']),
            "name": row['name'],
            "color": row['color'],
            "created_at": row['created_at'].isoformat(),
            "updated_at": row['updated_at'].isoformat()
        }
        for row in rows
    ]


@router.get("/tags")
async def list_tags(
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取用户的标签
    需要认证
    """
    user_id = current_user["user_id"]
    
    rows = await conn.fetch("""
        SELECT id, name, created_at
        FROM cloud_tags
        WHERE user_id = $1::uuid
        ORDER BY name
    """, user_id)
    
    return [
        {
            "id": str(row['id']),
            "name": row['name'],
            "created_at": row['created_at'].isoformat()
        }
        for row in rows
    ]


@router.post("/sync/metadata", response_model=MetadataSyncResponse)
async def sync_metadata(
    request: MetadataSyncRequest,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    同步分类和标签元数据
    需要认证
    """
    user_id = current_user["user_id"]
    
    try:
        # 同步分类
        for category in request.categories:
            await conn.execute("""
                INSERT INTO cloud_categories (user_id, name, color, created_at, updated_at)
                VALUES ($1::uuid, $2, $3, $4, $5)
                ON CONFLICT (user_id, name) 
                DO UPDATE SET color = EXCLUDED.color, updated_at = EXCLUDED.updated_at
            """, user_id, category['name'], category.get('color'), 
                category.get('created_at', datetime.utcnow()), 
                category.get('updated_at', datetime.utcnow()))
        
        # 同步标签
        for tag in request.tags:
            await conn.execute("""
                INSERT INTO cloud_tags (user_id, name, created_at)
                VALUES ($1::uuid, $2, $3)
                ON CONFLICT (user_id, name) DO NOTHING
            """, user_id, tag['name'], tag.get('created_at', datetime.utcnow()))
        
        # 检查用户是否有任何分类和标签
        categories_count = await conn.fetchrow("""
            SELECT COUNT(*) FROM cloud_categories WHERE user_id = $1::uuid
        """, user_id)
        
        tags_count = await conn.fetchrow("""
            SELECT COUNT(*) FROM cloud_tags WHERE user_id = $1::uuid
        """, user_id)
        
        # 如果用户没有分类和标签，返回空列表
        if categories_count[0] == 0 and tags_count[0] == 0:
            categories_rows = []
            tags_rows = []
        else:
            # 获取所有分类和标签
            categories_rows = await conn.fetch("""
                SELECT id, name, color, created_at, updated_at
                FROM cloud_categories
                WHERE user_id = $1::uuid
                ORDER BY name
            """, user_id)
            
            tags_rows = await conn.fetch("""
                SELECT id, name, created_at
                FROM cloud_tags
                WHERE user_id = $1::uuid
                ORDER BY name
            """, user_id)
        
        return MetadataSyncResponse(
            categories=[
                {
                    "id": str(row['id']),
                    "name": row['name'],
                    "color": row['color'],
                    "created_at": row['created_at'].isoformat(),
                    "updated_at": row['updated_at'].isoformat()
                }
                for row in categories_rows
            ],
            tags=[
                {
                    "id": str(row['id']),
                    "name": row['name'],
                    "created_at": row['created_at'].isoformat()
                }
                for row in tags_rows
            ],
            sync_time=datetime.utcnow()
        )
    
    except Exception as e:
        logger.error(f"Metadata sync error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Metadata sync failed"
        )
