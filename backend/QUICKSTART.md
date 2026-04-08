# 快速启动指南

5 分钟快速启动 SnippetBox Backend API。

## 前置要求

- Python 3.10+
- Docker 和 Docker Compose

## 快速启动（推荐）

### 1. 克隆项目

```bash
cd backend
```

### 2. 启动服务

**Linux/Mac**:
```bash
chmod +x scripts/start_dev.sh
./scripts/start_dev.sh
```

**Windows**:
```cmd
scripts\start_dev.bat
```

脚本会自动：
- 创建虚拟环境
- 安装依赖
- 启动 PostgreSQL 和 Redis
- 启动 API 服务器

### 3. 访问 API

- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

## 手动启动

### 1. 创建虚拟环境

```bash
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件（可选）
```

### 4. 启动数据库服务

```bash
docker-compose up -d postgres redis
```

### 5. 启动 API 服务器

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 测试 API

### 使用测试脚本

```bash
python scripts/test_api.py
```

### 使用 curl

```bash
# 健康检查
curl http://localhost:8000/health

# 文本向量化
curl -X POST http://localhost:8000/api/v1/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, World!"}'

# 批量向量化
curl -X POST http://localhost:8000/api/v1/embed/batch \
  -H "Content-Type: application/json" \
  -d '{"texts": ["text1", "text2", "text3"]}'
```

### 使用 Python

```python
import requests

# 单个文本
response = requests.post(
    "http://localhost:8000/api/v1/embed",
    json={"text": "Hello, World!"}
)
print(response.json())

# 批量文本
response = requests.post(
    "http://localhost:8000/api/v1/embed/batch",
    json={"texts": ["text1", "text2", "text3"]}
)
print(response.json())
```

## 常见问题

### Q: 模型下载失败？

A: 首次启动时需要下载模型（约 90MB），请确保网络连接正常。如果下载慢，可以配置国内镜像：

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

### Q: 端口被占用？

A: 修改 `.env` 文件中的 `PORT` 配置，或停止占用 8000 端口的进程。

### Q: Docker 服务启动失败？

A: 确保 Docker 正在运行，并检查端口 5432 和 6379 是否被占用。

## 下一步

- 查看 [README.md](README.md) 了解项目详情
- 查看 [API_USAGE.md](docs/API_USAGE.md) 学习 API 使用
- 查看 [WEEK2_SUMMARY.md](docs/WEEK2_SUMMARY.md) 了解实现细节

## 停止服务

```bash
# 停止 API 服务器
Ctrl+C

# 停止 Docker 服务
docker-compose down
```

## 需要帮助？

查看完整文档或联系开发团队。
