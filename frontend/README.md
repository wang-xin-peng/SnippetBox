# SnippetBox Frontend

SnippetBox 的前端应用，基于 Electron + React + TypeScript 构建。

## 技术栈

- **Electron 28**: 跨平台桌面应用框架
- **React 18**: UI 框架
- **TypeScript 5**: 类型安全
- **Vite 5**: 构建工具
- **Monaco Editor**: 代码编辑器
- **Better-SQLite3**: 本地数据库
- **React Router**: 路由管理

## 项目结构

```
frontend/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── database/      # 数据库层
│   │   ├── ipc/           # IPC 通信处理
│   │   ├── services/      # 业务逻辑服务
│   │   ├── index.ts       # 主进程入口
│   │   └── preload.ts     # 预加载脚本
│   ├── renderer/          # React 渲染进程
│   │   ├── components/    # React 组件
│   │   ├── App.tsx        # 应用根组件
│   │   └── index.html     # HTML 入口
│   └── shared/            # 共享类型和工具
├── tests/                 # 测试文件
│   ├── unit/             # 单元测试
│   ├── integration/      # 集成测试
│   └── property/         # 属性测试
├── dist/                  # 构建输出
├── node_modules/          # 依赖
└── package.json           # 项目配置
```

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

这会同时启动：
- Vite 开发服务器（端口 3000）
- Electron 应用（热重载）

### 构建

```bash
# 构建所有平台
npm run build

# 打包应用
npm run package

# 打包特定平台
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

### 代码质量

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 代码格式化
npm run format
```

### 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 主要功能模块

### 1. 数据库层 (`src/main/database/`)
- SQLite 数据库管理
- FTS5 全文搜索
- 数据模型定义

### 2. IPC 通信 (`src/main/ipc/`)
- 片段操作处理
- 分类管理处理
- 标签管理处理

### 3. 业务服务 (`src/main/services/`)
- SnippetManager: 片段管理
- CategoryManager: 分类管理
- TagManager: 标签管理
- SearchEngine: 搜索引擎

### 4. UI 组件 (`src/renderer/components/`)
- SnippetList: 片段列表
- SnippetEditor: 片段编辑器
- CodeEditor: 代码编辑器（Monaco）
- CategorySidebar: 分类侧边栏
- TagCloud: 标签云
- Search: 搜索组件

## 开发规范

### 代码风格
- 使用 ESLint + Prettier
- 遵循 TypeScript 严格模式
- 组件使用函数式 + Hooks

### 命名规范
- 组件：PascalCase（如 `SnippetList`）
- 文件：kebab-case（如 `snippet-list.tsx`）
- 变量/函数：camelCase（如 `getSnippets`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_SNIPPETS`）

### Git 提交规范
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

## 常见问题

### 1. better-sqlite3 编译失败

```bash
npm run rebuild
```

### 2. Electron 启动失败

检查 `dist/main` 目录是否存在，如果不存在：

```bash
npm run build:main
```

### 3. 热重载不工作

确保 Vite 开发服务器正在运行（端口 3000）

## 性能优化

- 使用 React.memo 避免不必要的重渲染
- 虚拟滚动处理大列表
- 代码分割和懒加载
- SQLite 索引优化

## 调试

### Chrome DevTools
在 Electron 应用中按 `Ctrl+Shift+I`（Windows/Linux）或 `Cmd+Option+I`（macOS）

### 主进程调试
使用 VSCode 的调试配置（`.vscode/launch.json`）

## 相关链接

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)

## 负责人

付佳腾 - 前端开发
