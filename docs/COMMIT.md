# 提交指南

本文档指导如何进行项目的提交。

## 提交前准备

### 1. 确认项目状态

```bash
# 查看当前分支
git branch

# 查看文件状态
git status

# 查看未暂存的改动
git diff
```

### 2. 运行检查

```bash
# 代码检查
npm run lint

# 代码格式化
npm run format

# 构建测试
npm run build

# 运行测试
npm run test

# 启动应用测试
npm run dev
```

## 提交内容清单

确保以下文件都已包含在首次提交中：

### 核心文件

- [X] `package.json` - 项目配置
- [X] `tsconfig.json` - TypeScript 配置（渲染进程）
- [X] `tsconfig.main.json` - TypeScript 配置（主进程）
- [X] `vite.config.ts` - Vite 配置
- [X] `jest.config.js` - Jest 配置
- [X] `.eslintrc.json` - ESLint 配置
- [X] `.prettierrc.json` - Prettier 配置
- [X] `.gitignore` - Git 忽略文件

### 源代码

- [X] `src/main/index.ts` - 主进程入口
- [X] `src/main/preload.ts` - 预加载脚本
- [X] `src/renderer/main.tsx` - 渲染进程入口
- [X] `src/renderer/App.tsx` - 应用根组件
- [X] `src/renderer/router/index.tsx` - 路由配置
- [X] `src/renderer/components/` - UI 组件
- [X] `src/renderer/pages/` - 页面组件
- [X] `src/shared/types/index.ts` - 共享类型

### 样式文件

- [X] `src/renderer/index.css` - 全局样式和主题
- [X] `src/renderer/components/**/*.css` - 组件样式

### 文档

- [X] `README.md` - 项目说明
- [X] `LICENSE` - 开源协议
- [X] `CHANGELOG.md` - 更新日志
- [X] `docs/DEVELOPMENT.md` - 开发指南
- [X] `docs/COMMIT_CHECKLIST.md` - 提交检查清单
- [X] `docs/FIRST_COMMIT.md` - 首次提交指南

### 测试文件

- [X] `tests/setup.ts` - 测试环境配置

### VSCode 配置

- [X] `.vscode/launch.json` - 调试配置
- [X] `.vscode/tasks.json` - 任务配置
- [X] `.vscode/extensions.json` - 推荐扩展

## 不应该提交的文件

确保以下文件/目录没有被提交：

- [ ] `node_modules/` - 依赖包
- [ ] `dist/` - 构建输出
- [ ] `release/` - 打包输出
- [ ] `.env` - 环境变量
- [ ] `*.log` - 日志文件
- [ ] `.DS_Store` - macOS 系统文件
- [ ] `Thumbs.db` - Windows 系统文件

## 验证提交

### 1. 查看提交历史

```bash
git log --oneline
```

### 2. 查看远程分支

```bash
git branch -a
```

### 3. 在 GitHub 上验证

访问你的 GitHub 仓库，确认：

- 文件已正确上传
- README.md 正确显示
- 分支结构正确

## 后续开发流程

首次提交完成后，团队成员可以：

### 1. 克隆仓库

```bash
https://github.com/wang-xin-peng/SnippetBox.git
cd SnippetBox
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发

```bash
npm run dev
```

### 4. 创建功能分支

```bash
# 从 dev 分支创建功能分支
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

### 5. 开发并提交

```bash
# 开发完成后
git add .
git commit -m "feat(scope): description"
git push origin feature/your-feature-name
```

### 6. 创建 Pull Request

在 GitHub 上创建 PR，请求合并到 dev 分支。
