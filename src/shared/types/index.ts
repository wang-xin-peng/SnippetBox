// 片段接口
export interface Snippet {
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

// 创建片段 DTO
export interface CreateSnippetDTO {
  title: string;
  code: string;
  language: string;
  category?: string;
  tags?: string[];
}

// 更新片段 DTO
export interface UpdateSnippetDTO {
  title?: string;
  code?: string;
  language?: string;
  category?: string;
  tags?: string[];
}

// 片段过滤器
export interface SnippetFilter {
  category?: string;
  tags?: string[];
  language?: string;
  searchQuery?: string;
}

// 分类接口
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
  count?: number;
}

// 创建分类 DTO
export interface CreateCategoryDTO {
  name: string;
  color?: string;
  icon?: string;
}

// 更新分类 DTO
export interface UpdateCategoryDTO {
  name?: string;
  color?: string;
  icon?: string;
}

// 标签接口
export interface Tag {
  id: string;
  name: string;
  usageCount: number;
  createdAt: Date;
}

// 创建标签 DTO
export interface CreateTagDTO {
  name: string;
}
