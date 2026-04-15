import Database from 'better-sqlite3';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;

  private constructor() {
    // 初始化数据库连接将在 connect 方法中进行
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public connect(): void {
    if (this.db) return;
    
    this.db = new Database('snippets.db');
    this.db.pragma('journal_mode = WAL');
    
    this.initialize();
  }

  private initialize(): void {
    if (!this.db) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snippets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        code TEXT NOT NULL,
        language TEXT DEFAULT 'plaintext',
        category_id TEXT,
        description TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        access_count INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0,
        cloud_id TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        usage_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS snippet_tags (
        snippet_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY (snippet_id, tag_id),
        FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS snippets_fts USING fts5(
        title,
        content,
        language,
        category,
        tags
      );

      CREATE TRIGGER IF NOT EXISTS snippets_ai AFTER INSERT ON snippets BEGIN
        INSERT INTO snippets_fts(rowid, title, content, language, category, tags)
        VALUES(new.rowid, new.title, new.code, new.language, '', '');
      END;

      CREATE TRIGGER IF NOT EXISTS snippets_ad AFTER DELETE ON snippets BEGIN
        DELETE FROM snippets_fts WHERE rowid = old.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS snippets_au AFTER UPDATE ON snippets BEGIN
        UPDATE snippets_fts SET
          title = new.title,
          content = new.code,
          language = new.language,
          category = '',
          tags = ''
        WHERE rowid = old.rowid;
      END;
    `);
    
    // 迁移：为已存在的 tags 表添加 usage_count 列
    try {
      const columns = this.db.pragma('table_info(tags)') as Array<{ name: string }>;
      const hasUsageCount = columns.some((col) => col.name === 'usage_count');
      
      if (!hasUsageCount) {
        console.log('[Database] Adding usage_count column to tags table...');
        this.db.exec('ALTER TABLE tags ADD COLUMN usage_count INTEGER DEFAULT 0');
        console.log('[Database] Migration completed successfully');
      }
    } catch (error) {
      console.error('[Database] Migration failed:', error);
    }
  }

  public getDb(): Database.Database {
    if (!this.db) {
      this.connect();
    }
    return this.db!;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// 导出单例获取函数
export function getDatabaseManager(): DatabaseManager {
  return DatabaseManager.getInstance();
}
