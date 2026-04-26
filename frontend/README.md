# SnippetBox Frontend

SnippetBox 桌面应用前端，基于 Electron + React + TypeScript 构建。

## 功能

- **代码片段管理**：创建、编辑、删除代码片段
- **分类与标签**：灵活的分类和标签系统
- **本地搜索**：支持全文搜索和向量语义搜索
- **云端同步**：多设备间数据同步
- **分享功能**：生成短链接分享代码片段
- **多语言支持**：支持 Python、JavaScript、TypeScript 等多种编程语言
- **离线优先**：本地优先，保证离线可用

## 技术栈

- **框架**：Electron 28 + React 18 + TypeScript
- **UI 组件**：Ant Design 6 + Monaco Editor
- **状态管理**：Zustand
- **本地数据库**：SQLite (better-sqlite3)
- **向量搜索**：ONNX Runtime + Transformers.js
- **构建工具**：Vite + Electron Builder
- **测试**：Jest

## 结构

```
frontend/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── config/          # 配置文件
│   │   ├── database/        # SQLite 数据库
│   │   ├── ipc/            # IPC 通信处理
│   │   ├── services/        # 核心服务
│   │   ├── workers/         # Web Workers
│   │   ├── database/        # 数据库 Schema
│   │   └── index.ts         # 主进程入口
│   ├── renderer/            # React 渲染进程
│   │   ├── api/             # API 调用
│   │   ├── components/      # React 组件
│   │   ├── pages/           # 页面
│   │   ├── router/           # 路由配置
│   │   ├── store/            # 状态管理
│   │   └── App.tsx           # 应用入口
│   └── shared/              # 共享类型定义
├── tests/                   # 单元测试
├── package.json
├── vite.config.ts
├── tsconfig.json
└── electron-builder.yml
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
# 构建所有代码
npm run build

# 仅构建渲染进程
npm run build:renderer

# 仅构建主进程
npm run build:main
```

### 打包

```bash
# 打包为可执行文件
npm run package

# 仅打包 Windows 版本
npm run package:win

# 仅打包 macOS 版本
npm run package:mac

# 仅打包 Linux 版本
npm run package:linux
```

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式（文件变化时重新测试）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 本地模型下载

应用支持本地向量模型以实现语义搜索：

```bash
# 重新生成向量索引
npm run regenerate-vectors
```

## 开发指南

### 代码规范

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 代码格式化
npm run format
```

### 数据库维护

主进程数据库位于用户数据目录，可以使用以下脚本更新分类：

```bash
npm run update-categories
```

## 许可证

MIT License
