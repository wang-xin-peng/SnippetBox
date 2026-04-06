/**
 * Database Access Layer
 * Manages SQLite database connections, transactions, migrations, and backups
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { INIT_SCRIPTS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, SCHEMA_VERSION } from './schema';

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    // 使用用户数据目录存储数据库
    const userDataPath = app.getPath('userData');
    this.dbPath = dbPath || path.join(userDataPath, 'snippetbox.db');
  }

  /**
   * 连接数据库
   */
  async connect(): Promise<void> {
    try {
      // 确保数据库目录存在
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 打开数据库连接
      this.db = new Database(this.dbPath);

      // 启用外键约束
      this.db.pragma('foreign_keys = ON');

      // 性能优化设置
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = -64000'); // 64MB cache

      console.log('Database connected:', this.dbPath);

      // 初始化数据库
      await this.initialize();
    } catch (error) {
      console.error('Failed to connect database:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database closed');
    }
  }

  /**
   * 获取数据库实例
   */
  getDB(): Database.Database {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: (db: Database.Database) => T): Promise<T> {
    const db = this.getDB();

    const transaction = db.transaction((fn: (db: Database.Database) => T) => {
      return fn(db);
    });

    return transaction(callback);
  }

  /**
   * 初始化数据库
   */
  private async initialize(): Promise<void> {
    const db = this.getDB();

    try {
      // 执行所有初始化脚本
      for (const script of INIT_SCRIPTS) {
        db.exec(script);
      }

      // 检查是否需要插入默认数据
      const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as {
        count: number;
      };

      if (categoryCount.count === 0) {
        // 插入默认分类
        const insertCategory = db.prepare(
          'INSERT INTO categories (id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        );

        const now = Date.now();
        for (const cat of DEFAULT_CATEGORIES) {
          insertCategory.run(cat.id, cat.name, cat.description, cat.color, now, now);
        }
      }

      // 插入默认设置
      const insertSetting = db.prepare(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
      );

      const now = Date.now();
      for (const setting of DEFAULT_SETTINGS) {
        insertSetting.run(setting.key, setting.value, now);
      }

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * 数据库迁移
   */
  async migrate(): Promise<void> {
    const db = this.getDB();

    try {
      // 获取当前版本
      const versionRow = db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('schema_version') as { value: string } | undefined;
      const currentVersion = versionRow ? parseInt(versionRow.value) : 0;

      if (currentVersion < SCHEMA_VERSION) {
        console.log(`Migrating database from version ${currentVersion} to ${SCHEMA_VERSION}`);

        // 在这里添加迁移逻辑
        // 例如：if (currentVersion < 2) { /* 执行版本2的迁移 */ }

        // 更新版本号
        db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(
          SCHEMA_VERSION.toString(),
          Date.now(),
          'schema_version'
        );

        console.log('Database migration completed');
      }
    } catch (error) {
      console.error('Failed to migrate database:', error);
      throw error;
    }
  }

  /**
   * 备份数据库
   */
  async backup(backupPath: string): Promise<void> {
    try {
      // 确保备份目录存在
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // 使用 better-sqlite3 的备份功能
      const db = this.getDB();
      await db.backup(backupPath);

      console.log('Database backed up to:', backupPath);
    } catch (error) {
      console.error('Failed to backup database:', error);
      throw error;
    }
  }

  /**
   * 从备份恢复
   */
  async restore(backupPath: string): Promise<void> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      // 关闭当前连接
      await this.close();

      // 复制备份文件
      fs.copyFileSync(backupPath, this.dbPath);

      // 重新连接
      await this.connect();

      console.log('Database restored from:', backupPath);
    } catch (error) {
      console.error('Failed to restore database:', error);
      throw error;
    }
  }

  /**
   * 优化数据库
   */
  async optimize(): Promise<void> {
    const db = this.getDB();
    db.exec('VACUUM');
    db.exec('ANALYZE');
    console.log('Database optimized');
  }
}

// 导出单例实例
export const databaseManager = new DatabaseManager();
