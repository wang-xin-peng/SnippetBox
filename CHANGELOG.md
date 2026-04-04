# 更新日志

本文档记录 SnippetBox 的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- 项目初始化，搭建 Electron + React + TypeScript 基础架构
- 配置开发环境（热重载、调试、测试框架）
- 实现基础 UI 框架
  - 主窗口布局（侧边栏 + 主内容区）
  - React Router 路由系统
  - 基础 UI 组件库（Button、Input、Modal）
  - 主题系统（浅色/深色主题）
- 创建项目文档
  - 开发指南（DEVELOPMENT.md）
  - README.md
  - LICENSE（MIT）

### 技术栈
- Electron 28.0.0
- React 18.2.0
- TypeScript 5.3.0
- Vite 5.0.0
- Monaco Editor（待集成）
- SQLite（待集成）

---

## 版本说明

### 版本号格式：主版本号.次版本号.修订号

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 变更类型

- **新增**：新功能
- **变更**：现有功能的变更
- **弃用**：即将移除的功能
- **移除**：已移除的功能
- **修复**：Bug 修复
- **安全**：安全相关的修复
