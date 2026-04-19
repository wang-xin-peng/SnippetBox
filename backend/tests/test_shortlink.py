"""
短链接服务测试
"""
import pytest
from services.shortlink import ShortLinkService


class TestShortLinkService:
    """短链接服务测试类"""
    
    def test_generate_short_code(self):
        """测试生成短码"""
        code = ShortLinkService.generate_short_code()
        
        assert code is not None
        assert len(code) == ShortLinkService.SHORT_CODE_LENGTH
        assert all(c in ShortLinkService.BASE62_CHARS for c in code)
    
    def test_generate_unique_codes(self):
        """测试生成多个短码的唯一性"""
        codes = set()
        for _ in range(100):
            code = ShortLinkService.generate_short_code()
            codes.add(code)
        
        # 100 个短码应该都是唯一的（概率极高）
        assert len(codes) == 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
