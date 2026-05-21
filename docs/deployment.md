# SnippetBox 后端部署指南

## 环境要求

| 组件 | 版本要求 |
|------|----------|
| Docker | 24+ |
| Docker Compose | 2.20+ |

## 部署步骤

### 1. 配置文件

复制 `.env.example` 为 `.env`：

```bash
cd backend
cp .env.example .env
```

编辑 `.env`，修改以下关键配置：

```env
JWT_SECRET_KEY=your-secret-key-change-this-in-production
DEBUG=False
BASE_URL=http://your_server_ip:8000
```

### 2. 使用部署脚本

项目提供了 `deploy_docker.sh` 脚本，一键部署：

```bash
cd backend
bash deploy_docker.sh
```

脚本会自动完成：
- 停止旧进程
- 构建 Docker 镜像
- 启动 PostgreSQL、Redis、API 服务
- 检查服务状态

### 3. 验证部署

```bash
curl http://localhost:8000/health
```

## 常用命令

| 操作 | 命令 |
|------|------|
| 查看容器 | `docker ps` |
| 查看日志 | `docker logs -f snippetbox-api` |
| 停止服务 | `docker-compose stop api` |
| 启动服务 | `docker-compose start api` |
| 重启服务 | `docker-compose restart api` |
| 进入容器 | `docker exec -it snippetbox-api bash` |

## 服务地址

| 服务 | 端口 |
|------|------|
| API | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## 默认配置

docker-compose.yml 中的默认数据库配置：

```yaml
POSTGRES_USER: snippetbox
POSTGRES_PASSWORD: snippetbox
POSTGRES_DB: snippetbox
```

## 容器与数据卷

部署后会启动三个容器：

| 容器 | 镜像 | 端口 | 数据卷挂载 |
|------|------|------|-----------|
| `snippetbox-postgres` | pgvector/pgvector:pg16 | 5432 | `postgres_data:/var/lib/postgresql/data` |
| `snippetbox-redis` | redis:7-alpine | 6379 | `redis_data:/data` |
| `snippetbox-api` | 本地构建 | 8000 | `.:/app` + `models_cache:/app/.cache/models` |

**数据卷说明：**

| 数据卷 | 用途 |
|--------|------|
| `postgres_data` | PostgreSQL 数据持久化 |
| `redis_data` | Redis 数据持久化 |
| `models_cache` | AI 模型缓存持久化 |
| `.:/app` | API 容器挂载主机代码目录（开发模式热重载用） |

**注意：** 删除容器不会丢失数据，数据存储在 Docker 数据卷中。如需完全清理，需执行 `docker-compose down -v`。
