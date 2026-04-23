/**
 * 数据库迁移脚本
 * 用于初始化默认分类和其他数据
 */

import Database from 'better-sqlite3';

/**
 * 添加缺失的列到 snippets 表（用于已有数据库的升级）
 */
function migrateSnippetsTable(db: Database.Database): void {
  const columnsToAdd = [
    { name: 'starred', type: 'INTEGER DEFAULT 0' },
    { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
    { name: 'deleted_at', type: 'INTEGER' },
    { name: 'storage_scope', type: "TEXT DEFAULT 'local'" },
    { name: 'skip_sync', type: 'INTEGER DEFAULT 0' },
    { name: 'category_name', type: 'TEXT' },
  ];

  for (const col of columnsToAdd) {
    try {
      const checkSql = `PRAGMA table_info(snippets)`;
      const columns = db.prepare(checkSql).all() as { name: string }[];
      const exists = columns.some(c => c.name === col.name);

      if (!exists) {
        console.log(`[Migration] Adding column ${col.name} to snippets table...`);
        db.exec(`ALTER TABLE snippets ADD COLUMN ${col.name} ${col.type}`);
      }
    } catch (error) {
      console.error(`[Migration] Failed to add column ${col.name}:`, error);
    }
  }
}

/**
 * 迁移 categories 表，添加 user_id 列
 */
function migrateCategoriesTable(db: Database.Database): void {
  try {
    const checkSql = `PRAGMA table_info(categories)`;
    const columns = db.prepare(checkSql).all() as { name: string }[];
    const hasUserId = columns.some(c => c.name === 'user_id');

    if (!hasUserId) {
      console.log('[Migration] Adding user_id column to categories table...');
      db.exec(`ALTER TABLE categories ADD COLUMN user_id TEXT DEFAULT 'local'`);

      const updateStmt = db.prepare(`UPDATE categories SET user_id = 'local' WHERE user_id IS NULL`);
      updateStmt.run();
    }
  } catch (error) {
    console.error('[Migration] Failed to migrate categories table:', error);
  }
}

/**
 * 初始化默认分类（仅当分类表完全为空时，为本地用户创建默认分类）
 */
export function initializeDefaultCategories(db: Database.Database): void {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    
    if (count.count === 0) {
      console.log('[Migration] Initializing default categories for local user...');
      
      const insertStmt = db.prepare(`
        INSERT INTO categories (id, name, description, color, icon, created_at, updated_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = Date.now();
      const defaults = [
        { id: 'cat_local_default', name: '未分类', description: '未分类的代码片段', color: '#6B7280', icon: '📁' },
        { id: 'cat_local_algorithm', name: '算法', description: '排序、搜索、动态规划等', color: '#3B82F6', icon: '🧮' },
        { id: 'cat_local_ui', name: 'UI组件', description: '可复用的界面组件和样式', color: '#8B5CF6', icon: '🎨' },
        { id: 'cat_local_utils', name: '工具函数', description: '通用工具函数和辅助方法', color: '#F59E0B', icon: '🔧' },
        { id: 'cat_local_api', name: 'API接口', description: 'HTTP请求、接口调用', color: '#06B6D4', icon: '🌐' },
      ];
      
      for (const category of defaults) {
        insertStmt.run(
          category.id,
          category.name,
          category.description,
          category.color,
          category.icon,
          now,
          now,
          'local'
        );
      }
      
      console.log(`[Migration] Initialized ${defaults.length} default categories for local user`);
    } else {
      console.log(`[Migration] Categories already exist (${count.count} categories), skipping initialization`);
    }
  } catch (error) {
    console.error('[Migration] Failed to initialize default categories:', error);
    throw error;
  }
}

/**
 * 运行所有迁移
 */
export function runMigrations(db: Database.Database): void {
  console.log('[Migration] Running database migrations...');
  
  try {
    initializeDefaultCategories(db);
    console.log('[Migration] All migrations completed successfully');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}
