/**
 * 数据库迁移脚本
 * 用于初始化默认分类和其他数据
 */

import Database from 'better-sqlite3';
import { DEFAULT_CATEGORIES } from './schema';

/**
 * 初始化默认分类
 * 如果分类表为空，则插入默认分类
 */
export function initializeDefaultCategories(db: Database.Database): void {
  try {
    // 检查是否已有分类
    const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    
    if (count.count === 0) {
      console.log('[Migration] Initializing default categories...');
      
      const insertStmt = db.prepare(`
        INSERT INTO categories (id, name, description, color, icon, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = Date.now();
      
      for (const category of DEFAULT_CATEGORIES) {
        insertStmt.run(
          category.id,
          category.name,
          category.description,
          category.color,
          category.icon,
          now,
          now
        );
      }
      
      console.log(`[Migration] Initialized ${DEFAULT_CATEGORIES.length} default categories`);
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
