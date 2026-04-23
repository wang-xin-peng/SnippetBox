"""
邮箱验证码数据模型
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


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
    expires_in: int


class RegisterWithCodeRequest(BaseModel):
    """注册验证码请求模型"""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')
    password: str = Field(..., min_length=8, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)


class ResetPasswordRequest(BaseModel):
    """重置密码请求模型"""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')
    new_password: str = Field(..., min_length=8, max_length=100)


class DeleteAccountSendRequest(BaseModel):
    """发送注销账号验证码请求模型"""
    email: EmailStr


class DeleteAccountVerifyRequest(BaseModel):
    """验证注销账号验证码请求模型"""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')
