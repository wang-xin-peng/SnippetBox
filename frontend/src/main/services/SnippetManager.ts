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
  starred: number;
  storage_scope?: string | null;
  skip_sync?: number | null;
  is_deleted?: number;
  deleted_at?: number | null;
  category_name?: string | null;
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

  // 创建片段
  async createSnippet(data: CreateSnippetDTO, storageScope: 'local' | 'cloud' = 'local'): Promise<Snippet> {
    const id = randomUUID();
    const now = Date.now();

    try {
      const transaction = this.db.transaction(() => {
        this.db
          .prepare(
            `
          INSERT INTO snippets (id, title, code, language, category_id, description, created_at, updated_at, access_count, is_synced, storage_scope)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
        `
          )
          .run(id, data.title, data.code, data.language, data.category || null, data.description || null, now, now, storageScope);

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

  // 获取片段列表
  async listSnippets(filter?: SnippetFilter): Promise<Snippet[]> {
    try {
      let sql = `
        SELECT DISTINCT s.*
        FROM snippets s
        LEFT JOIN snippet_tags st ON s.id = st.snippet_id
        WHERE (s.is_deleted = 0 OR s.is_deleted IS NULL)
      `;
      const params: any[] = [];

      // 应用过滤条件
      if (filter?.category) {
        // category 可能是名称或 ID，都支持
        sql += ` AND (s.category_id = ? OR s.category_id IN (SELECT id FROM categories WHERE name = ?))`;
        params.push(filter.category, filter.category);
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

  // 获取单个片段
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

  // 更新片段
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
        if (data.description !== undefined) {
          updates.push('description = ?');
          params.push(data.description);
        }
        if (data.category !== undefined) {
          updates.push('category_id = ?');
          params.push(data.category);
        }
        if ((data as any).starred !== undefined) {
          updates.push('starred = ?');
          params.push((data as any).starred ? 1 : 0);
        }

        // 有实质内容变更时，标记为未同步
        const hasContentChange = data.title !== undefined || data.code !== undefined ||
          data.language !== undefined || data.description !== undefined ||
          data.category !== undefined || data.tags !== undefined;
        if (hasContentChange) {
          updates.push('is_synced = 0');
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

  // 删除片段
  async deleteSnippet(id: string): Promise<void> {
    try {
      const now = Date.now();
      const result = this.db
        .prepare('UPDATE snippets SET is_deleted = 1, deleted_at = ? WHERE id = ?')
        .run(now, id);

      if (result.changes === 0) {
        throw new Error('Snippet not found');
      }
    } catch (error) {
      console.error('Failed to delete snippet:', error);
      throw error;
    }
  }

  async listTrash(): Promise<Snippet[]> {
    try {
      const dbSnippets = this.db
        .prepare('SELECT * FROM snippets WHERE is_deleted = 1 ORDER BY deleted_at DESC')
        .all() as DbSnippet[];
      return Promise.all(dbSnippets.map((s) => this.dbSnippetToSnippet(s)));
    } catch (error) {
      console.error('Failed to list trash:', error);
      throw error;
    }
  }

  async restoreSnippet(id: string): Promise<Snippet> {
    try {
      this.db
        .prepare('UPDATE snippets SET is_deleted = 0, deleted_at = NULL WHERE id = ?')
        .run(id);
      return await this.getSnippet(id);
    } catch (error) {
      console.error('Failed to restore snippet:', error);
      throw error;
    }
  }

  async permanentDelete(id: string): Promise<void> {
    try {
      // 先获取 cloudId，用于写入黑名单
      const row = this.db.prepare('SELECT cloud_id FROM snippets WHERE id = ?').get(id) as { cloud_id: string | null } | undefined;
      this.db.prepare('DELETE FROM snippet_tags WHERE snippet_id = ?').run(id);
      const result = this.db.prepare('DELETE FROM snippets WHERE id = ? AND is_deleted = 1').run(id);
      if (result.changes === 0) {
        throw new Error('Snippet not found in trash');
      }
      // 记录 cloudId 黑名单，防止 pull 时重新拉回
      if (row?.cloud_id) {
        this.db.prepare('INSERT OR REPLACE INTO deleted_cloud_ids (cloud_id, deleted_at) VALUES (?, ?)').run(row.cloud_id, Date.now());
      }
      await this.vectorStore.deleteVector(id);
    } catch (error) {
      console.error('Failed to permanently delete snippet:', error);
      throw error;
    }
  }

  async emptyTrash(): Promise<void> {
    try {
      const trashSnippets = this.db
        .prepare('SELECT id, cloud_id FROM snippets WHERE is_deleted = 1')
        .all() as Array<{ id: string; cloud_id: string | null }>;
      const transaction = this.db.transaction(() => {
        // 记录所有有 cloudId 的片段到黑名单
        const insertBlacklist = this.db.prepare('INSERT OR REPLACE INTO deleted_cloud_ids (cloud_id, deleted_at) VALUES (?, ?)');
        const now = Date.now();
        for (const s of trashSnippets) {
          if (s.cloud_id) insertBlacklist.run(s.cloud_id, now);
        }
        this.db.prepare('DELETE FROM snippet_tags WHERE snippet_id IN (SELECT id FROM snippets WHERE is_deleted = 1)').run();
        this.db.prepare('DELETE FROM snippets WHERE is_deleted = 1').run();
      });
      transaction();
      for (const s of trashSnippets) {
        await this.vectorStore.deleteVector(s.id).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to empty trash:', error);
      throw error;
    }
  }

  // 按分类过滤
  async filterByCategory(categoryId: string): Promise<Snippet[]> {
    return this.listSnippets({ category: categoryId });
  }

  // 按标签过滤
  async filterByTags(tagIds: string[]): Promise<Snippet[]> {
    return this.listSnippets({ tags: tagIds });
  }

  // 按语言过滤
  async filterByLanguage(language: string): Promise<Snippet[]> {
    return this.listSnippets({ language });
  }

  // 搜索片段
  async searchSnippets(query: string): Promise<Snippet[]> {
    return this.listSnippets({ searchQuery: query });
  }

  // 获取片段的标签
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

  // 添加标签到片段
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

  // 获取分类名称
  private getCategoryName(categoryId: string | null): string {
    if (!categoryId) {
      return '';
    }

    const category = this.db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId) as
      | { name: string }
      | undefined;
    return category?.name || '';
  }

  // 将数据库记录转换为 Snippet 对象
  private async dbSnippetToSnippet(dbSnippet: DbSnippet): Promise<Snippet> {
    const tags = this.getSnippetTags(dbSnippet.id);
    let category: string;
    let categoryId: string | undefined;
    if (dbSnippet.cloud_id && dbSnippet.category_name) {
      category = dbSnippet.category_name;
    } else if (dbSnippet.category_id) {
      category = this.getCategoryName(dbSnippet.category_id) || '';
      categoryId = dbSnippet.category_id;
    } else {
      category = '';
    }

    return {
      id: dbSnippet.id,
      title: dbSnippet.title,
      code: dbSnippet.code,
      language: dbSnippet.language,
      description: dbSnippet.description || undefined,
      category,
      categoryId,
      tags,
      starred: dbSnippet.starred === 1,
      createdAt: new Date(dbSnippet.created_at),
      updatedAt: new Date(dbSnippet.updated_at),
      accessCount: dbSnippet.access_count,
      isSynced: dbSnippet.is_synced === 1,
      cloudId: dbSnippet.cloud_id || undefined,
      storageScope: dbSnippet.storage_scope === 'cloud' ? 'cloud' : 'local',
      skipSync: dbSnippet.skip_sync === 1,
      deletedAt: dbSnippet.deleted_at ?? null,
    };
  }

  // 批量删除片段
  async batchDelete(snippetIds: string[]): Promise<BatchResult> {
    const result: BatchResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    const now = Date.now();
    const transaction = this.db.transaction((ids: string[]) => {
      const stmt = this.db.prepare('UPDATE snippets SET is_deleted = 1, deleted_at = ? WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)');
      for (const id of ids) {
        const r = stmt.run(now, id);
        if (r.changes > 0) result.success++;
        else { result.failed++; result.errors.push({ snippetId: id, error: 'Not found or already deleted' }); }
      }
    });

    try {
      transaction(snippetIds);
    } catch (error) {
      result.failed = snippetIds.length - result.success;
    }

    return result;
  }

  // 批量修改标签
  async batchUpdateTags(snippetIds: string[], tags: string[]): Promise<BatchResult> {
    const result: BatchResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const snippetId of snippetIds) {
      try {
        await this.updateSnippet(snippetId, { tags });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({ snippetId, error: (error as Error).message });
      }
    }

    return result;
  }

  // 批量修改分类
  async batchUpdateCategory(snippetIds: string[], categoryId: string): Promise<BatchResult> {
    const result: BatchResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const snippetId of snippetIds) {
      try {
        await this.updateSnippet(snippetId, { category: categoryId });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({ snippetId, error: (error as Error).message });
      }
    }

    return result;
  }

  // 向量生成队列
  private vectorGenerationQueue: Array<{ snippetId: string; content: string }> = [];
  private isProcessingQueue = false;

  // 为片段生成向量
  private generateVectorForSnippet(snippet: Snippet): void {
    // 组合标题、描述和代码，提高语义搜索准确性
    const content = [
      snippet.title,
      snippet.description || '',
      snippet.code
    ].filter(Boolean).join('\n');
    
    // 添加到队列
    this.vectorGenerationQueue.push({ snippetId: snippet.id, content });
    
    // 处理队列
    this.processVectorGenerationQueue();
  }

  // 处理向量生成队列
  private async processVectorGenerationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.vectorGenerationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      let processedCount = 0;
      while (this.vectorGenerationQueue.length > 0) {
        const { snippetId, content } = this.vectorGenerationQueue.shift()!;
        
        try {
          await this.vectorStore.addVector(snippetId, content);
          console.log(`Generated vector for snippet: ${snippetId}`);
          processedCount++;
          
          // 每处理 3 个片段后，让出主线程给其他任务
          if (processedCount % 3 === 0) {
            await new Promise(resolve => setImmediate(resolve));
          }
        } catch (error) {
          console.error(`Failed to generate vector for snippet ${snippetId}:`, error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
}

export interface BatchResult {
  success: number;
  failed: number;
  errors: Array<{ snippetId: string; error: string }>;
}
