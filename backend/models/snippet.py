"""
片段数据模型
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class SnippetBase(BaseModel):
    """片段基础模型"""
    title: str = Field(..., min_length=1, max_length=200)
    language: str = Field(..., max_length=50)
    code: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []


class SnippetCreate(SnippetBase):
    """片段创建模型"""
    pass


class SnippetUpdate(BaseModel):
    """片段更新模型"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    language: Optional[str] = Field(None, max_length=50)
    code: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class SnippetResponse(SnippetBase):
    """片段响应模型"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Snippet(SnippetBase):
    """完整片段模型（数据库）"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
