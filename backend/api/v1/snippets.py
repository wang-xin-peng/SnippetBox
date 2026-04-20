"""
片段 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
import asyncpg
from typing import List, Optional
from datetime import datetime
import logging

from models.snippet import SnippetCreate, SnippetUpdate, SnippetResponse
from middleware.auth import get_current_user
from database.connection import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/snippets", response_model=SnippetResponse, status_code=status.HTTP_201_CREATED)
async def create_snippet(
    snippet: SnippetCreate,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    创建片段
    
    需要认证
    """
    user_id = current_user["user_id"]
    
    try:
        row = await conn.fetchrow("""
            INSERT INTO cloud_snippets (user_id, title, language, code, description, category, tags)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
            RETURNING id, user_id, title, language, code, description, category, tags, 
                      created_at, updated_at, deleted_at
        """, user_id, snippet.title, snippet.language, snippet.code, 
            snippet.description, snippet.category, snippet.tags)
        
        return SnippetResponse(
            id=str(row['id']),
            user_id=str(row['user_id']),
            title=row['title'],
            language=row['language'],
            code=row['code'],
            description=row['description'],
            category=row['category'],
            tags=row['tags'] or [],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            deleted_at=row['deleted_at']
        )
    except Exception as e:
        logger.error(f"Create snippet error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create snippet"
        )


@router.get("/snippets", response_model=List[SnippetResponse])
async def list_snippets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_deleted: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取用户的所有片段
    
    - **skip**: 跳过的记录数（分页）
    - **limit**: 返回的最大记录数
    - **include_deleted**: 是否包含已删除的片段
    
    需要认证
    """
    user_id = current_user["user_id"]
    
    if include_deleted:
        query = """
            SELECT id, user_id, title, language, code, description, category, tags,
                   created_at, updated_at, deleted_at
            FROM cloud_snippets
            WHERE user_id = $1::uuid
            ORDER BY updated_at DESC
            LIMIT $2 OFFSET $3
        """
    else:
        query = """
            SELECT id, user_id, title, language, code, description, category, tags,
                   created_at, updated_at, deleted_at
            FROM cloud_snippets
            WHERE user_id = $1::uuid AND deleted_at IS NULL
            ORDER BY updated_at DESC
            LIMIT $2 OFFSET $3
        """
    
    rows = await conn.fetch(query, user_id, limit, skip)
    
    return [
        SnippetResponse(
            id=str(row['id']),
            user_id=str(row['user_id']),
            title=row['title'],
            language=row['language'],
            code=row['code'],
            description=row['description'],
            category=row['category'],
            tags=row['tags'] or [],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            deleted_at=row['deleted_at']
        )
        for row in rows
    ]


@router.get("/snippets/{snippet_id}", response_model=SnippetResponse)
async def get_snippet(
    snippet_id: str,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取单个片段
    
    需要认证，只能获取自己的片段
    """
    user_id = current_user["user_id"]
    
    row = await conn.fetchrow("""
        SELECT id, user_id, title, language, code, description, category, tags,
               created_at, updated_at, deleted_at
        FROM cloud_snippets
        WHERE id = $1::uuid AND user_id = $2::uuid
    """, snippet_id, user_id)
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found"
        )
    
    return SnippetResponse(
        id=str(row['id']),
        user_id=str(row['user_id']),
        title=row['title'],
        language=row['language'],
        code=row['code'],
        description=row['description'],
        category=row['category'],
        tags=row['tags'] or [],
        created_at=row['created_at'],
        updated_at=row['updated_at'],
        deleted_at=row['deleted_at']
    )


@router.put("/snippets/{snippet_id}", response_model=SnippetResponse)
async def update_snippet(
    snippet_id: str,
    snippet: SnippetUpdate,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    更新片段
    
    需要认证，只能更新自己的片段
    """
    user_id = current_user["user_id"]
    
    # 检查片段是否存在且属于当前用户
    existing = await conn.fetchrow("""
        SELECT id FROM cloud_snippets
        WHERE id = $1::uuid AND user_id = $2::uuid
    """, snippet_id, user_id)
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found"
        )
    
    # 构建更新语句
    update_fields = []
    params = []
    param_count = 1
    
    if snippet.title is not None:
        update_fields.append(f"title = ${param_count}")
        params.append(snippet.title)
        param_count += 1
    
    if snippet.language is not None:
        update_fields.append(f"language = ${param_count}")
        params.append(snippet.language)
        param_count += 1
    
    if snippet.code is not None:
        update_fields.append(f"code = ${param_count}")
        params.append(snippet.code)
        param_count += 1
    
    if snippet.description is not None:
        update_fields.append(f"description = ${param_count}")
        params.append(snippet.description)
        param_count += 1
    
    if snippet.category is not None:
        update_fields.append(f"category = ${param_count}")
        params.append(snippet.category)
        param_count += 1
    
    if snippet.tags is not None:
        update_fields.append(f"tags = ${param_count}")
        params.append(snippet.tags)
        param_count += 1
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    update_fields.append("updated_at = CURRENT_TIMESTAMP")
    params.extend([snippet_id, user_id])
    
    query = f"""
        UPDATE cloud_snippets
        SET {', '.join(update_fields)}
        WHERE id = ${param_count}::uuid AND user_id = ${param_count + 1}::uuid
        RETURNING id, user_id, title, language, code, description, category, tags,
                  created_at, updated_at, deleted_at
    """
    
    row = await conn.fetchrow(query, *params)
    
    return SnippetResponse(
        id=str(row['id']),
        user_id=str(row['user_id']),
        title=row['title'],
        language=row['language'],
        code=row['code'],
        description=row['description'],
        category=row['category'],
        tags=row['tags'] or [],
        created_at=row['created_at'],
        updated_at=row['updated_at'],
        deleted_at=row['deleted_at']
    )


@router.delete("/snippets/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_snippet(
    snippet_id: str,
    hard_delete: bool = Query(False, description="是否硬删除"),
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    删除片段（软删除）
    
    需要认证，只能删除自己的片段
    - **hard_delete**: 如果为 True，则永久删除；否则软删除
    """
    user_id = current_user["user_id"]
    
    if hard_delete:
        result = await conn.execute("""
            DELETE FROM cloud_snippets
            WHERE id = $1::uuid AND user_id = $2::uuid
        """, snippet_id, user_id)
    else:
        result = await conn.execute("""
            UPDATE cloud_snippets
            SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
        """, snippet_id, user_id)
    
    if result == "UPDATE 0" or result == "DELETE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found"
        )
