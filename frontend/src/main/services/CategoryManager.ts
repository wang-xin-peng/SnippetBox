import crypto from 'crypto';
import Database from 'better-sqlite3';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
  count?: number;
  userId?: string;
}

export interface CreateCategoryDto {
  name: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string;
  icon?: string;
}

export class CategoryManager {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async createCategory(dto: CreateCategoryDto, userId: string = 'local'): Promise<Category> {
    if (!dto.name.trim()) {
      throw new Error('Category name cannot be empty');
    }

    const existingCategory = this.db
      .prepare('SELECT id FROM categories WHERE name = ? AND user_id = ?')
      .get(dto.name.trim(), userId) as { id: string } | undefined;

    if (existingCategory) {
      throw new Error(`Category with name "${dto.name}" already exists`);
    }

    const id = crypto.randomUUID();
    const name = dto.name.trim();
    const color = dto.color || '#6c757d';
    const icon = dto.icon || 'fas fa-folder';
    const createdAt = Date.now();

    this.db
      .prepare(
        'INSERT INTO categories (id, name, description, color, icon, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, name, dto.description || null, color, icon, createdAt, createdAt, userId);

    return {
      id,
      name,
      color,
      icon,
      createdAt: new Date(createdAt),
    };
  }

  async getCategories(userId: string = 'local'): Promise<Category[]> {
    const isLocalUser = userId === 'local';
    const storageCondition = isLocalUser
      ? "(s.storage_scope IS NULL OR s.storage_scope = 'local')"
      : "s.storage_scope = 'cloud'";

    const categories = this.db
      .prepare(
        `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM snippets s
         WHERE (s.category_id = c.id OR (s.category_name = c.name AND s.category_id IS NULL))
           AND (s.is_deleted = 0 OR s.is_deleted IS NULL)
           AND ${storageCondition}) as snippet_count
      FROM categories c
      WHERE c.user_id = ? AND c.name NOT LIKE '#%'
      ORDER BY c.created_at DESC
    `
      )
      .all(userId) as any[];

    return categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      createdAt: new Date(cat.created_at),
      count: cat.snippet_count,
    }));
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const category = this.db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(id) as any | undefined;

    if (!category) {
      return undefined;
    }

    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      createdAt: new Date(category.created_at),
      userId: category.user_id,
    };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const existingCategory = await this.getCategoryById(id);
    if (!existingCategory) {
      throw new Error(`Category with id "${id}" not found`);
    }

    if (dto.name) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new Error('Category name cannot be empty');
      }

      const duplicateCategory = this.db
        .prepare('SELECT id FROM categories WHERE name = ? AND id != ? AND user_id = ?')
        .get(trimmedName, id, existingCategory.userId) as { id: string } | undefined;

      if (duplicateCategory) {
        throw new Error(`Category "${trimmedName}" already exists`);
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      params.push(dto.name.trim());
    }
    if (dto.color !== undefined) {
      updates.push('color = ?');
      params.push(dto.color);
    }
    if (dto.icon !== undefined) {
      updates.push('icon = ?');
      params.push(dto.icon);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(Date.now());
      params.push(id);
      this.db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedCategory = await this.getCategoryById(id);
    if (!updatedCategory) {
      throw new Error(`Category with id "${id}" not found`);
    }

    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    const existingCategory = await this.getCategoryById(id);
    if (!existingCategory) {
      throw new Error(`Category with id "${id}" not found`);
    }

    const transaction = this.db.transaction(() => {
      // 获取"未分类"的 ID
      const userId = existingCategory.userId || 'local';
      const uncategorizedId = `cat_${userId}_default`;
      
      // 将该分类下的片段移到"未分类"
      this.db.prepare('UPDATE snippets SET category_id = ? WHERE category_id = ?').run(uncategorizedId, id);
      this.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    });

    transaction();
  }

  async setCategoryColor(id: string, color: string): Promise<void> {
    const existingCategory = await this.getCategoryById(id);
    if (!existingCategory) {
      throw new Error(`Category with id "${id}" not found`);
    }

    this.db
      .prepare('UPDATE categories SET color = ?, updated_at = ? WHERE id = ?')
      .run(color, Date.now(), id);
  }

  async setCategoryIcon(id: string, icon: string): Promise<void> {
    const existingCategory = await this.getCategoryById(id);
    if (!existingCategory) {
      throw new Error(`Category with id "${id}" not found`);
    }

    this.db
      .prepare('UPDATE categories SET icon = ?, updated_at = ? WHERE id = ?')
      .run(icon, Date.now(), id);
  }

  async getCategoriesWithSnippetCount(userId: string = 'local'): Promise<Category[]> {
    return this.getCategories(userId);
  }

  async ensureDefaultCategories(userId: string = 'local'): Promise<void> {
    const defaults = [
      { id: `cat_${userId}_default`, name: '未分类', description: '未分类的代码片段', color: '#6B7280', icon: 'fas fa-folder' },
      { id: `cat_${userId}_algorithm`, name: '算法', description: '排序、搜索、动态规划等', color: '#3B82F6', icon: 'fas fa-brain' },
      { id: `cat_${userId}_ui`, name: 'UI组件', description: '可复用的界面组件和样式', color: '#8B5CF6', icon: 'fas fa-palette' },
      { id: `cat_${userId}_utils`, name: '工具函数', description: '通用工具函数和辅助方法', color: '#F59E0B', icon: 'fas fa-wrench' },
      { id: `cat_${userId}_api`, name: 'API接口', description: 'HTTP请求、接口调用', color: '#06B6D4', icon: 'fas fa-plug' },
    ];

    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, description, color, icon, created_at, updated_at, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    const transaction = this.db.transaction(() => {
      for (const cat of defaults) {
        insertStmt.run(cat.id, cat.name, cat.description, cat.color, cat.icon, now, now, userId);
      }
    });

    transaction();
  }
}
