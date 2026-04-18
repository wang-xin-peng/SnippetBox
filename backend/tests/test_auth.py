"""
认证服务测试
"""
import pytest
from services.auth import AuthService
from models.user import UserCreate


class TestAuthService:
    """认证服务测试类"""
    
    def test_hash_password(self):
        """测试密码哈希"""
        password = "test_password_123"
        hashed = AuthService.hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert AuthService.verify_password(password, hashed)
    
    def test_verify_password_wrong(self):
        """测试错误密码验证"""
        password = "test_password_123"
        wrong_password = "wrong_password"
        hashed = AuthService.hash_password(password)
        
        assert not AuthService.verify_password(wrong_password, hashed)
    
    def test_create_access_token(self):
        """测试创建访问令牌"""
        user_id = "test-user-id"
        email = "test@example.com"
        
        token, expires_in = AuthService.create_access_token(user_id, email)
        
        assert token is not None
        assert len(token) > 0
        assert expires_in == 3600  # 1 小时
    
    def test_create_refresh_token(self):
        """测试创建刷新令牌"""
        user_id = "test-user-id"
        email = "test@example.com"
        
        token = AuthService.create_refresh_token(user_id, email)
        
        assert token is not None
        assert len(token) > 0
    
    def test_verify_token(self):
        """测试验证令牌"""
        user_id = "test-user-id"
        email = "test@example.com"
        
        token, _ = AuthService.create_access_token(user_id, email)
        payload = AuthService.verify_token(token, "access")
        
        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["email"] == email
        assert payload["type"] == "access"
    
    def test_verify_token_wrong_type(self):
        """测试验证错误类型的令牌"""
        user_id = "test-user-id"
        email = "test@example.com"
        
        token, _ = AuthService.create_access_token(user_id, email)
        payload = AuthService.verify_token(token, "refresh")
        
        assert payload is None
    
    def test_verify_invalid_token(self):
        """测试验证无效令牌"""
        payload = AuthService.verify_token("invalid_token", "access")
        assert payload is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
