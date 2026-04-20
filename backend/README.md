# SnippetBox Backend API

SnippetBox 后端服务，提供用户认证、云端同步、短链接分享、文本向量化和语义搜索功能。

## 🎉 第三周更新（最新）

- ✅ 用户认证系统（注册、登录、JWT）
- ✅ 云端片段同步（增量同步、冲突检测）
- ✅ 短链接分享服务（Base62 编码、密码保护）
- ✅ 完整的 REST API（18+ 端点）
- ✅ HTML 分享页面（语法高亮、移动端适配）

📖 **快速开始**: 查看 [QUICKSTART.md](./QUICKSTART.md)  
📚 **实现文档**: 查看 [WEEK3_IMPLEMENTATION.md](./WEEK3_IMPLEMENTATION.md)  
🚀 **部署指南**: 查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 技术栈

- **FastAPI**: 现代、快速的 Web 框架
- **PostgreSQL + pgvector**: 向量数据库
- **Redis**: 缓存服务
- **JWT**: 用户认证和授权
- **bcrypt**: 密码哈希
- **Jinja2**: HTML 模板引擎
- **sentence-transformers**: 文本嵌入模型
- **ONNX Runtime**: 模型推理优化

## 功能特性

### 🔐 用户认证
- 用户注册和登录
- JWT 令牌认证
- 令牌刷新机制
- 登录失败保护（防暴力破解）
- 令牌黑名单（安全登出）

### ☁️ 云端同步
- 片段 CRUD 操作
- 增量同步（基于时间戳）
- 冲突检测和解决
- 分类和标签同步
- 软删除支持

### 🔗 短链接分享
- Base62 短码生成
- 密码保护（可选）
- 过期时间设置
- 访问统计
- 精美的分享页面

### 🔍 语义搜索
- 文本向量化
- 向量相似度搜索
- 批量处理支持

## 快速开始

### 环境要求

- Python 3.10+
- PostgreSQL 16+ (with pgvector extension)
- Redis 7+

### 安装依赖

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置数据库和 Redis 连接
```

### 使用 Docker Compose 启动服务

```bash
# 启动 PostgreSQL 和 Redis
docker-compose up -d postgres redis

# 或启动所有服务（包括 API）
docker-compose up -d
```

### 本地开发启动

```bash
# 启动开发服务器（支持热重载）
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 或使用 Python 直接运行
python main.py
```

访问 API 文档：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端点

### 健康检查

```bash
GET /health
```

### 文本向量化

#### 单个文本向量化

```bash
POST /api/v1/embed
Content-Type: application/json

{
  "text": "这是一段示例文本"
}
```

响应：
```json
{
  "vector": [0.1, 0.2, ..., 0.384],
  "dimension": 384
}
```

#### 批量文本向量化

```bash
POST /api/v1/embed/batch
Content-Type: application/json

{
  "texts": ["文本1", "文本2", "文本3"]
}
```

响应：
```json
{
  "vectors": [[0.1, ...], [0.2, ...], [0.3, ...]],
  "dimension": 384,
  "count": 3
}
```

#### 获取嵌入服务状态

```bash
GET /api/v1/embed/status
```

响应：
```json
{
  "initialized": true,
  "model_name": "sentence-transformers/all-MiniLM-L6-v2",
  "device": "cpu",
  "dimension": 384
}
```

### 向量存储（占位符）

#### 存储向量

```bash
POST /api/v1/vectors/store
Content-Type: application/json

{
  "snippet_id": "snippet-123",
  "vector": [0.1, 0.2, ..., 0.384]
}
```

#### 批量存储向量

```bash
POST /api/v1/vectors/store/batch
Content-Type: application/json

{
  "vectors": [
    {
      "snippet_id": "snippet-123",
      "vector": [0.1, ...]
    }
  ]
}
```

#### 向量相似度搜索

```bash
POST /api/v1/vectors/search
Content-Type: application/json

{
  "query_vector": [0.1, 0.2, ..., 0.384],
  "limit": 10,
  "threshold": 0.7
}
```

#### 删除向量

```bash
DELETE /api/v1/vectors/{snippet_id}
```

## 项目结构

```
backend/
├── api/                    # API 端点
│   └── v1/
│       ├── embedding.py    # 嵌入 API
│       └── vectors.py      # 向量存储 API
├── services/               # 业务逻辑
│   └── embedding.py        # 嵌入服务
├── database/               # 数据库相关（待实现）
├── models/                 # 数据模型（待实现）
├── main.py                 # 应用入口
├── config.py               # 配置管理
├── requirements.txt        # Python 依赖
├── Dockerfile              # Docker 镜像
├── docker-compose.yml      # Docker Compose 配置
└── README.md               # 本文档
```

## 开发指南

### 代码格式化

```bash
# 使用 black 格式化代码
black .

# 使用 isort 排序导入
isort .
```

### 代码检查

```bash
# 使用 pylint 检查代码
pylint **/*.py

# 使用 mypy 进行类型检查
mypy .
```

### 运行测试

```bash
# 运行所有测试
pytest

# 运行测试并生成覆盖率报告
pytest --cov=. --cov-report=html
```

## 性能优化

### 模型推理优化

1. **使用 ONNX Runtime**: 将模型转换为 ONNX 格式可以提升推理速度
2. **批量处理**: 使用批量 API 可以显著提升吞吐量
3. **GPU 加速**: 如果有 GPU，设置 `MODEL_DEVICE=cuda`

### 缓存策略

- 使用 Redis 缓存常见查询的向量结果
- 设置合理的缓存过期时间（默认 5 分钟）

## 部署

### 生产环境配置

1. 设置 `DEBUG=False`
2. 配置正确的 CORS 源
3. 使用强密码和安全的数据库连接
4. 配置 HTTPS
5. 设置合理的速率限制

### 使用 Docker 部署

```bash
# 构建镜像
docker build -t snippetbox-api .

# 运行容器
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  --name snippetbox-api \
  snippetbox-api
```

## 故障排查

### 模型加载失败

- 检查网络连接，确保可以访问 Hugging Face
- 检查磁盘空间，模型文件约 90MB
- 查看日志获取详细错误信息

### 数据库连接失败

- 确认 PostgreSQL 服务正在运行
- 检查数据库连接字符串是否正确
- 确认 pgvector 扩展已安装

### Redis 连接失败

- 确认 Redis 服务正在运行
- 检查 Redis 连接字符串是否正确

## 许可证

MIT License
