# 服务器部署指南

## 📦 需要迁移到服务器的文件

### ✅ 必须迁移的文件

```
backend/
├── api/                        # ✅ 必须
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── embedding.py
│       └── vectors.py
│
├── services/                   # ✅ 必须
│   ├── __init__.py
│   └── embedding.py
│
├── main.py                     # ✅ 必须 - 应用入口
├── config.py                   # ✅ 必须 - 配置管理
├── requirements.txt            # ✅ 必须 - 依赖列表
├── Dockerfile                  # ✅ 推荐 - Docker 部署
├── docker-compose.yml          # ✅ 推荐 - 容器编排
└── .env                        # ✅ 必须 - 生产环境配置（需要创建）
```

### ❌ 不需要迁移的文件

```
backend/
├── tests/                      # ❌ 测试文件（本地开发用）
├── scripts/                    # ❌ 开发脚本（本地开发用）
│   ├── start_dev.sh
│   ├── start_dev.bat
│   └── test_api.py
│
├── docs/                       # ❌ 文档（可选）
├── .env.example                # ❌ 环境变量模板（本地参考用）
├── .gitignore                  # ❌ Git 配置（本地开发用）
├── README.md                   # ❌ 文档（可选）
├── QUICKSTART.md               # ❌ 文档（可选）
├── COMPLETION_REPORT.md        # ❌ 文档（可选）
└── PROJECT_STRUCTURE.md        # ❌ 文档（可选）
```

---

## 🚀 部署方案

### 方案 1：Docker 部署（推荐）⭐

**优点**：
- 环境一致性
- 易于管理
- 包含所有依赖

**需要迁移的文件**：
```
backend/
├── api/                    # 整个目录
├── services/               # 整个目录
├── main.py
├── config.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env                    # 生产环境配置
```

**部署步骤**：

1. **在服务器上创建目录**
```bash
mkdir -p /opt/snippetbox/backend
cd /opt/snippetbox/backend
```

2. **上传文件**
```bash
# 使用 scp 上传
scp -r api/ services/ main.py config.py requirements.txt Dockerfile docker-compose.yml user@server:/opt/snippetbox/backend/

# 或使用 rsync
rsync -avz --exclude='tests' --exclude='scripts' --exclude='docs' --exclude='*.md' backend/ user@server:/opt/snippetbox/backend/
```

3. **创建生产环境配置**
```bash
# 在服务器上创建 .env 文件
cat > .env << EOF
# 生产环境配置
DEBUG=False
HOST=0.0.0.0
PORT=8000

# 数据库配置
DATABASE_URL=postgresql://snippetbox:your_password@localhost:5432/snippetbox

# Redis 配置
REDIS_URL=redis://localhost:6379/0

# 模型配置
MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
MODEL_CACHE_DIR=/opt/snippetbox/models
MODEL_DEVICE=cpu

# CORS 配置（根据实际前端域名修改）
CORS_ORIGINS=["https://your-domain.com"]
EOF
```

4. **启动服务**
```bash
# 使用 Docker Compose 启动
docker-compose up -d

# 查看日志
docker-compose logs -f api
```

---

### 方案 2：直接部署（不使用 Docker）

**需要迁移的文件**：
```
backend/
├── api/                    # 整个目录
├── services/               # 整个目录
├── main.py
├── config.py
├── requirements.txt
└── .env                    # 生产环境配置
```

**部署步骤**：

1. **在服务器上安装依赖**
```bash
# 安装 Python 3.10+
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip

# 安装 PostgreSQL 和 Redis
sudo apt install postgresql postgresql-contrib redis-server

# 安装 pgvector 扩展
sudo apt install postgresql-16-pgvector
```

2. **创建项目目录**
```bash
mkdir -p /opt/snippetbox/backend
cd /opt/snippetbox/backend
```

3. **上传文件**
```bash
# 只上传必要的文件
scp -r api/ services/ main.py config.py requirements.txt user@server:/opt/snippetbox/backend/
```

4. **创建虚拟环境并安装依赖**
```bash
cd /opt/snippetbox/backend

# 创建虚拟环境
python3.10 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

5. **创建生产环境配置**
```bash
# 创建 .env 文件（同上）
```

6. **使用 systemd 管理服务**
```bash
# 创建 systemd 服务文件
sudo nano /etc/systemd/system/snippetbox-api.service
```

内容：
```ini
[Unit]
Description=SnippetBox API Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/snippetbox/backend
Environment="PATH=/opt/snippetbox/backend/venv/bin"
ExecStart=/opt/snippetbox/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable snippetbox-api
sudo systemctl start snippetbox-api
sudo systemctl status snippetbox-api
```

---

## 📋 部署检查清单

### 部署前检查

- [ ] 确认服务器已安装 Docker（方案 1）或 Python 3.10+（方案 2）
- [ ] 确认服务器已安装 PostgreSQL 和 Redis
- [ ] 确认服务器有足够的磁盘空间（至少 5GB）
- [ ] 确认服务器有足够的内存（至少 2GB）
- [ ] 准备好数据库密码和配置

### 文件迁移检查

- [ ] 上传 `api/` 目录
- [ ] 上传 `services/` 目录
- [ ] 上传 `main.py`
- [ ] 上传 `config.py`
- [ ] 上传 `requirements.txt`
- [ ] 上传 `Dockerfile`（Docker 部署）
- [ ] 上传 `docker-compose.yml`（Docker 部署）
- [ ] 创建 `.env` 生产环境配置

### 部署后检查

- [ ] 服务正常启动
- [ ] 健康检查端点可访问：`curl http://localhost:8000/health`
- [ ] API 文档可访问：`http://your-server:8000/docs`
- [ ] 模型成功加载
- [ ] 数据库连接正常
- [ ] Redis 连接正常
- [ ] 配置防火墙规则
- [ ] 配置 Nginx 反向代理（可选）
- [ ] 配置 HTTPS（可选）

---

## 🔧 生产环境配置

### 1. 创建生产环境 .env 文件

```bash
# 应用配置
DEBUG=False
HOST=0.0.0.0
PORT=8000

# CORS 配置（重要！）
CORS_ORIGINS=["https://your-frontend-domain.com"]

# 数据库配置
DATABASE_URL=postgresql://snippetbox:STRONG_PASSWORD@localhost:5432/snippetbox

# Redis 配置
REDIS_URL=redis://localhost:6379/0
REDIS_CACHE_TTL=300

# 模型配置
MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
MODEL_CACHE_DIR=/opt/snippetbox/models
MODEL_DEVICE=cpu
EMBEDDING_DIMENSION=384

# 向量搜索配置
VECTOR_SEARCH_LIMIT=10
VECTOR_SIMILARITY_THRESHOLD=0.7

# 速率限制
RATE_LIMIT_PER_MINUTE=60
```

### 2. 配置 Nginx 反向代理（推荐）

```nginx
# /etc/nginx/sites-available/snippetbox-api
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/snippetbox-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 配置 HTTPS（推荐）

```bash
# 使用 Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

---

## 📊 快速迁移命令

### 使用 rsync 一键迁移（推荐）

```bash
# 从本地迁移到服务器
rsync -avz \
  --exclude='tests/' \
  --exclude='scripts/' \
  --exclude='docs/' \
  --exclude='*.md' \
  --exclude='.env.example' \
  --exclude='.gitignore' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='venv/' \
  backend/ user@your-server:/opt/snippetbox/backend/
```

### 使用 scp 迁移

```bash
# 创建临时目录
mkdir backend-deploy
cd backend-deploy

# 复制必要文件
cp -r ../backend/api .
cp -r ../backend/services .
cp ../backend/main.py .
cp ../backend/config.py .
cp ../backend/requirements.txt .
cp ../backend/Dockerfile .
cp ../backend/docker-compose.yml .

# 上传到服务器
scp -r * user@your-server:/opt/snippetbox/backend/
```

---

## 🔍 验证部署

### 1. 检查服务状态

```bash
# Docker 部署
docker-compose ps
docker-compose logs api

# systemd 部署
sudo systemctl status snippetbox-api
sudo journalctl -u snippetbox-api -f
```

### 2. 测试 API

```bash
# 健康检查
curl http://localhost:8000/health

# 测试向量化
curl -X POST http://localhost:8000/api/v1/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "测试文本"}'

# 查看 API 文档
curl http://localhost:8000/docs
```

### 3. 检查资源使用

```bash
# 查看内存使用
free -h

# 查看磁盘使用
df -h

# 查看进程
ps aux | grep uvicorn

# Docker 资源使用
docker stats
```

---

## 🛡️ 安全建议

### 1. 环境变量安全

- ❌ 不要将 `.env` 文件提交到 Git
- ✅ 使用强密码
- ✅ 限制文件权限：`chmod 600 .env`

### 2. 网络安全

- ✅ 配置防火墙，只开放必要端口
- ✅ 使用 HTTPS
- ✅ 配置 CORS 白名单
- ✅ 实现速率限制

### 3. 数据库安全

- ✅ 使用强密码
- ✅ 限制数据库访问 IP
- ✅ 定期备份数据

---

## 📝 总结

### 最小部署文件列表

```
backend/
├── api/
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── embedding.py
│       └── vectors.py
├── services/
│   ├── __init__.py
│   └── embedding.py
├── main.py
├── config.py
├── requirements.txt
├── Dockerfile              # Docker 部署需要
├── docker-compose.yml      # Docker 部署需要
└── .env                    # 生产环境配置
```

### 推荐部署方式

1. **开发/测试环境**：使用 Docker Compose
2. **生产环境**：使用 Docker + Nginx + HTTPS

### 快速部署命令

```bash
# 1. 迁移文件
rsync -avz --exclude='tests/' --exclude='scripts/' --exclude='docs/' --exclude='*.md' backend/ user@server:/opt/snippetbox/backend/

# 2. 在服务器上创建 .env
ssh user@server "cd /opt/snippetbox/backend && cat > .env << 'EOF'
DEBUG=False
DATABASE_URL=postgresql://snippetbox:password@localhost:5432/snippetbox
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=[\"https://your-domain.com\"]
EOF"

# 3. 启动服务
ssh user@server "cd /opt/snippetbox/backend && docker-compose up -d"
```

---

**文档版本**: 1.0  
**创建日期**: 2025-01-15  
**维护者**: 王欣鹏
