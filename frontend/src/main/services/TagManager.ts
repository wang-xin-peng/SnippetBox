import crypto from 'crypto';
import Database from 'better-sqlite3';

export interface Tag {
  id: string;
  name: string;
  usageCount: number;
  createdAt: Date;
}

export interface CreateTagDto {
  name: string;
}

export class TagManager {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async createTag(dto: CreateTagDto): Promise<Tag> {
    if (!dto.name.trim()) {
      throw new Error('Tag name cannot be empty');
    }

    const normalizedName = dto.name.trim().toLowerCase();
    const existingTag = this.db
      .prepare('SELECT id FROM tags WHERE LOWER(name) = ?')
      .get(normalizedName) as { id: string } | undefined;

    if (existingTag) {
      throw new Error(`Tag with name "${dto.name}" already exists`);
    }

    const id = crypto.randomUUID();
    const name = dto.name.trim();
    const createdAt = Date.now();

    this.db
      .prepare('INSERT INTO tags (id, name, usage_count, created_at) VALUES (?, ?, ?, ?)')
      .run(id, name, 0, createdAt);

    return {
      id,
      name,
      usageCount: 0,
      createdAt: new Date(createdAt),
    };
  }

  async getTags(): Promise<Tag[]> {
    const tags = this.db
      .prepare('SELECT * FROM tags ORDER BY usage_count DESC, name ASC')
      .all() as any[];

    return tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      usageCount: tag.usage_count,
      createdAt: new Date(tag.created_at),
    }));
  }

  async getTagById(id: string): Promise<Tag | undefined> {
    const tag = this.db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as any | undefined;

    if (!tag) {
      return undefined;
    }

    return {
      id: tag.id,
      name: tag.name,
      usageCount: tag.usage_count,
      createdAt: new Date(tag.created_at),
    };
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    const normalizedName = name.trim().toLowerCase();
    const tag = this.db
      .prepare('SELECT * FROM tags WHERE LOWER(name) = ?')
      .get(normalizedName) as any | undefined;

    if (!tag) {
      return undefined;
    }

    return {
      id: tag.id,
      name: tag.name,
      usageCount: tag.usage_count,
      createdAt: new Date(tag.created_at),
    };
  }

  async getTagSuggestions(
    query: string,
    options?: {
      exclude?: string[];
      limit?: number;
    }
  ): Promise<Tag[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const limit = options?.limit || 10;

    let sql = 'SELECT * FROM tags WHERE name LIKE ?';
    const params: any[] = [`%${normalizedQuery}%`];

    if (options?.exclude && options.exclude.length > 0) {
      const placeholders = options.exclude.map(() => '?').join(', ');
      sql += ` AND name NOT IN (${placeholders})`;
      params.push(...options.exclude);
    }

    sql += ' ORDER BY usage_count DESC, name ASC LIMIT ?';
    params.push(limit);

    const tags = this.db.prepare(sql).all(...params) as any[];

    return tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      usageCount: tag.usage_count,
      createdAt: new Date(tag.created_at),
    }));
  }

  async getTagUsageCount(tagId: string): Promise<number> {
    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM snippet_tags WHERE tag_id = ?')
      .get(tagId) as { count: number } | undefined;

    return result?.count || 0;
  }

  async deleteTag(id: string): Promise<void> {
    const existingTag = await this.getTagById(id);
    if (!existingTag) {
      throw new Error(`Tag with id "${id}" not found`);
    }

    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM snippet_tags WHERE tag_id = ?').run(id);
      this.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    });

    transaction();
  }

  async mergeTags(sourceId: string, targetId: string): Promise<void> {
    if (sourceId === targetId) {
      throw new Error('Cannot merge a tag with itself');
    }

    const sourceTag = await this.getTagById(sourceId);
    const targetTag = await this.getTagById(targetId);

    if (!sourceTag) {
      throw new Error(`Source tag with id "${sourceId}" not found`);
    }

    if (!targetTag) {
      throw new Error(`Target tag with id "${targetId}" not found`);
    }

    // 先获取使用计数，因为它是异步的
    const usageCount = await this.getTagUsageCount(targetId);

    const transaction = this.db.transaction(() => {
      this.db
        .prepare('UPDATE snippet_tags SET tag_id = ? WHERE tag_id = ?')
        .run(targetId, sourceId);

      this.db.prepare('DELETE FROM snippet_tags WHERE tag_id = ?').run(sourceId);
      this.db.prepare('DELETE FROM tags WHERE id = ?').run(sourceId);

      this.db.prepare('UPDATE tags SET usage_count = ? WHERE id = ?').run(usageCount, targetId);
    });

    transaction();
  }

  async renameTag(id: string, newName: string): Promise<Tag> {
    const existingTag = await this.getTagById(id);
    if (!existingTag) {
      throw new Error(`Tag with id "${id}" not found`);
    }

    const normalizedName = newName.trim().toLowerCase();
    if (!normalizedName) {
      throw new Error('Tag name cannot be empty');
    }

    const duplicateTag = this.db
      .prepare('SELECT id FROM tags WHERE LOWER(name) = ? AND id != ?')
      .get(normalizedName, id) as { id: string } | undefined;

    if (duplicateTag) {
      throw new Error(`Tag "${newName}" already exists`);
    }

    this.db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(newName.trim(), id);

    return {
      ...existingTag,
      name: newName.trim(),
    };
  }

  async getOrCreateTag(name: string): Promise<Tag> {
    const existingTag = await this.getTagByName(name);
    if (existingTag) {
      return existingTag;
    }

    return this.createTag({ name });
  }

  async getTagsForSnippet(snippetId: string): Promise<Tag[]> {
    const tags = this.db
      .prepare(
        `
      SELECT t.* FROM tags t
      JOIN snippet_tags st ON t.id = st.tag_id
      WHERE st.snippet_id = ?
      ORDER BY t.usage_count DESC, t.name ASC
    `
      )
      .all(snippetId) as any[];

    return tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      usageCount: tag.usage_count,
      createdAt: new Date(tag.created_at),
    }));
  }

  async updateTagsForSnippet(snippetId: string, tagNames: string[]): Promise<Tag[]> {
    const normalizedTagNames = tagNames
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM snippet_tags WHERE snippet_id = ?').run(snippetId);

      for (const tagName of normalizedTagNames) {
        // 同步查找或创建标签
        let tag = this.db
          .prepare('SELECT * FROM tags WHERE LOWER(name) = ?')
          .get(tagName.toLowerCase()) as any | undefined;

        if (!tag) {
          // 创建新标签
          const id = crypto.randomUUID();
          const createdAt = Date.now();
          this.db
            .prepare('INSERT INTO tags (id, name, usage_count, created_at) VALUES (?, ?, ?, ?)')
            .run(id, tagName, 0, createdAt);
          tag = { id, name: tagName, usage_count: 0, created_at: createdAt };
        }

        this.db
          .prepare('INSERT INTO snippet_tags (snippet_id, tag_id, created_at) VALUES (?, ?, ?)')
          .run(snippetId, tag.id, Date.now());

        this.db
          .prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?')
          .run(tag.id);
      }
    });

    transaction();

    return this.getTagsForSnippet(snippetId);
  }
}
