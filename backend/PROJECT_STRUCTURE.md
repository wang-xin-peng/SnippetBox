# SnippetBox Backend 项目结构

## 📁 目录结构

```
backend/
├── api/                        # API 端点
│   ├── __init__.py
│   └── v1/                     # API v1 版本
│       ├── __init__.py
│       ├── embedding.py        # 嵌入 API（文本向量化）
│       └── vectors.py          # 向量存储 API
│
├── services/                   # 业务逻辑服务
│   ├── __init__.py
│   └── embedding.py            # 嵌入服务（模型加载和推理）
│
├── tests/                      # 测试文件
│   ├── __init__.py
│   └── test_embedding.py       # 嵌入服务测试
│
├── scripts/                    # 脚本工具
│   ├── start_dev.sh            # Linux/Mac 启动脚本
│   ├── start_dev.bat           # Windows 启动脚本
│   └── test_api.py             # API 测试脚本
│
├── docs/                       # 文档
│   ├── API_USAGE.md            # API 使用指南
│   └── WEEK2_SUMMARY.md        # 第二周总结
│
├── main.py                     # FastAPI 应用入口
├── config.py                   # 配置管理
├── requirements.txt            # Python 依赖
├── Dockerfile                  # Docker 镜像配置
├── docker-compose.yml          # Docker Compose 配置
├── .env.example                # 环境变量模板
├── .gitignore                  # Git 忽略文件
├── README.md                   # 项目说明
├── QUICKSTART.md               # 快速启动指南
├── COMPLETION_REPORT.md        # 任务完成报告
└── PROJECT_STRUCTURE.md        # 本文档
```

## 📄 文件说明

### 核心文件

#### `main.py`
- FastAPI 应用入口
- 配置 CORS 中间件
- 注册 API 路由
- 应用生命周期管理
- 健康检查端点

#### `config.py`
- 应用配置管理
- 使用 Pydantic Settings
- 支持环境变量配置
- 包含所有配置项（数据库、Redis、模型等）

#### `requirements.txt`
- Python 依赖列表
- 包含 FastAPI、sentence-transformers、PostgreSQL、Redis 等

### API 端点

#### `api/v1/embedding.py`
- **POST /api/v1/embed**: 单个文本向量化
- **POST /api/v1/embed/batch**: 批量文本向量化
- **GET /api/v1/embed/status**: 服务状态查询

#### `api/v1/vectors.py`
- **POST /api/v1/vectors/store**: 存储向量（占位符）
- **POST /api/v1/vectors/store/batch**: 批量存储向量（占位符）
- **POST /api/v1/vectors/search**: 向量相似度搜索（占位符）
- **DELETE /api/v1/vectors/{id}**: 删除向量（占位符）

### 服务层

#### `services/embedding.py`
- `EmbeddingService` 类
- 模型加载和管理
- 文本向量化（单个和批量）
- 资源清理

### 测试

#### `tests/test_embedding.py`
- 健康检查测试
- 单个文本向量化测试
- 批量文本向量化测试
- 空文本验证测试
- 服务状态测试

#### `scripts/test_api.py`
- API 端点集成测试
- 向量相似度计算测试
- 性能测试

### 配置文件

#### `Dockerfile`
- Python 3.10 基础镜像
- 安装系统依赖
- 安装 Python 依赖
- 配置工作目录
- 暴露 8000 端口

#### `docker-compose.yml`
- PostgreSQL 服务（pgvector）
- Redis 服务
- API 服务（可选）
- 健康检查配置
- 数据卷配置

#### `.env.example`
- 环境变量模板
- 包含所有配置项
- 需要复制为 `.env` 并修改

### 脚本

#### `scripts/start_dev.sh` (Linux/Mac)
- 创建虚拟环境
- 安装依赖
- 启动 Docker 服务
- 启动 API 服务器

#### `scripts/start_dev.bat` (Windows)
- Windows 版本的启动脚本
- 功能同上

#### `scripts/test_api.py`
- 快速测试所有 API 端点
- 性能测试
- 向量相似度测试

### 文档

#### `README.md`
- 项目概述
- 技术栈
- 快速开始
- API 端点说明
- 开发指南
- 部署说明

#### `QUICKSTART.md`
- 5 分钟快速启动指南
- 前置要求
- 启动步骤
- 测试方法
- 常见问题

#### `docs/API_USAGE.md`
- 详细的 API 使用指南
- 请求/响应示例
- 代码示例（Python、JavaScript、TypeScript）
- 错误处理
- 性能建议
- 集成示例

#### `docs/WEEK2_SUMMARY.md`
- 第二周任务总结
- 完成的功能
- 技术实现
- 性能指标
- 待完成任务

#### `COMPLETION_REPORT.md`
- 任务完成报告
- 详细的验收标准
- 文件列表
- 工作量统计
- 下周计划

## 🔧 技术栈

### 后端框架
- **FastAPI**: 现代、快速的 Web 框架
- **Uvicorn**: ASGI 服务器
- **Pydantic**: 数据验证

### 机器学习
- **sentence-transformers**: 文本嵌入模型
- **PyTorch**: 深度学习框架
- **ONNX Runtime**: 模型推理优化

### 数据库
- **PostgreSQL**: 关系型数据库
- **pgvector**: 向量存储扩展
- **SQLAlchemy**: ORM（待实现）
- **Alembic**: 数据库迁移（待实现）

### 缓存
- **Redis**: 内存缓存

### 开发工具
- **Docker**: 容器化
- **Docker Compose**: 多容器编排
- **pytest**: 测试框架
- **black**: 代码格式化
- **pylint**: 代码检查

## 📊 API 端点总览

| 端点 | 方法 | 功能 | 状态 |
|------|------|------|------|
| `/` | GET | 根路径 | ✅ |
| `/health` | GET | 健康检查 | ✅ |
| `/docs` | GET | Swagger 文档 | ✅ |
| `/redoc` | GET | ReDoc 文档 | ✅ |
| `/api/v1/embed` | POST | 单个文本向量化 | ✅ |
| `/api/v1/embed/batch` | POST | 批量文本向量化 | ✅ |
| `/api/v1/embed/status` | GET | 服务状态 | ✅ |
| `/api/v1/vectors/store` | POST | 存储向量 | ⏳ |
| `/api/v1/vectors/store/batch` | POST | 批量存储 | ⏳ |
| `/api/v1/vectors/search` | POST | 相似度搜索 | ⏳ |
| `/api/v1/vectors/{id}` | DELETE | 删除向量 | ⏳ |

## 🚀 快速开始

### 1. 启动开发环境

```bash
# Linux/Mac
./scripts/start_dev.sh

# Windows
scripts\start_dev.bat
```

### 2. 访问 API

- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

### 3. 测试 API

```bash
python scripts/test_api.py
```

## 📝 开发规范

### 代码风格
- 使用 black 格式化代码
- 使用 isort 排序导入
- 使用 pylint 检查代码质量
- 使用 mypy 进行类型检查

### 提交规范
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- test: 测试相关
- refactor: 重构代码

### 测试要求
- 所有新功能必须包含单元测试
- 测试覆盖率目标：80% 以上
- 关键功能需要集成测试

## 🔄 开发流程

1. 创建功能分支
2. 开发和测试
3. 运行代码检查
4. 提交代码
5. 创建 Pull Request
6. Code Review
7. 合并到主分支

## 📚 相关文档

- [README.md](README.md) - 项目说明
- [QUICKSTART.md](QUICKSTART.md) - 快速启动
- [API_USAGE.md](docs/API_USAGE.md) - API 使用指南
- [WEEK2_SUMMARY.md](docs/WEEK2_SUMMARY.md) - 第二周总结
- [COMPLETION_REPORT.md](COMPLETION_REPORT.md) - 任务完成报告

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

---

**文档版本**: 1.0  
**创建日期**: 2025-01-15  
**维护者**: 王欣鹏
