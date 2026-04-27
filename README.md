# SnippetBox

一个轻量级的代码片段管理工具，专为开发者设计。

## 项目结构

```
SnippetBox/
├── frontend/         # 前端应用（Electron + React + TypeScript）
│   ├── src/
│   │   ├── main/     # Electron 主进程
│   │   ├── renderer/ # React 渲染进程
│   │   └── shared/   # 共享代码
│   ├── tests/        # 前端测试
│   ├── dist/         # 构建输出
│   └── package.json  # 前端依赖
├── backend/          # 后端 API（Python FastAPI）
│   ├── api/          # API 路由
│   ├── services/     # 业务逻辑
│   ├── tests/        # 后端测试
│   ├── main.py       # 应用入口
│   └── requirements.txt  # Python 依赖
├── docs/             # 项目文档
└── README.md         # 项目说明
```

## 快速开始

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

### 后端开发

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## 功能特性

- 📝 代码片段管理（创建、编辑、删除）
- 🔍 全文搜索（FTS5）
- 🏷️ 标签和分类管理
- 🎨 语法高亮（Monaco Editor）
- 🔐 本地存储（SQLite）
- 🤖 语义搜索（AI 向量化）
- 🌐 云端同步（可选）

## 技术栈

### 前端

- Electron 28
- React 18
- TypeScript 5
- Vite 5
- Monaco Editor
- Better-SQLite3

### 后端

- Python 3.10+
- FastAPI
- sentence-transformers
- PostgreSQL + pgvector
- Redis

## 开发团队

- 王欣鹏 - 全栈开发
- 付佳腾 - 前端开发
- 赵祐晟 - 前端/测试

## 许可证

MIT License

## 文档

详细文档请查看 [docs/](./docs/) 目录：

- [需求文档](./docs/requirements.md)
- [设计文档](./docs/design.md)
- [开发指南](./docs/development.md)
- [API 文档](./docs/API_USAGE.md)

## 部署

### 前端打包

```bash
cd frontend
npm run build
npm run package:win  # Windows
npm run package:mac  # macOS
npm run package:linux  # Linux
```

### 后端部署

详见 [backend/DEPLOYMENT\_GUIDE.md](./backend/DEPLOYMENT_GUIDE.md)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub: <https://github.com/wang-xin-peng/SnippetBox>
- 服务器 API: <http://8.141.108.146:8000>

