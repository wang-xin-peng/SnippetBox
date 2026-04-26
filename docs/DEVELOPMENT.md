# 开发指南

## 项目结构

```
SnippetBox/
├── backend/                 # FastAPI 后端服务
│   ├── api/v1/              # API 端点
│   │   ├── auth.py          # 认证 API
│   │   ├── snippets.py      # 片段 API
│   │   ├── share.py         # 分享 API
│   │   └── sync.py          # 同步 API
│   ├── services/            # 业务逻辑服务
│   │   ├── auth.py          # JWT 认证、密码哈希、令牌黑名单
│   │   ├── email.py         # 邮件发送服务
│   │   ├── email_code.py    # 邮箱验证码服务
│   │   └── shortlink.py     # 短链接生成服务
│   ├── database/            # 数据库连接
│   ├── middleware/          # 中间件
│   ├── templates/           # HTML 模板
│   └── main.py              # 后端入口
│
├── frontend/                # Electron 桌面应用
│   ├── src/
│   │   ├── main/            # Electron 主进程
│   │   │   ├── config/      # 配置文件
│   │   │   ├── database/    # SQLite 本地数据库
│   │   │   ├── ipc/         # IPC 通信处理
│   │   │   ├── services/    # 核心服务
│   │   │   ├── workers/     # Web Workers
│   │   │   ├── scripts/     # 维护脚本
│   │   │   └── index.ts     # 主进程入口
│   │   ├── renderer/        # React 渲染进程
│   │   │   ├── api/         # API 调用封装
│   │   │   ├── components/  # React 组件
│   │   │   ├── pages/       # 页面
│   │   │   ├── router/      # 路由配置
│   │   │   ├── store/       # 状态管理 (Zustand)
│   │   │   └── App.tsx      # 应用入口
│   │   └── shared/          # 共享类型定义
│   └── tests/               # 测试
│
├── docs/                    # 项目文档
└── LICENSE                  # MIT 许可证
```

## 开发规范

### Git Flow 工作流

- `main` - 稳定的生产分支
- `dev` - 开发分支
- `feature/*` - 功能分支

提交流程：

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
3. 推送到远程：
   ```bash
   git push origin feature/your-feature-name
   ```
4. 创建 Pull Request，等待 Code Review 后合并到 `dev`

### 代码风格

- 使用 ESLint 和 Prettier 保持代码风格一致
- 运行 `npm run lint` 检查代码
- 运行 `npm run format` 格式化代码
- 提交前确保没有 lint 错误

### 测试要求

- 所有新功能必须包含单元测试
- 提交前保证通过现有测试
- 当前测试类型：
  - **单元测试** (`tests/unit/`) - 测试单个函数和组件
  - **端到端测试** (`tests/e2e/`) - 测试完整用户流程
  - **安全测试** (`tests/security/`) - XSS、SQL注入、密码强度等
  - **属性测试** (`tests/property/`) - 基于属性的测试
  - **集成测试** - 暂未实现

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
- **代码讨论**：GitHub PR Comments
- **文档协作**：项目 `docs/` 目录
- **API 文档**：后端提供 Swagger 文档（`/docs` 端点）

### 项目文档

- [需求规范](./requirements.md)
- [设计文档](./design.md)

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../LICENSE) 文件。
