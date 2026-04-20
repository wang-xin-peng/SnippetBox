# SnippetBox 后端快速启动指南

## 本地开发环境

### 前置要求

- Python 3.10+
- Docker & Docker Compose
- Git

### 快速启动（5 分钟）

```bash
# 1. 克隆代码
git clone https://github.com/wang-xin-peng/SnippetBox.git
cd SnippetBox/backend

# 2. 启动数据库和 Redis
docker-compose up -d postgres redis

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量
cp .env.example .env

# 5. 启动应用
uvicorn main:app --reload

# 6. 访问 API 文档
# 浏览器打开: http://localhost:8000/docs
```

### 测试 API

```bash
# 运行测试脚本
cd scripts
python test_api_week3.py
```

---

## 服务器部署（王欣鹏）

### SSH 连接

```bash
ssh -p 22 xinpeng@8.141.108.146
```

### 部署步骤

```bash
# 1. 进入项目目录
cd /opt/SnippetBox

# 2. 拉取最新代码
git fetch origin
git checkout feature/auth-and-sync
git pull origin feature/auth-and-sync

# 3. 进入后端目录
cd backend

# 4. 配置环境变量（首次部署）
cp .env.example .env
nano .env

# 生成 JWT 密钥
openssl rand -hex 32

# 5. 启动服务（Docker 方式）
docker-compose down
docker-compose up -d

# 6. 查看日志
docker-compose logs -f api

# 7. 测试 API
curl http://localhost:8000/health
```

### 查看服务状态

```bash
# 查看容器状态
docker-compose ps

# 查看 API 日志
docker-compose logs -f api

# 查看数据库日志
docker-compose logs -f postgres

# 查看 Redis 日志
docker-compose logs -f redis
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启 API 服务
docker-compose restart api

# 重新构建并启动
docker-compose up -d --build
```

---

## API 端点速查

### 认证相关

```bash
# 注册
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"test123456"}'

# 登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# 获取当前用户信息
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 片段管理

```bash
# 创建片段
curl -X POST http://localhost:8000/api/v1/snippets \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试片段","language":"python","code":"print(\"Hello\")"}'

# 获取片段列表
curl -X GET http://localhost:8000/api/v1/snippets \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 获取单个片段
curl -X GET http://localhost:8000/api/v1/snippets/SNIPPET_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 同步相关

```bash
# 同步片段
curl -X POST http://localhost:8000/api/v1/sync \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"last_sync_time":null,"changes":[]}'

# 获取分类
curl -X GET http://localhost:8000/api/v1/categories \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 获取标签
curl -X GET http://localhost:8000/api/v1/tags \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 分享相关

```bash
# 创建分享
curl -X POST http://localhost:8000/api/v1/share \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"snippet_id":"SNIPPET_ID","expires_in_days":7}'

# 获取分享列表
curl -X GET http://localhost:8000/api/v1/shares \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 访问短链接（浏览器）
# http://localhost:8000/s/SHORT_CODE
```

---

## 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
sudo lsof -i :8000

# 杀死进程
kill -9 PID
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 容器
docker-compose ps postgres

# 重启 PostgreSQL
docker-compose restart postgres

# 查看日志
docker-compose logs postgres
```

### 3. Redis 连接失败

```bash
# 检查 Redis 容器
docker-compose ps redis

# 重启 Redis
docker-compose restart redis

# 测试连接
docker-compose exec redis redis-cli ping
```

### 4. 模型下载失败

```bash
# 设置 Hugging Face 镜像
export HF_ENDPOINT=https://hf-mirror.com

# 或在 .env 文件中设置
HF_ENDPOINT=https://hf-mirror.com
```

---

## 开发工具

### API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 数据库管理

```bash
# 连接到 PostgreSQL
docker-compose exec postgres psql -U snippetbox

# 查看所有表
\dt

# 查看表结构
\d users

# 退出
\q
```

### Redis 管理

```bash
# 连接到 Redis
docker-compose exec redis redis-cli

# 查看所有键
KEYS *

# 查看键值
GET key_name

# 退出
exit
```

---

## 性能监控

### 查看资源使用

```bash
# 查看容器资源使用
docker stats

# 查看系统资源
htop
```

### 查看日志

```bash
# 实时查看 API 日志
docker-compose logs -f api

# 查看最近 100 行日志
docker-compose logs --tail=100 api

# 查看所有服务日志
docker-compose logs -f
```

---

## 下一步

1. 阅读 [WEEK3_IMPLEMENTATION.md](./WEEK3_IMPLEMENTATION.md) 了解实现细节
2. 阅读 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解部署详情
3. 运行 `python scripts/test_api_week3.py` 测试所有功能
4. 访问 http://localhost:8000/docs 查看完整 API 文档

---

## 联系方式

- GitHub: https://github.com/wang-xin-peng/SnippetBox
- 问题反馈: https://github.com/wang-xin-peng/SnippetBox/issues
