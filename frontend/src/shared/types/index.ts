// Snippet 相关类型定义
export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  description?: string;
  category: string;
  categoryId?: string;
  tags: string[];
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  isSynced: boolean;
  cloudId?: string;
  storageScope?: 'local' | 'cloud';
}

export interface CreateSnippetDTO {
  title: string;
  code: string;
  language: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateSnippetDTO {
  title?: string;
  code?: string;
  language?: string;
  description?: string;
  category?: string;
  tags?: string[];
  starred?: boolean;
}

export interface SnippetFilter {
  category?: string;
  language?: string;
  tags?: string[];
  searchQuery?: string;
}

// 分类相关类型定义
export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
}

// 标签相关类型定义
export interface Tag {
  id: string;
  name: string;
  usageCount: number;
  createdAt: Date;
}

// 搜索相关类型定义
export interface SearchResult {
  id: string;
  title: string;
  code: string;
  language: string;
  category?: string;
  tags?: string[];
  relevance: number;
  createdAt?: Date;
  searchMode: 'fulltext' | 'semantic' | 'hybrid';
}

export interface SearchQuery {
  query: string;
  filters?: {
    language?: string[];
    category?: string[];
    tags?: string[];
  };
  sortBy?: 'relevance' | 'date' | 'title';
  limit?: number;
  searchMode?: 'auto' | 'fulltext' | 'semantic' | 'hybrid';
}

// 导出相关类型定义
export interface ExportOptions {
  includeTitle?: boolean;
  includeMetadata?: boolean;
  includeTimestamp?: boolean;
  theme?: 'light' | 'dark';
}

export interface BatchResult {
  success: number;
  failed: number;
  errors: string[];
}

// 导入相关类型定义
export interface ImportOptions {
  duplicateStrategy: 'skip' | 'overwrite' | 'merge';
  includeMetadata?: boolean;
  defaultCategory?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

// 分享相关类型定义
export * from './share';
