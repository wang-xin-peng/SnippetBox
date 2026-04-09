# 项目结构重构总结

## 重构时间
2026-04-09

## 重构原因

原有项目结构存在以下问题：
1. 前端代码直接放在根目录的 `src/`，而后端在 `backend/` 子目录
2. 结构不对称，前后端组织方式不一致
3. 根目录混杂了大量前端配置文件
4. 不利于团队协作和项目维护

## 重构前结构

```
SnippetBox/
├── backend/          # 后端 API（Python FastAPI）
├── src/              # 前端源码（Electron + React）
│   ├── main/
│   └── renderer/
├── dist/             # 前端构建输出
├── tests/            # 前端测试
├── docs/             # 文档
├── package.json      # 前端依赖
├── tsconfig.json     # 前端 TS 配置
├── vite.config.ts    # 前端构建配置
└── ...其他前端配置文件
```

## 重构后结构

```
SnippetBox/
├── frontend/         # 前端应用（Electron + React）
│   ├── src/
│   │   ├── main/     # Electron 主进程
│   │   ├── renderer/ # React 渲染进程
│   │   └── shared/   # 共享代码
│   ├── tests/        # 前端测试
│   ├── dist/         # 构建输出
│   ├── node_modules/ # 前端依赖
│   ├── package.json  # 前端依赖配置
│   ├── tsconfig.json # TypeScript 配置
│   ├── vite.config.ts # Vite 配置
│   └── README.md     # 前端文档
├── backend/          # 后端 API（Python FastAPI）
│   ├── api/          # API 路由
│   ├── services/     # 业务逻辑
│   ├── tests/        # 后端测试
│   ├── main.py       # 应用入口
│   ├── requirements.txt # Python 依赖
│   └── README.md     # 后端文档
├── docs/             # 项目文档
├── .git/             # Git 仓库
├── .gitignore        # Git 忽略配置
├── LICENSE           # 许可证
└── README.md         # 项目说明
```

## 重构优点

### 1. 结构清晰
- 前后端完全分离，目录结构对称
- 每个子项目有独立的配置和依赖
- 根目录干净，只保留项目级别的文件

### 2. 易于维护
- 前端和后端可以独立开发和部署
- 依赖管理更清晰（frontend/node_modules vs backend/venv）
- 配置文件不再混杂

### 3. 团队协作
- 前端开发者只需关注 `frontend/` 目录
- 后端开发者只需关注 `backend/` 目录
- 减少代码冲突的可能性

### 4. 可扩展性
- 未来可以轻松添加其他子项目（如 mobile/、docs-site/ 等）
- 每个子项目可以有自己的 CI/CD 配置
- 便于微服务架构演进

## 重构步骤

1. **创建 frontend 目录**
   ```bash
   mkdir frontend
   ```

2. **移动前端代码**（使用 git mv 保留历史）
   ```bash
   git mv src frontend/src
   git mv tests frontend/tests
   git mv package.json frontend/
   git mv package-lock.json frontend/
   git mv tsconfig.json frontend/
   git mv tsconfig.main.json frontend/
   git mv vite.config.ts frontend/
   git mv jest.config.js frontend/
   git mv .eslintrc.json frontend/
   git mv .prettierrc.json frontend/
   git mv .vscode frontend/.vscode
   ```

3. **移动 node_modules**
   ```bash
   mv node_modules frontend/node_modules
   ```

4. **更新配置文件**
   - 修改 `frontend/vite.config.ts` 中的 `outDir` 路径
   - 其他配置文件使用相对路径，无需修改

5. **创建文档**
   - 更新根目录 `README.md`
   - 创建 `frontend/README.md`
   - 创建本文档

6. **提交更改**
   ```bash
   git add -A
   git commit -m "refactor: 重构项目结构，将前端代码移至 frontend 目录"
   git push origin feature/backend-api-and-embedding
   ```

## 配置文件更改

### frontend/vite.config.ts
```diff
  build: {
-   outDir: '../../dist/renderer',
+   outDir: '../dist/renderer',
    emptyOutDir: true,
  },
```

其他配置文件无需修改，因为它们使用相对路径。

## 验证

### 前端构建测试
```bash
cd frontend
npm run build:main  # ✅ 成功
```

### Git 历史保留
使用 `git mv` 命令移动文件，保留了完整的 Git 历史记录。

## 迁移指南

### 对于开发者

**前端开发**：
```bash
cd frontend
npm install
npm run dev
```

**后端开发**：
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 对于 CI/CD

需要更新构建脚本中的路径：
- 前端构建：`cd frontend && npm run build`
- 后端构建：`cd backend && docker build .`

### 对于文档

所有文档链接已更新：
- 前端相关：指向 `frontend/` 目录
- 后端相关：指向 `backend/` 目录
- 共享文档：保留在 `docs/` 目录

## 注意事项

1. **首次拉取代码后**：
   ```bash
   cd frontend && npm install
   cd ../backend && pip install -r requirements.txt
   ```

2. **IDE 配置**：
   - VSCode 工作区配置已移至 `frontend/.vscode/`
   - 如需项目级配置，可在根目录创建 `.vscode/`

3. **环境变量**：
   - 前端：无需环境变量（或在 `frontend/.env` 中配置）
   - 后端：在 `backend/.env` 中配置

## 相关提交

- Commit: `d375f47` - refactor: 重构项目结构，将前端代码移至 frontend 目录
- Branch: `feature/backend-api-and-embedding`

## 团队成员

- 王欣鹏 - 后端开发
- 付佳腾 - 前端开发
- 赵祐晟 - 全栈/测试

## 反馈

如有任何问题或建议，请在团队会议中提出或创建 Issue。
