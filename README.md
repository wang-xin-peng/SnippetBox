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

- 代码片段管理
- 全文搜索
- 智能搜索
- 标签和分类管理
- 导入、导出、打印、分享
- 语法高亮（Monaco Editor）
- 本地存储（SQLite）
- 云端同步

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
- PostgreSQL
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
- [开发文档](./docs/development.md)
- [任务文档](./docs/tasks.md)
- [后端部署](./docs/deployment.md)

## 部署

### 前端

##### 启动

```
cd frontend
npm install
npm run dev
```

##### 打包

```bash
cd frontend
npm run build
npm run package:win  # Windows
npm run package:mac  # macOS
npm run package:linux  # Linux
```

### 后端部署

详见 [docs/deployment.md](./docs/deployment.md)

### 启动后：

默认情况下（未自行配置后端地址）：

- 前端 : http://localhost:3000
- 后端 API : http://localhost:8000
- 后端文档 : http://localhost:8000/docs
