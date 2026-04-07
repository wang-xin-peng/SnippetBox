import crypto from 'crypto';
import { DatabaseManager } from '../database';

const dbInstance = DatabaseManager.getInstance();

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
  private db: any;

  constructor(db?: any) {
    if (db) {
      this.db = db;
    } else {
      dbInstance.connect();
      this.db = dbInstance.getDB();
    }
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    if (!dto.name.trim()) {
      throw new Error('Category name cannot be empty');
    }

    const existingCategory = await this.db.get(
      'SELECT id FROM categories WHERE name = ?',
      [dto.name.trim()]
    );

    if (existingCategory) {
      throw new Error(`Category with name "${dto.name}" already exists`);
    }

    const id = crypto.randomUUID();
    const name = dto.name.trim();
    const color = dto.color || '#6c757d';
    const icon = dto.icon || '📁';
    const createdAt = new Date();

    await this.db.run(
      'INSERT INTO categories (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, color, icon, createdAt.toISOString()]
    );

    return {
      id,
      name,
      color,
      icon,
      createdAt,
    };
  }

  async getCategories(): Promise<Category[]> {
    const categories = await this.db.all(`
      SELECT 
        c.*, 
        COUNT(s.id) as snippet_count
      FROM categories c
      LEFT JOIN snippets s ON c.id = s.category_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

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
    const category = await this.db.get('SELECT * FROM categories WHERE id = ?', [id]);

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

    if (dto.name) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new Error('Category name cannot be empty');
      }

      const duplicateCategory = await this.db.get(
        'SELECT id FROM categories WHERE name = ? AND id != ?',
        [trimmedName, id]
      );

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
      params.push(id);
      await this.db.run(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
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

    await this.db.transaction(async () => {
      await this.db.run(
        'UPDATE snippets SET category_id = NULL WHERE category_id = ?',
        [id]
      );

      await this.db.run('DELETE FROM categories WHERE id = ?', [id]);
    });
  }

  async setCategoryColor(id: string, color: string): Promise<void> {
    const existingCategory = await this.getCategoryById(id);
    if (!existingCategory) {
      throw new Error(`Category with id "${id}" not found`);
    }

    await this.db.run('UPDATE categories SET color = ? WHERE id = ?', [color, id]);
  }

  async setCategoryIcon(id: string, icon: string): Promise<void> {
    const existingCategory = await this.getCategoryById(id);
    if (!existingCategory) {
      throw new Error(`Category with id "${id}" not found`);
    }

    await this.db.run('UPDATE categories SET icon = ? WHERE id = ?', [icon, id]);
  }

  async getCategoriesWithSnippetCount(): Promise<Category[]> {
    return this.getCategories();
  }

  async getOrCreateDefaultCategory(): Promise<Category> {
    const defaultCategory = await this.db.get('SELECT * FROM categories WHERE name = ?', ['默认分类']);

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
