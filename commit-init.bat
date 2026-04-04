@echo off
REM SnippetBox 首次提交脚本 (Windows)

echo ==========================================
echo SnippetBox 项目初始化提交
echo ==========================================
echo.

REM 1. 检查当前分支
echo 📍 当前分支：
git branch --show-current
echo.

REM 2. 查看文件状态
echo 📋 文件状态：
git status --short
echo.

REM 3. 添加所有文件
echo ➕ 添加所有文件到暂存区...
git add .
echo ✅ 文件已添加
echo.

REM 4. 查看将要提交的文件
echo 📦 将要提交的文件：
git status --short
echo.

REM 5. 提交
echo 💾 提交代码...
git commit -m "chore: 项目初始化" -m "" -m "- 搭建 Electron + React + TypeScript 基础架构" -m "- 配置开发环境（Vite、ESLint、Prettier、Jest）" -m "- 配置调试环境（VSCode launch.json、tasks.json）" -m "- 实现基础 UI 框架" -m "  - 主窗口布局（侧边栏 + 主内容区）" -m "  - React Router 路由系统" -m "  - 基础 UI 组件库（Button、Input、Modal）" -m "  - 主题系统（浅色/深色主题）" -m "- 添加项目文档" -m "  - 开发指南（DEVELOPMENT.md）" -m "  - 首次提交指南（FIRST_COMMIT.md）" -m "  - 提交检查清单（COMMIT_CHECKLIST.md）" -m "  - README.md" -m "  - LICENSE（MIT）" -m "  - CHANGELOG.md" -m "- 修复主进程启动问题" -m "- 修复 ESLint 错误和警告" -m "- 完善团队分工说明" -m "" -m "技术栈：" -m "- Electron 28.0.0" -m "- React 18.2.0" -m "- TypeScript 5.3.0" -m "- Vite 5.0.0" -m "- Jest 29.7.0"

echo ✅ 提交完成
echo.

REM 6. 查看提交历史
echo 📜 提交历史：
git log --oneline -1
echo.

echo ==========================================
echo ✨ 提交成功！
echo ==========================================
echo.
echo 下一步：
echo 1. 推送到远程：git push origin feature/initialization
echo 2. 在 GitHub 上创建 Pull Request
echo 3. 请求团队成员 Code Review
echo 4. 合并到 dev 分支
echo.

pause
