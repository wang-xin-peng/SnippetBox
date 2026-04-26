# SnippetBox Backend

SnippetBox 后端 API 服务，基于 FastAPI 构建，提供代码片段管理、用户认证、云端同步和分享功能。

## 功能特性

- **用户认证**：邮箱注册/登录、邮箱验证码、JWT 令牌、刷新令牌
- **片段管理**：创建、读取、更新、删除代码片段
- **云端同步**：增量同步机制，支持多设备数据一致性
- **分享功能**：短链接分享、密码保护、过期时间设置
- **分类标签**：支持分类和标签管理

## 技术栈

- **框架**：FastAPI + Uvicorn
- **数据库**：PostgreSQL + asyncpg
- **缓存**：Redis
- **认证**：JWT (PyJWT) + bcrypt

## 项目结构

```
backend/
├── api/v1/              # API 端点
│   ├── auth.py          # 认证 API
│   ├── share.py         # 分享 API
│   ├── snippets.py      # 片段 API
│   └── sync.py          # 同步 API
├── database/            # 数据库相关
│   └── connection.py    # 数据库连接和初始化
├── middleware/          # 中间件
│   └── auth.py          # 认证中间件
├── models/              # 数据模型（Pydantic）
├── services/            # 业务逻辑
│   ├── auth.py          # 认证服务
│   ├── email.py         # 邮件服务
│   ├── email_code.py    # 邮箱验证码服务
│   └── shortlink.py     # 短链接服务
├── templates/           # HTML 模板（分享页面）
├── tests/               # 测试文件
├── main.py              # 应用入口
├── config.py            # 配置管理
├── Dockerfile           # Docker 镜像构建
├── docker-compose.yml    # Docker Compose 配置
└── requirements*.txt    # Python 依赖
```

## 快速开始

### 环境要求

- Python 3.10+
- PostgreSQL 14+
- Redis 6+

### 本地开发

1. 安装依赖：

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate   # Windows

pip install -r requirements.txt
```

2. 配置环境变量：

```bash
cp .env.example .env
# 编辑 .env 文件，修改必要的配置
```

3. 启动服务：

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

4. 访问 API 文档：

打开浏览器访问 http://localhost:8000/docs

### Docker 部署

1. 构建并启动服务：

```bash
docker compose up -d
```

2. 查看容器状态：

```bash
docker compose ps
```

3. 查看日志：

```bash
docker compose logs -f api
```

## 配置说明

主要配置项（通过 `.env` 文件或环境变量设置）：

| 配置项             | 说明                         | 默认值                                                       |
| ------------------ | ---------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`   | PostgreSQL 连接字符串        | postgresql://snippetbox:snippetbox@localhost:5432/snippetbox |
| `REDIS_URL`      | Redis 连接字符串             | redis://localhost:6379/0                                     |
| `JWT_SECRET_KEY` | JWT 密钥（生产环境必须修改） | -                                                            |
| `CORS_ORIGINS`   | 允许的 CORS 源               | ["*"]                                                        |
| `BASE_URL`       | 服务基础 URL                 | http://localhost:8000                                        |
| `SMTP_*`         | 邮件服务配置                 | -                                                            |

## API 端点

### 认证

| 方法 | 端点                             | 说明             |
| ---- | -------------------------------- | ---------------- |
| POST | `/api/v1/auth/register`        | 用户注册         |
| POST | `/api/v1/auth/login`           | 用户登录         |
| POST | `/api/v1/auth/refresh`         | 刷新令牌         |
| GET  | `/api/v1/auth/me`              | 获取当前用户信息 |
| POST | `/api/v1/auth/send-code`       | 发送邮箱验证码   |
| POST | `/api/v1/auth/login-with-code` | 邮箱验证码登录   |

### 片段

| 方法   | 端点                      | 说明         |
| ------ | ------------------------- | ------------ |
| POST   | `/api/v1/snippets`      | 创建片段     |
| GET    | `/api/v1/snippets`      | 获取片段列表 |
| GET    | `/api/v1/snippets/{id}` | 获取单个片段 |
| PUT    | `/api/v1/snippets/{id}` | 更新片段     |
| DELETE | `/api/v1/snippets/{id}` | 删除片段     |

### 同步

| 方法 | 端点                      | 说明                     |
| ---- | ------------------------- | ------------------------ |
| POST | `/api/v1/sync`          | 增量同步片段             |
| POST | `/api/v1/sync/metadata` | 同步元数据（分类、标签） |

### 分享

| 方法   | 端点                                 | 说明               |
| ------ | ------------------------------------ | ------------------ |
| POST   | `/api/v1/share`                    | 创建分享           |
| GET    | `/api/v1/share/{short_code}`       | 访问分享页面       |
| GET    | `/api/v1/share/{short_code}/info`  | 获取分享信息       |
| GET    | `/api/v1/shares`                   | 获取用户的分享列表 |
| GET    | `/api/v1/share/{short_code}/stats` | 获取分享统计       |
| DELETE | `/api/v1/share/{short_code}`       | 删除分享           |

## 许可证

MIT License
