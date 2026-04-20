/**
 * 更新分类脚本
 * 删除旧的默认分类，插入新的默认分类
 * 保留用户创建的自定义分类和所有代码片段
 */

import { DatabaseManager } from '../database';
import { DEFAULT_CATEGORIES } from '../database/schema';

export async function updateCategories(): Promise<void> {
  console.log('[UpdateCategories] Starting category update...');
  
  try {
    const dbManager = DatabaseManager.getInstance();
    dbManager.connect();
    const db = dbManager.getDb();
    
    // 获取所有现有分类
    const existingCategories = db.prepare('SELECT * FROM categories').all() as Array<{
      id: string;
      name: string;
      color: string;
      icon: string;
      created_at: number;
      updated_at: number;
    }>;
    
    console.log(`[UpdateCategories] Found ${existingCategories.length} existing categories`);
    
    // 定义旧的默认分类名称（需要删除的）
    const oldDefaultCategoryNames = [
      'JavaScript',
      'TypeScript',
      'Python',
      'CSS',
      'React',
      'Node.js',
      'Uncategorized'
    ];
    
    // 找出需要删除的旧默认分类
    const categoriesToDelete = existingCategories.filter(cat => 
      oldDefaultCategoryNames.includes(cat.name)
    );
    
    console.log(`[UpdateCategories] Found ${categoriesToDelete.length} old default categories to delete`);
    
    // 开始事务
    const transaction = db.transaction(() => {
      // 1. 将使用旧默认分类的片段设置为 NULL（未分类）
      for (const category of categoriesToDelete) {
        const snippetCount = db.prepare('SELECT COUNT(*) as count FROM snippets WHERE category_id = ?')
          .get(category.id) as { count: number };
        
        if (snippetCount.count > 0) {
          console.log(`[UpdateCategories] Moving ${snippetCount.count} snippets from "${category.name}" to uncategorized`);
          db.prepare('UPDATE snippets SET category_id = NULL WHERE category_id = ?').run(category.id);
        }
        
        // 删除旧分类
        db.prepare('DELETE FROM categories WHERE id = ?').run(category.id);
        console.log(`[UpdateCategories] Deleted old category: ${category.name}`);
      }
      
      // 2. 插入新的默认分类
      const now = Date.now();
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO categories (id, name, description, color, icon, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const category of DEFAULT_CATEGORIES) {
        const result = insertStmt.run(
          category.id,
          category.name,
          category.description,
          category.color,
          category.icon,
          now,
          now
        );
        
        if (result.changes > 0) {
          console.log(`[UpdateCategories] Inserted new category: ${category.name}`);
        } else {
          console.log(`[UpdateCategories] Category already exists: ${category.name}`);
        }
      }
    });
    
    // 执行事务
    transaction();
    
    // 验证结果
    const finalCategories = db.prepare('SELECT * FROM categories').all() as Array<{
      id: string;
      name: string;
    }>;
    
    console.log(`[UpdateCategories] Category update complete!`);
    console.log(`[UpdateCategories] Total categories: ${finalCategories.length}`);
    console.log('[UpdateCategories] Categories:', finalCategories.map(c => c.name).join(', '));
    
  } catch (error) {
    console.error('[UpdateCategories] Category update failed:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updateCategories()
    .then(() => {
      console.log('Category update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Category update failed:', error);
      process.exit(1);
    });
}
