# SnippetBox Backend

代码片段管理工具后端 API，基于 FastAPI 构建。

## 技术栈

- **框架**: FastAPI + Uvicorn
- **数据库**: PostgreSQL 16 (pgvector)
- **缓存**: Redis 7
- **认证**: JWT

## 快速部署

```bash
cd backend

# 配置环境变量
cp .env.example .env

# Docker Compose 部署
bash deploy_docker.sh
```

## API 端点

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/v1/auth/*` | 登录、注册、令牌刷新 |
| 片段 | `/api/v1/snippets/*` | CRUD、同步 |
| 分享 | `/api/v1/share/*` | 短链接分享 |
| 同步 | `/api/v1/sync/*` | 云端同步 |

## 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
# 或
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 配置说明

主要环境变量（详见 `.env.example`）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | postgresql://... | PostgreSQL 连接串 |
| `REDIS_URL` | redis://localhost:6379/0 | Redis 连接串 |
| `JWT_SECRET_KEY` | - | JWT 签名密钥（必改） |
| `BASE_URL` | http://localhost:8000 | 公开访问地址 |

## Docker 服务

| 容器 | 端口 |
|------|------|
| snippetbox-api | 8000 |
| snippetbox-postgres | 5432 |
| snippetbox-redis | 6379 |
