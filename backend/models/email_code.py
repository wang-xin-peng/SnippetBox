"""
邮箱验证码数据模型
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr


class EmailCodeRequest(BaseModel):
    """邮箱验证码请求模型"""
    email: EmailStr


class EmailCodeVerify(BaseModel):
    """邮箱验证码验证模型"""
    email: EmailStr
    code: str


class EmailCodeResponse(BaseModel):
    """邮箱验证码响应模型"""
    message: str
    expires_in: int  # 秒
