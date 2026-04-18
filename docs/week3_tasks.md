# 第三周任务分配

## 📅 时间：第 3 周（7 天）

## 🎯 本周目标

完成云同步和分享功能，实现用户认证、片段云端同步、冲突解决、短链接分享，以及第二周未完成的导出、批量操作和导入功能。

---

## 👨‍💻 王欣鹏（后端开发）- 第三周任务

### 主要负责：用户认证系统 + 云端片段同步 API + 短链接服务 + 云端向量存储

### 任务 20：用户认证系统 ⭐⭐⭐

**优先级**：P0（核心功能，其他云端功能的基础）

#### 20.1 实现用户注册

**文件位置**：`backend/api/v1/auth.py`

**需要创建的文件**：
- `backend/models/user.py` - 用户模型
- `backend/services/auth.py` - 认证服务
- `backend/api/v1/auth.py` - 认证 API

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter()

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: str

class RegisterResponse(BaseModel):
    user_id: str
    email: str
    username: str

@router.post("/register", response_model=RegisterResponse)
async def register(request: RegisterRequest):
    # 实现用户注册
    pass
```

**验收标准**：
- [ ] 创建用户模型（users 表）
- [ ] 实现邮箱格式验证
- [ ] 实现密码强度验证（至少 8 位）
- [ ] 实现密码哈希（bcrypt）
- [ ] 实现邮箱唯一性检查
- [ ] 编写单元测试

---

#### 20.2 实现用户登录

**文件位置**：`backend/api/v1/auth.py`

```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    # 实现用户登录
    pass
```

**验收标准**：
- [ ] 实现密码验证
- [ ] 实现 JWT 令牌生成（access_token + refresh_token）
- [ ] 配置令牌过期时间（access: 1小时，refresh: 7天）
- [ ] 实现登录失败记录（防暴力破解）
- [ ] 编写单元测试

---

#### 20.3 实现令牌刷新和登出

**文件位置**：`backend/api/v1/auth.py`

```python
@router.post("/refresh")
async def refresh_token(refresh_token: str):
    # 刷新访问令牌
    pass

@router.post("/logout")
async def logout(token: str):
    # 登出（令牌加入黑名单）
    pass
```

**验收标准**：
- [ ] 实现令牌刷新机制
- [ ] 实现令牌黑名单（Redis）
- [ ] 实现登出功能
- [ ] 实现令牌验证中间件
- [ ] 编写单元测试

---

#### 20.4 实现认证中间件

**文件位置**：`backend/middleware/auth.py`

```python
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials):
    # 验证 JWT 令牌
    pass

def require_auth(func):
    # 认证装饰器
    pass
```

**验收标准**：
- [ ] 实现 JWT 验证中间件
- [ ] 实现权限检查
- [ ] 实现速率限制（每分钟 60 次请求）
- [ ] 实现认证失败处理
- [ ] 编写单元测试

---

### 任务 21：云端片段同步 API ⭐⭐⭐

**优先级**：P0（核心功能）

#### 21.1 实现云端片段 CRUD API

**文件位置**：`backend/api/v1/snippets.py`

**需要创建的文件**：
- `backend/models/snippet.py` - 片段模型
- `backend/services/snippet.py` - 片段服务
- `backend/api/v1/snippets.py` - 片段 API

```python
from fastapi import APIRouter, Depends
from typing import List

router = APIRouter()

@router.post("/snippets")
async def create_snippet(snippet: SnippetCreate, user_id: str = Depends(get_current_user)):
    # 创建片段
    pass

@router.get("/snippets")
async def list_snippets(user_id: str = Depends(get_current_user)) -> List[Snippet]:
    # 获取用户的所有片段
    pass

@router.get("/snippets/{snippet_id}")
async def get_snippet(snippet_id: str, user_id: str = Depends(get_current_user)):
    # 获取单个片段
    pass

@router.put("/snippets/{snippet_id}")
async def update_snippet(snippet_id: str, snippet: SnippetUpdate, user_id: str = Depends(get_current_user)):
    # 更新片段
    pass

@router.delete("/snippets/{snippet_id}")
async def delete_snippet(snippet_id: str, user_id: str = Depends(get_current_user)):
    # 软删除片段
    pass
```

**验收标准**：
- [ ] 创建 cloud_snippets 表（包含 user_id, deleted_at 字段）
- [ ] 实现创建片段 API
- [ ] 实现获取片段列表 API（支持分页）
- [ ] 实现更新片段 API
- [ ] 实现软删除片段 API
- [ ] 实现权限检查（用户只能操作自己的片段）
- [ ] 编写单元测试

---

#### 21.2 实现增量同步 API

**文件位置**：`backend/api/v1/sync.py`

```python
from datetime import datetime

class SyncRequest(BaseModel):
    last_sync_time: datetime
    changes: List[SnippetChange]

class SyncResponse(BaseModel):
    server_changes: List[SnippetChange]
    conflicts: List[Conflict]
    sync_time: datetime

@router.post("/sync")
async def sync_snippets(request: SyncRequest, user_id: str = Depends(get_current_user)):
    # 增量同步
    pass
```

**验收标准**：
- [ ] 实现基于时间戳的增量同步
- [ ] 实现冲突检测（同一片段在客户端和服务器都被修改）
- [ ] 实现同步响应（返回服务器变更和冲突）
- [ ] 实现同步日志记录
- [ ] 编写单元测试

---

#### 21.3 实现分类和标签同步 API

**文件位置**：`backend/api/v1/sync.py`

```python
@router.get("/categories")
async def list_categories(user_id: str = Depends(get_current_user)):
    # 获取用户的分类
    pass

@router.get("/tags")
async def list_tags(user_id: str = Depends(get_current_user)):
    # 获取用户的标签
    pass

@router.post("/sync/metadata")
async def sync_metadata(request: MetadataSyncRequest, user_id: str = Depends(get_current_user)):
    # 同步分类和标签
    pass
```

**验收标准**：
- [ ] 创建 cloud_categories 和 cloud_tags 表
- [ ] 实现分类同步 API
- [ ] 实现标签同步 API
- [ ] 实现元数据增量同步
- [ ] 编写单元测试

---

### 任务 22：短链接分享服务 ⭐⭐

**优先级**：P0

#### 22.1 实现短链接生成

**文件位置**：`backend/api/v1/share.py`

**需要创建的文件**：
- `backend/models/share.py` - 分享模型
- `backend/services/shortlink.py` - 短链接服务
- `backend/api/v1/share.py` - 分享 API

```python
from fastapi import APIRouter
import base62

router = APIRouter()

class ShareRequest(BaseModel):
    snippet_id: str
    expires_in_days: int = 7  # 默认 7 天过期
    password: Optional[str] = None

class ShareResponse(BaseModel):
    short_code: str
    short_url: str
    expires_at: datetime

@router.post("/share", response_model=ShareResponse)
async def create_share(request: ShareRequest, user_id: str = Depends(get_current_user)):
    # 生成短链接
    pass
```

**验收标准**：
- [ ] 创建 shared_snippets 表（short_code, snippet_id, user_id, expires_at, password_hash, view_count）
- [ ] 实现短码生成算法（Base62，6 位字符）
- [ ] 实现碰撞检测和重试
- [ ] 实现过期时间设置
- [ ] 实现密码保护（可选）
- [ ] 编写单元测试

---

#### 22.2 实现短链接访问

**文件位置**：`backend/api/v1/share.py`

```python
@router.get("/s/{short_code}")
async def access_share(short_code: str, password: Optional[str] = None):
    # 访问短链接
    pass

@router.get("/share/{short_code}/info")
async def get_share_info(short_code: str):
    # 获取分享信息（不包含片段内容）
    pass
```

**验收标准**：
- [ ] 实现短链接解析
- [ ] 实现过期检查
- [ ] 实现密码验证
- [ ] 实现访问统计（view_count + 1）
- [ ] 实现访问日志记录
- [ ] 编写单元测试

---

#### 22.3 实现短链接管理 API

**文件位置**：`backend/api/v1/share.py`

```python
@router.get("/shares")
async def list_shares(user_id: str = Depends(get_current_user)):
    # 获取用户的所有分享
    pass

@router.delete("/share/{short_code}")
async def delete_share(short_code: str, user_id: str = Depends(get_current_user)):
    # 删除分享
    pass

@router.get("/share/{short_code}/stats")
async def get_share_stats(short_code: str, user_id: str = Depends(get_current_user)):
    # 获取分享统计
    pass
```

**验收标准**：
- [ ] 实现分享列表查询
- [ ] 实现分享删除
- [ ] 实现分享统计（访问次数、最后访问时间）
- [ ] 实现权限检查
- [ ] 编写单元测试

---

#### 22.4 实现短链接访问页面

**文件位置**：`backend/templates/share.html`

**验收标准**：
- [ ] 创建公开访问页面（GET /s/{shortCode}）
- [ ] 显示片段内容和语法高亮（使用 Prism.js 或 highlight.js）
- [ ] 实现复制代码按钮
- [ ] 显示 SnippetBox 品牌和下载链接
- [ ] 实现移动端适配
- [ ] 实现密码输入界面（如果需要）
- [ ] 实现过期提示页面

---

### 任务 23：云端向量存储 ⭐⭐

**优先级**：P0

**文件位置**：`backend/services/vector_sync.py`

**验收标准**：
- [ ] 创建 cloud_snippet_vectors 表
- [ ] 实现向量同步 API
- [ ] 实现云端语义搜索 API
- [ ] 优化向量检索性能
- [ ] 编写单元测试

---

### 📊 王欣鹏任务总结

**任务优先级**：
1. 任务 20（用户认证系统）- Day 1-2
2. 任务 21（云端片段同步 API）- Day 3-5
3. 任务 22（短链接分享服务）- Day 6
4. 任务 23（云端向量存储）- Day 7

**建议开发顺序**：
- Day 1-2：任务 20（用户认证系统）
- Day 3-4：任务 21.1-21.2（片段 CRUD 和增量同步）
- Day 5：任务 21.3（分类标签同步）
- Day 6：任务 22（短链接分享服务）
- Day 7：任务 23（云端向量存储）

---

## 👨‍💻 付佳腾（前端开发）- 第三周任务

### 主要负责：客户端认证 + 云同步客户端 + 短链接分享 UI + 批量操作功能

### 任务 24：批量操作功能（第二周未完成）⭐⭐

**优先级**：P0

#### 24.1 实现批量选择

**文件位置**：`src/renderer/components/SnippetList/BatchSelection.tsx`

**验收标准**：
- [ ] 实现片段多选（Checkbox）
- [ ] 实现全选/取消全选
- [ ] 实现选择计数显示
- [ ] 实现批量操作工具栏
- [ ] 实现 Shift 键连续选择

---

#### 24.2 实现批量操作后端

**文件位置**：`src/main/ipc/batchHandlers.ts`

```typescript
// IPC 处理器
ipcMain.handle('batch:delete', async (event, snippetIds: string[]) => {
  // 批量删除
})

ipcMain.handle('batch:update-tags', async (event, snippetIds: string[], tags: string[]) => {
  // 批量修改标签
})

ipcMain.handle('batch:update-category', async (event, snippetIds: string[], categoryId: string) => {
  // 批量修改分类
})

ipcMain.handle('batch:export', async (event, snippetIds: string[], format: string) => {
  // 批量导出
})
```

**验收标准**：
- [ ] 实现批量删除
- [ ] 实现批量修改标签
- [ ] 实现批量修改分类
- [ ] 实现批量导出
- [ ] 实现事务处理（全部成功或全部回滚）
- [ ] 返回操作结果（成功/失败数量）
- [ ] 编写单元测试

---

#### 24.3 实现批量操作 UI

**文件位置**：`src/renderer/components/SnippetList/BatchOperations.tsx`

**验收标准**：
- [ ] 创建批量操作工具栏
- [ ] 实现批量删除按钮（带确认对话框）
- [ ] 实现批量修改标签对话框
- [ ] 实现批量修改分类对话框
- [ ] 显示批量操作进度
- [ ] 显示操作结果（成功/失败数量）
- [ ] 显示失败项详情

---

### 任务 25：客户端认证实现 ⭐⭐⭐

**优先级**：P0（核心功能）

**依赖**：需要等待王欣鹏完成任务 20（用户认证系统）

#### 25.1 实现登录/注册 UI

**文件位置**：`src/renderer/components/Auth/`

**需要创建的组件**：
- `LoginDialog.tsx` - 登录对话框
- `RegisterDialog.tsx` - 注册对话框
- `AuthForm.tsx` - 认证表单组件

**验收标准**：
- [ ] 创建登录对话框
- [ ] 创建注册对话框
- [ ] 实现表单验证（邮箱格式、密码强度）
- [ ] 实现错误提示
- [ ] 实现"记住我"选项
- [ ] 实现"忘记密码"链接（占位符）

---

#### 25.2 实现客户端认证服务

**文件位置**：`src/main/services/AuthService.ts`

```typescript
class AuthService {
  // 注册
  register(email: string, password: string, username: string): Promise<void>
  
  // 登录
  login(email: string, password: string): Promise<LoginResult>
  
  // 登出
  logout(): Promise<void>
  
  // 刷新令牌
  refreshToken(): Promise<string>
  
  // 获取当前用户
  getCurrentUser(): Promise<User | null>
  
  // 检查是否已登录
  isLoggedIn(): boolean
}

interface LoginResult {
  accessToken: string
  refreshToken: string
  user: User
}
```

**验收标准**：
- [ ] 实现注册功能（调用后端 API）
- [ ] 实现登录功能（调用后端 API）
- [ ] 实现令牌存储（使用 safeStorage 加密）
- [ ] 实现自动令牌刷新（access_token 过期前 5 分钟）
- [ ] 实现登出功能（清除令牌）
- [ ] 通过 IPC 暴露给渲染进程
- [ ] 编写单元测试

---

#### 25.3 实现认证状态管理

**文件位置**：`src/renderer/store/authStore.ts`

```typescript
interface AuthState {
  isLoggedIn: boolean
  user: User | null
  loading: boolean
  error: string | null
}

const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  user: null,
  loading: false,
  error: null,
  
  login: async (email: string, password: string) => {
    // 登录逻辑
  },
  
  logout: async () => {
    // 登出逻辑
  },
  
  checkAuth: async () => {
    // 检查认证状态
  }
}))
```

**验收标准**：
- [ ] 创建认证状态管理（Zustand 或 Context）
- [ ] 实现登录状态持久化
- [ ] 实现自动登录（启动时检查令牌）
- [ ] 实现登录状态变化通知
- [ ] 实现用户信息缓存

---

#### 25.4 实现认证 UI 集成

**文件位置**：`src/renderer/components/Header/UserMenu.tsx`

**验收标准**：
- [ ] 在顶部栏显示用户菜单
- [ ] 显示用户头像和用户名
- [ ] 实现登录/注册按钮（未登录时）
- [ ] 实现用户菜单（已登录时）
- [ ] 实现登出按钮
- [ ] 实现账户设置入口

---

### 任务 26：云同步客户端实现 ⭐⭐⭐

**优先级**：P0（核心功能）

**依赖**：需要等待王欣鹏完成任务 21（云端片段同步 API）

#### 26.1 实现同步服务

**文件位置**：`src/main/services/SyncService.ts`

```typescript
class SyncService {
  // 推送本地变更到云端
  pushChanges(): Promise<PushResult>
  
  // 从云端拉取变更
  pullChanges(): Promise<PullResult>
  
  // 完整同步（推送 + 拉取）
  sync(): Promise<SyncResult>
  
  // 获取同步状态
  getSyncStatus(): SyncStatus
  
  // 启用自动同步
  enableAutoSync(intervalMinutes: number): void
  
  // 禁用自动同步
  disableAutoSync(): void
}

interface SyncResult {
  pushed: number
  pulled: number
  conflicts: Conflict[]
  errors: SyncError[]
}
```

**验收标准**：
- [ ] 实现推送变更（pushChanges）
- [ ] 实现拉取变更（pullChanges）
- [ ] 实现完整同步（sync）
- [ ] 实现同步队列管理
- [ ] 实现同步状态跟踪
- [ ] 实现自动同步（可配置间隔）
- [ ] 通过 IPC 暴露给渲染进程
- [ ] 编写单元测试

---

#### 26.2 实现冲突检测和解决

**文件位置**：`src/main/services/ConflictResolver.ts`

```typescript
class ConflictResolver {
  // 检测冲突
  detectConflicts(localSnippets: Snippet[], cloudSnippets: Snippet[]): Conflict[]
  
  // 解决冲突
  resolveConflict(conflict: Conflict, resolution: ConflictResolution): Promise<void>
  
  // 自动解决冲突（使用策略）
  autoResolve(conflicts: Conflict[], strategy: 'local' | 'cloud' | 'latest'): Promise<void>
}

interface Conflict {
  snippetId: string
  localVersion: Snippet
  cloudVersion: Snippet
  type: 'update' | 'delete'
}

type ConflictResolution = 'use-local' | 'use-cloud' | 'merge' | 'skip'
```

**验收标准**：
- [ ] 实现更新冲突检测（同一片段在本地和云端都被修改）
- [ ] 实现删除冲突检测（本地删除但云端修改，或反之）
- [ ] 实现冲突解决策略（使用本地/云端/最新）
- [ ] 实现手动冲突解决
- [ ] 记录冲突解决历史
- [ ] 编写单元测试

---

#### 26.3 实现离线支持

**文件位置**：`src/main/services/OfflineQueue.ts`

```typescript
class OfflineQueue {
  // 添加离线操作到队列
  enqueue(operation: OfflineOperation): Promise<void>
  
  // 处理离线队列（网络恢复后）
  processQueue(): Promise<void>
  
  // 获取队列状态
  getQueueStatus(): QueueStatus
}

interface OfflineOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  snippetId: string
  data: any
  timestamp: number
}
```

**验收标准**：
- [ ] 实现网络状态检测
- [ ] 实现离线操作队列
- [ ] 实现队列持久化（SQLite）
- [ ] 实现网络恢复自动同步
- [ ] 实现队列失败重试
- [ ] 显示离线状态指示器
- [ ] 编写单元测试

---

#### 26.4 实现同步 UI

**文件位置**：`src/renderer/components/Sync/`

**需要创建的组件**：
- `SyncIndicator.tsx` - 同步状态指示器
- `SyncProgress.tsx` - 同步进度对话框
- `ConflictResolver.tsx` - 冲突解决对话框
- `SyncSettings.tsx` - 同步设置

**验收标准**：
- [ ] 创建同步状态指示器（顶部栏）
- [ ] 显示同步进度（推送/拉取数量）
- [ ] 实现手动同步按钮
- [ ] 实现冲突解决 UI（显示本地和云端版本对比）
- [ ] 实现同步设置（自动同步间隔、冲突策略）
- [ ] 显示同步历史和日志

---

### 任务 27：短链接分享 UI ⭐⭐

**优先级**：P0

**依赖**：需要等待王欣鹏完成任务 22（短链接分享服务）

#### 27.1 实现分享对话框

**文件位置**：`src/renderer/components/Share/ShareDialog.tsx`

```typescript
interface ShareDialogProps {
  snippet: Snippet
  onClose: () => void
}

const ShareDialog: React.FC<ShareDialogProps> = ({ snippet, onClose }) => {
  // 分享对话框实现
}
```

**验收标准**：
- [ ] 创建分享对话框
- [ ] 实现短链接生成请求
- [ ] 显示生成的短链接
- [ ] 实现链接复制到剪贴板
- [ ] 实现分享选项（有效期选择：1天/7天/30天/永久）
- [ ] 实现密码保护选项（可选）
- [ ] 显示生成进度和错误

---

#### 27.2 实现分享管理

**文件位置**：`src/renderer/components/Share/ShareManager.tsx`

**验收标准**：
- [ ] 创建分享管理页面
- [ ] 显示用户的所有分享列表
- [ ] 显示分享统计（访问次数、创建时间、过期时间）
- [ ] 实现删除分享按钮
- [ ] 实现复制链接按钮
- [ ] 实现分享详情查看

---

#### 27.3 实现分享按钮集成

**文件位置**：`src/renderer/components/SnippetDetail/ShareButton.tsx`

**验收标准**：
- [ ] 在片段详情页添加分享按钮
- [ ] 在片段列表添加分享快捷按钮
- [ ] 实现分享成功通知
- [ ] 实现分享失败提示
- [ ] 实现未登录提示（需要登录才能分享）

---

### 📊 付佳腾任务总结

**任务优先级**：
1. 任务 24（批量操作功能）- Day 1
2. 任务 25（客户端认证）- Day 2-3
3. 任务 26（云同步客户端）- Day 4-6
4. 任务 27（短链接分享 UI）- Day 7

**建议开发顺序**：
- Day 1：任务 24（批量操作功能）
- Day 2-3：任务 25（客户端认证）
- Day 4-5：任务 26.1-26.3（同步服务和冲突解决）
- Day 6：任务 26.4（同步 UI）
- Day 7：任务 27（短链接分享 UI）

---

## 👨‍💻 赵祐晟（全栈/测试）- 第三周任务

### 主要负责：导出导入功能 + 数据备份恢复 + 设置系统 + 前后端联调 + 测试

### 任务 28：导出功能实现（第二周未完成）⭐⭐

**优先级**：P0

#### 28.1 实现 Markdown 导出

**文件位置**：`src/main/services/ExportService.ts`

```typescript
class ExportService {
  // 导出单个片段为 Markdown
  exportToMarkdown(snippetId: string, filePath: string): Promise<void>
  
  // 批量导出片段为 Markdown
  batchExportToMarkdown(snippetIds: string[], filePath: string): Promise<void>
}
```

**Markdown 模板示例**：
```markdown
# {title}

**语言**: {language}
**分类**: {category}
**标签**: {tags}
**创建时间**: {created_at}
**更新时间**: {updated_at}

## 描述

{description}

## 代码

\`\`\`{language}
{code}
\`\`\`
```

**验收标准**：
- [ ] 创建 Markdown 模板
- [ ] 实现单个片段导出
- [ ] 实现批量片段导出（合并到一个文件）
- [ ] 包含元数据（分类、标签、创建时间）
- [ ] 通过 IPC 暴露给渲染进程
- [ ] 编写单元测试

---

#### 28.2 实现 PDF 导出

**文件位置**：`src/main/services/ExportService.ts`

**依赖安装**：
```bash
npm install puppeteer
# 或
npm install electron-pdf
```

**验收标准**：
- [ ] 集成 Puppeteer 或 electron-pdf
- [ ] 将 Markdown 转换为 HTML
- [ ] 实现 HTML 到 PDF 转换
- [ ] 保留语法高亮样式
- [ ] 实现页面布局和分页
- [ ] 编写单元测试

---

#### 28.3 实现导出 UI

**文件位置**：`src/renderer/components/Export/`

**需要创建的组件**：
- `ExportDialog.tsx` - 导出对话框
- `FormatSelector.tsx` - 格式选择器
- `ExportProgress.tsx` - 导出进度
- `ExportPreview.tsx` - 导出预览

**验收标准**：
- [ ] 创建导出对话框
- [ ] 实现格式选择（Markdown/PDF）
- [ ] 实现文件保存位置选择
- [ ] 显示导出进度和结果
- [ ] 实现导出成功通知
- [ ] 实现导出预览功能

---

### 任务 29：数据导入功能（第二周未完成）⭐⭐

**优先级**：P0

#### 29.1 实现 Markdown 导入

**文件位置**：`src/main/services/ImportService.ts`

```typescript
class ImportService {
  // 导入 Markdown 文件
  importFromMarkdown(filePath: string): Promise<ImportResult>
  
  // 导入 JSON 文件
  importFromJSON(filePath: string): Promise<ImportResult>
}

interface ImportResult {
  imported: number
  skipped: number
  errors: Array<{file: string, error: string}>
}
```

**验收标准**：
- [ ] 解析 Markdown 文件
- [ ] 提取代码块和元数据
- [ ] 自动检测编程语言（从代码块标记）
- [ ] 创建片段记录
- [ ] 处理解析错误
- [ ] 编写单元测试

---

#### 29.2 实现 JSON 导入

**文件位置**：`src/main/services/ImportService.ts`

**JSON 格式示例**：
```json
{
  "version": "1.0",
  "snippets": [
    {
      "title": "片段标题",
      "language": "javascript",
      "code": "console.log('Hello');",
      "description": "描述",
      "category": "分类名",
      "tags": ["标签1", "标签2"]
    }
  ]
}
```

**验收标准**：
- [ ] 验证 JSON 格式
- [ ] 解析片段数据
- [ ] 批量导入片段
- [ ] 处理格式错误
- [ ] 编写单元测试

---

#### 29.3 实现重复检测

**文件位置**：`src/main/services/ImportService.ts`

**验收标准**：
- [ ] 检测重复片段（标题 + 代码哈希）
- [ ] 提示用户选择（覆盖/保留/跳过）
- [ ] 实现智能合并（保留更新的版本）
- [ ] 记录导入日志

---

#### 29.4 实现导入 UI

**文件位置**：`src/renderer/components/Import/`

**需要创建的组件**：
- `ImportDialog.tsx` - 导入对话框
- `ImportProgress.tsx` - 导入进度
- `ImportResult.tsx` - 导入结果摘要
- `DuplicateResolver.tsx` - 重复处理对话框

**验收标准**：
- [ ] 创建导入对话框
- [ ] 支持文件拖放
- [ ] 支持文件选择（Markdown/JSON）
- [ ] 显示导入进度
- [ ] 显示导入结果摘要
- [ ] 实现重复处理 UI

---

### 任务 30：数据备份和恢复 ⭐⭐

**优先级**：P0

#### 30.1 实现本地备份

**文件位置**：`src/main/services/BackupService.ts`

```typescript
class BackupService {
  // 创建备份
  createBackup(backupPath?: string): Promise<BackupResult>
  
  // 自动备份
  enableAutoBackup(intervalDays: number): void
  
  // 获取备份列表
  listBackups(): Promise<Backup[]>
  
  // 删除备份
  deleteBackup(backupId: string): Promise<void>
  
  // 清理旧备份
  cleanOldBackups(keepDays: number): Promise<number>
}

interface BackupResult {
  backupId: string
  filePath: string
  size: number
  timestamp: number
}
```

**验收标准**：
- [ ] 实现手动备份功能（导出 SQLite 数据库）
- [ ] 实现自动备份（每天凌晨 2 点）
- [ ] 实现备份文件压缩（ZIP）
- [ ] 实现备份文件命名（snippetbox-backup-YYYYMMDD-HHMMSS.zip）
- [ ] 实现备份清理（保留最近 7 天）
- [ ] 通过 IPC 暴露给渲染进程
- [ ] 编写单元测试

---

#### 30.2 实现数据恢复

**文件位置**：`src/main/services/RestoreService.ts`

```typescript
class RestoreService {
  // 验证备份文件
  validateBackup(backupPath: string): Promise<BackupValidation>
  
  // 恢复数据
  restoreFromBackup(backupPath: string, mode: 'overwrite' | 'merge'): Promise<RestoreResult>
  
  // 预览备份内容
  previewBackup(backupPath: string): Promise<BackupPreview>
}

interface RestoreResult {
  restored: number
  skipped: number
  errors: RestoreError[]
}
```

**验收标准**：
- [ ] 实现备份文件验证（格式、完整性）
- [ ] 实现恢复选项（覆盖/合并）
- [ ] 实现恢复进度跟踪
- [ ] 实现恢复错误处理
- [ ] 实现恢复前自动备份当前数据
- [ ] 编写单元测试

---

#### 30.3 实现备份 UI

**文件位置**：`src/renderer/components/Backup/`

**需要创建的组件**：
- `BackupManager.tsx` - 备份管理页面
- `BackupList.tsx` - 备份列表
- `RestoreDialog.tsx` - 恢复对话框

**验收标准**：
- [ ] 创建备份管理页面
- [ ] 显示备份列表（文件名、大小、创建时间）
- [ ] 实现创建备份按钮
- [ ] 实现恢复按钮
- [ ] 实现删除备份按钮
- [ ] 显示备份/恢复进度
- [ ] 实现自动备份设置

---

### 任务 31：设置和配置系统 ⭐⭐

**优先级**：P0

#### 31.1 实现设置系统

**文件位置**：`src/main/services/SettingsManager.ts`

```typescript
class SettingsManager {
  // 获取设置
  getSettings(): Promise<Settings>
  
  // 更新设置
  updateSettings(settings: Partial<Settings>): Promise<void>
  
  // 重置设置
  resetSettings(): Promise<void>
  
  // 导出设置
  exportSettings(filePath: string): Promise<void>
  
  // 导入设置
  importSettings(filePath: string): Promise<void>
}

interface Settings {
  // 通用设置
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  
  // 编辑器设置
  editor: {
    fontSize: number
    fontFamily: string
    tabSize: number
    wordWrap: boolean
  }
  
  // 同步设置
  sync: {
    autoSync: boolean
    syncInterval: number  // 分钟
    conflictStrategy: 'local' | 'cloud' | 'latest' | 'manual'
  }
  
  // 搜索设置
  search: {
    searchMode: 'local' | 'cloud' | 'auto'
    maxResults: number
  }
  
  // 备份设置
  backup: {
    autoBackup: boolean
    backupInterval: number  // 天
    keepBackups: number
  }
}
```

**验收标准**：
- [ ] 创建设置数据模型
- [ ] 实现设置持久化（SQLite settings 表）
- [ ] 实现设置加载和应用
- [ ] 实现设置重置
- [ ] 实现设置导出/导入
- [ ] 通过 IPC 暴露给渲染进程
- [ ] 编写单元测试

---

#### 31.2 实现设置 UI

**文件位置**：`src/renderer/components/Settings/`

**需要创建的组件**：
- `SettingsPage.tsx` - 设置页面
- `GeneralSettings.tsx` - 通用设置
- `EditorSettings.tsx` - 编辑器设置
- `SyncSettings.tsx` - 同步设置
- `SearchSettings.tsx` - 搜索设置
- `BackupSettings.tsx` - 备份设置
- `ModelSettings.tsx` - 模型管理

**验收标准**：
- [ ] 创建设置页面（侧边栏导航）
- [ ] 实现通用设置（主题、语言）
- [ ] 实现编辑器设置（字体、字号、Tab 大小）
- [ ] 实现同步设置（自动同步、间隔、冲突策略）
- [ ] 实现搜索设置（搜索模式、最大结果数）
- [ ] 实现备份设置（自动备份、间隔、保留数量）
- [ ] 实现模型管理（显示状态、删除、重新下载）
- [ ] 实现设置重置按钮
- [ ] 实现设置导出/导入按钮

---

### 任务 32：前后端联调 ⭐⭐⭐

**优先级**：P0（核心功能）

**依赖**：需要等待王欣鹏和付佳腾完成相应功能

#### 32.1 认证流程集成测试

**文件位置**：`tests/integration/auth.test.ts`

**验收标准**：
- [ ] 测试注册流程（成功/失败场景）
- [ ] 测试登录流程（成功/失败场景）
- [ ] 测试令牌刷新机制
- [ ] 测试登出流程
- [ ] 测试令牌过期处理
- [ ] 测试并发登录场景
- [ ] 测试网络错误处理
- [ ] 测试无效凭证处理

---

#### 32.2 同步流程集成测试

**文件位置**：`tests/integration/sync.test.ts`

**验收标准**：
- [ ] 测试完整同步流程（推送 + 拉取）
- [ ] 测试增量同步
- [ ] 测试首次同步（大量数据）
- [ ] 测试空数据同步
- [ ] 测试同步中断恢复
- [ ] 测试更新冲突检测
- [ ] 测试删除冲突检测
- [ ] 测试冲突自动解决（各种策略）
- [ ] 测试冲突手动解决

---

#### 32.3 离线同步集成测试

**文件位置**：`tests/integration/offline-sync.test.ts`

**验收标准**：
- [ ] 测试离线操作队列
- [ ] 测试网络恢复自动同步
- [ ] 测试离线队列持久化
- [ ] 测试离线操作冲突处理
- [ ] 测试长时间离线场景

---

#### 32.4 短链接集成测试

**文件位置**：`tests/integration/share.test.ts`

**验收标准**：
- [ ] 测试短链接创建
- [ ] 测试短链接访问
- [ ] 测试短链接过期
- [ ] 测试密码保护
- [ ] 测试访问统计

---

### 任务 33：第 3 周测试 ⭐⭐⭐

**优先级**：P0

#### 33.1 单元测试

**文件位置**：`tests/unit/`

**验收标准**：
- [ ] 导出服务单元测试
- [ ] 导入服务单元测试
- [ ] 备份恢复单元测试
- [ ] 设置管理单元测试
- [ ] 认证服务单元测试（前端 + 后端）
- [ ] 同步服务单元测试（前端 + 后端）
- [ ] 冲突解决单元测试
- [ ] 短链接服务单元测试
- [ ] 测试覆盖率 >= 80%

---

#### 33.2 集成测试

**文件位置**：`tests/integration/`

**验收标准**：
- [ ] 认证流程集成测试
- [ ] 同步流程集成测试
- [ ] 冲突解决集成测试
- [ ] 离线同步集成测试
- [ ] 短链接创建和访问集成测试
- [ ] 备份恢复集成测试
- [ ] 导出导入集成测试

---

#### 33.3 属性测试

**文件位置**：`tests/property/`

**验收标准**：
- [ ] 属性 4：同步冲突解决的确定性
- [ ] 属性 9：导出-导入往返一致性
- [ ] 属性 14：认证令牌的有效性
- [ ] 属性 15：同步操作的幂等性
- [ ] 属性 16：离线操作队列的顺序性
- [ ] 属性 17：短链接的唯一性
- [ ] 属性 18：备份-恢复往返一致性
- [ ] 属性 19：设置更新的原子性
- [ ] 属性 20：同步冲突检测的准确性

---

#### 33.4 端到端测试

**文件位置**：`tests/e2e/`

**验收标准**：
- [ ] 完整注册登录流程测试
- [ ] 完整同步流程测试（创建 → 同步 → 修改 → 同步）
- [ ] 离线到在线同步测试
- [ ] 冲突解决流程测试
- [ ] 短链接分享流程测试
- [ ] 备份恢复流程测试
- [ ] 导出导入流程测试

---

#### 33.5 性能测试

**文件位置**：`tests/performance/`

**验收标准**：
- [ ] 测试同步 1000 个片段的性能
- [ ] 测试并发同步性能（多设备）
- [ ] 测试冲突解决性能
- [ ] 测试备份恢复性能
- [ ] 测试短链接访问性能（100 并发）
- [ ] 测试导出导入性能

---

#### 33.6 安全测试

**文件位置**：`tests/security/`

**验收标准**：
- [ ] 测试 SQL 注入防护
- [ ] 测试 XSS 攻击防护
- [ ] 测试认证绕过尝试
- [ ] 测试令牌伪造尝试
- [ ] 测试速率限制
- [ ] 测试密码强度要求

---

### 📊 赵祐晟任务总结

**任务优先级**：
1. 任务 28-29（导出导入功能）- Day 1-2
2. 任务 30（数据备份恢复）- Day 3-4
3. 任务 31（设置系统）- Day 4-5
4. 任务 32（前后端联调）- Day 5-6
5. 任务 33（第 3 周测试）- Day 6-7

**建议开发顺序**：
- Day 1：任务 28（导出功能）
- Day 2：任务 29（导入功能）
- Day 3-4：任务 30（备份恢复）
- Day 4-5：任务 31（设置系统）
- Day 5-6：任务 32（前后端联调）
- Day 6-7：任务 33（测试）

---

## 🤝 协作要点

### 关键接口约定

#### 认证接口（王欣鹏提供）

**文件**：`backend/api/v1/auth.py`

```python
# POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username"
}

# Response
{
  "user_id": "uuid",
  "email": "user@example.com",
  "username": "username"
}

# POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Response
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "token_type": "bearer",
  "expires_in": 3600
}

# POST /api/v1/auth/refresh
{
  "refresh_token": "refresh_token"
}

# Response
{
  "access_token": "new_jwt_token",
  "expires_in": 3600
}
```

---

#### 同步接口（王欣鹏提供）

**文件**：`backend/api/v1/sync.py`

```python
# POST /api/v1/sync
{
  "last_sync_time": "2024-01-01T00:00:00Z",
  "changes": [
    {
      "snippet_id": "uuid",
      "action": "create" | "update" | "delete",
      "data": {...},
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}

# Response
{
  "server_changes": [
    {
      "snippet_id": "uuid",
      "action": "create" | "update" | "delete",
      "data": {...},
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "conflicts": [
    {
      "snippet_id": "uuid",
      "local_version": {...},
      "cloud_version": {...},
      "type": "update" | "delete"
    }
  ],
  "sync_time": "2024-01-01T00:00:00Z"
}
```

---

#### 短链接接口（王欣鹏提供）

**文件**：`backend/api/v1/share.py`

```python
# POST /api/v1/share
{
  "snippet_id": "uuid",
  "expires_in_days": 7,
  "password": "optional_password"
}

# Response
{
  "short_code": "abc123",
  "short_url": "https://snippetbox.com/s/abc123",
  "expires_at": "2024-01-08T00:00:00Z"
}

# GET /api/v1/s/{short_code}
# Query params: password (optional)

# Response
{
  "snippet": {
    "title": "片段标题",
    "language": "javascript",
    "code": "console.log('Hello');",
    "description": "描述"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "view_count": 10
}
```

---

#### IPC 通信接口（双方共同约定）

**文件**：`src/shared/types/ipc.ts`

```typescript
export const IPC_CHANNELS = {
  // 认证相关
  AUTH_REGISTER: 'auth:register',
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_REFRESH: 'auth:refresh',
  AUTH_GET_USER: 'auth:get-user',
  AUTH_IS_LOGGED_IN: 'auth:is-logged-in',
  
  // 同步相关
  SYNC_PUSH: 'sync:push',
  SYNC_PULL: 'sync:pull',
  SYNC_FULL: 'sync:full',
  SYNC_GET_STATUS: 'sync:get-status',
  SYNC_ENABLE_AUTO: 'sync:enable-auto',
  SYNC_DISABLE_AUTO: 'sync:disable-auto',
  
  // 冲突解决
  CONFLICT_RESOLVE: 'conflict:resolve',
  CONFLICT_AUTO_RESOLVE: 'conflict:auto-resolve',
  
  // 分享相关
  SHARE_CREATE: 'share:create',
  SHARE_LIST: 'share:list',
  SHARE_DELETE: 'share:delete',
  SHARE_GET_STATS: 'share:get-stats',
  
  // 导出导入
  EXPORT_MARKDOWN: 'export:markdown',
  EXPORT_PDF: 'export:pdf',
  IMPORT_MARKDOWN: 'import:markdown',
  IMPORT_JSON: 'import:json',
  
  // 备份恢复
  BACKUP_CREATE: 'backup:create',
  BACKUP_LIST: 'backup:list',
  BACKUP_DELETE: 'backup:delete',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_VALIDATE: 'backup:validate',
  
  // 设置相关
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_RESET: 'settings:reset',
  SETTINGS_EXPORT: 'settings:export',
  SETTINGS_IMPORT: 'settings:import',
}
```

---

#### 类型定义（双方共同约定）

**文件**：`src/shared/types/index.ts`

```typescript
// 用户类型
export interface User {
  id: string
  email: string
  username: string
  created_at: string
}

// 同步结果
export interface SyncResult {
  pushed: number
  pulled: number
  conflicts: Conflict[]
  errors: SyncError[]
}

// 冲突类型
export interface Conflict {
  snippetId: string
  localVersion: Snippet
  cloudVersion: Snippet
  type: 'update' | 'delete'
}

// 冲突解决
export type ConflictResolution = 'use-local' | 'use-cloud' | 'merge' | 'skip'

// 备份结果
export interface BackupResult {
  backupId: string
  filePath: string
  size: number
  timestamp: number
}

// 恢复结果
export interface RestoreResult {
  restored: number
  skipped: number
  errors: RestoreError[]
}

// 导入结果
export interface ImportResult {
  imported: number
  skipped: number
  errors: Array<{file: string, error: string}>
}

// 分享信息
export interface ShareInfo {
  shortCode: string
  shortUrl: string
  snippetId: string
  expiresAt: string
  viewCount: number
  createdAt: string
}
```

---

## 📅 开发流程（Day 1-7）

### Day 1（周一）

**王欣鹏**：
- [ ] 完成任务 20.1-20.2（用户注册和登录）
- [ ] 提供认证 API 文档

**付佳腾**：
- [ ] 完成任务 24（批量操作功能）
- [ ] 创建 PR：`feature/batch-operations`

**赵祐晟**：
- [ ] 完成任务 28（导出功能）
- [ ] 创建 PR：`feature/export`

**协作**：
- 确认认证接口设计
- 讨论同步协议
- 确认导出格式

---

### Day 2（周二）

**王欣鹏**：
- [ ] 完成任务 20.3-20.4（令牌刷新和认证中间件）
- [ ] 开始任务 21.1（云端片段 CRUD API）

**付佳腾**：
- [ ] 开始任务 25（客户端认证）

**赵祐晟**：
- [ ] 完成任务 29（导入功能）
- [ ] 创建 PR：`feature/import`

**协作**：
- Code Review：`feature/batch-operations`
- Code Review：`feature/export`
- Code Review：`feature/import`
- 联调认证接口

---

### Day 3（周三）

**王欣鹏**：
- [ ] 完成任务 21.1（云端片段 CRUD API）
- [ ] 开始任务 21.2（增量同步 API）

**付佳腾**：
- [ ] 完成任务 25（客户端认证）
- [ ] 创建 PR：`feature/auth-client`
- [ ] 开始任务 26.1-26.2（同步服务和冲突解决）

**赵祐晟**：
- [ ] 开始任务 30（数据备份恢复）
- [ ] 开始任务 32.1（认证联调）

**协作**：
- Code Review：`feature/auth-client`
- 确认同步接口设计
- 测试认证功能

---

### Day 4（周四）

**王欣鹏**：
- [ ] 完成任务 21.2-21.3（增量同步和元数据同步）
- [ ] 开始任务 22.1（短链接生成）

**付佳腾**：
- [ ] 完成任务 26.1-26.2（同步服务和冲突解决）
- [ ] 开始任务 26.3（离线支持）

**赵祐晟**：
- [ ] 完成任务 30（数据备份恢复）
- [ ] 创建 PR：`feature/backup-restore`
- [ ] 开始任务 31（设置系统）

**协作**：
- Code Review：`feature/backup-restore`
- 联调同步接口
- 测试冲突解决

---

### Day 5（周五）

**王欣鹏**：
- [ ] 完成任务 22.1-22.3（短链接生成、访问、管理）
- [ ] 开始任务 22.4（短链接访问页面）

**付佳腾**：
- [ ] 完成任务 26.3（离线支持）
- [ ] 开始任务 26.4（同步 UI）

**赵祐晟**：
- [ ] 完成任务 31（设置系统）
- [ ] 创建 PR：`feature/settings`
- [ ] 开始任务 32.2-32.3（同步和离线联调）

**协作**：
- Code Review：`feature/settings`
- 集成测试：完整同步流程
- 测试离线同步

---

### Day 6（周六）

**王欣鹏**：
- [ ] 完成任务 22.4（短链接访问页面）
- [ ] 开始任务 23（云端向量存储）

**付佳腾**：
- [ ] 完成任务 26.4（同步 UI）
- [ ] 创建 PR：`feature/sync-client`
- [ ] 开始任务 27（短链接分享 UI）

**赵祐晟**：
- [ ] 完成任务 32（前后端联调）
- [ ] 开始任务 33（第 3 周测试）

**协作**：
- Code Review：`feature/sync-client`
- 测试短链接功能
- 集成测试：完整功能流程

---

### Day 7（周日）

**王欣鹏**：
- [ ] 完成任务 23（云端向量存储）
- [ ] 协助测试和 bug 修复
- [ ] 整理本周工作

**付佳腾**：
- [ ] 完成任务 27（短链接分享 UI）
- [ ] 创建 PR：`feature/share-ui`
- [ ] 协助测试和 bug 修复
- [ ] 整理本周工作

**赵祐晟**：
- [ ] 完成任务 33（第 3 周测试）
- [ ] 整理测试报告
- [ ] 整理本周工作总结

**协作**：
- Code Review：`feature/share-ui`
- 端到端测试：完整功能流程
- 本周工作总结和下周计划

---

## 🎯 本周成功标准

### 功能完成度

- [ ] 用户可以注册和登录
- [ ] 用户可以同步片段到云端
- [ ] 冲突可以被检测和解决
- [ ] 离线操作可以在网络恢复后同步
- [ ] 用户可以创建和访问短链接
- [ ] 用户可以备份和恢复数据
- [ ] 用户可以配置应用设置
- [ ] 用户可以导出片段（Markdown/PDF）
- [ ] 用户可以批量操作片段
- [ ] 用户可以导入片段（Markdown/JSON）
- [ ] 云端语义搜索可用

### 代码质量

- [ ] 测试覆盖率 >= 80%
- [ ] 无 ESLint 错误
- [ ] 所有 PR 都经过 Code Review
- [ ] 代码符合团队规范
- [ ] 关键函数有注释

### 性能指标

- [ ] 同步 100 个片段 < 5 秒
- [ ] 冲突检测时间 < 1 秒
- [ ] 备份创建时间 < 3 秒
- [ ] 短链接访问响应时间 < 200ms
- [ ] 认证响应时间 < 500ms
- [ ] 导出 100 个片段 < 10 秒
- [ ] 导入 100 个片段 < 10 秒

### 用户体验

- [ ] 认证流程清晰易懂
- [ ] 同步状态实时显示
- [ ] 冲突解决界面清晰
- [ ] 错误提示友好
- [ ] 离线状态明确提示
- [ ] 导出导入进度清晰
- [ ] 批量操作反馈及时

### 文档完善

- [ ] 所有接口都有 TypeScript 类型定义
- [ ] 关键函数有注释
- [ ] README 更新（添加第 3 周功能说明）
- [ ] API 文档更新（Swagger）
- [ ] 用户使用文档更新

---

## 📋 下周计划（第 4 周）

第 4 周将专注于：

1. **性能优化**
   - 客户端性能优化
   - 数据库性能优化
   - 后端性能优化
   - 网络请求优化

2. **安全加固**
   - 客户端安全
   - 后端安全
   - 数据加密
   - 安全测试

3. **用户体验优化**
   - UI/UX 优化
   - 可访问性优化
   - 错误处理优化
   - 加载状态优化

4. **错误处理和日志**
   - 全局错误处理
   - 日志系统
   - 错误报告
   - 监控告警

5. **文档编写**
   - 用户文档
   - 开发者文档
   - 部署文档
   - API 文档

6. **打包和发布**
   - 配置打包
   - 打包测试
   - 发布准备
   - 版本管理

7. **云端服务部署**
   - 容器化
   - 生产环境部署
   - 监控和日志
   - 备份策略

8. **最终测试**
   - 完整功能测试
   - 跨平台测试
   - 性能和压力测试
   - 用户验收测试

---

## ✅ 总结

第三周是项目的关键周，需要完成：

1. **核心云端功能**：用户认证、片段同步、冲突解决、云端向量存储
2. **分享功能**：短链接生成和访问
3. **数据管理**：备份恢复、导出导入、批量操作
4. **系统配置**：设置系统、模型管理

**关键成功因素**：

- 前后端密切配合，及时沟通
- 优先完成核心功能，保证质量
- 充分测试，确保稳定性
- 做好时间管理，避免延期

**预期成果**：

- 完整的云同步功能
- 可用的分享功能
- 完善的数据管理
- 稳定的系统配置
- 云端语义搜索功能

第三周结束后，所有核心功能开发完毕，第四周将专注于优化、测试和交付。

