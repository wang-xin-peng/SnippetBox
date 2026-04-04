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
