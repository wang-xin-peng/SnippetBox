/**
 * Database Schema Definition
 * SQLite database schema for SnippetBox
 */

export const SCHEMA_VERSION = 1;

// 1. snippets - 片段主表
export const CREATE_SNIPPETS_TABLE = `
CREATE TABLE IF NOT EXISTS snippets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  category_id TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  access_count INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  cloud_id TEXT,
  starred INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  deleted_at INTEGER,
  storage_scope TEXT DEFAULT 'local',
  skip_sync INTEGER DEFAULT 0,
  category_name TEXT,
  sync_source TEXT DEFAULT 'local',
  user_id TEXT DEFAULT 'local',
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
`;

// 2. categories - 分类表
export const CREATE_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  icon TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

// 3. tags - 标签表
export const CREATE_TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
`;

// 4. snippet_tags - 片段标签关联表
export const CREATE_SNIPPET_TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS snippet_tags (
  snippet_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (snippet_id, tag_id),
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
`;

// 5. settings - 设置表
export const CREATE_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

// 6. sync_queue - 同步队列表
export const CREATE_SYNC_QUEUE_TABLE = `
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snippet_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT,
  created_at INTEGER NOT NULL,
  synced_at INTEGER,
  retry_count INTEGER DEFAULT 0,
  error TEXT,
  FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
);
`;

// 7. deleted_cloud_ids - 已永久删除的云端片段黑名单
export const CREATE_DELETED_CLOUD_IDS_TABLE = `
CREATE TABLE IF NOT EXISTS deleted_cloud_ids (
  cloud_id TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);
`;

// 创建索引
export const CREATE_INDEXES = [
  // snippets 表索引
  'CREATE INDEX IF NOT EXISTS idx_snippets_category ON snippets(category_id);',
  'CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets(language);',
  'CREATE INDEX IF NOT EXISTS idx_snippets_created_at ON snippets(created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_snippets_updated_at ON snippets(updated_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_snippets_cloud_id ON snippets(cloud_id);',

  // snippet_tags 表索引
  'CREATE INDEX IF NOT EXISTS idx_snippet_tags_tag_id ON snippet_tags(tag_id);',

  // sync_queue 表索引
  'CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced_at);',
  'CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);',
];

// FTS5 虚拟表（全文搜索）
export const CREATE_FTS_TABLE = `
CREATE VIRTUAL TABLE IF NOT EXISTS snippets_fts USING fts5(
  title,
  code,
  description,
  content='snippets',
  content_rowid='rowid'
);
`;

// FTS 触发器 - 自动同步索引
export const CREATE_FTS_TRIGGERS = [
  // INSERT 触发器
  `CREATE TRIGGER IF NOT EXISTS snippets_fts_insert AFTER INSERT ON snippets BEGIN
    INSERT INTO snippets_fts(rowid, title, code, description)
    VALUES (new.rowid, new.title, new.code, new.description);
  END;`,

  // DELETE 触发器
  `CREATE TRIGGER IF NOT EXISTS snippets_fts_delete AFTER DELETE ON snippets BEGIN
    DELETE FROM snippets_fts WHERE rowid = old.rowid;
  END;`,

  // UPDATE 触发器
  `CREATE TRIGGER IF NOT EXISTS snippets_fts_update AFTER UPDATE ON snippets BEGIN
    DELETE FROM snippets_fts WHERE rowid = old.rowid;
    INSERT INTO snippets_fts(rowid, title, code, description)
    VALUES (new.rowid, new.title, new.code, new.description);
  END;`,
];

// 数据库初始化脚本
export const INIT_SCRIPTS = [
  CREATE_CATEGORIES_TABLE,
  CREATE_TAGS_TABLE,
  CREATE_SNIPPETS_TABLE,
  CREATE_SNIPPET_TAGS_TABLE,
  CREATE_SETTINGS_TABLE,
  CREATE_SYNC_QUEUE_TABLE,
  CREATE_DELETED_CLOUD_IDS_TABLE,
  ...CREATE_INDEXES,
  CREATE_FTS_TABLE,
  ...CREATE_FTS_TRIGGERS,
];

// 默认数据 - 按用途分类
export const DEFAULT_CATEGORIES = [
  { id: 'cat_default', name: '未分类', description: '未分类的代码片段', color: '#6B7280', icon: '📁' },
  { id: 'cat_algorithm', name: '算法', description: '排序、搜索、动态规划等算法实现', color: '#3B82F6', icon: '🧮' },
  { id: 'cat_data_structure', name: '数据结构', description: '链表、树、图、栈、队列等数据结构', color: '#10B981', icon: '🗂️' },
  { id: 'cat_ui', name: 'UI组件', description: '可复用的界面组件和样式', color: '#8B5CF6', icon: '🎨' },
  { id: 'cat_utils', name: '工具函数', description: '通用工具函数和辅助方法', color: '#F59E0B', icon: '🔧' },
  { id: 'cat_database', name: '数据库操作', description: 'SQL查询、ORM操作、数据库优化', color: '#EF4444', icon: '💾' },
  { id: 'cat_api', name: 'API接口', description: 'HTTP请求、接口调用、API封装', color: '#06B6D4', icon: '🌐' },
  { id: 'cat_config', name: '配置文件', description: '项目配置、环境变量、构建配置', color: '#84CC16', icon: '⚙️' },
  { id: 'cat_hooks', name: 'Hooks/钩子', description: 'React Hooks、Vue Composition API等', color: '#EC4899', icon: '🪝' },
  { id: 'cat_validation', name: '验证/校验', description: '表单验证、数据校验、正则表达式', color: '#F97316', icon: '✅' },
];

// 初始化默认设置
export const DEFAULT_SETTINGS = [
  { key: 'theme', value: 'light' },
  { key: 'editor_theme', value: 'vs-light' },
  { key: 'font_size', value: '14' },
  { key: 'auto_sync', value: 'false' },
  { key: 'schema_version', value: SCHEMA_VERSION.toString() },
];
