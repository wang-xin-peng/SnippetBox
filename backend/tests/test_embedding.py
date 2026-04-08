"""
嵌入服务测试
"""
import pytest
from httpx import AsyncClient
from main import app


@pytest.mark.asyncio
async def test_health_check():
    """测试健康检查端点"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_embed_text():
    """测试单个文本向量化"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/embed",
            json={"text": "这是一个测试文本"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "vector" in data
        assert "dimension" in data
        assert data["dimension"] == 384
        assert len(data["vector"]) == 384


@pytest.mark.asyncio
async def test_batch_embed_texts():
    """测试批量文本向量化"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/embed/batch",
            json={"texts": ["文本1", "文本2", "文本3"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "vectors" in data
        assert "dimension" in data
        assert "count" in data
        assert data["dimension"] == 384
        assert data["count"] == 3
        assert len(data["vectors"]) == 3
        assert all(len(v) == 384 for v in data["vectors"])


@pytest.mark.asyncio
async def test_embed_empty_text():
    """测试空文本"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/embed",
            json={"text": ""}
        )
        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_embed_status():
    """测试嵌入服务状态"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/embed/status")
        assert response.status_code == 200
        data = response.json()
        assert "initialized" in data
        assert "model_name" in data
        assert "device" in data
        assert "dimension" in data
