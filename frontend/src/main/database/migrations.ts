/**
 * 数据库迁移脚本
 * 用于初始化默认分类和其他数据
 */

import Database from 'better-sqlite3';

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
