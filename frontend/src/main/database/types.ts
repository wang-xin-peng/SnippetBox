export interface Database {
  run: (sql: string, params?: any[]) => Promise<any>;
  get: <T>(sql: string, params?: any[]) => Promise<T | undefined>;
  all: <T>(sql: string, params?: any[]) => Promise<T[]>;
  transaction: <T>(callback: () => Promise<T>) => Promise<T>;
}

export interface Snippet {
  id: string;
  title: string;
  content: string;
  language: string;
  category_id?: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  usage_count: number;
  created_at: string;
}

export interface SnippetTag {
  snippet_id: string;
  tag_id: string;
}
