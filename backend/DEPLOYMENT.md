# SnippetBox 后端部署指南

## 服务器环境要求

- Ubuntu 20.04+ / CentOS 7+
- Python 3.10+
- PostgreSQL 16+ (with pgvector extension)
- Redis 7+
- Docker & Docker Compose (推荐)

---

## 方式一：使用 Docker Compose 部署（推荐）

### 1. 克隆代码

```bash
cd /opt
git clone https://github.com/wang-xin-peng/SnippetBox.git
cd SnippetBox/backend
```

### 2. 配置环境变量

```bash
cp .env.example .env
nano .env
```

修改以下配置：

```bash
# 生产环境配置
DEBUG=False
HOST=0.0.0.0
PORT=8000

# 数据库配置（使用 Docker 内部网络）
DATABASE_URL=postgresql://snippetbox:snippetbox@postgres:5432/snippetbox

# Redis 配置
REDIS_URL=redis://redis:6379/0

# JWT 配置（重要：必须修改）
JWT_SECRET_KEY=$(openssl rand -hex 32)

# 短链接配置（修改为你的域名）
BASE_URL=https://api.snippetbox.com

# CORS 配置（修改为你的前端域名）
CORS_ORIGINS=["https://snippetbox.com", "https://www.snippetbox.com"]
```

### 3. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 查看服务状态
docker-compose ps
```

### 4. 验证部署

```bash
# 健康检查
curl http://localhost:8000/health

# 查看 API 文档
curl http://localhost:8000/docs
```

### 5. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name api.snippetbox.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. 配置 HTTPS（使用 Let's Encrypt）

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.snippetbox.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 方式二：手动部署

### 1. 安装依赖

```bash
# 安装 Python 3.10
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip

# 安装 PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install postgresql-16 postgresql-contrib-16

# 安装 pgvector 扩展
sudo apt install postgresql-16-pgvector

# 安装 Redis
sudo apt install redis-server
```

### 2. 配置数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE snippetbox;
CREATE USER snippetbox WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE snippetbox TO snippetbox;

# 启用 pgvector 扩展
\c snippetbox
CREATE EXTENSION vector;

# 退出
\q
```

### 3. 部署应用

```bash
# 创建应用目录
sudo mkdir -p /opt/snippetbox
cd /opt/snippetbox

# 克隆代码
git clone https://github.com/wang-xin-peng/SnippetBox.git
cd SnippetBox/backend

# 创建虚拟环境
python3.10 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
nano .env
```

### 4. 配置 Systemd 服务

创建 `/etc/systemd/system/snippetbox-api.service`:

```ini
[Unit]
Description=SnippetBox API Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/snippetbox/SnippetBox/backend
Environment="PATH=/opt/snippetbox/SnippetBox/backend/venv/bin"
ExecStart=/opt/snippetbox/SnippetBox/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start snippetbox-api

# 设置开机自启
sudo systemctl enable snippetbox-api

# 查看状态
sudo systemctl status snippetbox-api

# 查看日志
sudo journalctl -u snippetbox-api -f
```

---

## 服务器测试步骤

### 1. SSH 连接到服务器

```bash
ssh -p 22 xinpeng@8.141.108.146
```

### 2. 拉取最新代码

```bash
cd /opt/SnippetBox
git fetch origin
git checkout feature/auth-and-sync
git pull origin feature/auth-and-sync
```

### 3. 更新依赖

```bash
cd backend
source venv/bin/activate  # 如果使用虚拟环境
pip install -r requirements.txt
```

### 4. 配置环境变量

```bash
# 如果还没有 .env 文件
cp .env.example .env
nano .env

# 生成 JWT 密钥
openssl rand -hex 32
```

### 5. 启动服务

#### 使用 Docker Compose

```bash
cd backend
docker-compose down
docker-compose up -d
docker-compose logs -f api
```

#### 手动启动

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 6. 测试 API

```bash
# 在本地运行测试脚本
cd backend/scripts
python test_api_week3.py

# 或者使用 curl 测试
curl http://8.141.108.146:8000/health
curl http://8.141.108.146:8000/docs
```

---

## 监控和维护

### 查看日志

```bash
# Docker 日志
docker-compose logs -f api

# Systemd 日志
sudo journalctl -u snippetbox-api -f

# 应用日志
tail -f /opt/snippetbox/SnippetBox/backend/logs/app.log
```

### 数据库备份

```bash
# 备份数据库
pg_dump -U snippetbox -h localhost snippetbox > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U snippetbox -h localhost snippetbox < backup_20240101.sql
```

### 性能监控

```bash
# 查看 CPU 和内存使用
htop

# 查看 Docker 容器资源使用
docker stats

# 查看数据库连接数
psql -U snippetbox -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 故障排查

### API 无法启动

1. 检查端口是否被占用：`sudo lsof -i :8000`
2. 检查数据库连接：`psql -U snippetbox -h localhost`
3. 检查环境变量：`cat .env`
4. 查看详细日志：`docker-compose logs api`

### 数据库连接失败

1. 检查 PostgreSQL 服务：`sudo systemctl status postgresql`
2. 检查 pgvector 扩展：`psql -U snippetbox -c "SELECT * FROM pg_extension WHERE extname='vector';"`
3. 检查防火墙：`sudo ufw status`

### Redis 连接失败

1. 检查 Redis 服务：`sudo systemctl status redis`
2. 测试连接：`redis-cli ping`

---

## 安全建议

1. **修改默认密码**
   - 数据库密码
   - JWT 密钥
   - Redis 密码（如果启用）

2. **配置防火墙**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **定期更新**
   ```bash
   sudo apt update
   sudo apt upgrade
   ```

4. **配置 SSL/TLS**
   - 使用 Let's Encrypt 免费证书
   - 强制 HTTPS 访问

5. **限制数据库访问**
   - 只允许本地连接
   - 使用强密码
   - 定期备份

---

## 性能优化

1. **增加 Worker 数量**
   ```bash
   uvicorn main:app --workers 4
   ```

2. **启用 Redis 缓存**
   - 缓存常用查询结果
   - 缓存向量搜索结果

3. **数据库优化**
   - 添加索引
   - 定期 VACUUM
   - 调整连接池大小

4. **使用 CDN**
   - 静态资源使用 CDN
   - 短链接页面使用 CDN

---

## 联系方式

如有问题，请联系：
- 邮箱: xinpeng@example.com
- GitHub: https://github.com/wang-xin-peng/SnippetBox
