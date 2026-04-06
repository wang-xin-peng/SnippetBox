import crypto from 'crypto';
import { DatabaseManager } from '../database';

const dbInstance = DatabaseManager.getInstance();

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
  private db: any;

  constructor(db?: any) {
    if (db) {
      this.db = db;
    } else {
      dbInstance.connect();
      this.db = dbInstance.getDB();
    }
  }

  async createTag(dto: CreateTagDto): Promise<Tag> {
    if (!dto.name.trim()) {
      throw new Error('Tag name cannot be empty');
    }

    const normalizedName = dto.name.trim().toLowerCase();
    const existingTag = await this.db.get(
      'SELECT id FROM tags WHERE LOWER(name) = ?',
      [normalizedName]
    );

    if (existingTag) {
      throw new Error(`Tag with name "${dto.name}" already exists`);
    }

    const id = crypto.randomUUID();
    const name = dto.name.trim();
    const createdAt = new Date();

    await this.db.run(
      'INSERT INTO tags (id, name, usage_count, created_at) VALUES (?, ?, ?, ?)',
      [id, name, 0, createdAt.toISOString()]
    );

    return {
      id,
      name,
      usageCount: 0,
      createdAt,
    };
  }

  async getTags(): Promise<Tag[]> {
    const tags = await this.db.all('SELECT * FROM tags ORDER BY usage_count DESC, name ASC');

    return tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      usageCount: tag.usage_count,
      createdAt: new Date(tag.created_at),
    }));
  }

  async getTagById(id: string): Promise<Tag | undefined> {
    const tag = await this.db.get('SELECT * FROM tags WHERE id = ?', [id]);

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
    const tag = await this.db.get('SELECT * FROM tags WHERE LOWER(name) = ?', [normalizedName]);

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

  async getTagSuggestions(query: string, options?: {
    exclude?: string[];
    limit?: number;
  }): Promise<Tag[]> {
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

    const tags = await this.db.all(sql, params);

    return tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      usageCount: tag.usage_count,
      createdAt: new Date(tag.created_at),
    }));
  }

  async getTagUsageCount(tagId: string): Promise<number> {
    const result = await this.db.get(
      'SELECT COUNT(*) as count FROM snippet_tags WHERE tag_id = ?',
      [tagId]
    );

    return result?.count || 0;
  }

  async deleteTag(id: string): Promise<void> {
    const existingTag = await this.getTagById(id);
    if (!existingTag) {
      throw new Error(`Tag with id "${id}" not found`);
    }

    await this.db.transaction(async () => {
      await this.db.run('DELETE FROM snippet_tags WHERE tag_id = ?', [id]);
      await this.db.run('DELETE FROM tags WHERE id = ?', [id]);
    });
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

    await this.db.transaction(async () => {
      await this.db.run(
        'UPDATE snippet_tags SET tag_id = ? WHERE tag_id = ?',
        [targetId, sourceId]
      );

      await this.db.run('DELETE FROM snippet_tags WHERE tag_id = ?', [sourceId]);
      await this.db.run('DELETE FROM tags WHERE id = ?', [sourceId]);

      const usageCount = await this.getTagUsageCount(targetId);
      await this.db.run(
        'UPDATE tags SET usage_count = ? WHERE id = ?',
        [usageCount, targetId]
      );
    });
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

    const duplicateTag = await this.db.get(
      'SELECT id FROM tags WHERE LOWER(name) = ? AND id != ?',
      [normalizedName, id]
    );

    if (duplicateTag) {
      throw new Error(`Tag "${newName}" already exists`);
    }

    await this.db.run('UPDATE tags SET name = ? WHERE id = ?', [newName.trim(), id]);

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
    const tags = await this.db.all(`
      SELECT t.* FROM tags t
      JOIN snippet_tags st ON t.id = st.tag_id
      WHERE st.snippet_id = ?
      ORDER BY t.usage_count DESC, t.name ASC
    `, [snippetId]);

    return tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      usageCount: tag.usage_count,
      createdAt: new Date(tag.created_at),
    }));
  }

  async updateTagsForSnippet(snippetId: string, tagNames: string[]): Promise<Tag[]> {
    const normalizedTagNames = tagNames.map(name => name.trim().toLowerCase()).filter(Boolean);

    await this.db.transaction(async () => {
      await this.db.run('DELETE FROM snippet_tags WHERE snippet_id = ?', [snippetId]);

      for (const tagName of normalizedTagNames) {
        let tag = await this.getTagByName(tagName);
        if (!tag) {
          tag = await this.createTag({ name: tagName });
        }

        await this.db.run(
          'INSERT INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)',
          [snippetId, tag.id]
        );

        await this.db.run(
          'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
          [tag.id]
        );
      }
    });

    return this.getTagsForSnippet(snippetId);
  }
}
