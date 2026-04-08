"""
嵌入 API 端点
提供文本向量化服务
"""
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from typing import List
import logging

from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class EmbedRequest(BaseModel):
    """单个文本嵌入请求"""
    text: str = Field(..., min_length=1, max_length=10000, description="要向量化的文本")


class EmbedResponse(BaseModel):
    """单个文本嵌入响应"""
    vector: List[float] = Field(..., description="文本向量")
    dimension: int = Field(..., description="向量维度")


class BatchEmbedRequest(BaseModel):
    """批量文本嵌入请求"""
    texts: List[str] = Field(..., min_items=1, max_items=100, description="要向量化的文本列表")


class BatchEmbedResponse(BaseModel):
    """批量文本嵌入响应"""
    vectors: List[List[float]] = Field(..., description="文本向量列表")
    dimension: int = Field(..., description="向量维度")
    count: int = Field(..., description="向量数量")


@router.post("/embed", response_model=EmbedResponse, status_code=status.HTTP_200_OK)
async def embed_text(request: EmbedRequest, app_request: Request):
    """
    生成单个文本的向量
    
    - **text**: 要向量化的文本（1-10000 字符）
    
    返回 384 维的归一化向量
    """
    try:
        embedding_service = app_request.app.state.embedding_service
        
        # 生成向量
        vector = await embedding_service.embed(request.text)
        
        return EmbedResponse(
            vector=vector,
            dimension=settings.EMBEDDING_DIMENSION
        )
        
    except Exception as e:
        logger.error(f"Error in embed_text: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embedding: {str(e)}"
        )


@router.post("/embed/batch", response_model=BatchEmbedResponse, status_code=status.HTTP_200_OK)
async def batch_embed_texts(request: BatchEmbedRequest, app_request: Request):
    """
    批量生成文本向量
    
    - **texts**: 要向量化的文本列表（1-100 个文本）
    
    返回 384 维的归一化向量列表
    """
    try:
        embedding_service = app_request.app.state.embedding_service
        
        # 批量生成向量
        vectors = await embedding_service.batch_embed(request.texts)
        
        return BatchEmbedResponse(
            vectors=vectors,
            dimension=settings.EMBEDDING_DIMENSION,
            count=len(vectors)
        )
        
    except Exception as e:
        logger.error(f"Error in batch_embed_texts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embeddings: {str(e)}"
        )


@router.get("/embed/status")
async def get_embedding_status(app_request: Request):
    """
    获取嵌入服务状态
    
    返回模型是否已加载等信息
    """
    try:
        embedding_service = app_request.app.state.embedding_service
        
        return {
            "initialized": embedding_service.is_initialized(),
            "model_name": embedding_service.model_name,
            "device": embedding_service.device,
            "dimension": embedding_service.dimension
        }
        
    except Exception as e:
        logger.error(f"Error in get_embedding_status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get status: {str(e)}"
        )
