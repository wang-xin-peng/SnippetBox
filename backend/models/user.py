"""
用户数据模型
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """用户基础模型"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    """用户创建模型"""
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """用户登录模型"""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """用户响应模型"""
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """令牌响应模型"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # 秒


class TokenRefresh(BaseModel):
    """令牌刷新模型"""
    refresh_token: str


class User(UserBase):
    """完整用户模型（数据库）"""
    id: str
    password_hash: str
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    failed_login_attempts: int = 0
    last_login: Optional[datetime] = None
