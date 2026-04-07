# 第一周任务分配

## 📅 时间：第 1 周（7 天）

## 🎯 本周目标

完成基础架构与本地核心功能，实现可运行的桌面应用，本地 CRUD 可用。

---

## 王欣鹏 - 第一周任务

### 任务 1：项目初始化和基础架构 ✅

- [X] 1.1 初始化 Electron + React + TypeScript 项目
- [X] 1.2 配置开发环境（热重载、调试、测试）
- [X] 1.3 设计和实现基础 UI 框架
  - [X] 主窗口布局（侧边栏 + 主内容区）
  - [X] React Router 路由系统
  - [X] 基础 UI 组件库（Button、Input、Modal）
  - [X] 主题系统（浅色/深色主题）

---

## 👨‍💻 付佳腾（前端开发）- 第一周任务

### 主要负责：本地数据库 + 片段管理 + Monaco Editor

### 任务 2：本地数据库设计和实现

**优先级**：P0（最高优先级，其他功能依赖此任务）

#### 2.1 设计 SQLite 数据库模式

**文件位置**：`src/main/database/schema.ts`

```typescript
// 需要创建的表：
// 1. snippets - 片段主表
// 2. categories - 分类表
// 3. tags - 标签表
// 4. snippet_tags - 片段标签关联表
// 5. settings - 设置表
// 6. sync_queue - 同步队列表
```

**验收标准**：

- [X] 定义所有表的 SQL 创建语句
- [X] 包含必要的索引和外键约束
- [X] 编写数据库初始化脚本

---

#### 2.2 实现数据库访问层

**文件位置**：`src/main/database/index.ts`

```typescript
// 需要实现的功能：
class Database {
  // 连接管理
  connect(): Promise<void>
  close(): Promise<void>
  
  // 事务支持
  transaction<T>(callback: () => Promise<T>): Promise<T>
  
  // 迁移机制
  migrate(): Promise<void>
  
  // 备份功能
  backup(path: string): Promise<void>
}
```

**验收标准**：

- [X] 封装 SQLite 连接管理
- [X] 实现事务支持
- [X] 实现数据库迁移机制
- [X] 实现数据库备份功能
- [X] 编写单元测试

**依赖**：需要安装 `better-sqlite3` 或 `sqlite3`

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

---

#### 2.3 配置全文搜索（FTS5）

**文件位置**：`src/main/database/fts.ts`

```typescript
// 需要实现的功能：
// 1. 创建 snippets_fts 虚拟表
// 2. 实现 FTS 索引自动更新触发器
// 3. 实现全文搜索查询接口
```

**验收标准**：

- [X] 创建 FTS5 虚拟表
- [X] 实现触发器自动同步索引
- [X] 实现搜索查询接口
- [X] 支持中文分词（可选）

---

### 任务 3：片段管理核心功能 ⭐⭐⭐

**优先级**：P0

#### 3.1 实现 Snippet Manager 服务

**文件位置**：`src/main/services/SnippetManager.ts`

```typescript
class SnippetManager {
  // CRUD 操作
  createSnippet(snippet: CreateSnippetDto): Promise<Snippet>
  listSnippets(filter?: SnippetFilter): Promise<Snippet[]>
  getSnippet(id: string): Promise<Snippet>
  updateSnippet(id: string, data: UpdateSnippetDto): Promise<Snippet>
  deleteSnippet(id: string): Promise<void>
  
  // 过滤功能
  filterByCategory(categoryId: string): Promise<Snippet[]>
  filterByTags(tagIds: string[]): Promise<Snippet[]>
  filterByLanguage(language: string): Promise<Snippet[]>
}
```

**验收标准**：

- [X] 实现所有 CRUD 操作
- [X] 实现过滤功能
- [X] 通过 IPC 暴露给渲染进程
- [X] 编写单元测试

**预计时间**：6-8 小时

---

#### 3.2 实现片段列表 UI

**文件位置**：`src/renderer/components/SnippetList/`

**需要创建的组件**：

- `SnippetList.tsx` - 列表容器（支持虚拟滚动）
- `SnippetCard.tsx` - 片段卡片
- `SnippetFilter.tsx` - 筛选器

**验收标准**：

- [X] 创建片段列表组件
- [X] 实现片段卡片组件
- [X] 实现分类和标签筛选器
- [X] 实现排序功能（创建时间、更新时间）
- [X] 支持虚拟滚动（可选，如果时间允许）

---

#### 3.3 实现片段编辑器 UI

**文件位置**：`src/renderer/components/SnippetEditor/`

**需要创建的组件**：

- `SnippetEditor.tsx` - 编辑器容器
- `SnippetForm.tsx` - 编辑表单

**验收标准**：

- [X] 创建片段编辑表单
- [X] 实现标题和语言选择
- [X] 实现分类和标签输入
- [X] 实现保存和取消操作
- [X] 表单验证

---

### 任务 5：Monaco Editor 集成 ⭐⭐

**优先级**：P0

#### 5.1 集成 Monaco Editor

**文件位置**：`src/renderer/components/CodeEditor/`

**依赖安装**：

```bash
npm install @monaco-editor/react monaco-editor
```

**验收标准**：

- [X] 安装和配置 @monaco-editor/react
- [X] 创建代码编辑器组件
- [X] 配置语法高亮（支持 20+ 语言）
- [X] 配置编辑器主题（与应用主题同步）

---

#### 5.2 实现编辑器功能

**验收标准**：

- [X] 实现代码自动缩进
- [X] 实现行号显示
- [X] 实现代码折叠
- [X] 实现一键复制功能

---

#### 5.3 实现编辑器快捷键（可选）

**优先级**：P1（如果时间允许）

**验收标准**：

- [X] 实现 Ctrl+S 保存
- [X] 实现 Ctrl+C 复制
- [X] 实现 Ctrl+F 搜索

---

### 📊 付佳腾任务总结

**任务优先级**：

1. 任务 2.1-2.2（数据库基础）- 必须最先完成
2. 任务 3.1（Snippet Manager）- 核心功能
3. 任务 2.3（FTS5）- 搜索依赖
4. 任务 3.2-3.3（片段 UI）- 用户界面
5. 任务 5.1-5.2（Monaco Editor）- 编辑器
6. 任务 5.3（快捷键）- 可选

**建议开发顺序**：

- Day 1-2：任务 2.1-2.2（数据库）
- Day 3：任务 3.1（Snippet Manager）
- Day 4：任务 2.3（FTS5）
- Day 5：任务 3.2-3.3（片段 UI）
- Day 6-7：任务 5.1-5.2（Monaco Editor）

---

## 👨‍💻 赵祐晟（全栈/测试）- 第一周任务

### 主要负责：分类标签系统 + 全文搜索 + 测试

### 任务 4：分类和标签系统 ⭐⭐⭐

**优先级**：P0

**依赖**：需要等待付佳腾完成任务 2.1-2.2（数据库基础）

#### 4.1 实现分类管理

**文件位置**：`src/main/services/CategoryManager.ts`

```typescript
class CategoryManager {
  createCategory(category: CreateCategoryDto): Promise<Category>
  getCategories(): Promise<Category[]>
  updateCategory(id: string, data: UpdateCategoryDto): Promise<Category>
  deleteCategory(id: string): Promise<void>
  
  // 分类配置
  setCategoryColor(id: string, color: string): Promise<void>
  setCategoryIcon(id: string, icon: string): Promise<void>
}
```

**验收标准**：

- [X] 实现创建分类
- [X] 实现分类列表查询
- [X] 实现分类更新和删除
- [X] 实现分类颜色和图标配置
- [X] 通过 IPC 暴露给渲染进程
- [X] 
- [ ] 
- [ ] 
- [ ] 编写单元测试

---

#### 4.2 实现标签管理

**文件位置**：`src/main/services/TagManager.ts`

```typescript
class TagManager {
  createTag(tag: CreateTagDto): Promise<Tag>
  getTags(): Promise<Tag[]>
  getTagSuggestions(query: string): Promise<Tag[]>
  
  // 标签统计
  getTagUsageCount(tagId: string): Promise<number>
  
  // 标签操作
  deleteTag(id: string): Promise<void>
  mergeTags(sourceId: string, targetId: string): Promise<void>
}
```

**验收标准**：

- [X] 实现标签自动完成
- [X] 实现标签创建和关联
- [X] 实现标签统计（使用次数）
- [X] 实现标签删除和合并
- [X] 通过 IPC 暴露给渲染进程
- [X] 编写单元测试

---

#### 4.3 实现分类和标签 UI

**文件位置**：`src/renderer/components/`

**需要创建的组件**：

- `CategorySidebar/` - 分类侧边栏
- `TagInput/` - 标签输入组件（支持多选）
- `TagCloud/` - 标签云视图
- `CategoryTagManager/` - 分类和标签管理对话框

**验收标准**：

- [X] 创建分类侧边栏
- [X] 创建标签输入组件（支持多选和自动完成）
- [X] 实现标签云视图
- [X] 实现分类和标签管理对话框

---

### 任务 6：全文搜索功能 ⭐⭐⭐

**优先级**：P0

**依赖**：需要等待付佳腾完成任务 2.3（FTS5）

#### 6.1 实现全文搜索引擎

**文件位置**：`src/main/services/SearchEngine.ts`

```typescript
class SearchEngine {
  // 全文搜索
  search(query: string): Promise<SearchResult[]>
  
  // 多关键词搜索
  searchMultipleKeywords(keywords: string[]): Promise<SearchResult[]>
  
  // 搜索结果排序
  sortByRelevance(results: SearchResult[]): SearchResult[]
  
  // 搜索结果高亮
  highlightMatches(text: string, query: string): string
}
```

**验收标准**：

- [X] 实现 FTS5 查询封装
- [X] 实现多关键词搜索
- [X] 实现搜索结果排序（按相关度）
- [X] 实现搜索结果高亮
- [X] 通过 IPC 暴露给渲染进程
- [X] 编写单元测试

---

#### 6.2 实现搜索 UI

**文件位置**：`src/renderer/components/Search/`

**需要创建的组件**：

- `SearchBox.tsx` - 统一搜索框
- `SearchResults.tsx` - 搜索结果列表
- `SearchHistory.tsx` - 搜索历史记录

**验收标准**：

- [X] 创建统一搜索框组件
- [X] 实现搜索防抖（300ms）
- [X] 实现搜索结果列表
- [X] 实现搜索历史记录
- [X] 高亮显示匹配关键词

---

### 任务 7：第 1 周测试 ⭐⭐

**优先级**：P0

#### 7.1 单元测试

**文件位置**：`tests/unit/`

**验收标准**：

- [X] Snippet Manager 单元测试
- [X] 数据库访问层单元测试
- [X] 分类和标签管理单元测试
- [X] 搜索引擎单元测试
- [X] 测试覆盖率 >= 80%

---

#### 7.2 集成测试

**文件位置**：`tests/integration/`

**验收标准**：

- [X] 片段 CRUD 集成测试
- [X] 全文搜索集成测试
- [X] UI 组件集成测试

---

#### 7.3 属性测试

**文件位置**：`tests/property/`

**依赖安装**：

```bash
npm install -D fast-check
```

**验收标准**：

- [X] 属性 1：片段 CRUD 操作的数据一致性
- [X] 属性 2：片段 ID 的唯一性
- [X] 属性 3：时间戳的不变性和单调性

---

### 📊 赵祐晟任务总结

**任务优先级**：

1. 等待付佳腾完成数据库基础（Day 1-2）
2. 任务 4.1-4.2（分类标签管理）- Day 3-4
3. 任务 6.1（搜索引擎）- Day 4-5
4. 任务 4.3（分类标签 UI）- Day 5-6
5. 任务 6.2（搜索 UI）- Day 6
6. 任务 7（测试）- Day 7

**建议开发顺序**：

- Day 1-2：熟悉项目，设计分类标签系统
- Day 3-4：任务 4.1-4.2（分类标签管理）
- Day 4-5：任务 6.1（搜索引擎）
- Day 5-6：任务 4.3 + 6.2（UI 实现）
- Day 7：任务 7（测试）

---

## 🤝 协作要点

### 关键接口约定

#### 数据库接口（付佳腾提供）

**文件**：`src/main/database/index.ts`

```typescript
export interface Database {
  // 片段操作
  createSnippet(snippet: Snippet): Promise<Snippet>
  getSnippets(): Promise<Snippet[]>
  updateSnippet(id: string, snippet: Partial<Snippet>): Promise<Snippet>
  deleteSnippet(id: string): Promise<void>
  
  // 分类操作
  createCategory(category: Category): Promise<Category>
  getCategories(): Promise<Category[]>
  updateCategory(id: string, category: Partial<Category>): Promise<Category>
  deleteCategory(id: string): Promise<void>
  
  // 标签操作
  createTag(tag: Tag): Promise<Tag>
  getTags(): Promise<Tag[]>
  deleteTag(id: string): Promise<void>
  
  // 搜索
  searchSnippets(query: string): Promise<Snippet[]>
}
```

---

#### IPC 通信接口（双方共同约定）

**文件**：`src/shared/types/ipc.ts`

```typescript
// 片段相关
export const IPC_CHANNELS = {
  // 片段
  SNIPPET_CREATE: 'snippet:create',
  SNIPPET_LIST: 'snippet:list',
  SNIPPET_GET: 'snippet:get',
  SNIPPET_UPDATE: 'snippet:update',
  SNIPPET_DELETE: 'snippet:delete',
  
  // 分类
  CATEGORY_CREATE: 'category:create',
  CATEGORY_LIST: 'category:list',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  
  // 标签
  TAG_CREATE: 'tag:create',
  TAG_LIST: 'tag:list',
  TAG_SUGGESTIONS: 'tag:suggestions',
  TAG_DELETE: 'tag:delete',
  
  // 搜索
  SEARCH_QUERY: 'search:query',
  SEARCH_HISTORY: 'search:history',
}
```

---

#### 类型定义（双方共同约定）

**文件**：`src/shared/types/index.ts`

```typescript
export interface Snippet {
  id: string
  title: string
  code: string
  language: string
  categoryId?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  accessCount: number
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  createdAt: Date
}

export interface Tag {
  id: string
  name: string
  usageCount: number
  createdAt: Date
}
```

---

### 开发流程

#### Day 1-2（周一-周二）

**付佳腾**：

- 完成任务 2.1-2.2（数据库设计和访问层）
- 创建 PR：`feature/database-foundation`

**赵祐晟**：

- 熟悉项目代码
- 设计分类标签系统的数据结构和 UI
- 准备测试框架

---

#### Day 3-4（周三-周四）

**付佳腾**：

- 完成任务 2.3（FTS5）
- 完成任务 3.1（Snippet Manager）
- 创建 PR：`feature/snippet-manager`

**赵祐晟**：

- 完成任务 4.1-4.2（分类标签管理）
- 创建 PR：`feature/category-tag-manager`

---

#### Day 5-6（周五-周六）

**付佳腾**：

- 完成任务 3.2-3.3（片段 UI）
- 完成任务 5.1（Monaco Editor 集成）
- 创建 PR：`feature/snippet-ui`

**赵祐晟**：

- 完成任务 6.1（搜索引擎）
- 完成任务 4.3（分类标签 UI）
- 完成任务 6.2（搜索 UI）
- 创建 PR：`feature/search-and-ui`

---

#### Day 7（周日）

**付佳腾**：

- 完成任务 5.2（编辑器功能）
- 协助测试和 bug 修复
- 创建 PR：`feature/monaco-editor`

**赵祐晟**：

- 完成任务 7（所有测试）
- 创建 PR：`feature/week1-tests`
- 整理本周工作总结

## 📚 参考资源

### 技术文档

- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3/wiki)
- [SQLite FTS5 文档](https://www.sqlite.org/fts5.html)
- [Monaco Editor 文档](https://microsoft.github.io/monaco-editor/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [fast-check 文档](https://fast-check.dev/)

### 项目文档

- [需求规范](../.kiro/specs/snippet-box/requirements.md)
- [设计文档](../.kiro/specs/snippet-box/design.md)
- [完整任务列表](../.kiro/specs/snippet-box/tasks.md)

---

## 🎯 本周成功标准

### 功能完成度

- [X] 可以创建、查看、编辑、删除片段
- [X] 可以管理分类和标签
- [X] 可以使用全文搜索
- [X] Monaco Editor 正常工作
- [X] 所有核心功能有单元测试

### 代码质量

- [X] 测试覆盖率 >= 80%
- [X] 无 ESLint 错误
- [X] 所有 PR 都经过 Code Review
- [X] 代码符合团队规范

### 文档完善

- [X] 所有接口都有 TypeScript 类型定义
- [X] 关键函数有注释
- [X] README 更新
