# 开发指南

## 项目概述

SnippetBox 是一款面向开发者的轻量级代码片段管理工具，采用本地优先架构，支持智能搜索和可选的云同步功能。

**技术栈**：

- 前端：Electron + React + TypeScript
- 本地数据库：SQLite (FTS5 + sqlite-vss)
- 代码编辑器：Monaco Editor
- 后端：Python + FastAPI
- 云数据库：PostgreSQL + pgvector
- 缓存：Redis

**开发周期**：4 周（2026年1月-2月）

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 克隆项目

```bash
git clone https://github.com/wang-xin-peng/SnippetBox.git
cd SnippetBox
```

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

这个命令会：

1. 启动 Vite 开发服务器（渲染进程热重载）
2. 编译主进程 TypeScript 代码
3. 启动 Electron 应用

应用会在几秒钟内启动，你会看到主窗口界面。

### 其他常用命令

```bash
# 构建生产版本
npm run build

# 打包应用（生成安装包）
npm run package

# 运行测试
npm run test

# 运行测试（监听模式）
npm run test:watch

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
│   │   ├── App.tsx        # 应用根组件
│   │   └── main.tsx       # 渲染进程入口
│   └── shared/            # 共享类型和工具
│       └── types/         # TypeScript 类型定义
├── dist/                  # 编译输出目录
├── tests/                 # 测试文件
├── docs/                  # 项目文档
├── .vscode/              # VSCode 配置
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置（渲染进程）
├── tsconfig.main.json    # TypeScript 配置（主进程）
├── vite.config.ts        # Vite 配置
└── jest.config.js        # Jest 测试配置
```

## 开发规范

### Git 工作流

我们使用 Git Flow 工作流：

- `main` - 稳定的生产分支
- `dev` - 开发分支
- `feature/*` - 功能分支

**提交流程**：

1. 从 `dev` 创建功能分支：

   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```
2. 开发并提交代码：

   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```
3. 推送到远程并创建 Pull Request：

   ```bash
   git push origin feature/your-feature-name
   ```
4. 等待至少一人 Code Review 后合并到 `dev`

### Commit 规范

使用约定式提交（Conventional Commits）格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构代码
- `test`: 添加或修改测试
- `chore`: 构建工具或辅助工具的变动

**示例**：

```
feat(snippet): 添加片段创建功能

- 实现 Snippet Manager 的 createSnippet 方法
- 添加片段创建表单 UI
- 集成 SQLite 数据库存储

Closes #123
```

### 代码风格

- 使用 ESLint 和 Prettier 保持代码风格一致
- 运行 `npm run lint` 检查代码
- 运行 `npm run format` 格式化代码
- 提交前确保没有 lint 错误

### 测试要求

- 所有新功能必须包含单元测试
- 测试覆盖率目标：80% 以上
- 运行 `npm run test:coverage` 查看覆盖率报告
- 关键功能需要集成测试

## 团队分工

### 后端开发 - 王欣鹏

**主要职责**：

- FastAPI 后端服务开发
- 用户认证系统（JWT）
- 云端片段同步 API
- 短链接服务
- 云端语义搜索服务（嵌入模型部署）
- PostgreSQL + pgvector 向量存储
- Redis 缓存策略
- 服务器部署和运维
- 应用打包和发布
- GitHub 仓库维护
- 项目文档撰写

**工作重点**：

- 第 1 周：协助前端搭建基础架构，准备后端开发环境
- 第 2 周：开发后端 API 基础架构，部署嵌入模型
- 第 3 周：实现用户认证、云同步、短链接功能
- 第 4 周：服务器部署、性能优化、文档编写

**技术栈**：

- Python 3.10+
- FastAPI
- PostgreSQL + pgvector
- Redis
- sentence-transformers (ONNX)
- Docker

### 前端开发 - 付佳腾

**主要职责**：

- Electron 主进程和渲染进程开发
- React 用户界面实现
- SQLite 本地数据库操作
- 片段管理核心功能（CRUD）
- 分类和标签系统
- Monaco Editor 集成
- 全文搜索功能（FTS5）
- 本地语义搜索（ONNX Runtime Web）
- 模型下载器实现
- 导出功能（Markdown/PDF）
- 调用后端 API

**工作重点**：

- 第 1 周：完成 Electron + React 基础架构，实现片段 CRUD、分类标签、Monaco Editor 集成
- 第 2 周：实现本地嵌入服务、模型下载器、智能搜索引擎、导出功能
- 第 3 周：实现云同步客户端、冲突解决 UI、短链接分享界面
- 第 4 周：UI/UX 优化、性能调优、跨平台测试

**技术栈**：

- TypeScript
- Electron
- React
- SQLite + FTS5 + sqlite-vss
- Monaco Editor
- ONNX Runtime Web
- Vite

### 全栈/测试 - 赵祐晟

**主要职责**：

- 协助前后端关键模块开发
- 用户认证前后端联调
- 云同步接口开发和测试
- 短链接管理功能
- 单元测试编写
- 集成测试编写
- 端到端测试（E2E）
- 属性测试（Property-Based Testing）
- 性能测试
- 安全测试
- Bug 修复

**工作重点**：

- 第 1 周：协助前端开发，编写单元测试
- 第 2 周：协助实现搜索功能，编写搜索相关测试
- 第 3 周：负责认证和同步功能的前后端联调，编写集成测试
- 第 4 周：执行完整测试计划，修复 bug，编写测试文档

**技术栈**：

- TypeScript / Python
- Jest + React Testing Library
- Playwright (E2E)
- Hypothesis (Python) / fast-check (TypeScript) - 属性测试

## 协作机制

### 代码审查（Code Review）

- 所有 PR 必须至少一人 review 后才能合并
- Review 重点：
  - 代码逻辑正确性
  - 是否符合需求规范
  - 代码风格一致性
  - 测试覆盖率
  - 性能影响
  - 安全问题

### 沟通渠道

- **日常沟通**：微信群
- **代码讨论**：GitHub Issues 和 PR Comments
- **文档协作**：项目 `docs/` 目录
- **API 文档**：后端提供 Swagger 文档（`/docs` 端点）

## 开发里程碑

### 第 1 周：基础架构与本地核心功能

**目标**：可运行的桌面应用，本地 CRUD 可用

**详细任务分配**：请查看 [第一周任务分配文档](WEEK1_TASKS.md)

**任务**：

- ✅ 项目初始化（Electron + React + TypeScript）
- ✅ 开发环境配置（热重载、调试、测试）
- ✅ 基础 UI 框架（布局、路由、组件库）

**付佳腾负责**：
- [ ] SQLite 数据库设计和实现
- [ ] 片段管理核心功能（CRUD）
- [ ] Monaco Editor 集成

**赵祐晟负责**：
- [ ] 分类和标签系统
- [ ] 全文搜索功能（FTS5）
- [ ] 第一周测试（单元测试、集成测试、属性测试）

### 第 2 周：智能搜索和导出功能

**目标**：导出功能可用，本地语义搜索可用

**任务**：

- [ ] 欢迎向导实现
- [ ] 模型下载器（后台下载、多镜像源）
- [ ] 本地嵌入服务（ONNX Runtime）
- [ ] 向量存储（sqlite-vss）
- [ ] 智能搜索引擎（自动降级）
- [ ] 导出功能（Markdown/PDF）
- [ ] 批量操作功能
- [ ] 数据导入功能

### 第 3 周：云同步和分享功能

**目标**：登录、同步、短链接访问正常

**任务**：

- [ ] 后端 API 基础架构（FastAPI）
- [ ] 用户认证系统
- [ ] 云端片段同步
- [ ] 冲突解决机制
- [ ] 云端语义搜索（可选）
- [ ] 短链接分享功能
- [ ] 数据备份和恢复
- [ ] 设置和配置

### 第 4 周：测试、优化与交付

**目标**：安装包，部署演示服务，GitHub 仓库完善

**任务**：

- [ ] 性能优化
- [ ] 安全加固
- [ ] 用户体验优化
- [ ] 错误处理和日志
- [ ] 文档编写
- [ ] 打包和发布
- [ ] 云端服务部署
- [ ] 最终测试

## 调试技巧

### 调试主进程

1. 在 VSCode 中按 F5 启动调试
2. 选择 "Electron: Main" 配置
3. 在 `src/main/index.ts` 中设置断点

### 调试渲染进程

1. 启动应用：`npm run dev`
2. 在 Electron 窗口中按 Ctrl+Shift+I 打开开发者工具
3. 在 Sources 面板中设置断点

### 查看日志

- 主进程日志：在终端中查看
- 渲染进程日志：在开发者工具的 Console 面板中查看

## 常见问题

### Q: 应用启动失败，提示找不到模块

A: 确保已经运行 `npm install` 安装所有依赖，并且运行 `npm run build:main` 编译主进程代码。

### Q: 热重载不工作

A: 检查 Vite 开发服务器是否正常启动（默认端口 3000），确保没有其他进程占用该端口。

### Q: TypeScript 编译错误

A: 运行 `npm run lint` 查看详细错误信息，确保代码符合 TypeScript 类型要求。

### Q: 测试失败

A: 检查测试输出的错误信息，确保测试环境配置正确，必要时运行 `npm run test -- --verbose` 查看详细日志。

## 参考资源

### 官方文档

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Vite 文档](https://vitejs.dev/)
- [Monaco Editor 文档](https://microsoft.github.io/monaco-editor/)
- [SQLite 文档](https://www.sqlite.org/docs.html)
- [FastAPI 文档](https://fastapi.tiangolo.com/)

### 项目文档

- [需求规范](../.kiro/specs/snippet-box/requirements.md)
- [设计文档](../.kiro/specs/snippet-box/design.md)
- [任务列表](../.kiro/specs/snippet-box/tasks.md)

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../LICENSE) 文件。
