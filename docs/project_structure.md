# SnippetBox 项目结构

## 项目概述

SnippetBox 是一款基于 Electron + React + TypeScript 构建的代码片段管理工具，采用本地优先架构，支持智能搜索和可选的云同步功能。

**技术栈**：

- 前端框架：React 18 + TypeScript
- 桌面框架：Electron
- 代码编辑器：Monaco Editor
- 本地数据库：SQLite + FTS5 + sqlite-vss
- 构建工具：Vite
- 测试框架：Jest + React Testing Library

## 项目根目录结构

```
SnippetBox/
├── .git/                    # Git 版本控制
├── .vscode/                 # VSCode 配置
├── dist/                    # 构建输出目录
├── docs/                    # 项目文档
├── node_modules/            # 依赖包
├── src/                     # 源代码目录
│   ├── main/               # Electron 主进程
│   ├── renderer/           # React 渲染进程
│   └── shared/             # 共享代码
├── tests/                   # 测试代码
│   ├── unit/               # 单元测试
│   ├── integration/        # 集成测试
│   └── property/           # 属性测试
├── .eslintrc.json          # ESLint 配置
├── .gitignore              # Git 忽略文件
├── .prettierrc.json        # Prettier 配置
├── jest.config.js          # Jest 测试配置
├── package.json            # 项目依赖和脚本
├── package-lock.json       # 依赖锁定文件
├── README.md               # 项目说明
├── tsconfig.json           # TypeScript 配置
└── vite.config.ts          # Vite 构建配置
```

## 核心目录详解

### 1. src/main/ - Electron 主进程

主进程负责应用生命周期管理、窗口创建、系统级操作和 IPC 通信。

```
src/main/
├── index.ts                 # 主进程入口文件
├── preload.ts              # 预加载脚本（桥接主进程和渲染进程）
├── database/               # 数据库层
│   ├── index.ts           # 数据库连接管理
│   ├── schema.ts          # 数据库表结构定义
│   ├── fts.ts             # 全文搜索配置
│   └── types.ts           # 数据库类型定义
├── ipc/                    # IPC 通信处理器
│   ├── index.ts           # IPC 路由注册
│   ├── snippetHandlers.ts # 片段相关 IPC 处理
│   ├── categoryHandlers.ts# 分类相关 IPC 处理
│   └── tagHandlers.ts     # 标签相关 IPC 处理
└── services/               # 主进程业务逻辑
    ├── SnippetManager.ts  # 片段管理服务
    ├── CategoryManager.ts # 分类管理服务
    ├── TagManager.ts      # 标签管理服务
    └── SearchEngine.ts    # 搜索引擎服务
```

**关键文件说明**：

- **index.ts**：应用入口，创建主窗口，注册 IPC 处理器
- **preload.ts**：暴露安全的 API 给渲染进程，使用 contextBridge
- **database/index.ts**：SQLite 连接管理，事务支持，数据库迁移
- **services/SnippetManager.ts**：片段 CRUD 操作的核心实现

### 2. src/renderer/ - React 渲染进程

渲染进程负责 UI 展示和用户交互。

```
src/renderer/
├── App.tsx                 # 应用根组件
├── main.tsx               # 渲染进程入口
├── index.html             # HTML 模板
├── index.css              # 全局样式
├── global.d.ts            # 全局类型声明
├── components/            # UI 组件库
│   ├── Button/           # 按钮组件
│   │   ├── index.tsx
│   │   └── Button.css
│   ├── Input/            # 输入框组件
│   ├── Modal/            # 模态框组件
│   ├── Layout/           # 布局组件
│   ├── Sidebar/          # 侧边栏组件
│   ├── CategorySidebar/  # 分类侧边栏
│   ├── CategoryTagManager/ # 分类标签管理器
│   ├── CodeEditor/       # Monaco 编辑器封装
│   ├── Search/           # 搜索相关组件
│   │   ├── SearchBox.tsx      # 搜索框
│   │   ├── SearchResults.tsx  # 搜索结果
│   │   └── SearchHistory.tsx  # 搜索历史
│   ├── SnippetList/      # 片段列表
│   │   ├── index.tsx
│   │   ├── SnippetCard.tsx    # 片段卡片
│   │   └── SnippetFilter.tsx  # 片段过滤器
│   ├── SnippetEditor/    # 片段编辑器
│   │   ├── index.tsx
│   │   └── SnippetForm.tsx    # 片段表单
│   ├── TagCloud/         # 标签云
│   └── TagInput/         # 标签输入组件
├── pages/                 # 页面组件
│   ├── HomePage/         # 主页
│   ├── EditorPage/       # 编辑器页面
│   └── SettingsPage/     # 设置页面
└── router/               # 路由配置
```

**关键文件说明**：

- **App.tsx**：应用根组件，包含路由配置和全局状态
- **main.tsx**：React 应用挂载点
- **components/**：可复用的 UI 组件，每个组件独立目录
- **pages/**：页面级组件，对应不同的路由

### 3. src/shared/ - 共享代码

主进程和渲染进程共享的类型定义和工具函数。

```
src/shared/
└── types/
    └── index.ts           # 共享类型定义
```

**关键类型**：

- `Snippet`：片段数据结构
- `Category`：分类数据结构
- `Tag`：标签数据结构
- `SearchResult`：搜索结果结构

### 4. tests/ - 测试代码

```
tests/
├── setup.ts               # 测试环境配置
├── unit/                  # 单元测试
│   ├── CategoryManager.test.ts
│   ├── CategoryTagProperty.test.ts
│   ├── SearchEngine.test.ts
│   └── TagManager.test.ts
├── integration/           # 集成测试
│   ├── CategoryTagIntegration.test.ts
│   └── SearchIntegration.test.ts
└── property/              # 属性测试
    └── SnippetProperty.test.ts
```

**测试类型说明**：

- **单元测试**：测试单个模块的功能
- **集成测试**：测试多个模块协作
- **属性测试**：使用 fast-check 进行基于属性的测试

### 5. docs/ - 项目文档

```
docs/
├── requirements.md        # 需求文档
├── design.md             # 设计文档
├── tasks.md              # 任务列表
├── week1_tasks.md        # 第一周任务
├── development.md        # 开发指南
├── commit.md             # 提交规范
├── ipc_fix.md            # IPC 修复文档
└── project_structure.md  # 本文档
```

## 数据流架构

### IPC 通信流程

```
渲染进程 (React)
    ↓ window.api.xxx()
预加载脚本 (preload.ts)
    ↓ ipcRenderer.invoke()
主进程 IPC 处理器 (ipc/)
    ↓ 调用服务层
业务逻辑层 (services/)
    ↓ 数据库操作
数据访问层 (database/)
    ↓ SQLite
本地数据库
```

### 组件层次结构

```
App (根组件)
├── Router (路由)
│   ├── HomePage (主页)
│   │   ├── Sidebar (侧边栏)
│   │   │   └── CategorySidebar (分类列表)
│   │   ├── Search (搜索区域)
│   │   │   ├── SearchBox (搜索框)
│   │   │   └── SearchResults (搜索结果)
│   │   └── SnippetList (片段列表)
│   │       └── SnippetCard (片段卡片)
│   ├── EditorPage (编辑器页面)
│   │   ├── SnippetEditor (片段编辑器)
│   │   │   ├── SnippetForm (表单)
│   │   │   ├── CodeEditor (代码编辑器)
│   │   │   └── TagInput (标签输入)
│   │   └── Button (操作按钮)
│   └── SettingsPage (设置页面)
└── Modal (全局模态框)
```

## 关键技术实现

### 1. 数据库设计

**核心表结构**：

- `snippets`：存储代码片段
- `categories`：存储分类
- `tags`：存储标签
- `snippet_tags`：片段和标签的多对多关系
- `snippets_fts`：全文搜索虚拟表（FTS5）

### 2. IPC 通信

使用 Electron 的 `contextBridge` 和 `ipcRenderer` 实现安全的进程间通信：

```typescript
// preload.ts
contextBridge.exposeInMainWorld('api', {
  snippet: {
    create: (data) => ipcRenderer.invoke('snippet:create', data),
    list: () => ipcRenderer.invoke('snippet:list'),
    // ...
  }
});

// 渲染进程使用
const snippet = await window.api.snippet.create(data);
```

### 3. 全文搜索

使用 SQLite FTS5 扩展实现高性能全文搜索：

- 自动索引片段标题和代码内容
- 支持多关键词搜索
- 按相关度排序结果

### 4. Monaco Editor 集成

使用 `@monaco-editor/react` 封装 Monaco Editor：

- 支持 20+ 编程语言语法高亮
- 代码自动缩进和格式化
- 主题与应用主题同步

## 配置文件说明

### package.json

定义项目依赖、脚本命令和 Electron 配置。

**关键脚本**：

- `dev`：启动开发服务器
- `build`：构建生产版本
- `test`：运行测试
- `lint`：代码检查
- `package`：打包应用

### tsconfig.json

TypeScript 编译配置：

- 目标：ES2020
- 模块：ESNext
- 严格模式：启用
- 路径别名：`@/` 指向 `src/`

### vite.config.ts

Vite 构建配置：

- 插件：React、Electron
- 别名配置
- 构建优化

### jest.config.js

Jest 测试配置：

- 测试环境：jsdom
- 转换器：ts-jest
- 覆盖率报告
