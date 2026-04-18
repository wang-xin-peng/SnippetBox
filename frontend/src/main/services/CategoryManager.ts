import crypto from 'crypto';
import Database from 'better-sqlite3';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
  count?: number;
}

export interface CreateCategoryDto {
  name: string;
  color?: string;
  icon?: string;
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

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    if (!dto.name.trim()) {
      throw new Error('Category name cannot be empty');
    }

    const existingCategory = this.db
      .prepare('SELECT id FROM categories WHERE name = ?')
      .get(dto.name.trim()) as { id: string } | undefined;

    if (existingCategory) {
      throw new Error(`Category with name "${dto.name}" already exists`);
    }

    const id = crypto.randomUUID();
    const name = dto.name.trim();
    const color = dto.color || '#6c757d';
    const icon = dto.icon || '📁';
    const createdAt = Date.now();

    this.db
      .prepare(
        'INSERT INTO categories (id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(id, name, color, icon, createdAt, createdAt);

    return {
      id,
      name,
      color,
      icon,
      createdAt: new Date(createdAt),
    };
  }

  async getCategories(): Promise<Category[]> {
    const categories = this.db
      .prepare(
        `
      SELECT 
        c.*, 
        COUNT(s.id) as snippet_count
      FROM categories c
      LEFT JOIN snippets s ON c.id = s.category_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `
      )
      .all() as any[];

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
    };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const existingCategory = await this.getCategoryById(id);
    if (!existingCategory) {
      throw new Error(`Category with id "${id}" not found`);
    }

    // 防止修改"未分类"的名称
    if (existingCategory.name === '未分类' && dto.name && dto.name !== '未分类') {
      throw new Error('Cannot rename the "未分类" category');
    }

    if (dto.name) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new Error('Category name cannot be empty');
      }

      const duplicateCategory = this.db
        .prepare('SELECT id FROM categories WHERE name = ? AND id != ?')
        .get(trimmedName, id) as { id: string } | undefined;

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

    // 防止删除"未分类"
    if (existingCategory.name === '未分类') {
      throw new Error('Cannot delete the "未分类" category');
    }

    const transaction = this.db.transaction(() => {
      this.db.prepare('UPDATE snippets SET category_id = NULL WHERE category_id = ?').run(id);
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

  async getCategoriesWithSnippetCount(): Promise<Category[]> {
    return this.getCategories();
  }

  async getOrCreateDefaultCategory(): Promise<Category> {
    const defaultCategory = this.db
      .prepare('SELECT * FROM categories WHERE name = ?')
      .get('默认分类') as any | undefined;

    if (defaultCategory) {
      return {
        id: defaultCategory.id,
        name: defaultCategory.name,
        color: defaultCategory.color,
        icon: defaultCategory.icon,
        createdAt: new Date(defaultCategory.created_at),
      };
    }

    return this.createCategory({
      name: '默认分类',
      color: '#6c757d',
      icon: '📁',
    });
  }
}
