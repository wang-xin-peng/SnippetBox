"""
同步 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
from typing import List
from datetime import datetime, timezone
import logging

from models.sync import SyncRequest, SyncResponse, SnippetChange, Conflict, MetadataSyncRequest, MetadataSyncResponse
from middleware.auth import get_current_user
from database.connection import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter()

# 存储限制（1GB）
STORAGE_LIMIT = 1024 * 1024 * 1024  # 1GB

async def calculate_storage_usage(conn: asyncpg.Connection, user_id: str) -> int:
    """
    计算用户的存储使用量
    返回字节数
    """
    # 计算所有非删除片段的大小
    result = await conn.fetchrow("""
        SELECT COALESCE(SUM(
            LENGTH(title) + 
            LENGTH(language) + 
            LENGTH(code) + 
            COALESCE(LENGTH(description), 0) + 
            COALESCE(LENGTH(category), 0) + 
            COALESCE(ARRAY_LENGTH(tags, 1) * 50, 0)
        ), 0) as total_size
        FROM cloud_snippets
        WHERE user_id = $1::uuid AND deleted_at IS NULL
    """, user_id)
    
    return result['total_size']

async def check_storage_limit(conn: asyncpg.Connection, user_id: str, new_data_size: int = 0) -> None:
    """
    检查用户是否超过存储限制
    如果超过限制，抛出 HTTP 异常
    """
    current_usage = await calculate_storage_usage(conn, user_id)
    if current_usage + new_data_size > STORAGE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"存储容量超出限制（1GB）。当前使用：{current_usage / (1024 * 1024):.2f}MB，尝试添加：{new_data_size / (1024 * 1024):.2f}MB"
        )


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
                    # 计算新数据的大小
                    data = change.data
                    new_data_size = len(data['title']) + len(data['language']) + len(data['code'])
                    if data.get('description'):
                        new_data_size += len(data['description'])
                    if data.get('category'):
                        new_data_size += len(data['category'])
                    if data.get('tags'):
                        new_data_size += len(data['tags']) * 50
                    
                    # 检查存储限制
                    await check_storage_limit(conn, user_id, new_data_size)
                    
                    # 创建片段
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
                    new_data_size = len(data['title']) + len(data['language']) + len(data['code'])
                    if data.get('description'):
                        new_data_size += len(data['description'])
                    if data.get('category'):
                        new_data_size += len(data['category'])
                    if data.get('tags'):
                        new_data_size += len(data['tags']) * 50
                    
                    # 检查存储限制
                    await check_storage_limit(conn, user_id, new_data_size)
                    
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
                        # 计算新旧数据的大小差异
                        data = change.data
                        old_size = len(server_snippet['title']) + len(server_snippet['language']) + len(server_snippet['code'])
                        if server_snippet['description']:
                            old_size += len(server_snippet['description'])
                        if server_snippet['category']:
                            old_size += len(server_snippet['category'])
                        if server_snippet['tags']:
                            old_size += len(server_snippet['tags']) * 50
                        
                        new_size = len(data['title']) + len(data['language']) + len(data['code'])
                        if data.get('description'):
                            new_size += len(data['description'])
                        if data.get('category'):
                            new_size += len(data['category'])
                        if data.get('tags'):
                            new_size += len(data['tags']) * 50
                        
                        # 计算大小差异
                        size_diff = new_size - old_size
                        
                        # 检查存储限制
                        if size_diff > 0:
                            await check_storage_limit(conn, user_id, size_diff)
                        
                        # 更新片段
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
    
    def _parse_dt(val: str | None, fallback: datetime) -> datetime:
        """将 ISO 8601 字符串解析为 naive UTC datetime，asyncpg 不接受字符串也不接受 aware datetime"""
        if not val:
            return fallback
        try:
            dt = datetime.fromisoformat(val.replace('Z', '+00:00'))
            # 转为 UTC 并去掉时区信息（TIMESTAMP 列要求 naive datetime）
            if dt.tzinfo is not None:
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt
        except (ValueError, AttributeError):
            return fallback

    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        # 同步分类
        for category in request.categories:
            await conn.execute("""
                INSERT INTO cloud_categories (user_id, name, color, created_at, updated_at)
                VALUES ($1::uuid, $2, $3, $4, $5)
                ON CONFLICT (user_id, name)
                DO UPDATE SET color = EXCLUDED.color, updated_at = EXCLUDED.updated_at
            """, user_id, category['name'], category.get('color'),
                _parse_dt(category.get('created_at'), now),
                _parse_dt(category.get('updated_at'), now))

        # 同步标签
        for tag in request.tags:
            await conn.execute("""
                INSERT INTO cloud_tags (user_id, name, created_at)
                VALUES ($1::uuid, $2, $3)
                ON CONFLICT (user_id, name) DO NOTHING
            """, user_id, tag['name'], _parse_dt(tag.get('created_at'), now))
        
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


@router.get("/storage")
async def get_storage_usage(
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取用户的存储使用情况
    需要认证
    """
    user_id = current_user["user_id"]
    
    # 计算当前使用量
    current_usage = await calculate_storage_usage(conn, user_id)
    
    # 计算百分比
    usage_percentage = (current_usage / STORAGE_LIMIT) * 100
    
    return {
        "current_usage": current_usage,
        "total_limit": STORAGE_LIMIT,
        "usage_percentage": round(usage_percentage, 2),
        "current_usage_mb": round(current_usage / (1024 * 1024), 2),
        "total_limit_mb": round(STORAGE_LIMIT / (1024 * 1024), 2)
    }