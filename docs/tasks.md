# SnippetBox 功能清单

## 功能列表

### 用户认证

- [x] 邮箱密码注册
- [x] 邮箱密码登录
- [x] 记住登录状态
- [x] 验证码登录（无密码）
- [x] 找回密码（邮箱验证码）
- [x] 修改用户名
- [x] 修改密码
- [x] 注销账号
- [x] JWT 令牌认证
- [x] 令牌刷新机制

### 代码片段管理

- [x] 创建片段（标题、代码、描述、分类、标签、语言）
- [x] 编辑片段
- [x] 删除片段（软删除）
- [x] 回收站（恢复/永久删除）
- [x] 收藏夹
- [x] 一键复制代码
- [x] 打印为 PDF
- [x] 批量删除
- [x] 批量修改标签
- [x] Ctrl+S保存片段修改
- [x] 批量修改分类

### 分类与标签

- [x] 创建分类（自定义颜色）
- [x] 编辑分类
- [x] 删除分类
- [x] 创建标签
- [x] 标签自动完成
- [x] 标签使用统计

### 搜索功能

- [x] SQLite FTS5 全文搜索
- [x] ONNX Runtime 本地语义搜索
- [x] 搜索历史
- [x] 按语言筛选
- [x] 按分类筛选
- [x] 按标签筛选
- [x] 排序（相关度/日期/标题）

### 云端同步

- [x] 增量同步
- [x] 冲突检测
- [x] 冲突解决（本地/云端/最新）
- [x] 离线操作队列
- [x] 元数据同步（分类/标签）
- [x] 同步状态指示器
- [x] 登录合并（检测本地片段并提示上传）

### 分享功能

- [x] 短链接生成（Base62）
- [x] 密码保护
- [x] 有效期设置（1-365 天）
- [x] 访问统计
- [x] 公开访问页面（语法高亮）

### 导出与导入

- [x] 导出 Markdown
- [x] 导出 PDF
- [x] 导入 Markdown
- [x] 导入 JSON

### 设置

- [x] 主题切换（浅色/深色）
- [x] 搜索设置（关键词/智能）
- [x] 模型管理（下载/删除）
- [x] 数据管理（导入/导出设置）

### 欢迎向导

- [x] 首次启动检测
- [x] 模型下载选择
- [x] 多镜像源支持
- [x] 后台下载
- [x] 下载进度显示

### 编辑器

- [x] Monaco Editor 集成
- [x] 20+ 语言语法高亮
- [x] 代码自动缩进
- [x] 行号显示
- [x] 代码折叠

***

## 后端 API

### 认证 API (/api/v1/auth)

| 端点                         | 方法     | 说明        |
| -------------------------- | ------ | --------- |
| `/auth/register`           | POST   | 用户注册      |
| `/auth/login`              | POST   | 用户登录      |
| `/auth/refresh`            | POST   | 刷新令牌      |
| `/auth/logout`             | POST   | 登出        |
| `/auth/send-code`          | POST   | 发送验证码     |
| `/auth/login-with-code`    | POST   | 验证码登录     |
| `/auth/send-register-code` | POST   | 发送注册验证码   |
| `/auth/send-reset-code`    | POST   | 发送重置密码验证码 |
| `/auth/reset-password`     | POST   | 重置密码      |
| `/auth/username`           | PUT    | 修改用户名     |
| `/auth/password`           | PUT    | 修改密码      |
| `/auth/account`            | DELETE | 注销账号      |
| `/auth/me`                 | GET    | 获取当前用户    |

### 片段 API (/api/v1/snippets)

| 端点               | 方法     | 说明     |
| ---------------- | ------ | ------ |
| `/snippets`      | POST   | 创建片段   |
| `/snippets`      | GET    | 获取片段列表 |
| `/snippets/{id}` | GET    | 获取单个片段 |
| `/snippets/{id}` | PUT    | 更新片段   |
| `/snippets/{id}` | DELETE | 删除片段   |

### 分享 API (/api/v1/share)

| 端点                          | 方法   | 说明        |
| --------------------------- | ---- | --------- |
| `/share`                    | POST | 创建短链接     |
| `/share`                    | GET  | 获取用户的分享列表 |
| `/share/{short_code}`       | GET  | 访问短链接     |
| `/share/{short_code}/stats` | GET  | 获取访问统计    |

### 同步 API (/api/v1/sync)

| 端点               | 方法   | 说明    |
| ---------------- | ---- | ----- |
| `/sync`          | POST | 增量同步  |
| `/sync/metadata` | POST | 同步元数据 |

***

## 本地数据库表

### SQLite (前端)

| 表名                   | 说明      |
| -------------------- | ------- |
| `snippets`           | 代码片段    |
| `categories`         | 分类      |
| `tags`               | 标签      |
| `snippet_tags`       | 片段-标签关联 |
| `settings`           | 设置      |
| `sync_queue`         | 同步队列    |
| `offline_operations` | 离线操作    |

### PostgreSQL (后端)

| 表名                  | 说明   |
| ------------------- | ---- |
| `users`             | 用户   |
| `cloud_snippets`    | 云端片段 |
| `shares`            | 分享记录 |
| `share_access_logs` | 访问日志 |

