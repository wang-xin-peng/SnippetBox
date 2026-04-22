"""
云端向量同步 API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
import asyncpg
from typing import List, Optional
from datetime import datetime
import logging
from pydantic import BaseModel

from middleware.auth import get_current_user
from database.connection import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter()


class VectorUpload(BaseModel):
    """向量上传模型"""
    snippet_id: str
    vector: List[float]


class VectorSearchRequest(BaseModel):
    """向量搜索请求"""
    query_vector: List[float]
    limit: int = 10
    threshold: float = 0.7


@router.post("/vector-sync/upload")
async def upload_vector(
    data: VectorUpload,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    上传片段向量
    
    - **snippet_id**: 片段 ID
    - **vector**: 向量数据（384 维）
    
    需要认证
    """
    user_id = current_user["user_id"]
    snippet_id = data.snippet_id
    vector = data.vector
    
    try:
        # 验证片段是否存在且属于当前用户
        snippet = await conn.fetchrow("""
            SELECT id FROM cloud_snippets
            WHERE id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
        """, snippet_id, user_id)
        
        if not snippet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Snippet not found"
            )
        
        # 验证向量维度
        if len(vector) != 384:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vector dimension must be 384"
            )
        
        # 插入或更新向量
        await conn.execute("""
            INSERT INTO cloud_snippet_vectors (snippet_id, user_id, vector)
            VALUES ($1::uuid, $2::uuid, $3::vector)
            ON CONFLICT (snippet_id) 
            DO UPDATE SET vector = EXCLUDED.vector, updated_at = CURRENT_TIMESTAMP
        """, snippet_id, user_id, vector)
        
        return {
            "status": "success",
            "snippet_id": snippet_id,
            "message": "Vector uploaded successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload vector error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload vector"
        )


@router.post("/vector-sync/batch-upload")
async def batch_upload_vectors(
    vectors: List[VectorUpload],
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    批量上传向量
    
    - **vectors**: 向量列表，每个包含 snippet_id 和 vector
    
    需要认证
    """
    user_id = current_user["user_id"]
    
    try:
        success_count = 0
        error_count = 0
        errors = []
        
        for item in vectors:
            snippet_id = item.snippet_id
            vector = item.vector
            
            if len(vector) != 384:
                error_count += 1
                errors.append({"snippet_id": snippet_id, "error": "Invalid vector dimension"})
                continue
            
            try:
                # 验证片段是否存在
                snippet = await conn.fetchrow("""
                    SELECT id FROM cloud_snippets
                    WHERE id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
                """, snippet_id, user_id)
                
                if not snippet:
                    error_count += 1
                    errors.append({"snippet_id": snippet_id, "error": "Snippet not found"})
                    continue
                
                # 插入或更新向量
                await conn.execute("""
                    INSERT INTO cloud_snippet_vectors (snippet_id, user_id, vector)
                    VALUES ($1::uuid, $2::uuid, $3::vector)
                    ON CONFLICT (snippet_id) 
                    DO UPDATE SET vector = EXCLUDED.vector, updated_at = CURRENT_TIMESTAMP
                """, snippet_id, user_id, vector)
                
                success_count += 1
            
            except Exception as e:
                error_count += 1
                errors.append({"snippet_id": snippet_id, "error": str(e)})
        
        return {
            "status": "completed",
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors if errors else None
        }
    
    except Exception as e:
        logger.error(f"Batch upload vectors error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to batch upload vectors"
        )


@router.post("/vector-sync/search")
async def search_vectors(
    request: VectorSearchRequest,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    向量相似度搜索
    
    - **query_vector**: 查询向量（384 维）
    - **limit**: 返回结果数量（默认 10）
    - **threshold**: 相似度阈值（默认 0.7）
    
    需要认证
    """
    user_id = current_user["user_id"]
    query_vector = request.query_vector
    limit = request.limit
    threshold = request.threshold
    
    try:
        # 验证向量维度
        if len(query_vector) != 384:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query vector dimension must be 384"
            )
        
        # 向量相似度搜索（使用余弦相似度）
        rows = await conn.fetch("""
            SELECT 
                v.snippet_id,
                s.title,
                s.language,
                s.code,
                s.description,
                s.category,
                s.tags,
                s.created_at,
                s.updated_at,
                1 - (v.vector <=> $1::vector) as similarity
            FROM cloud_snippet_vectors v
            JOIN cloud_snippets s ON v.snippet_id = s.id
            WHERE v.user_id = $2::uuid 
                AND s.deleted_at IS NULL
                AND 1 - (v.vector <=> $1::vector) >= $3
            ORDER BY v.vector <=> $1::vector
            LIMIT $4
        """, query_vector, user_id, threshold, limit)
        
        results = [
            {
                "snippet_id": str(row['snippet_id']),
                "title": row['title'],
                "language": row['language'],
                "code": row['code'],
                "description": row['description'],
                "category": row['category'],
                "tags": row['tags'] or [],
                "similarity": float(row['similarity']),
                "created_at": row['created_at'].isoformat(),
                "updated_at": row['updated_at'].isoformat()
            }
            for row in rows
        ]
        
        return {
            "results": results,
            "count": len(results)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vector search error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search vectors"
        )


@router.delete("/vector-sync/{snippet_id}")
async def delete_vector(
    snippet_id: str,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    删除片段向量
    
    需要认证，只能删除自己的向量
    """
    user_id = current_user["user_id"]
    
    result = await conn.execute("""
        DELETE FROM cloud_snippet_vectors
        WHERE snippet_id = $1::uuid AND user_id = $2::uuid
    """, snippet_id, user_id)
    
    if result == "DELETE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vector not found"
        )
    
    return {
        "status": "success",
        "message": "Vector deleted successfully"
    }


@router.get("/vectors/stats")
async def get_vector_stats(
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    获取向量统计信息
    
    需要认证
    """
    user_id = current_user["user_id"]
    
    stats = await conn.fetchrow("""
        SELECT 
            COUNT(*) as total_vectors,
            COUNT(DISTINCT snippet_id) as unique_snippets
        FROM cloud_snippet_vectors
        WHERE user_id = $1::uuid
    """, user_id)
    
    return {
        "total_vectors": stats['total_vectors'],
        "unique_snippets": stats['unique_snippets']
    }
