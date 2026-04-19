"""
分享相关数据模型
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ShareCreate(BaseModel):
    """创建分享模型"""
    snippet_id: str
    expires_in_days: int = Field(default=7, ge=1, le=365)
    password: Optional[str] = Field(None, min_length=4, max_length=50)


class ShareResponse(BaseModel):
    """分享响应模型"""
    short_code: str
    short_url: str
    expires_at: datetime


class ShareInfo(BaseModel):
    """分享信息模型"""
    short_code: str
    snippet_id: str
    user_id: str
    expires_at: datetime
    view_count: int
    created_at: datetime
    has_password: bool


class ShareAccess(BaseModel):
    """访问分享模型"""
    password: Optional[str] = None


class ShareDetail(BaseModel):
    """分享详情模型"""
    snippet: dict
    created_at: datetime
    view_count: int


class ShareStats(BaseModel):
    """分享统计模型"""
    short_code: str
    view_count: int
    created_at: datetime
    expires_at: datetime
    last_accessed: Optional[datetime] = None
