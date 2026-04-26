# SnippetBox

一款面向开发者的轻量级代码片段管理工具，采用本地优先架构，支持智能搜索和可选云同步。

![Electron](https://img.shields.io/badge/Electron-28-blue)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)
![License](https://img.shields.io/badge/License-MIT-green)

## 核心特性

- **本地优先**：所有核心功能完全离线可用，数据存储在本地 SQLite 数据库
- **智能搜索**：支持全文搜索（FTS5）和本地语义搜索（ONNX Runtime），自动选择最佳搜索策略
- **代码高亮**：集成 Monaco Editor，支持 20+ 编程语言的语法高亮
- **云端同步**：可选的云同步功能，支持多设备间数据同步
- **短链接分享**：生成短链接分享代码片段，支持密码保护和访问统计
- **导出导入**：支持 Markdown 和 JSON 格式的批量导入导出

## 技术栈

### 桌面客户端

- **框架**：Electron 28 + React 18 + TypeScript
- **UI 组件**：Ant Design 6 + Monaco Editor
- **状态管理**：Zustand
- **本地数据库**：SQLite (better-sqlite3) + FTS5
- **向量搜索**：ONNX Runtime + Transformers.js
- **构建工具**：Vite + Electron Builder

### 云端服务

- **框架**：FastAPI (Python)
- **数据库**：PostgreSQL + pgvector
- **认证**：JWT + bcrypt
- **缓存**：Redis
- **部署**：Docker

## 快速开始

### 前置要求

- Node.js 18+
- Python 3.10+ (后端)
- npm 9+

### 安装依赖

```bash
# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd backend && pip install -r requirements.txt
```

### 开发模式

```bash
# 前端开发
cd frontend && npm run dev

# 后端开发
cd backend && uvicorn main:app --reload
```

### 构建

```bash
# 构建前端
cd frontend && npm run build

# 构建后端 Docker 镜像
cd backend && docker build -t snippetbox-api .
```

## 项目结构

```
SnippetBox/
├── backend/                    # FastAPI 后端服务
│   ├── api/v1/               # API 端点
│   │   ├── auth.py          # 认证 API
│   │   ├── snippets.py      # 片段 API
│   │   ├── share.py         # 分享 API
│   │   └── sync.py          # 同步 API
│   ├── services/             # 业务逻辑
│   │   ├── auth.py          # JWT 认证服务
│   │   ├── email.py         # 邮件服务
│   │   ├── email_code.py    # 验证码服务
│   │   └── shortlink.py     # 短链接服务
│   ├── templates/            # HTML 模板
│   └── main.py              # 入口文件
│
├── frontend/                  # Electron 桌面应用
│   ├── src/
│   │   ├── main/            # 主进程
│   │   │   ├── database/     # SQLite 数据库
│   │   │   ├── ipc/         # IPC 通信
│   │   │   ├── services/     # 核心服务
│   │   │   └── workers/      # Web Workers
│   │   ├── renderer/         # 渲染进程
│   │   │   ├── components/   # React 组件
│   │   │   ├── pages/        # 页面
│   │   │   └── store/        # 状态管理
│   │   └── shared/          # 共享类型
│   └── tests/                # 测试
│
├── docs/                      # 项目文档
└── LICENSE                    # MIT 许可证
```

## 功能列表

### 用户认证

| 功能     | 说明          |
| ------ | ----------- |
| 邮箱密码注册 | 支持邮箱验证码注册   |
| 邮箱密码登录 | 支持记住登录状态    |
| 验证码登录  | 无密码验证码登录    |
| 找回密码   | 通过邮箱验证码重置密码 |
| 修改用户名  | 实时更新用户名     |
| 修改密码   | 验证当前密码后修改   |
| 注销账号   | 永久删除账号及所有数据 |

### 代码片段管理

| 功能   | 说明                  |
| ---- | ------------------- |
| 创建片段 | 支持标题、代码、描述、分类、标签、语言 |
| 编辑片段 | 完整编辑功能              |
| 删除片段 | 软删除至回收站             |
| 回收站  | 恢复或永久删除             |
| 收藏夹  | 标记和筛选收藏的片段          |
| 一键复制 | 快速复制代码到剪贴板          |
| 打印导出 | 打印为 PDF 文档          |

### 分类与标签

| 功能   | 说明           |
| ---- | ------------ |
| 创建分类 | 支持自定义颜色      |
| 编辑分类 | 修改名称和颜色      |
| 删除分类 | 整理片段归属       |
| 创建标签 | 自动管理使用计数     |
| 批量操作 | 批量修改片段的分类和标签 |

### 搜索功能

| 功能   | 说明                  |
| ---- | ------------------- |
| 全文搜索 | SQLite FTS5 全文搜索    |
| 语义搜索 | ONNX Runtime 本地向量搜索 |
| 筛选   | 按语言、分类、标签筛选         |
| 排序   | 按相关度、日期、标题排序        |

### 云端同步

| 功能    | 说明      |
| ----- | ------- |
| 增量同步  | 仅同步变更部分 |
| 离线队列  | 离线时记录操作 |
| 元数据同步 | 分类和标签同步 |
| 登录合并  | 登录时提示合并本地片段到云端 |

### 分享功能

| 功能    | 说明        |
| ----- | --------- |
| 短链接分享 | Base62 短码 |
| 密码保护  | 可选密码访问    |
| 有效期设置 | 1-365 天   |
| 访问统计  | 查看次数统计    |

### 导出与导入

| 功能          | 说明                |
| ----------- | ----------------- |
| 导出 Markdown | 导出为 .md 文件（zip打包） |
| 导出 PDF      | 导出为 PDF 文档        |
| 导入 Markdown | 批量导入 .md 文件       |
| 导入 JSON     | 批量导入 JSON 备份      |

### 设置

| 功能   | 说明          |
| ---- | ----------- |
| 主题切换 | 浅色/深色       |
| 搜索设置 | 搜索模式、结果数量   |
| 模型管理 | 下载、删除 AI 模型 |
| 数据管理 | 导入/导出设置     |

## 文档

- [需求规范](./docs/requirements.md) - 详细功能需求
- [设计文档](./docs/design.md) - 架构和技术设计
- [开发指南](./docs/development.md) - 开发规范和协作流程

## 测试

```bash
# 运行所有测试
cd frontend && npm test

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件
