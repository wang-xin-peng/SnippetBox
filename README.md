# SnippetBox

一款面向开发者的轻量级代码片段管理工具。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 项目简介

SnippetBox 是一款本地优先的代码片段管理工具，帮助开发者高效管理和检索代码片段。支持智能搜索、语法高亮、多格式导出和可选的云端同步功能。

**开发团队**：第 17 组

- 王欣鹏 - 后端开发
- 付佳腾 - 前端开发
- 赵祐晟 - 全栈/测试

**开发周期**：4周

## 功能特性

- 📝 **片段管理**：创建、编辑、删除代码片段，支持分类和标签
- 🔍 **智能搜索**：统一搜索框，自动选择最佳搜索方式（全文搜索/本地语义搜索/云端搜索）
- 🎨 **语法高亮**：基于 Monaco Editor，支持 20+ 编程语言
- 📤 **多格式导出**：支持 Markdown 和 PDF 格式导出
- ☁️ **云端同步**：可选的多设备数据同步，支持冲突解决
- 🔗 **短链接分享**：快速生成分享链接
- 🌙 **主题支持**：浅色/深色主题切换
- 🔒 **隐私保护**：本地模式下代码片段不会发送到外部服务器
- 💾 **离线可用**：核心功能完全离线可用

## 技术栈

### 客户端

- **框架**：Electron + React + TypeScript
- **本地数据库**：SQLite + FTS5（全文搜索）+ sqlite-vss（向量存储）
- **代码编辑器**：Monaco Editor
- **本地 AI**：ONNX Runtime Web + all-MiniLM-L6-v2（约 80MB，可选下载）
- **构建工具**：Vite

### 服务端

- **后端框架**：Python + FastAPI
- **云数据库**：PostgreSQL + pgvector
- **缓存**：Redis
- **AI 模型**：sentence-transformers (ONNX)

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安装依赖

```bash
git clone https://github.com/your-org/SnippetBox.git
cd SnippetBox
npm install
```

### 开发模式

```bash
npm run dev
```

应用会自动启动，包括：

- Vite 开发服务器（渲染进程热重载）
- Electron 主进程
- 应用窗口

### 其他命令

```bash
# 构建生产版本
npm run build

# 打包应用（生成安装包）
npm run package

# 运行测试
npm run test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 项目结构

```
SnippetBox/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts       # 主进程入口
│   │   └── preload.ts     # 预加载脚本
│   ├── renderer/          # React 渲染进程
│   │   ├── components/    # UI 组件
│   │   ├── pages/         # 页面组件
│   │   ├── router/        # 路由配置
│   │   └── App.tsx        # 应用根组件
│   └── shared/            # 共享类型和工具
├── dist/                  # 编译输出
├── docs/                  # 项目文档
├── tests/                 # 测试文件
└── .vscode/              # VSCode 配置
```

## 开发文档

- [开发指南](docs/development.md) - 详细的开发环境搭建和团队协作指南
- [需求规范](docs/requirements.md) - 完整的功能需求和验收标准
- [设计文档](docs/design.md) - 系统架构和技术设计
- [任务列表](docs/tasks.md) - 详细的开发任务分解

## 开发进度

### 第 1 周：基础架构与本地核心功能 ✅

- [X] 项目初始化（Electron + React + TypeScript）
- [X] 开发环境配置（热重载、调试、测试）
- [X] 基础 UI 框架（布局、路由、组件库、主题系统）
- [X] SQLite 数据库设计和实现
- [X] 片段管理核心功能
- [X] 分类和标签系统
- [X] Monaco Editor 集成
- [X] 全文搜索功能

### 第 2 周：智能搜索和导出功能

- [ ] 欢迎向导和模型下载器
- [ ] 本地语义搜索（ONNX Runtime）
- [ ] 智能搜索引擎（自动降级）
- [ ] 导出功能（Markdown/PDF）

### 第 3 周：云同步和分享功能

- [ ] 后端 API 和用户认证
- [ ] 云端片段同步
- [ ] 短链接分享功能

### 第 4 周：测试、优化与交付

- [ ] 性能优化和安全加固
- [ ] 完整测试
- [ ] 打包和发布

### Commit 规范

使用约定式提交格式：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构代码
- `test`: 添加或修改测试
- `chore`: 构建工具或辅助工具的变动

## 开源协议

本项目采用 [MIT License](LICENSE)。
