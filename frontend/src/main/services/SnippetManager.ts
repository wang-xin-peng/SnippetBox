/**
 * Snippet Manager Service
 * Handles all snippet-related operations
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { Snippet, CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter } from '../../shared/types/index';
import { FullTextSearch } from '../database/fts';
import { VectorStore } from './VectorStore';

interface DbSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  category_id: string | null;
  description: string | null;
  created_at: number;
  updated_at: number;
  access_count: number;
  is_synced: number;
  cloud_id: string | null;
}

export class SnippetManager {
  private db: Database.Database;
  private fts: FullTextSearch;
  private vectorStore: VectorStore;

  constructor(db: Database.Database) {
    this.db = db;
    this.fts = new FullTextSearch(db);
    this.vectorStore = new VectorStore();
  }

  /**
   * 创建片段
   */
  async createSnippet(data: CreateSnippetDTO): Promise<Snippet> {
    const id = randomUUID();
    const now = Date.now();

    try {
      const transaction = this.db.transaction(() => {
        // 插入片段
        this.db
          .prepare(
            `
          INSERT INTO snippets (id, title, code, language, category_id, description, created_at, updated_at, access_count, is_synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
        `
          )
          .run(id, data.title, data.code, data.language, data.category || null, null, now, now);

        // 处理标签
        if (data.tags && data.tags.length > 0) {
          this.addTagsToSnippet(id, data.tags);
        }

        return id;
      });

      const snippetId = transaction();
      const snippet = await this.getSnippet(snippetId);

      if (!snippet) {
        throw new Error('Failed to create snippet');
      }

      // 自动生成向量
      this.generateVectorForSnippet(snippet);

      return snippet;
    } catch (error) {
      console.error('Failed to create snippet:', error);
      throw error;
    }
  }

  /**
   * 获取片段列表
   */
  async listSnippets(filter?: SnippetFilter): Promise<Snippet[]> {
    try {
      let sql = `
        SELECT DISTINCT s.*
        FROM snippets s
        LEFT JOIN snippet_tags st ON s.id = st.snippet_id
        WHERE 1=1
      `;
      const params: any[] = [];

      // 应用过滤条件
      if (filter?.category) {
        sql += ` AND s.category_id = ?`;
        params.push(filter.category);
      }

      if (filter?.language) {
        sql += ` AND s.language = ?`;
        params.push(filter.language);
      }

      if (filter?.tags && filter.tags.length > 0) {
        sql += ` AND st.tag_id IN (${filter.tags.map(() => '?').join(',')})`;
        params.push(...filter.tags);
      }

      if (filter?.searchQuery) {
        // 使用全文搜索
        const searchResults = this.fts.search(filter.searchQuery);
        const searchIds = searchResults.map((r) => r.id);

        if (searchIds.length === 0) {
          return [];
        }

        sql += ` AND s.id IN (${searchIds.map(() => '?').join(',')})`;
        params.push(...searchIds);
      }

      sql += ` ORDER BY s.updated_at DESC`;

      const dbSnippets = this.db.prepare(sql).all(...params) as DbSnippet[];
      return Promise.all(dbSnippets.map((s) => this.dbSnippetToSnippet(s)));
    } catch (error) {
      console.error('Failed to list snippets:', error);
      throw error;
    }
  }

  /**
   * 获取单个片段
   */
  async getSnippet(id: string): Promise<Snippet> {
    try {
      const dbSnippet = this.db
        .prepare(
          `
        SELECT * FROM snippets WHERE id = ?
      `
        )
        .get(id) as DbSnippet | undefined;

      if (!dbSnippet) {
        throw new Error('Snippet not found');
      }

      // 增加访问计数
      this.db
        .prepare(
          `
        UPDATE snippets SET access_count = access_count + 1 WHERE id = ?
      `
        )
        .run(id);

      return this.dbSnippetToSnippet(dbSnippet);
    } catch (error) {
      console.error('Failed to get snippet:', error);
      throw error;
    }
  }

  /**
   * 更新片段
   */
  async updateSnippet(id: string, data: UpdateSnippetDTO): Promise<Snippet> {
    const now = Date.now();

    try {
      const transaction = this.db.transaction(() => {
        const updates: string[] = [];
        const params: any[] = [];

        if (data.title !== undefined) {
          updates.push('title = ?');
          params.push(data.title);
        }
        if (data.code !== undefined) {
          updates.push('code = ?');
          params.push(data.code);
        }
        if (data.language !== undefined) {
          updates.push('language = ?');
          params.push(data.language);
        }
        if (data.category !== undefined) {
          updates.push('category_id = ?');
          params.push(data.category);
        }

        updates.push('updated_at = ?');
        params.push(now);
        params.push(id);

        if (updates.length > 0) {
          this.db
            .prepare(
              `
            UPDATE snippets SET ${updates.join(', ')} WHERE id = ?
          `
            )
            .run(...params);
        }

        // 更新标签
        if (data.tags !== undefined) {
          // 删除现有标签
          this.db.prepare('DELETE FROM snippet_tags WHERE snippet_id = ?').run(id);
          // 添加新标签
          if (data.tags.length > 0) {
            this.addTagsToSnippet(id, data.tags);
          }
        }
      });

      transaction();
      const updatedSnippet = await this.getSnippet(id);
      
      // 自动更新向量
      this.generateVectorForSnippet(updatedSnippet);
      
      return updatedSnippet;
    } catch (error) {
      console.error('Failed to update snippet:', error);
      throw error;
    }
  }

  /**
   * 删除片段
   */
  async deleteSnippet(id: string): Promise<void> {
    try {
      const result = this.db.prepare('DELETE FROM snippets WHERE id = ?').run(id);

      if (result.changes === 0) {
        throw new Error('Snippet not found');
      }

      // 自动删除向量
      await this.vectorStore.deleteVector(id);
    } catch (error) {
      console.error('Failed to delete snippet:', error);
      throw error;
    }
  }

  /**
   * 按分类过滤
   */
  async filterByCategory(categoryId: string): Promise<Snippet[]> {
    return this.listSnippets({ category: categoryId });
  }

  /**
   * 按标签过滤
   */
  async filterByTags(tagIds: string[]): Promise<Snippet[]> {
    return this.listSnippets({ tags: tagIds });
  }

  /**
   * 按语言过滤
   */
  async filterByLanguage(language: string): Promise<Snippet[]> {
    return this.listSnippets({ language });
  }

  /**
   * 搜索片段
   */
  async searchSnippets(query: string): Promise<Snippet[]> {
    return this.listSnippets({ searchQuery: query });
  }

  /**
   * 获取片段的标签
   */
  private getSnippetTags(snippetId: string): string[] {
    const tags = this.db
      .prepare(
        `
      SELECT t.name
      FROM tags t
      JOIN snippet_tags st ON t.id = st.tag_id
      WHERE st.snippet_id = ?
    `
      )
      .all(snippetId) as { name: string }[];

    return tags.map((t) => t.name);
  }

  /**
   * 添加标签到片段
   */
  private addTagsToSnippet(snippetId: string, tagNames: string[]): void {
    const now = Date.now();

    tagNames.forEach((tagName) => {
      // 确保标签存在
      let tag = this.db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as
        | { id: string }
        | undefined;

      if (!tag) {
        const tagId = randomUUID();
        this.db
          .prepare('INSERT INTO tags (id, name, usage_count, created_at) VALUES (?, ?, ?, ?)')
          .run(tagId, tagName, 0, now);
        tag = { id: tagId };
      }

      // 添加关联
      const result = this.db
        .prepare(
          `
        INSERT OR IGNORE INTO snippet_tags (snippet_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `
        )
        .run(snippetId, tag.id, now);

      // 如果成功插入了新关联，更新 usage_count
      if (result && result.changes && result.changes > 0) {
        this.db
          .prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?')
          .run(tag.id);
      }
    });
  }

  /**
   * 获取分类名称
   */
  private getCategoryName(categoryId: string | null): string {
    if (!categoryId) {
      return '';
    }

    const category = this.db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId) as
      | { name: string }
      | undefined;
    return category?.name || '';
  }

  /**
   * 将数据库记录转换为 Snippet 对象
   */
  private async dbSnippetToSnippet(dbSnippet: DbSnippet): Promise<Snippet> {
    const tags = this.getSnippetTags(dbSnippet.id);
    const category = this.getCategoryName(dbSnippet.category_id);

    return {
      id: dbSnippet.id,
      title: dbSnippet.title,
      code: dbSnippet.code,
      language: dbSnippet.language,
      category,
      tags,
      createdAt: new Date(dbSnippet.created_at),
      updatedAt: new Date(dbSnippet.updated_at),
      accessCount: dbSnippet.access_count,
      isSynced: dbSnippet.is_synced === 1,
      cloudId: dbSnippet.cloud_id || undefined,
    };
  }

  /**
   * 向量生成队列
   */
  private vectorGenerationQueue: Array<{ snippetId: string; content: string }> = [];
  private isProcessingQueue = false;

  /**
   * 为片段生成向量
   */
  private generateVectorForSnippet(snippet: Snippet): void {
    const content = `${snippet.title}\n${snippet.code}`;
    
    // 添加到队列
    this.vectorGenerationQueue.push({ snippetId: snippet.id, content });
    
    // 处理队列
    this.processVectorGenerationQueue();
  }

  /**
   * 处理向量生成队列
   */
  private async processVectorGenerationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.vectorGenerationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.vectorGenerationQueue.length > 0) {
        const { snippetId, content } = this.vectorGenerationQueue.shift()!;
        
        try {
          await this.vectorStore.addVector(snippetId, content);
          console.log(`Generated vector for snippet: ${snippetId}`);
        } catch (error) {
          console.error(`Failed to generate vector for snippet ${snippetId}:`, error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
}
