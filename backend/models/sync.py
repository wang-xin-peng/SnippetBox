"""
同步相关数据模型
"""
from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel


class SnippetChange(BaseModel):
    """片段变更模型"""
    snippet_id: str
    action: Literal["create", "update", "delete"]
    data: Optional[dict] = None
    timestamp: datetime


class SyncRequest(BaseModel):
    """同步请求模型"""
    last_sync_time: Optional[datetime] = None
    changes: List[SnippetChange] = []


class Conflict(BaseModel):
    """冲突模型"""
    snippet_id: str
    local_version: dict
    cloud_version: dict
    conflict_type: Literal["update", "delete"]


class SyncResponse(BaseModel):
    """同步响应模型"""
    server_changes: List[SnippetChange]
    conflicts: List[Conflict]
    sync_time: datetime


class MetadataSyncRequest(BaseModel):
    """元数据同步请求"""
    categories: List[dict] = []
    tags: List[dict] = []
    last_sync_time: Optional[datetime] = None


class MetadataSyncResponse(BaseModel):
    """元数据同步响应"""
    categories: List[dict]
    tags: List[dict]
    sync_time: datetime
