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
    { name: 'sync_source', type: "TEXT DEFAULT 'local'" },
    { name: 'user_id', type: "TEXT DEFAULT 'local'" },
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
 * 清理重复的 cloud_id 片段（保留最新的一条）
 */
function deduplicateCloudSnippets(db: Database.Database): void {
  try {
    const result = db.prepare(`
      DELETE FROM snippets
      WHERE cloud_id IS NOT NULL
        AND (is_deleted = 0 OR is_deleted IS NULL)
        AND id NOT IN (
          SELECT id FROM snippets
          WHERE cloud_id IS NOT NULL
            AND (is_deleted = 0 OR is_deleted IS NULL)
          GROUP BY cloud_id
          HAVING id = MAX(id)
        )
    `).run();
    if (result.changes > 0) {
      console.log(`[Migration] Removed ${result.changes} duplicate cloud snippets`);
    }
  } catch (error) {
    console.error('[Migration] Failed to deduplicate cloud snippets:', error);
  }
}

/**
 * 为 cloud_id 添加唯一索引，防止重复插入
 */
function migrateCloudIdUniqueIndex(db: Database.Database): void {
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_snippets_cloud_id_unique ON snippets(cloud_id) WHERE cloud_id IS NOT NULL`);
  } catch (error) {
    // 如果已存在或不支持 partial index，忽略
    console.warn('[Migration] Could not create unique index on cloud_id:', (error as any).message);
  }
}

/**
 * 创建 deleted_cloud_ids 表（已永久删除的云端片段黑名单）
 */
function migrateDeletedCloudIdsTable(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS deleted_cloud_ids (
        cloud_id TEXT PRIMARY KEY,
        deleted_at INTEGER NOT NULL
      )
    `);
  } catch (error) {
    console.error('[Migration] Failed to create deleted_cloud_ids table:', error);
  }
}

/**
 * 将默认分类的 emoji 图标迁移为 Font Awesome class
 */
function migrateDefaultCategoryIcons(db: Database.Database): void {
  const iconMap: Record<string, string> = {
    '📁': 'fas fa-inbox',
    '🧮': 'fas fa-brain',
    '🎨': 'fas fa-palette',
    '🔧': 'fas fa-wrench',
    '🌐': 'fas fa-plug',
    '🗂️': 'fas fa-layer-group',
    '💾': 'fas fa-database',
    '⚙️': 'fas fa-cog',
    '🪝': 'fas fa-code-branch',
    '✅': 'fas fa-check-circle',
  };
  try {
    const stmt = db.prepare('UPDATE categories SET icon = ? WHERE icon = ?');
    for (const [emoji, fa] of Object.entries(iconMap)) {
      stmt.run(fa, emoji);
    }
  } catch (e) {
    console.warn('[Migration] Failed to migrate category icons:', e);
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
        { id: 'cat_local_default', name: '未分类', description: '未分类的代码片段', color: '#6B7280', icon: 'fas fa-inbox' },
        { id: 'cat_local_algorithm', name: '算法', description: '排序、搜索、动态规划等', color: '#3B82F6', icon: 'fas fa-brain' },
        { id: 'cat_local_ui', name: 'UI组件', description: '可复用的界面组件和样式', color: '#8B5CF6', icon: 'fas fa-palette' },
        { id: 'cat_local_utils', name: '工具函数', description: '通用工具函数和辅助方法', color: '#F59E0B', icon: 'fas fa-wrench' },
        { id: 'cat_local_api', name: 'API接口', description: 'HTTP请求、接口调用', color: '#06B6D4', icon: 'fas fa-plug' },
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
 * 清理因历史 bug 产生的用户专属默认分类（cat_<uuid>_* 格式）
 * 将这些分类下的片段迁移到对应的 local 分类，然后删除重复分类
 */
function cleanupDuplicateDefaultCategories(db: Database.Database): void {
  try {
    // 找出所有非 local 的默认分类（id 格式为 cat_<uuid>_<suffix>，不是 cat_local_*）
    const duplicates = db.prepare(`
      SELECT id, name, user_id FROM categories
      WHERE id LIKE 'cat_%'
        AND id NOT LIKE 'cat_local_%'
    `).all() as { id: string; name: string; user_id: string }[];

    if (duplicates.length === 0) return;

    console.log(`[Migration] Cleaning up ${duplicates.length} duplicate default categories...`);

    const transaction = db.transaction(() => {
      for (const dup of duplicates) {
        // 找到对应的 local 分类（同名）
        const localCat = db.prepare(
          "SELECT id FROM categories WHERE name = ? AND user_id = 'local'"
        ).get(dup.name) as { id: string } | undefined;

        if (localCat) {
          // 把引用重复分类的片段改指向 local 分类
          db.prepare('UPDATE snippets SET category_id = ? WHERE category_id = ?')
            .run(localCat.id, dup.id);
        }
        // 删除重复分类
        db.prepare('DELETE FROM categories WHERE id = ?').run(dup.id);
      }
    });

    transaction();
    console.log('[Migration] Duplicate default categories cleaned up');
  } catch (e) {
    console.warn('[Migration] Failed to clean up duplicate categories:', e);
  }
}

/**
 * 运行所有迁移
 */
export function runMigrations(db: Database.Database): void {
  console.log('[Migration] Running database migrations...');

  try {
    migrateSnippetsTable(db);
    migrateCategoriesTable(db);
    migrateDefaultCategoryIcons(db);
    migrateDeletedCloudIdsTable(db);
    deduplicateCloudSnippets(db);
    migrateCloudIdUniqueIndex(db);
    initializeDefaultCategories(db);
    cleanupDuplicateDefaultCategories(db);
    console.log('[Migration] All migrations completed successfully');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}
