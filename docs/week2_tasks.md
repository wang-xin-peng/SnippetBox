# 第二周任务分配

## 📅 时间：第 2 周（7 天）

## 🎯 本周目标

完成智能搜索和导出功能，实现本地语义搜索、模型下载管理、Markdown/PDF 导出、批量操作和数据导入。

---

## 👨‍💻 王欣鹏（后端开发）- 第二周任务

### 主要负责：后端 API 准备 + 云端嵌入模型部署

### 任务 17：后端 API 基础架构准备 ⭐⭐

**优先级**：P1（为第三周做准备）

#### 17.1 初始化 FastAPI 项目

**文件位置**：`backend/`（新建目录）

**需要创建的文件**：

- `main.py` - FastAPI 应用入口
- `config.py` - 配置管理
- `requirements.txt` - Python 依赖
- `Dockerfile` - 容器化配置

```python
# main.py 示例
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SnippetBox API", version="1.0.0")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "SnippetBox API"}
```

**验收标准**：

- [ ] 创建 FastAPI 项目结构
- [ ] 配置 CORS 中间件
- [ ] 配置日志系统
- [ ] 实现健康检查端点（/health）
- [ ] 编写 README 和环境配置说明

---

#### 17.2 配置 PostgreSQL 数据库

**文件位置**：`backend/database/`

**验收标准**：

- [ ] 设计云端数据库模式（users, snippets, categories, tags）
- [ ] 安装 pgvector 扩展
- [ ] 配置 SQLAlchemy ORM
- [ ] 实现数据库迁移（Alembic）
- [ ] 编写数据库初始化脚本

---

#### 17.3 配置 Redis 缓存

**文件位置**：`backend/cache/`

**验收标准**：

- [ ] 安装和配置 Redis
- [ ] 实现 Redis 连接管理
- [ ] 实现缓存装饰器
- [ ] 实现缓存失效策略
- [ ] 编写缓存使用文档

---

### 任务 18：云端嵌入模型部署 ⭐⭐⭐

**优先级**：P0（为云端语义搜索做准备）

#### 18.1 部署嵌入模型

**文件位置**：`backend/services/embedding.py`

**依赖安装**：

```bash
pip install sentence-transformers
pip install onnxruntime
# 或
pip install onnxruntime-gpu
```

**验收标准**：

- [ ] 下载 all-MiniLM-L6-v2 模型
- [ ] 转换为 ONNX 格式（可选，优化性能）
- [ ] 实现模型加载和初始化
- [ ] 实现模型懒加载
- [ ] 配置 GPU 加速（如果可用）

---

#### 18.2 实现文本向量化 API

**文件位置**：`backend/api/v1/embedding.py`

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    vector: list[float]
    dimension: int

@router.post("/embed", response_model=EmbedResponse)
async def embed_text(request: EmbedRequest):
    # 实现文本向量化
    pass
```

**验收标准**：

- [ ] 实现单个文本向量化端点（POST /api/v1/embed）
- [ ] 实现批量文本向量化端点（POST /api/v1/embed/batch）
- [ ] 实现输入验证和错误处理
- [ ] 添加速率限制
- [ ] 编写 API 文档

---

#### 18.3 优化推理性能

**文件位置**：`backend/services/embedding.py`

**验收标准**：

- [ ] 实现批量推理优化
- [ ] 实现模型预热
- [ ] 配置推理线程池
- [ ] 实现推理结果缓存
- [ ] 性能目标：单次推理 < 100ms

---

#### 18.4 实现向量存储 API

**文件位置**：`backend/api/v1/vectors.py`

```python
@router.post("/vectors/store")
async def store_vector(snippet_id: str, vector: list[float]):
    # 存储向量到 pgvector
    pass

@router.post("/vectors/search")
async def search_similar(query_vector: list[float], limit: int = 10):
    # 向量相似度搜索
    pass
```

**验收标准**：

- [ ] 创建 snippet_vectors 表（使用 pgvector）
- [ ] 配置 HNSW 索引
- [ ] 实现向量存储端点
- [ ] 实现向量相似度搜索端点
- [ ] 编写单元测试

---

### 任务 19：开发环境和工具 ⭐

**优先级**：P1

#### 19.1 配置开发环境

**验收标准**：

- [ ] 编写 docker-compose.yml（PostgreSQL + Redis）
- [ ] 配置环境变量管理（.env）
- [ ] 编写开发环境启动脚本
- [ ] 配置代码格式化工具（black, isort）
- [ ] 配置代码检查工具（pylint, mypy）

---

#### 19.2 编写 API 文档

**验收标准**：

- [ ] 配置 Swagger UI（FastAPI 自动生成）
- [ ] 编写 API 使用示例
- [ ] 编写认证说明文档
- [ ] 编写错误码说明文档

---

### 📊 王欣鹏任务总结

**任务优先级**：

1. 任务 18（云端嵌入模型部署）- Day 1-4
2. 任务 17（后端 API 基础架构）- Day 5-6
3. 任务 19（开发环境和工具）- Day 7

**建议开发顺序**：

- Day 1-2：任务 18.1-18.2（部署模型和向量化 API）
- Day 3-4：任务 18.3-18.4（性能优化和向量存储）
- Day 5-6：任务 17（后端基础架构）
- Day 7：任务 19（开发环境和文档）

---

## 👨‍💻 付佳腾（前端开发）- 第二周任务

### 主要负责：欢迎向导 + 模型下载器 + 本地嵌入服务

### 任务 8：欢迎向导实现 ⭐⭐

**优先级**：P0（最高优先级，影响用户首次体验）

#### 8.1 设计欢迎向导流程

**文件位置**：`src/renderer/components/WelcomeWizard/`

**需要创建的组件**：

- `WelcomeWizard.tsx` - 向导容器
- `WizardSteps.tsx` - 步骤导航
- `WelcomePage.tsx` - 欢迎页面
- `ModelDownloadPage.tsx` - 模型下载选择页面
- `CompletePage.tsx` - 完成页面

```typescript
// 向导步骤
const steps = [
  { id: 1, title: '欢迎使用', component: WelcomePage },
  { id: 2, title: '选择功能', component: ModelDownloadPage },
  { id: 3, title: '完成', component: CompletePage }
]
```

**验收标准**：

- [ ] 创建欢迎向导组件
- [ ] 实现多步骤导航（上一步、下一步、跳过）
- [ ] 添加进度指示器
- [ ] 设计欢迎页面（介绍应用功能）
- [ ] 设计模型下载选择页面
- [ ] 步骤切换动画流畅

---

#### 8.2 实现首次启动检测

**文件位置**：`src/main/services/SettingsManager.ts`

```typescript
class SettingsManager {
  // 检测是否首次启动
  isFirstLaunch(): Promise<boolean>
  
  // 标记已完成首次启动
  markFirstLaunchComplete(): Promise<void>
  
  // 保存用户选择
  saveWizardChoices(choices: WizardChoices): Promise<void>
}

interface WizardChoices {
  downloadModel: boolean  // 是否下载本地模型
  searchMode: 'local' | 'lightweight'  // 搜索模式
}
```

**验收标准**：

- [ ] 检测是否首次启动
- [ ] 显示欢迎向导
- [ ] 保存用户选择到设置
- [ ] 实现"跳过"和"下次提醒"选项
- [ ] 编写单元测试

---

### 任务 9：模型下载器实现 ⭐⭐⭐

**优先级**：P0（核心功能）

#### 9.1 实现模型下载核心功能

**文件位置**：`src/main/services/ModelDownloader.ts`

```typescript
class ModelDownloader {
  // 下载模型
  startDownload(mirrorUrl?: string): Promise<void>
  
  // 暂停下载
  pauseDownload(): Promise<void>
  
  // 恢复下载
  resumeDownload(): Promise<void>
  
  // 取消下载
  cancelDownload(): Promise<void>
  
  // 获取下载进度
  getProgress(): DownloadProgress
  
  // 验证模型文件
  verifyModel(filePath: string): Promise<boolean>
  
  // 删除模型
  deleteModel(): Promise<void>
}
```

**验收标准**：

- [ ] 实现 HTTP 下载（支持断点续传）
- [ ] 实现下载进度跟踪
- [ ] 实现 SHA256 校验
- [ ] 实现模型文件缓存管理
- [ ] 通过 IPC 暴露给渲染进程
- [ ] 编写单元测试

**依赖**：

```bash
npm install axios
npm install crypto  # Node.js 内置
```

---

#### 9.2 实现多镜像源支持

**文件位置**：`src/main/config/mirrors.ts`

```typescript
export const MODEL_MIRRORS: MirrorInfo[] = [
  {
    url: 'https://cdn.example.com/models/all-MiniLM-L6-v2.onnx',
    name: '官方 CDN',
    location: '全球',
    priority: 1
  },
  {
    url: 'https://github.com/releases/download/v1.0/all-MiniLM-L6-v2.onnx',
    name: 'GitHub Release',
    location: '全球',
    priority: 2
  },
  {
    url: 'https://backup-cdn.example.com/models/all-MiniLM-L6-v2.onnx',
    name: '备用 CDN',
    location: '中国',
    priority: 3
  }
]
```

**验收标准**：

- [ ] 配置多个 CDN 镜像源
- [ ] 实现镜像源自动切换
- [ ] 实现镜像源速度测试（可选）
- [ ] 实现用户手动选择镜像源

---

#### 9.3 实现后台下载

**文件位置**：`src/main/services/ModelDownloader.ts`

**验收标准**：

- [ ] 在 Electron 主进程中实现下载
- [ ] 实现下载暂停和恢复
- [ ] 实现下载取消
- [ ] 实现下载进度持久化
- [ ] 应用重启后可以恢复下载

---

#### 9.4 实现下载 UI

**文件位置**：`src/renderer/components/ModelDownload/`

**需要创建的组件**：

- `DownloadDialog.tsx` - 下载进度对话框
- `DownloadProgress.tsx` - 进度显示
- `DownloadControls.tsx` - 控制按钮
- `MirrorSelector.tsx` - 镜像源选择器

**验收标准**：

- [ ] 创建下载进度对话框
- [ ] 显示下载速度和剩余时间
- [ ] 实现暂停/恢复/取消按钮
- [ ] 实现下载完成通知

---

### 任务 10：本地嵌入服务实现 ⭐⭐⭐

**优先级**：P0（核心功能）

#### 10.1 集成 ONNX Runtime

**文件位置**：`src/main/services/LocalEmbeddingService.ts`

**依赖安装**：

```bash
npm install onnxruntime-node
# 或
npm install onnxruntime-web
```

**验收标准**：

- [ ] 安装 onnxruntime-node
- [ ] 实现模型加载（all-MiniLM-L6-v2）
- [ ] 实现模型懒加载
- [ ] 实现模型卸载（释放内存）
- [ ] 编写单元测试

---

#### 10.2 实现文本向量化

**文件位置**：`src/main/services/LocalEmbeddingService.ts`

```typescript
class LocalEmbeddingService {
  // 初始化模型
  initialize(): Promise<void>
  
  // 检查模型是否已加载
  isModelLoaded(): boolean
  
  // 生成单个文本的向量
  embed(text: string): Promise<number[]>
  
  // 批量生成向量
  batchEmbed(texts: string[]): Promise<number[][]>
  
  // 卸载模型释放内存
  unload(): Promise<void>
}
```

**验收标准**：

- [ ] 实现 tokenization
- [ ] 实现输入预处理（padding）
- [ ] 实现模型推理
- [ ] 实现批量向量化
- [ ] 性能目标：单次推理 < 200ms
- [ ] 编写单元测试

---

#### 10.3 实现 Web Worker 优化（可选）

**优先级**：P1（如果时间允许）

**文件位置**：`src/main/workers/embedding.worker.ts`

**验收标准**：

- [ ] 创建 embedding.worker.ts
- [ ] 在 Worker 中加载模型
- [ ] 实现主线程与 Worker 通信
- [ ] 实现 Worker 错误处理

---

### 📊 付佳腾任务总结

**任务优先级**：

1. 任务 8（欢迎向导）- Day 1
2. 任务 9.1-9.3（模型下载器）- Day 2-3
3. 任务 9.4（下载 UI）- Day 4
4. 任务 10.1-10.2（本地嵌入服务）- Day 5-6
5. 任务 10.3（Worker 优化）- Day 7（可选）

**建议开发顺序**：

- Day 1：任务 8（欢迎向导）
- Day 2-3：任务 9.1-9.3（模型下载核心）
- Day 4：任务 9.4（下载 UI）
- Day 5-6：任务 10.1-10.2（嵌入服务）
- Day 7：任务 10.3（优化）+ 测试

---

## 👨‍💻 赵祐晟（全栈/测试）- 第二周任务

### 主要负责：向量存储 + 智能搜索引擎 + 导出功能 + 测试

### 任务 11：向量存储实现 ⭐⭐⭐

**优先级**：P0（核心功能）

**依赖**：需要等待付佳腾完成任务 10.1-10.2（本地嵌入服务）

#### 11.1 集成 sqlite-vss 扩展

**文件位置**：`src/main/database/vector.ts`

**依赖安装**：

```bash
npm install sqlite-vss
```

**验收标准**：

- [ ] 安装和配置 sqlite-vss
- [ ] 创建 snippet_vectors 虚拟表
- [ ] 创建 snippet_vector_mapping 关联表
- [ ] 配置 HNSW 索引
- [ ] 编写单元测试

---

#### 11.2 实现向量存储接口

**文件位置**：`src/main/services/VectorStore.ts`

```typescript
class VectorStore {
  // 存储向量
  storeVector(snippetId: string, vector: number[]): Promise<void>
  
  // 批量存储向量
  batchStoreVectors(vectors: Array<{snippetId: string, vector: number[]}>): Promise<void>
  
  // 向量相似度搜索
  searchSimilar(queryVector: number[], limit: number): Promise<SearchResult[]>
  
  // 删除向量
  deleteVector(snippetId: string): Promise<void>
}
```

**验收标准**：

- [ ] 实现存储向量
- [ ] 实现批量存储向量
- [ ] 实现向量相似度搜索
- [ ] 实现删除向量
- [ ] 通过 IPC 暴露给渲染进程
- [ ] 编写单元测试

---

#### 11.3 实现向量自动更新

**文件位置**：`src/main/services/VectorStore.ts`

**验收标准**：

- [ ] 片段创建时自动生成向量
- [ ] 片段更新时自动更新向量
- [ ] 片段删除时自动删除向量
- [ ] 实现向量生成队列（避免阻塞）
- [ ] 编写单元测试

---

### 任务 12：智能搜索引擎实现 ⭐⭐⭐

**优先级**：P0（核心功能）

**依赖**：需要等待任务 11（向量存储）完成

#### 12.1 实现搜索策略选择

**文件位置**：`src/main/services/SearchEngine.ts`

```typescript
class SearchEngine {
  // 搜索能力检测
  getSearchCapability(): SearchCapability
  
  // 本地语义搜索策略
  localSemanticSearch(query: string): Promise<SearchResult[]>
  
  // 云端语义搜索策略（占位符）
  cloudSemanticSearch(query: string): Promise<SearchResult[]>
  
  // 全文搜索策略
  fullTextSearch(query: string): Promise<SearchResult[]>
}

interface SearchCapability {
  hasLocalModel: boolean
  isLoggedIn: boolean
  isOnline: boolean
  recommendedMode: 'local' | 'cloud' | 'keyword'
}
```

**验收标准**：

- [ ] 实现搜索能力检测
- [ ] 实现本地语义搜索策略
- [ ] 实现云端语义搜索策略（占位符）
- [ ] 实现全文搜索策略
- [ ] 编写单元测试

---

#### 12.2 实现智能降级逻辑

**文件位置**：`src/main/services/SearchEngine.ts`

**验收标准**：

- [ ] 检测本地模型状态
- [ ] 检测用户登录状态
- [ ] 检测网络连接状态
- [ ] 实现自动降级决策
- [ ] 编写单元测试

---

#### 12.3 实现搜索模式指示器

**文件位置**：`src/renderer/components/Search/SearchModeIndicator.tsx`

**验收标准**：

- [ ] 创建搜索模式图标组件
- [ ] 显示当前搜索模式（本地/云端/关键词）
- [ ] 实现悬停提示（说明当前模式）
- [ ] 实现模式切换动画

---

#### 12.4 实现搜索结果合并

**文件位置**：`src/main/services/SearchEngine.ts`

**验收标准**：

- [ ] 合并全文搜索和语义搜索结果
- [ ] 实现结果去重
- [ ] 实现结果排序（相关度 + 相似度）
- [ ] 实现搜索结果缓存（5 分钟）
- [ ] 编写单元测试

---

### 任务 13：导出功能实现 ⭐⭐

**优先级**：P1

#### 13.1 实现 Markdown 导出

**文件位置**：`src/main/services/ExportService.ts`

```typescript
class ExportService {
  // 导出单个片段为 Markdown
  exportToMarkdown(snippetId: string, filePath: string): Promise<void>
  
  // 批量导出片段为 Markdown
  batchExportToMarkdown(snippetIds: string[], filePath: string): Promise<void>
}
```

**验收标准**：

- [ ] 创建 Markdown 模板
- [ ] 实现单个片段导出
- [ ] 实现批量片段导出
- [ ] 包含元数据（分类、标签、创建时间）
- [ ] 编写单元测试

---

#### 13.2 实现 PDF 导出

**文件位置**：`src/main/services/ExportService.ts`

**依赖安装**：

```bash
npm install puppeteer
# 或
npm install electron-pdf
```

**验收标准**：

- [ ] 集成 Puppeteer 或 electron-pdf
- [ ] 实现 HTML 到 PDF 转换
- [ ] 保留语法高亮样式
- [ ] 实现页面布局和分页
- [ ] 编写单元测试

---

#### 13.3 实现导出 UI

**文件位置**：`src/renderer/components/Export/`

**需要创建的组件**：

- `ExportDialog.tsx` - 导出对话框
- `FormatSelector.tsx` - 格式选择器
- `ExportProgress.tsx` - 导出进度

**验收标准**：

- [ ] 创建导出对话框
- [ ] 实现格式选择（Markdown/PDF）
- [ ] 实现文件保存位置选择
- [ ] 显示导出进度和结果

---

#### 13.4 实现导出预览

**文件位置**：`src/renderer/components/Export/ExportPreview.tsx`

**验收标准**：

- [ ] 生成导出预览
- [ ] 显示预览对话框
- [ ] 实现预览刷新
- [ ] 实现从预览直接导出

---

### 任务 14：批量操作功能 ⭐⭐

**优先级**：P1

#### 14.1 实现批量选择

**文件位置**：`src/renderer/components/SnippetList/BatchSelection.tsx`

**验收标准**：

- [ ] 实现片段多选（Checkbox）
- [ ] 实现全选/取消全选
- [ ] 实现选择计数显示
- [ ] 实现批量操作工具栏

---

#### 14.2 实现批量操作

**文件位置**：`src/main/services/SnippetManager.ts`

```typescript
class SnippetManager {
  // 批量删除
  batchDelete(snippetIds: string[]): Promise<BatchResult>
  
  // 批量修改标签
  batchUpdateTags(snippetIds: string[], tags: string[]): Promise<BatchResult>
  
  // 批量修改分类
  batchUpdateCategory(snippetIds: string[], categoryId: string): Promise<BatchResult>
  
  // 批量导出
  batchExport(snippetIds: string[], format: 'markdown' | 'pdf'): Promise<BatchResult>
}

interface BatchResult {
  success: number
  failed: number
  errors: Array<{snippetId: string, error: string}>
}
```

**验收标准**：

- [ ] 实现批量删除
- [ ] 实现批量修改标签
- [ ] 实现批量修改分类
- [ ] 实现批量导出
- [ ] 通过 IPC 暴露给渲染进程
- [ ] 编写单元测试

---

#### 14.3 实现批量操作 UI

**文件位置**：`src/renderer/components/SnippetList/BatchOperations.tsx`

**验收标准**：

- [ ] 显示批量操作进度
- [ ] 显示操作结果（成功/失败数量）
- [ ] 显示失败项详情
- [ ] 实现操作撤销（可选）

---

### 任务 15：数据导入功能 ⭐⭐

**优先级**：P1

#### 15.1 实现 Markdown 导入

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
- [ ] 自动检测编程语言
- [ ] 创建片段记录
- [ ] 编写单元测试

---

#### 15.2 实现 JSON 导入

**文件位置**：`src/main/services/ImportService.ts`

**验收标准**：

- [ ] 验证 JSON 格式
- [ ] 解析片段数据
- [ ] 批量导入片段
- [ ] 处理格式错误
- [ ] 编写单元测试

---

#### 15.3 实现重复检测

**文件位置**：`src/main/services/ImportService.ts`

**验收标准**：

- [ ] 检测重复片段（标题 + 代码）
- [ ] 提示用户选择（覆盖/保留/跳过）
- [ ] 实现智能合并
- [ ] 记录导入日志

---

#### 15.4 实现导入 UI

**文件位置**：`src/renderer/components/Import/`

**需要创建的组件**：

- `ImportDialog.tsx` - 导入对话框
- `ImportProgress.tsx` - 导入进度
- `ImportResult.tsx` - 导入结果摘要

**验收标准**：

- [ ] 创建导入对话框
- [ ] 支持文件拖放
- [ ] 显示导入进度
- [ ] 显示导入结果摘要

---

### 任务 16：第 2 周测试 ⭐⭐

**优先级**：P0

#### 16.1 单元测试

**文件位置**：`tests/unit/`

**验收标准**：

- [ ] 向量存储单元测试
- [ ] 搜索引擎单元测试
- [ ] 导出服务单元测试
- [ ] 导入服务单元测试
- [ ] 批量操作单元测试
- [ ] 测试覆盖率 >= 80%

---

#### 16.2 集成测试

**文件位置**：`tests/integration/`

**验收标准**：

- [ ] 向量化和存储集成测试
- [ ] 智能搜索降级集成测试
- [ ] 导出功能集成测试
- [ ] 导入功能集成测试

---

#### 16.3 属性测试

**文件位置**：`tests/property/`

**验收标准**：

- [ ] 属性 7：全文搜索索引的同步性
- [ ] 属性 9：导出-导入往返一致性
- [ ] 属性 11：搜索策略选择的确定性
- [ ] 属性 12：向量维度的一致性
- [ ] 属性 13：向量存储的往返一致性

---

#### 16.4 端到端测试

**文件位置**：`tests/e2e/`

**验收标准**：

- [ ] 完整搜索流程测试
- [ ] 导出流程测试
- [ ] 导入流程测试
- [ ] 批量操作流程测试

---

### 📊 赵祐晟任务总结

**任务优先级**：

1. 等待付佳腾完成本地嵌入服务（Day 1-5）
2. 任务 11.1-11.2（向量存储）- Day 6
3. 任务 11.3（向量自动更新）- Day 6
4. 任务 12.1-12.2（搜索引擎）- Day 7
5. 任务 12.3-12.4（搜索 UI）- Day 7
6. 任务 13-15（导出导入批量操作）- 后续迭代
7. 任务 16（测试）- Day 7

**建议开发顺序**：

- Day 1-5：熟悉向量存储技术，设计搜索引擎架构
- Day 6：任务 11（向量存储）
- Day 7：任务 12（智能搜索引擎）+ 任务 16（测试）

**注意事项**：

- 任务 13-15（导出、批量操作、导入）优先级为 P1，如果时间紧张可以放到第 3 周
- 重点保证任务 11-12（向量存储和智能搜索）的质量
- 测试任务 16 必须完成，确保核心功能稳定

---

## 🤝 协作要点

### 关键接口约定

#### 本地嵌入服务接口（付佳腾提供）

**文件**：`src/main/services/LocalEmbeddingService.ts`

```typescript
export interface LocalEmbeddingService {
  // 初始化模型
  initialize(): Promise<void>
  
  // 检查模型是否已加载
  isModelLoaded(): boolean
  
  // 生成单个文本的向量
  embed(text: string): Promise<number[]>
  
  // 批量生成向量
  batchEmbed(texts: string[]): Promise<number[][]>
  
  // 卸载模型释放内存
  unload(): Promise<void>
}
```

---

#### 向量存储接口（赵祐晟提供）

**文件**：`src/main/services/VectorStore.ts`

```typescript
export interface VectorStore {
  // 存储向量
  storeVector(snippetId: string, vector: number[]): Promise<void>
  
  // 批量存储向量
  batchStoreVectors(vectors: Array<{snippetId: string, vector: number[]}>): Promise<void>
  
  // 向量相似度搜索
  searchSimilar(queryVector: number[], limit: number): Promise<SearchResult[]>
  
  // 删除向量
  deleteVector(snippetId: string): Promise<void>
}
```

---

#### 搜索引擎接口（赵祐晟提供）

**文件**：`src/main/services/SearchEngine.ts`

```typescript
export interface SearchEngine {
  // 搜索能力检测
  getSearchCapability(): SearchCapability
  
  // 统一搜索接口（自动选择策略）
  search(query: string): Promise<SearchResult[]>
  
  // 本地语义搜索
  localSemanticSearch(query: string): Promise<SearchResult[]>
  
  // 全文搜索
  fullTextSearch(query: string): Promise<SearchResult[]>
}

export interface SearchCapability {
  hasLocalModel: boolean
  isLoggedIn: boolean
  isOnline: boolean
  recommendedMode: 'local' | 'cloud' | 'keyword'
}
```

---

#### 云端嵌入服务接口（王欣鹏提供）

**文件**：`backend/api/v1/embedding.py`

```python
# POST /api/v1/embed
{
  "text": "string"
}

# Response
{
  "vector": [0.1, 0.2, ...],  # 384 维向量
  "dimension": 384
}

# POST /api/v1/embed/batch
{
  "texts": ["string1", "string2", ...]
}

# Response
{
  "vectors": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  "dimension": 384
}
```

---

#### IPC 通信接口（双方共同约定）

**文件**：`src/shared/types/ipc.ts`

```typescript
// 模型下载相关
export const IPC_CHANNELS = {
  // 模型下载
  MODEL_START_DOWNLOAD: 'model:start-download',
  MODEL_PAUSE_DOWNLOAD: 'model:pause-download',
  MODEL_RESUME_DOWNLOAD: 'model:resume-download',
  MODEL_CANCEL_DOWNLOAD: 'model:cancel-download',
  MODEL_GET_PROGRESS: 'model:get-progress',
  MODEL_DELETE: 'model:delete',
  
  // 本地嵌入
  EMBEDDING_INITIALIZE: 'embedding:initialize',
  EMBEDDING_IS_LOADED: 'embedding:is-loaded',
  EMBEDDING_EMBED: 'embedding:embed',
  EMBEDDING_BATCH_EMBED: 'embedding:batch-embed',
  EMBEDDING_UNLOAD: 'embedding:unload',
  
  // 向量存储
  VECTOR_STORE: 'vector:store',
  VECTOR_BATCH_STORE: 'vector:batch-store',
  VECTOR_SEARCH: 'vector:search',
  VECTOR_DELETE: 'vector:delete',
  
  // 搜索
  SEARCH_CAPABILITY: 'search:capability',
  SEARCH_QUERY: 'search:query',
  SEARCH_LOCAL_SEMANTIC: 'search:local-semantic',
  
  // 导出
  EXPORT_MARKDOWN: 'export:markdown',
  EXPORT_PDF: 'export:pdf',
  EXPORT_BATCH: 'export:batch',
  
  // 导入
  IMPORT_MARKDOWN: 'import:markdown',
  IMPORT_JSON: 'import:json',
  
  // 批量操作
  BATCH_DELETE: 'batch:delete',
  BATCH_UPDATE_TAGS: 'batch:update-tags',
  BATCH_UPDATE_CATEGORY: 'batch:update-category',
}
```

---

#### 类型定义（双方共同约定）

**文件**：`src/shared/types/index.ts`

```typescript
// 模型下载进度
export interface DownloadProgress {
  downloaded: number  // 已下载字节数
  total: number       // 总字节数
  percentage: number  // 下载百分比
  speed: number       // 下载速度（字节/秒）
  remainingTime: number  // 剩余时间（秒）
  status: 'downloading' | 'paused' | 'completed' | 'failed'
}

// 搜索结果
export interface SearchResult {
  snippet: Snippet
  score: number       // 相关度分数
  similarity?: number // 相似度分数（语义搜索）
  highlights?: string[] // 高亮关键词
}

// 批量操作结果
export interface BatchResult {
  success: number
  failed: number
  errors: Array<{snippetId: string, error: string}>
}

// 导入结果
export interface ImportResult {
  imported: number
  skipped: number
  errors: Array<{file: string, error: string}>
}
```

---

### 开发流程

#### Day 1-2（周一-周二）

**王欣鹏**：

- 开始任务 18.1-18.2（部署模型和向量化 API）
- 搭建 FastAPI 基础项目结构

**付佳腾**：

- 完成任务 8（欢迎向导）
- 开始任务 9.1-9.2（模型下载核心）
- 创建 PR：`feature/welcome-wizard`

**赵祐晟**：

- 熟悉 sqlite-vss 和向量存储技术
- 设计搜索引擎架构
- 准备测试框架

**协作**：

- 确认欢迎向导的 UI 设计
- 讨论模型下载流程
- 确认云端 API 接口格式

---

#### Day 3-4（周三-周四）

**王欣鹏**：

- 完成任务 18.3-18.4（性能优化和向量存储 API）
- 提供 API 文档给前端

**付佳腾**：

- 完成任务 9.1-9.3（模型下载核心）
- 完成任务 9.4（下载 UI）
- 创建 PR：`feature/model-downloader`

**赵祐晟**：

- 继续设计工作
- 编写向量存储接口文档
- 编写搜索引擎接口文档

**协作**：

- 确认模型下载接口
- 讨论搜索降级策略
- 测试云端向量化 API

---

#### Day 5-6（周五-周六）

**王欣鹏**：

- 完成任务 17（后端基础架构）
- 配置 PostgreSQL 和 Redis
- 编写 API 使用文档

**付佳腾**：

- 完成任务 10.1-10.2（本地嵌入服务）
- 创建 PR：`feature/local-embedding`
- 通知赵祐晟可以开始集成

**赵祐晟**：

- 完成任务 11（向量存储）
- 创建 PR：`feature/vector-store`

**协作**：

- Code Review：`feature/local-embedding`
- Code Review：`feature/vector-store`
- 集成测试：本地嵌入 + 向量存储

---

#### Day 7（周日）

**王欣鹏**：

- 完成任务 19（开发环境和文档）
- 协助前端测试云端 API
- 整理本周工作

**付佳腾**：

- 完成任务 10.3（Worker 优化，可选）
- 协助测试和 bug 修复

**赵祐晟**：

- 完成任务 12（智能搜索引擎）
- 完成任务 16（第 2 周测试）
- 创建 PR：`feature/smart-search`
- 整理本周工作总结

**协作**：

- Code Review：`feature/smart-search`
- 端到端测试：完整搜索流程
- 本周工作总结和下周计划

## 📅 开发流程（Day 1-7）

### Day 1（周一）

**王欣鹏**：

- [ ] 开始任务 18.1（部署嵌入模型）
- [ ] 创建 FastAPI 项目结构

**付佳腾**：

- [ ] 完成任务 8.1（欢迎向导流程设计）
- [ ] 完成任务 8.2（首次启动检测）
- [ ] 创建 PR：`feature/welcome-wizard`

**赵祐晟**：

- [ ] 研究 sqlite-vss 文档和示例
- [ ] 研究 ONNX Runtime 和向量化技术
- [ ] 设计向量存储数据库模式

**协作**：

- 确认欢迎向导的 UI 设计
- 讨论模型下载流程
- 确认云端 API 接口格式

---

### Day 2（周二）

**王欣鹏**：

- [ ] 完成任务 18.1（部署嵌入模型）
- [ ] 开始任务 18.2（文本向量化 API）

**付佳腾**：

- [ ] 完成任务 9.1（模型下载核心功能）
- [ ] 完成任务 9.2（多镜像源支持）

**赵祐晟**：

- [ ] 设计搜索引擎架构
- [ ] 设计搜索策略选择逻辑
- [ ] 准备测试框架和测试用例

**协作**：

- 确认模型下载接口
- 讨论搜索降级策略

---

### Day 3（周三）

**王欣鹏**：

- [ ] 完成任务 18.2（文本向量化 API）
- [ ] 开始任务 18.3（优化推理性能）

**付佳腾**：

- [ ] 完成任务 9.3（后台下载）
- [ ] 开始任务 9.4（下载 UI）

**赵祐晟**：

- [ ] 继续设计工作
- [ ] 编写向量存储接口文档
- [ ] 编写搜索引擎接口文档

**协作**：

- 确认下载进度显示方式
- 讨论向量存储接口设计
- 测试云端向量化 API

---

### Day 4（周四）

**王欣鹏**：

- [ ] 完成任务 18.3（优化推理性能）
- [ ] 开始任务 18.4（向量存储 API）

**付佳腾**：

- [ ] 完成任务 9.4（下载 UI）
- [ ] 创建 PR：`feature/model-downloader`
- [ ] 开始任务 10.1（集成 ONNX Runtime）

**赵祐晟**：

- [ ] 完成接口设计文档
- [ ] 准备向量存储实现
- [ ] 编写测试用例

**协作**：

- Code Review：`feature/model-downloader`
- 确认本地嵌入服务接口
- 测试云端向量存储 API

---

### Day 5（周五）

**王欣鹏**：

- [ ] 完成任务 18.4（向量存储 API）
- [ ] 开始任务 17（后端基础架构）

**付佳腾**：

- [ ] 完成任务 10.1（集成 ONNX Runtime）
- [ ] 完成任务 10.2（文本向量化）
- [ ] 创建 PR：`feature/local-embedding`

**赵祐晟**：

- [ ] 等待付佳腾完成本地嵌入服务
- [ ] 准备向量存储实现
- [ ] 编写单元测试

**协作**：

- Code Review：`feature/local-embedding`
- 测试本地嵌入服务接口

---

### Day 6（周六）

**王欣鹏**：

- [ ] 完成任务 17（后端基础架构）
- [ ] 配置 PostgreSQL 和 Redis

**付佳腾**：

- [ ] 开始任务 10.3（Worker 优化，可选）
- [ ] 协助赵祐晟测试向量存储

**赵祐晟**：

- [ ] 完成任务 11.1（集成 sqlite-vss）
- [ ] 完成任务 11.2（向量存储接口）
- [ ] 完成任务 11.3（向量自动更新）
- [ ] 创建 PR：`feature/vector-store`

**协作**：

- Code Review：`feature/vector-store`
- 集成测试：本地嵌入 + 向量存储

---

### Day 7（周日）

**王欣鹏**：

- [ ] 完成任务 19（开发环境和文档）
- [ ] 协助前端测试云端 API
- [ ] 整理本周工作

**付佳腾**：

- [ ] 完成任务 10.3（Worker 优化，可选）
- [ ] 协助测试和 bug 修复
- [ ] 整理本周工作

**赵祐晟**：

- [ ] 完成任务 12.1-12.2（搜索策略和降级）
- [ ] 完成任务 12.3-12.4（搜索 UI 和结果合并）
- [ ] 完成任务 16（第 2 周测试）
- [ ] 创建 PR：`feature/smart-search`
- [ ] 整理本周工作总结

**协作**：

- Code Review：`feature/smart-search`
- 端到端测试：完整搜索流程
- 本周工作总结和下周计划

---

## 🎯 本周成功标准

### 功能完成度

- [ ] 欢迎向导可以正常显示和使用
- [ ] 模型下载器可以下载、暂停、恢复、取消下载
- [ ] 本地嵌入服务可以加载模型并生成向量
- [ ] 向量存储可以存储和检索向量
- [ ] 智能搜索引擎可以根据条件自动选择搜索策略
- [ ] 搜索结果准确且响应快速（< 200ms）
- [ ] 云端嵌入 API 可以正常调用

### 代码质量

- [ ] 测试覆盖率 >= 80%
- [ ] 无 ESLint 错误
- [ ] 所有 PR 都经过 Code Review
- [ ] 代码符合团队规范
- [ ] 关键函数有注释

### 性能指标

- [ ] 模型加载时间 < 3 秒
- [ ] 单次向量化时间 < 200ms（本地）
- [ ] 单次向量化时间 < 100ms（云端）
- [ ] 向量搜索时间 < 100ms
- [ ] 搜索总响应时间 < 300ms

### 用户体验

- [ ] 欢迎向导流程清晰易懂
- [ ] 模型下载进度显示准确
- [ ] 搜索模式指示器清晰可见
- [ ] 搜索结果排序合理
- [ ] 错误提示友好

### 文档完善

- [ ] 所有接口都有 TypeScript 类型定义
- [ ] 关键函数有注释
- [ ] README 更新（添加第 2 周功能说明）
- [ ] API 文档更新（Swagger）
- [ ] 后端 API 使用文档

---

## ⚠️ 风险和注意事项

### 技术风险

1. **ONNX Runtime 性能问题**

   - 风险：模型推理可能比预期慢
   - 缓解：使用 Web Worker 优化，提供云端选项
2. **sqlite-vss 兼容性问题**

   - 风险：可能在某些平台上无法正常工作
   - 缓解：提前在多平台测试，准备降级方案
3. **向量搜索准确性问题**

   - 风险：搜索结果可能不够准确
   - 缓解：调整相似度阈值，结合全文搜索
4. **云端服务部署问题**

   - 风险：服务器配置和部署可能遇到问题
   - 缓解：使用 Docker 容器化，提前测试部署流程

### 时间风险

1. **任务 13-15 时间不足**

   - 风险：导出、批量操作、导入功能可能无法完成
   - 缓解：这些功能优先级为 P1，可以放到第 3 周
2. **测试时间不足**

   - 风险：测试覆盖率可能达不到 80%
   - 缓解：优先测试核心功能，次要功能后续补充
3. **后端开发进度延迟**

   - 风险：云端 API 可能无法按时完成
   - 缓解：优先完成嵌入 API，其他功能第 3 周继续

### 协作风险

1. **接口不匹配**

   - 风险：前后端接口可能不匹配
   - 缓解：提前约定接口，及时沟通
2. **进度不同步**

   - 风险：赵祐晟需要等待付佳腾完成本地嵌入服务
   - 缓解：赵祐晟提前做好设计和准备工作
3. **API 联调问题**

   - 风险：前后端联调可能遇到问题
   - 缓解：提供详细的 API 文档和测试用例

---

## 📝 可选功能（如果时间允许）

以下功能优先级为 P1，如果时间紧张可以放到第 3 周：

- [ ] 任务 10.3：Web Worker 优化
- [ ] 任务 13：导出功能（Markdown/PDF）
- [ ] 任务 14：批量操作功能
- [ ] 任务 15：数据导入功能
