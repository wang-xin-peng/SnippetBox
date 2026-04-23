import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

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
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        user_id TEXT DEFAULT 'local'
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
        this.db.exec('ALTER TABLE tags ADD COLUMN usage_count INTEGER DEFAULT 0');
      }
    } catch (error) {
      console.error('[Database] Migration failed:', error);
    }

    // 迁移：为 snippets 表添加 starred 列
    try {
      const cols = this.db.pragma('table_info(snippets)') as Array<{ name: string }>;
      if (!cols.some(c => c.name === 'starred')) {
        this.db.exec('ALTER TABLE snippets ADD COLUMN starred INTEGER DEFAULT 0');
      }
      if (!cols.some(c => c.name === 'storage_scope')) {
        this.db.exec("ALTER TABLE snippets ADD COLUMN storage_scope TEXT DEFAULT 'local'");
      }
      if (!cols.some(c => c.name === 'skip_sync')) {
        this.db.exec('ALTER TABLE snippets ADD COLUMN skip_sync INTEGER DEFAULT 0');
      }
      if (!cols.some(c => c.name === 'is_deleted')) {
        this.db.exec('ALTER TABLE snippets ADD COLUMN is_deleted INTEGER DEFAULT 0');
      }
      if (!cols.some(c => c.name === 'deleted_at')) {
        this.db.exec('ALTER TABLE snippets ADD COLUMN deleted_at INTEGER DEFAULT NULL');
      }
    } catch (error) {
      console.error('[Database] snippets migration failed:', error);
    }

    // 迁移：为 categories 表添加 color、icon、updated_at 列
    try {
      const catCols = this.db.pragma('table_info(categories)') as Array<{ name: string }>;
      const catColNames = catCols.map(c => c.name);
      if (!catColNames.includes('color')) {
        this.db.exec("ALTER TABLE categories ADD COLUMN color TEXT DEFAULT '#6c757d'");
      }
      if (!catColNames.includes('icon')) {
        this.db.exec("ALTER TABLE categories ADD COLUMN icon TEXT DEFAULT '📁'");
      }
      if (!catColNames.includes('updated_at')) {
        this.db.exec('ALTER TABLE categories ADD COLUMN updated_at INTEGER DEFAULT 0');
      }
      if (!catColNames.includes('user_id')) {
        this.db.exec("ALTER TABLE categories ADD COLUMN user_id TEXT DEFAULT 'local'");
        // 重建唯一索引：从全局 name UNIQUE 改为按 (name, user_id) 唯一
        try {
          this.db.exec('DROP INDEX IF EXISTS idx_categories_name');
        } catch {}
        try {
          this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_user ON categories(name, user_id)');
        } catch (e) {
          console.warn('[Database] Could not create unique index:', e);
        }
      }
    } catch (error) {
      console.error('[Database] categories migration failed:', error);
    }

    // 预置默认分类（如果分类表为空）
    try {
      runMigrations(this.db);
    } catch (error) {
      console.error('[Database] Default categories migration failed:', error);
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
