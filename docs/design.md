# SnippetBox 设计文档

## 概述

SnippetBox 是一款面向开发者的轻量级代码片段管理工具，采用本地优先架构，支持智能搜索和可选的云同步功能。

### 核心设计理念

1. **本地优先**：所有核心功能完全离线可用，数据存储在本地 SQLite 数据库
2. **智能搜索**：统一搜索框自动选择最佳搜索策略（本地语义 → 云端语义 → 全文搜索）
3. **按需下载**：嵌入模型（约 134MB，支持多语言）可选下载，支持轻量模式
4. **渐进增强**：基础功能无需网络，高级功能（云同步、分享）需要登录
5. **跨平台支持**：基于 Electron 构建，支持 Windows、macOS 和 Linux

### 技术栈概览

**桌面客户端**：

- 框架：Electron + React + TypeScript
- 编辑器：Monaco Editor
- 状态管理：React Context / Zustand
- 本地数据库：SQLite + FTS5
- 本地推理：ONNX Runtime Web

**云端服务**：

- API 框架：Python + FastAPI
- 数据库：PostgreSQL + pgvector
- 缓存：Redis
- 文件存储：对象存储（S3 兼容）

## 系统架构

### 整体架构图

```mermaid
graph TB
    subgraph "桌面客户端 (Electron)"
        UI[React UI 层]
        SM[Snippet Manager]
        SE[Search Engine]
        ED[Monaco Editor]
        LES[Local Embedding Service]
        MD[Model Downloader]
        SS[Sync Service]
        ES[Export Service]
      
        UI --> SM
        UI --> SE
        UI --> ED
        UI --> MD
        SM --> LDB[(SQLite Database)]
        SE --> LDB
        SE --> LES
        SE --> VS[(Vector Store<br/>SQLite)]
        LES --> VS
        LES --> MC[Model Cache]
        MD --> MC
        SS --> LDB
        SS --> CloudAPI
        ES --> SM
    end
  
    subgraph "云端服务"
        CloudAPI[FastAPI Server]
        Auth[Auth Service]
        CloudSync[Cloud Sync Service]
        Share[Share Service]
        CloudEmbed[Cloud Embedding Service]
      
        CloudAPI --> Auth
        CloudAPI --> CloudSync
        CloudAPI --> Share
        CloudAPI --> CloudEmbed
        CloudSync --> PG[(PostgreSQL)]
        CloudSync --> Redis[(Redis Cache)]
        Share --> PG
        CloudEmbed --> PG
    end

    style LDB fill:#e1f5ff
    style VS fill:#e1f5ff
    style MC fill:#fff4e1
    style PG fill:#ffe1e1
    style Redis fill:#ffe1e1
```

### 架构层次

**表现层（Presentation Layer）**：

- React 组件：片段列表、编辑器、搜索框、设置面板
- Monaco Editor 集成：语法高亮、代码编辑
- 欢迎向导：首次启动引导

**业务逻辑层（Business Logic Layer）**：

- Snippet Manager：片段 CRUD 操作
- Search Engine：智能搜索策略选择和执行
- Sync Service：云端同步和冲突解决
- Export Service：Markdown/PDF 导出
- Model Downloader：模型下载管理

**数据访问层（Data Access Layer）**：

- SQLite 数据库访问
- Vector Store 访问（SQLite 表）
- 本地文件系统访问（模型缓存）

**基础设施层（Infrastructure Layer）**：

- Local Embedding Service：ONNX Runtime 推理
- HTTP 客户端：云端 API 通信
- 文件系统操作：导出、备份

## 组件和接口设计

### 1. Snippet Manager（片段管理器）

**职责**：管理代码片段的生命周期（创建、读取、更新、删除）

**接口定义**：

```typescript
interface SnippetManager {
  // 创建新片段
  createSnippet(data: CreateSnippetDTO): Promise<Snippet>;
  
  // 获取片段列表
  listSnippets(filter?: SnippetFilter): Promise<Snippet[]>;
  
  // 获取单个片段
  getSnippet(id: string): Promise<Snippet | null>;
  
  // 更新片段
  updateSnippet(id: string, data: UpdateSnippetDTO): Promise<Snippet>;
  
  // 删除片段
  deleteSnippet(id: string): Promise<void>;
  
  // 批量删除
  batchDelete(ids: string[]): Promise<BatchOperationResult>;
  
  // 批量更新标签
  batchUpdateTags(ids: string[], tags: string[]): Promise<BatchOperationResult>;
  
  // 批量更新分类
  batchUpdateCategory(ids: string[], category: string): Promise<BatchOperationResult>;
}

interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  isSynced: boolean;
  cloudId?: string;
}

interface CreateSnippetDTO {
  title: string;
  code: string;
  language: string;
  category?: string;
  tags?: string[];
}

interface UpdateSnippetDTO {
  title?: string;
  code?: string;
  language?: string;
  category?: string;
  tags?: string[];
}

interface SnippetFilter {
  category?: string;
  tags?: string[];
  language?: string;
  searchQuery?: string;
}

interface BatchOperationResult {
  successCount: number;
  failedCount: number;
  failedIds: string[];
  errors: Map<string, string>;
}
```

**实现要点**：

- 使用 SQLite 事务确保数据一致性
- 自动生成 UUID 作为片段 ID
- 自动记录创建时间和更新时间
- 触发向量化任务（如果本地模型已下载）
- 触发全文搜索索引更新
- 触发云端同步（如果用户已登录）

### 2. Search Engine（搜索引擎）

**职责**：实现智能搜索策略，自动选择最佳搜索方式

**搜索策略决策流程**：

```mermaid
graph TD
    A[用户输入搜索查询] --> B{本地模型<br/>已下载?}
    B -->|是| C[本地语义搜索]
    B -->|否| D[全文搜索 FTS5]

    C --> E[返回结果 + 显示<br/>本地搜索指示器]
    D --> F[返回结果 + 显示<br/>关键词搜索指示器]
```

**接口定义**：

```typescript
interface SearchEngine {
  // 执行搜索（自动选择策略）
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  
  // 获取当前可用的搜索模式
  getAvailableSearchModes(): SearchMode[];
  
  // 获取搜索能力状态
  getSearchCapability(): SearchCapability;
}

interface SearchOptions {
  limit?: number;
  sortBy?: 'relevance' | 'createdAt' | 'updatedAt' | 'accessCount' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface SearchResult {
  snippets: Snippet[];
  mode: SearchMode;
  totalCount: number;
  executionTime: number;
}

enum SearchMode {
  LOCAL_SEMANTIC = 'local_semantic',
  CLOUD_SEMANTIC = 'cloud_semantic',
  FULLTEXT = 'fulltext'
}

interface SearchCapability {
  hasLocalModel: boolean;
  isLoggedIn: boolean;
  isOnline: boolean;
  currentMode: SearchMode;
  availableModes: SearchMode[];
}
```

**实现要点**：

- 策略模式实现不同搜索方式
- 本地语义搜索：使用 Local Embedding Service 生成查询向量，在 Vector Store 中检索
- 全文搜索：使用 SQLite FTS5 扩展
- 缓存搜索结果（5 分钟有效期）
- 防抖处理（300ms）

### 3. Local Embedding Service（本地嵌入服务）

**职责**：使用本地 ONNX 模型将文本转换为向量

**接口定义**：

```typescript
interface LocalEmbeddingService {
  // 初始化模型
  initialize(): Promise<void>;
  
  // 检查模型是否已加载
  isModelLoaded(): boolean;
  
  // 生成单个文本的向量
  embed(text: string): Promise<number[]>;
  
  // 批量生成向量
  batchEmbed(texts: string[]): Promise<number[][]>;
  
  // 卸载模型释放内存
  unload(): Promise<void>;
}
```

**实现要点**：

- 使用 ONNX Runtime Web 加载 multilingual-e5-small 模型
- 模型文件路径：`{userData}/models/multilingual-e5-small/`
- 输入预处理：tokenization + padding
- 输出：384 维向量
- 性能目标：单次推理 < 200ms
- 使用 Web Worker 避免阻塞主线程
- 模型懒加载：首次使用时才加载到内存

### 4. Vector Store（向量存储）

**职责**：存储和检索片段向量

**接口定义**：

```typescript
interface VectorStore {
  // 存储向量
  storeVector(snippetId: string, vector: number[]): Promise<void>;
  
  // 批量存储向量
  batchStoreVectors(data: Array<{snippetId: string, vector: number[]}>): Promise<void>;
  
  // 向量相似度搜索
  searchSimilar(queryVector: number[], limit: number): Promise<VectorSearchResult[]>;
  
  // 删除向量
  deleteVector(snippetId: string): Promise<void>;
  
  // 批量删除向量
  batchDeleteVectors(snippetIds: string[]): Promise<void>;
}

interface VectorSearchResult {
  snippetId: string;
  similarity: number;
}
```

**实现要点**：

- 使用 SQLite 表存储向量
- 相似度计算：余弦相似度（应用层计算）
- 向量维度：384
- 性能优化：批量插入、定期清理

### 5. Model Downloader（模型下载器）

**职责**：管理嵌入模型的下载、验证和缓存

**接口定义**：

```typescript
interface ModelDownloader {
  // 开始下载模型
  startDownload(mirrorUrl?: string): Promise<void>;
  
  // 暂停下载
  pauseDownload(): Promise<void>;
  
  // 恢复下载
  resumeDownload(): Promise<void>;
  
  // 取消下载
  cancelDownload(): Promise<void>;
  
  // 获取下载进度
  getProgress(): DownloadProgress;
  
  // 验证模型文件
  verifyModel(filePath: string): Promise<boolean>;
  
  // 删除模型
  deleteModel(): Promise<void>;
  
  // 获取可用镜像列表
  getAvailableMirrors(): MirrorInfo[];
}

interface DownloadProgress {
  status: 'idle' | 'downloading' | 'paused' | 'completed' | 'failed';
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  currentMirror: string;
}

interface MirrorInfo {
  url: string;
  name: string;
  location: string;
  priority: number;
}
```

**实现要点**：

- 支持断点续传（HTTP Range 请求）
- SHA256 校验确保文件完整性
- 多镜像源配置（CDN + GitHub Release + 官方服务器）
- 下载失败自动切换镜像
- 进度持久化（应用重启后可恢复）
- 下载在独立进程中进行（Electron 主进程）

### 6. Sync Service（同步服务）

**职责**：处理本地和云端数据的同步

**接口定义**：

```typescript
interface SyncService {
  // 执行完整同步
  sync(): Promise<SyncResult>;
  
  // 上传本地变更
  pushChanges(): Promise<PushResult>;
  
  // 下载云端变更
  pullChanges(): Promise<PullResult>;
  
  // 解决冲突
  resolveConflict(snippetId: string, resolution: ConflictResolution): Promise<void>;
  
  // 获取同步状态
  getSyncStatus(): SyncStatus;
  
  // 获取待解决的冲突列表
  getPendingConflicts(): Promise<Conflict[]>;
}

interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

interface PushResult {
  successCount: number;
  failedCount: number;
  failedIds: string[];
}

interface PullResult {
  newSnippets: number;
  updatedSnippets: number;
  deletedSnippets: number;
  conflicts: Conflict[];
}

interface Conflict {
  snippetId: string;
  localVersion: Snippet;
  cloudVersion: Snippet;
  conflictType: 'update' | 'delete';
}

enum ConflictResolution {
  KEEP_LOCAL = 'keep_local',
  KEEP_CLOUD = 'keep_cloud',
  KEEP_BOTH = 'keep_both'
}

interface SyncStatus {
  lastSyncTime: Date | null;
  isSyncing: boolean;
  pendingChanges: number;
  pendingConflicts: number;
}
```

**实现要点**：

- 增量同步：只传输变更的数据
- 使用时间戳和版本号检测冲突
- 冲突解决策略：提示用户选择
- 离线操作队列：网络恢复后自动同步
- 重试机制：失败后最多重试 3 次
- 软删除：云端标记删除而非物理删除

### 7. Export Service（导出服务）

**职责**：将片段导出为 Markdown 或 PDF 格式

**接口定义**：

```typescript
interface ExportService {
  // 导出为 Markdown
  exportToMarkdown(snippetIds: string[], outputPath: string): Promise<ExportResult>;
  
  // 导出为 PDF
  exportToPDF(snippetIds: string[], outputPath: string): Promise<ExportResult>;
  
  // 生成导出预览
  generatePreview(snippetIds: string[], format: 'markdown' | 'pdf'): Promise<string>;
}

interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}
```

**实现要点**：

- Markdown 导出：使用模板生成，包含代码块、元数据
- PDF 导出：使用 Puppeteer 或 electron-pdf 生成，保留语法高亮
- 支持批量导出（多个片段合并到一个文件）
- 包含片段的分类、标签、创建时间等元数据

### 8. Auth Service（认证服务）

**职责**：处理用户认证和授权

**接口定义**：

```typescript
interface AuthService {
  // 用户注册
  register(email: string, password: string): Promise<AuthResult>;
  
  // 用户登录
  login(email: string, password: string): Promise<AuthResult>;
  
  // 用户登出
  logout(): Promise<void>;
  
  // 刷新访问令牌
  refreshToken(): Promise<string>;
  
  // 检查是否已登录
  isAuthenticated(): boolean;
  
  // 获取当前用户信息
  getCurrentUser(): User | null;
}

interface AuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  error?: string;
}

interface User {
  id: string;
  email: string;
  createdAt: Date;
}
```

**实现要点**：

- 访问令牌有效期：7 天
- 令牌存储：Electron safeStorage API（加密存储）
- 自动刷新：令牌过期前自动刷新
- 密码验证：前端基本验证 + 后端完整验证

### 9. Share Service（分享服务）

**职责**：生成和管理短链接

**接口定义**：

```typescript
interface ShareService {
  // 生成短链接
  createShortLink(snippetId: string, options?: ShareOptions): Promise<ShortLink>;
  
  // 获取短链接信息
  getShortLink(shortCode: string): Promise<ShortLink | null>;
  
  // 删除短链接
  deleteShortLink(shortCode: string): Promise<void>;
  
  // 获取用户的所有短链接
  listShortLinks(): Promise<ShortLink[]>;
}

interface ShareOptions {
  expiresIn?: number; // 有效期（秒）
  password?: string; // 访问密码
}

interface ShortLink {
  shortCode: string;
  fullUrl: string;
  snippetId: string;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  hasPassword: boolean;
}
```

**实现要点**：

- 短链接标识符：8 字符随机字符串（Base62 编码）
- 碰撞检测：生成时检查唯一性
- 访问统计：记录访问次数和时间
- 过期处理：定时任务清理过期链接

## 数据模型

### 本地数据库（SQLite）

#### snippets 表

```sql
CREATE TABLE snippets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  access_count INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  cloud_id TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at INTEGER
);

CREATE INDEX idx_snippets_category ON snippets(category);
CREATE INDEX idx_snippets_language ON snippets(language);
CREATE INDEX idx_snippets_created_at ON snippets(created_at DESC);
CREATE INDEX idx_snippets_updated_at ON snippets(updated_at DESC);
CREATE INDEX idx_snippets_cloud_id ON snippets(cloud_id);
```

#### tags 表

```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE INDEX idx_tags_name ON tags(name);
```

#### snippet_tags 表（多对多关系）

```sql
CREATE TABLE snippet_tags (
  snippet_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (snippet_id, tag_id),
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_snippet_tags_snippet_id ON snippet_tags(snippet_id);
CREATE INDEX idx_snippet_tags_tag_id ON snippet_tags(tag_id);
```

#### categories 表

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  icon TEXT
);
```

#### snippets_fts 表（全文搜索）

```sql
CREATE VIRTUAL TABLE snippets_fts USING fts5(
  snippet_id UNINDEXED,
  title,
  code,
  content='snippets',
  content_rowid='rowid'
);

-- 触发器：自动更新 FTS 索引
CREATE TRIGGER snippets_fts_insert AFTER INSERT ON snippets BEGIN
  INSERT INTO snippets_fts(snippet_id, title, code)
  VALUES (new.id, new.title, new.code);
END;

CREATE TRIGGER snippets_fts_update AFTER UPDATE ON snippets BEGIN
  UPDATE snippets_fts
  SET title = new.title, code = new.code
  WHERE snippet_id = new.id;
END;

CREATE TRIGGER snippets_fts_delete AFTER DELETE ON snippets BEGIN
  DELETE FROM snippets_fts WHERE snippet_id = old.id;
END;
```

#### snippet_vectors 表（向量存储）

```sql
-- 使用 SQLite 表存储向量
CREATE TABLE snippet_vectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snippet_id TEXT NOT NULL,
  embedding TEXT NOT NULL, -- JSON 序列化的 384 维向量
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
);

-- 创建索引以加速相似度搜索
CREATE INDEX idx_snippet_vectors_snippet_id ON snippet_vectors(snippet_id);
```

> 注意：实际代码中向量以 JSON 文本形式存储在 SQLite 表中，相似度计算在应用层完成。

#### sync_queue 表（同步队列）

```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snippet_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'create', 'update', 'delete'
  timestamp INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_queue_timestamp ON sync_queue(timestamp);
```

#### settings 表

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### 云端数据库（PostgreSQL）

#### users 表

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

#### cloud_snippets 表

```sql
CREATE TABLE cloud_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  tags TEXT[], -- PostgreSQL 数组类型
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_cloud_snippets_user_id ON cloud_snippets(user_id);
CREATE INDEX idx_cloud_snippets_updated_at ON cloud_snippets(updated_at DESC);
CREATE INDEX idx_cloud_snippets_is_deleted ON cloud_snippets(is_deleted);
```

#### cloud_snippet_vectors 表

```sql
CREATE TABLE cloud_snippet_vectors (
  snippet_id UUID PRIMARY KEY,
  embedding vector(384), -- pgvector 扩展
  FOREIGN KEY (snippet_id) REFERENCES cloud_snippets(id) ON DELETE CASCADE
);

-- 创建 HNSW 索引加速向量搜索
CREATE INDEX idx_cloud_snippet_vectors_embedding ON cloud_snippet_vectors
USING hnsw (embedding vector_cosine_ops);
```

#### short_links 表

```sql
CREATE TABLE short_links (
  short_code VARCHAR(8) PRIMARY KEY,
  user_id UUID NOT NULL,
  snippet_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  password_hash VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (snippet_id) REFERENCES cloud_snippets(id) ON DELETE CASCADE
);

CREATE INDEX idx_short_links_user_id ON short_links(user_id);
CREATE INDEX idx_short_links_snippet_id ON short_links(snippet_id);
CREATE INDEX idx_short_links_expires_at ON short_links(expires_at);
```

#### access_logs 表

```sql
CREATE TABLE access_logs (
  id BIGSERIAL PRIMARY KEY,
  short_code VARCHAR(8) NOT NULL,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  referer TEXT
);

CREATE INDEX idx_access_logs_short_code ON access_logs(short_code);
CREATE INDEX idx_access_logs_accessed_at ON access_logs(accessed_at DESC);
```

## API 设计

### 云端 API 端点

#### 认证相关

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

#### 片段同步

```
POST   /api/v1/sync
GET    /api/v1/snippets
GET    /api/v1/snippets/{id}
POST   /api/v1/snippets
PUT    /api/v1/snippets/{id}
DELETE /api/v1/snippets/{id}
GET    /api/v1/sync/categories
GET    /api/v1/sync/tags
POST   /api/v1/sync/metadata
```

#### 语义搜索

```
POST /api/v1/search/semantic
```

请求体：

```json
{
  "query": "string",
  "limit": 10
}
```

响应：

```json
{
  "results": [
    {
      "snippet_id": "uuid",
      "title": "string",
      "code": "string",
      "language": "string",
      "similarity": 0.95
    }
  ],
  "execution_time": 123
}
```

#### 短链接

```
POST   /api/v1/share
GET    /api/v1/share/{shortCode}
DELETE /api/v1/share/{shortCode}
GET    /api/v1/share
```

#### 公开访问

```
GET /s/{shortCode}
```

返回 HTML 页面，展示代码片段

### API 认证

使用 JWT Bearer Token：

```
Authorization: Bearer {access_token}
```

### API 速率限制

响应头：

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640000000
```

超过限制时返回 429 状态码：

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

## 正确性属性

属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。

### 属性 1：片段 CRUD 操作的数据一致性

对于任何有效的片段数据，创建后检索应该返回与输入等价的数据；更新后检索应该返回更新后的数据。

**验证需求**：1.1, 1.4

### 属性 2：片段 ID 的唯一性

对于任意数量的片段创建操作，所有生成的片段 ID 必须是唯一的，不存在重复。

**验证需求**：1.6

### 属性 3：时间戳的不变性和单调性

对于任何片段，创建时间在片段生命周期内保持不变；更新操作后，最后修改时间应该大于或等于之前的修改时间。

**验证需求**：1.7

### 属性 4：片段删除的完整性

对于任何存在的片段，删除操作后，该片段不应该出现在列表查询或单个查询的结果中。

**验证需求**：1.5

### 属性 5：列表排序的正确性

对于任何片段集合，按创建时间倒序查询时，返回的列表中每个片段的创建时间应该大于或等于其后续片段的创建时间。

**验证需求**：1.2

### 属性 6：标签过滤的子集关系

对于标签集合 T1 和 T2，如果 T1 ⊂ T2（T1 是 T2 的子集），则使用 T2 过滤的结果数量应该小于或等于使用 T1 过滤的结果数量：|filter(T2)| ≤ |filter(T1)|。

**验证需求**：2.3, 2.4, 2.5

### 属性 7：全文搜索索引的同步性

对于任何新创建或更新的片段，使用其标题或代码中的唯一关键词立即进行搜索，应该能在结果中找到该片段。

**验证需求**：3.1, 3.5

### 属性 8：多关键词搜索的交集属性

对于任何多关键词搜索查询，返回的每个片段都应该包含所有指定的关键词。

**验证需求**：3.3

### 属性 9：导出-导入往返一致性

对于任何片段 S，执行 import(export(S, 'markdown')) 应该产生与 S 等价的片段（标题、代码、语言、分类、标签相同）。

**验证需求**：6.1, 18.1

### 属性 10：批量导出的完整性

对于任何片段集合 [S1, S2, ..., Sn]，导出操作生成的文件应该包含所有 n 个片段的完整信息。

**验证需求**：6.3

### 属性 11：搜索策略选择的确定性

对于任何给定的系统状态（本地模型状态、登录状态、网络状态），搜索引擎应该选择确定的搜索策略：

- 本地模型已下载 → 本地语义搜索
- 本地模型未下载 且 已登录 → 云端语义搜索
- 本地模型未下载 且 未登录 → 全文搜索

**验证需求**：10.2, 10.3, 10.4, 10.5

### 属性 12：向量维度的一致性

对于任何片段，本地嵌入服务生成的向量维度必须恰好是 384 维。

**验证需求**：11.3

### 属性 13：向量存储的往返一致性

对于任何向量 V 和片段 ID，执行 retrieve(store(ID, V)) 应该返回与 V 等价的向量（考虑浮点精度误差在可接受范围内）。

**验证需求**：11.4

### 属性 14：向量删除的级联性

对于任何片段，删除片段后，其对应的向量数据也应该从向量存储中被删除，不应该能检索到。

**验证需求**：11.7

### 属性 15：文件校验和的确定性

对于任何文件内容，多次计算 SHA256 校验和应该产生相同的结果。

**验证需求**：12.9

### 属性 16：重复片段检测的准确性

对于任何已存在的片段 S，导入与 S 具有相同标题和代码的片段时，系统应该检测到重复。

**验证需求**：18.7

### 属性 17：批量删除的原子性

对于批量删除操作，如果操作成功，所有指定的有效片段 ID 都应该被删除；对于无效 ID，应该在结果中准确报告。

**验证需求**：24.2, 24.7

### 属性 18：备份-恢复往返一致性

对于任何片段集合 D，执行 restore(backup(D)) 应该产生与 D 等价的片段集合（所有片段的内容、元数据完全相同）。

**验证需求**：29.2, 29.4

### 属性 19：排序的正确性

对于任何片段集合和排序字段 F（创建时间、更新时间、访问次数、标题），按 F 升序排序的结果中，每个元素的 F 值应该小于或等于其后续元素的 F 值；降序则相反。

**验证需求**：30.2, 30.3, 30.4, 30.5

### 属性 20：同步冲突检测的准确性

对于本地版本 L 和云端版本 C，如果 L.updatedAt > C.updatedAt 且 C.updatedAt > L.lastSyncTime，则应该检测到冲突。

**验证需求**：9.3

## 错误处理

### 错误分类

**客户端错误（4xx）**：

- 400 Bad Request：请求参数无效
- 401 Unauthorized：未认证或令牌无效
- 403 Forbidden：无权访问资源
- 404 Not Found：资源不存在
- 409 Conflict：数据冲突
- 429 Too Many Requests：超过速率限制

**服务器错误（5xx）**：

- 500 Internal Server Error：服务器内部错误
- 503 Service Unavailable：服务暂时不可用

### 错误处理策略

#### 1. 网络错误

**场景**：云端 API 请求失败

**处理**：

- 自动重试（最多 3 次，指数退避）
- 降级到本地功能
- 显示友好的错误提示
- 将操作加入同步队列，等待网络恢复

```typescript
async function handleNetworkError(error: NetworkError, operation: Operation) {
  if (operation.retryCount < 3) {
    const delay = Math.pow(2, operation.retryCount) * 1000;
    await sleep(delay);
    return retry(operation);
  }
  
  // 模型加载失败时降级到全文搜索
  if (operation.type === 'search' && operation.mode === 'semantic') {
    return fallbackToFullTextSearch(operation.query);
  }
  
  // 加入同步队列
  if (operation.type === 'sync') {
    await syncQueue.add(operation);
  }
  
  // 显示错误提示
  showNotification({
    type: 'error',
    message: '网络连接失败，操作已加入队列，将在网络恢复后自动同步',
    action: '查看详情'
  });
}
```

#### 2. 数据库错误

**场景**：SQLite 操作失败

**处理**：

- 事务回滚
- 记录详细错误日志
- 尝试从备份恢复（如果是数据库损坏）
- 显示错误信息和建议操作

```typescript
async function handleDatabaseError(error: DatabaseError) {
  logger.error('Database error:', error);
  
  if (error.code === 'SQLITE_CORRUPT') {
    const hasBackup = await checkBackupExists();
    if (hasBackup) {
      showDialog({
        title: '数据库文件损坏',
        message: '检测到数据库文件损坏，是否从最近的备份恢复？',
        actions: ['恢复备份', '取消']
      });
    }
  }
  
  throw new ApplicationError('数据库操作失败', error);
}
```

#### 3. 模型加载错误

**场景**：ONNX 模型加载失败

**处理**：

- 验证模型文件完整性
- 如果校验失败，提示重新下载
- 降级到全文搜索
- 记录错误日志

```typescript
async function handleModelLoadError(error: ModelLoadError) {
  logger.error('Model load error:', error);
  
  const isValid = await verifyModelChecksum();
  if (!isValid) {
    showNotification({
      type: 'warning',
      message: '本地模型文件损坏，请重新下载',
      action: '重新下载'
    });
    await deleteCorruptedModel();
  }
  
  // 禁用本地语义搜索，切换到全文搜索
  searchEngine.disableLocalSemantic();
}
```

#### 4. 同步冲突

**场景**：本地和云端数据不一致

**处理**：

- 检测冲突类型（更新冲突、删除冲突）
- 保留两个版本
- 提示用户选择解决方案
- 记录冲突解决历史

```typescript
async function handleSyncConflict(conflict: Conflict) {
  const resolution = await showConflictDialog({
    local: conflict.localVersion,
    cloud: conflict.cloudVersion,
    options: ['保留本地', '保留云端', '保留两者']
  });
  
  switch (resolution) {
    case 'keep_local':
      await syncService.pushToCloud(conflict.localVersion);
      break;
    case 'keep_cloud':
      await syncService.pullFromCloud(conflict.cloudVersion);
      break;
    case 'keep_both':
      await syncService.createDuplicate(conflict.cloudVersion);
      break;
  }
  
  await conflictLog.record(conflict, resolution);
}
```

#### 5. 导出错误

**场景**：文件导出失败

**处理**：

- 检查文件系统权限
- 检查磁盘空间
- 提供替代保存位置
- 显示具体错误原因

```typescript
async function handleExportError(error: ExportError) {
  if (error.code === 'EACCES') {
    showNotification({
      type: 'error',
      message: '没有写入权限，请选择其他位置',
      action: '重新选择'
    });
  } else if (error.code === 'ENOSPC') {
    showNotification({
      type: 'error',
      message: '磁盘空间不足，请清理空间后重试'
    });
  } else {
    showNotification({
      type: 'error',
      message: `导出失败：${error.message}`
    });
  }
}
```

### 错误日志

所有错误都应该记录到本地日志文件：

```
{userData}/logs/app-{date}.log
```

日志格式：

```
[2025-01-15 10:30:45] [ERROR] [SnippetManager] Failed to create snippet: Database locked
  Stack: ...
  Context: { userId: 'xxx', snippetId: 'yyy' }
```

日志轮转：

- 每天创建新日志文件
- 保留最近 7 天的日志
- 单个日志文件最大 10MB

## 测试策略

### 单元测试

**覆盖范围**：

- 所有业务逻辑模块（Snippet Manager、Search Engine、Sync Service 等）
- 数据访问层（数据库操作、向量存储）
- 工具函数（校验、格式化、转换）

**测试框架**：

- TypeScript/JavaScript：Jest + @testing-library/react
- Python：pytest

**目标**：

- 代码覆盖率 ≥ 80%
- 所有公共 API 都有测试
- 所有错误处理路径都有测试

**示例**：

```typescript
describe('SnippetManager', () => {
  it('should create snippet with valid data', async () => {
    const data = {
      title: 'Test Snippet',
      code: 'console.log("hello")',
      language: 'javascript'
    };
  
    const snippet = await snippetManager.createSnippet(data);
  
    expect(snippet.id).toBeDefined();
    expect(snippet.title).toBe(data.title);
    expect(snippet.code).toBe(data.code);
    expect(snippet.createdAt).toBeInstanceOf(Date);
  });
  
  it('should reject empty title', async () => {
    const data = {
      title: '',
      code: 'console.log("hello")',
      language: 'javascript'
    };
  
    await expect(snippetManager.createSnippet(data))
      .rejects.toThrow('Title cannot be empty');
  });
});
```

### 属性测试

**测试框架**：

- TypeScript：fast-check
- Python：Hypothesis

**配置**：

- 每个属性测试运行 100 次迭代
- 使用种子确保可重现性
- 失败时自动缩小反例

**标签格式**：

```typescript
// Feature: snippet-box, Property 1: 片段 CRUD 操作的数据一致性
```

**示例**：

```typescript
import fc from 'fast-check';

describe('Property Tests', () => {
  // Feature: snippet-box, Property 1: 片段 CRUD 操作的数据一致性
  it('should maintain data consistency for CRUD operations', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          code: fc.string({ minLength: 1, maxLength: 10000 }),
          language: fc.constantFrom('javascript', 'python', 'java', 'go')
        }),
        async (snippetData) => {
          // 创建片段
          const created = await snippetManager.createSnippet(snippetData);
        
          // 检索片段
          const retrieved = await snippetManager.getSnippet(created.id);
        
          // 验证数据一致性
          expect(retrieved).not.toBeNull();
          expect(retrieved!.title).toBe(snippetData.title);
          expect(retrieved!.code).toBe(snippetData.code);
          expect(retrieved!.language).toBe(snippetData.language);
        
          // 清理
          await snippetManager.deleteSnippet(created.id);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: snippet-box, Property 2: 片段 ID 的唯一性
  it('should generate unique IDs for all snippets', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1 }),
            code: fc.string({ minLength: 1 }),
            language: fc.string()
          }),
          { minLength: 10, maxLength: 100 }
        ),
        async (snippetsData) => {
          const ids = new Set<string>();
        
          for (const data of snippetsData) {
            const snippet = await snippetManager.createSnippet(data);
            expect(ids.has(snippet.id)).toBe(false);
            ids.add(snippet.id);
          }
        
          // 清理
          for (const id of ids) {
            await snippetManager.deleteSnippet(id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: snippet-box, Property 9: 导出-导入往返一致性
  it('should maintain consistency for export-import round trip', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1 }),
          code: fc.string({ minLength: 1 }),
          language: fc.string(),
          category: fc.option(fc.string()),
          tags: fc.array(fc.string())
        }),
        async (snippetData) => {
          // 创建片段
          const original = await snippetManager.createSnippet(snippetData);
        
          // 导出为 Markdown
          const markdown = await exportService.exportToMarkdown([original.id], '/tmp/test.md');
        
          // 导入
          const imported = await snippetManager.importFromMarkdown('/tmp/test.md');
        
          // 验证一致性
          expect(imported[0].title).toBe(original.title);
          expect(imported[0].code).toBe(original.code);
          expect(imported[0].language).toBe(original.language);
          expect(imported[0].category).toBe(original.category);
          expect(imported[0].tags).toEqual(original.tags);
        
          // 清理
          await snippetManager.deleteSnippet(original.id);
          await snippetManager.deleteSnippet(imported[0].id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

### 端到端测试

**测试框架**：Playwright

**测试场景**：

- 完整的用户工作流程：创建 → 搜索 → 编辑 → 导出 → 分享
- 首次启动欢迎向导流程
- 模型下载流程（暂停、恢复、取消）
- 离线到在线的同步场景
- 冲突解决流程

**示例**：

```typescript
test('complete snippet workflow', async ({ page }) => {
  // 启动应用
  await page.goto('http://localhost:3000');
  
  // 创建片段
  await page.click('[data-testid="new-snippet"]');
  await page.fill('[data-testid="snippet-title"]', 'My Test Snippet');
  await page.fill('[data-testid="snippet-code"]', 'console.log("hello")');
  await page.selectOption('[data-testid="snippet-language"]', 'javascript');
  await page.click('[data-testid="save-snippet"]');
  
  // 验证片段出现在列表中
  await expect(page.locator('text=My Test Snippet')).toBeVisible();
  
  // 搜索片段
  await page.fill('[data-testid="search-input"]', 'test');
  await expect(page.locator('text=My Test Snippet')).toBeVisible();
  
  // 编辑片段
  await page.click('text=My Test Snippet');
  await page.fill('[data-testid="snippet-code"]', 'console.log("updated")');
  await page.click('[data-testid="save-snippet"]');
  
  // 导出片段
  await page.click('[data-testid="export-button"]');
  await page.click('text=导出为 Markdown');
  
  // 验证文件已下载
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toContain('.md');
});
```

### 安全测试

**测试场景**：

- SQL 注入防护
- XSS 防护
- CSRF 防护
- 认证和授权
- 速率限制
- 密码强度验证

**测试工具**：

- OWASP ZAP（自动化安全扫描）
- 手动渗透测试

### 测试覆盖率目标

- 单元测试覆盖率：≥ 80%
- 端到端测试：覆盖所有主要用户流程
- 属性测试：覆盖所有正确性属性

## 部署架构

### 桌面客户端部署

**打包工具**：electron-builder

**平台支持**：

- Windows：NSIS 安装程序（.exe）
- macOS：DMG 镜像（.dmg）+ 代码签名
- Linux：AppImage、deb、rpm

**安装包结构**：

```
SnippetBox/
├── app/                    # 应用主体
│   ├── main.js            # Electron 主进程
│   ├── renderer/          # React 渲染进程
│   └── preload.js         # 预加载脚本
├── resources/             # 资源文件
│   ├── icons/            # 应用图标
│   └── welcome/          # 欢迎向导资源
└── node_modules/         # 依赖
```

**首次安装流程**：

1. 用户下载并安装应用（不包含嵌入模型）
2. 首次启动显示欢迎向导
3. 用户选择是否下载本地模型
4. 如果选择下载，后台开始下载模型文件
5. 用户可以立即开始使用基础功能

**自动更新**：暂未实现

### 云端服务部署

**容器化**：Docker + Docker Compose

**服务架构**：

```yaml
version: '3.8'

services:
  api:
    image: snippetbox-api:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/snippetbox
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
  
  postgres:
    image: pgvector/pgvector:pg16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=snippetbox
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

**负载均衡**：

- Nginx 作为反向代理
- 支持水平扩展（多个 API 实例）
- 健康检查：`GET /health`

**数据库迁移**：

- 使用 Alembic（Python）管理数据库版本
- 部署前自动运行迁移脚本

**监控和日志**：

- 应用日志：结构化 JSON 日志
- 监控：Prometheus + Grafana
- 告警：关键错误自动通知
- 日志聚合：ELK Stack（Elasticsearch + Logstash + Kibana）

## 性能优化

### 客户端性能优化

#### 1. 虚拟滚动

对于大量片段列表，使用虚拟滚动只渲染可见区域：

```typescript
import { FixedSizeList } from 'react-window';

function SnippetList({ snippets }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={snippets.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <SnippetItem snippet={snippets[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

#### 2. 代码分割

使用 React.lazy 和 Suspense 实现路由级代码分割：

```typescript
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const EditorPage = React.lazy(() => import('./pages/Editor'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/editor" element={<EditorPage />} />
      </Routes>
    </Suspense>
  );
}
```

#### 3. 搜索防抖

避免频繁的搜索请求：

```typescript
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchEngine.search(query);
  }, 300),
  []
);
```

#### 4. 本地缓存

缓存频繁访问的数据：

```typescript
class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 分钟
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
  
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
  
    return entry.value;
  }
  
  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
}
```

#### 5. Web Worker

将耗时操作移到 Web Worker：

```typescript
// embedding.worker.ts
import * as ort from 'onnxruntime-web';

let session: ort.InferenceSession | null = null;

self.onmessage = async (e) => {
  const { type, data } = e.data;
  
  if (type === 'init') {
    session = await ort.InferenceSession.create(data.modelPath);
    self.postMessage({ type: 'ready' });
  } else if (type === 'embed') {
    const result = await session!.run(data.input);
    self.postMessage({ type: 'result', data: result });
  }
};
```

### 服务器性能优化

#### 1. 数据库索引

确保所有查询都有适当的索引：

```sql
-- 用户查询索引
CREATE INDEX idx_cloud_snippets_user_updated 
ON cloud_snippets(user_id, updated_at DESC);

-- 向量搜索索引
CREATE INDEX idx_cloud_snippet_vectors_embedding 
ON cloud_snippet_vectors 
USING hnsw (embedding vector_cosine_ops);
```

#### 2. 查询优化

使用 EXPLAIN ANALYZE 分析慢查询：

```sql
EXPLAIN ANALYZE
SELECT * FROM cloud_snippets
WHERE user_id = 'xxx'
  AND is_deleted = false
ORDER BY updated_at DESC
LIMIT 20;
```

#### 3. 连接池

配置合适的数据库连接池：

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)
```

#### 4. Redis 缓存策略

```python
async def get_snippet(snippet_id: str, user_id: str):
    # 尝试从缓存获取
    cache_key = f"snippet:{snippet_id}"
    cached = await redis.get(cache_key)
  
    if cached:
        return json.loads(cached)
  
    # 从数据库查询
    snippet = await db.query(CloudSnippet).filter(
        CloudSnippet.id == snippet_id,
        CloudSnippet.user_id == user_id
    ).first()
  
    if snippet:
        # 写入缓存
        await redis.setex(
            cache_key,
            3600,  # 1 小时
            json.dumps(snippet.dict())
        )
  
    return snippet
```

#### 5. 批量操作

减少数据库往返次数：

```python
async def batch_create_snippets(snippets: List[SnippetCreate], user_id: str):
    # 批量插入
    db_snippets = [
        CloudSnippet(**snippet.dict(), user_id=user_id)
        for snippet in snippets
    ]
  
    db.bulk_save_objects(db_snippets)
    await db.commit()
  
    # 批量生成向量
    texts = [f"{s.title} {s.code}" for s in snippets]
    vectors = await embedding_service.batch_embed(texts)
  
    # 批量插入向量
    db_vectors = [
        CloudSnippetVector(snippet_id=s.id, embedding=v)
        for s, v in zip(db_snippets, vectors)
    ]
  
    db.bulk_save_objects(db_vectors)
    await db.commit()
```

## 安全考虑

### 1. 认证和授权

**JWT 令牌**：

- 访问令牌有效期：7 天
- 刷新令牌有效期：30 天
- 使用 RS256 算法签名
- 令牌包含最小必要信息

```python
def create_access_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
        'type': 'access'
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm='RS256')
```

**密码存储**：

- 使用 bcrypt 或 argon2 哈希
- 加盐（自动）
- 工作因子：12（bcrypt）

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

### 2. 输入验证

**服务器端验证**：

```python
from pydantic import BaseModel, validator

class SnippetCreate(BaseModel):
    title: str
    code: str
    language: str
  
    @validator('title')
    def title_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        if len(v) > 200:
            raise ValueError('Title too long')
        return v.strip()
  
    @validator('code')
    def code_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Code cannot be empty')
        if len(v) > 100000:
            raise ValueError('Code too long')
        return v
```

### 3. SQL 注入防护

使用参数化查询：

```python
# 正确 ✓
snippet = await db.query(Snippet).filter(
    Snippet.id == snippet_id
).first()

# 错误 ✗
snippet = await db.execute(
    f"SELECT * FROM snippets WHERE id = '{snippet_id}'"
)
```

### 4. XSS 防护

**内容安全策略（CSP）**：

```typescript
// Electron 主进程
app.on('ready', () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "connect-src 'self' https://api.snippetbox.com"
        ].join('; ')
      }
    });
  });
});
```

**输出转义**：

```typescript
import DOMPurify from 'dompurify';

function renderSnippetTitle(title: string) {
  return DOMPurify.sanitize(title);
}
```

### 5. 速率限制

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/snippets")
@limiter.limit("60/minute")
async def create_snippet(request: Request, snippet: SnippetCreate):
    # ...
    pass

@app.post("/api/v1/search/semantic")
@limiter.limit("10/minute")
async def semantic_search(request: Request, query: SearchQuery):
    # ...
    pass
```

### 6. HTTPS 强制

```nginx
server {
    listen 80;
    server_name api.snippetbox.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.snippetbox.com;
  
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
  
    # ...
}
```

### 7. 敏感数据保护

**客户端**：

- 使用 Electron safeStorage API 加密存储令牌
- 不在日志中记录敏感信息

```typescript
import { safeStorage } from 'electron';

function saveToken(token: string) {
  const encrypted = safeStorage.encryptString(token);
  localStorage.setItem('auth_token', encrypted.toString('base64'));
}

function loadToken(): string | null {
  const encrypted = localStorage.getItem('auth_token');
  if (!encrypted) return null;
  
  const buffer = Buffer.from(encrypted, 'base64');
  return safeStorage.decryptString(buffer);
}
```

**服务器端**：

- 环境变量存储敏感配置
- 不在响应中返回敏感信息
- 日志脱敏

```python
import re

def sanitize_log(message: str) -> str:
    # 移除邮箱
    message = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', message)
    # 移除令牌
    message = re.sub(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', 'Bearer [TOKEN]', message)
    return message
```

## 可维护性设计

### 代码组织

```
src/
├── main/                  # Electron 主进程
│   ├── index.ts
│   ├── ipc/              # IPC 处理器
│   ├── services/         # 主进程服务
│   └── utils/
├── renderer/             # React 渲染进程
│   ├── components/       # UI 组件
│   ├── pages/           # 页面组件
│   ├── hooks/           # 自定义 Hooks
│   ├── services/        # 业务逻辑
│   ├── store/           # 状态管理
│   └── utils/
├── shared/              # 共享代码
│   ├── types/          # TypeScript 类型
│   ├── constants/      # 常量
│   └── utils/
└── tests/              # 测试
    ├── unit/
    ├── e2e/
    ├── security/
    └── property/
```

### 文档

**代码文档**：

- 所有公共 API 都有 JSDoc 注释
- 复杂逻辑添加注释说明
- README 包含快速开始指南

**API 文档**：

- 使用 OpenAPI/Swagger 规范
- 自动生成 API 文档
- 包含请求/响应示例

**架构文档**：

- 系统架构图
- 数据流图
- 部署架构图

### 版本控制

**Git 工作流**：

- 主分支：main（生产环境）
- 开发分支：develop
- 功能分支：feature/xxx
- 修复分支：fix/xxx

**提交规范**：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：

- feat：新功能
- fix：修复
- docs：文档
- style：格式
- refactor：重构
- test：测试
- chore：构建/工具

### CI/CD

**GitHub Actions 工作流**：

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run test:e2e
  
  build:
    needs: test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run package
      - uses: actions/upload-artifact@v3
        with:
          name: dist-${{ matrix.os }}
          path: dist/
```
