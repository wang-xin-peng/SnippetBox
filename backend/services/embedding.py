"""
嵌入服务 - 文本向量化
使用 sentence-transformers 模型生成文本嵌入向量
"""
import logging
from typing import List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
import torch

from config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """嵌入服务类"""
    
    def __init__(self):
        self.model: Optional[SentenceTransformer] = None
        self.model_name = settings.MODEL_NAME
        self.device = settings.MODEL_DEVICE
        self.dimension = settings.EMBEDDING_DIMENSION
        self._is_initialized = False
        
    async def initialize(self):
        """初始化模型（懒加载）"""
        if self._is_initialized:
            logger.info("Model already initialized")
            return
            
        try:
            logger.info(f"Loading model: {self.model_name}")
            
            # 加载模型
            self.model = SentenceTransformer(
                self.model_name,
                cache_folder=settings.MODEL_CACHE_DIR,
                device=self.device
            )
            
            # 模型预热
            logger.info("Warming up model...")
            _ = self.model.encode(["test"], convert_to_numpy=True)
            
            self._is_initialized = True
            logger.info(f"Model loaded successfully on device: {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def is_initialized(self) -> bool:
        """检查模型是否已初始化"""
        return self._is_initialized
    
    async def embed(self, text: str) -> List[float]:
        """
        生成单个文本的向量
        
        Args:
            text: 输入文本
            
        Returns:
            向量列表
        """
        if not self._is_initialized:
            await self.initialize()
        
        try:
            # 生成向量
            vector = self.model.encode(
                text,
                convert_to_numpy=True,
                normalize_embeddings=True  # 归一化向量
            )
            
            return vector.tolist()
            
        except Exception as e:
            logger.error(f"Failed to embed text: {e}")
            raise
    
    async def batch_embed(self, texts: List[str]) -> List[List[float]]:
        """
        批量生成文本向量
        
        Args:
            texts: 文本列表
            
        Returns:
            向量列表的列表
        """
        if not self._is_initialized:
            await self.initialize()
        
        try:
            # 批量生成向量
            vectors = self.model.encode(
                texts,
                convert_to_numpy=True,
                normalize_embeddings=True,
                batch_size=32,  # 批处理大小
                show_progress_bar=False
            )
            
            return vectors.tolist()
            
        except Exception as e:
            logger.error(f"Failed to batch embed texts: {e}")
            raise
    
    async def cleanup(self):
        """清理资源"""
        if self.model is not None:
            logger.info("Cleaning up embedding service...")
            del self.model
            self.model = None
            self._is_initialized = False
            
            # 清理 GPU 缓存（如果使用 GPU）
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
