import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
}

export interface ImportOptions {
  skipDuplicates?: boolean;
  overwriteDuplicates?: boolean;
}

export class ImportService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 从 Markdown 文件导入片段
   */
  async importFromMarkdown(filePath: string, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 分割多个片段（使用 --- 分隔符）
      const snippetBlocks = content.split(/\n---\n/).filter(block => block.trim());

      for (const block of snippetBlocks) {
        try {
          const snippet = this.parseMarkdownSnippet(block);
          
          if (!snippet) {
            result.skipped++;
            continue;
          }

          // 检查重复
          if (options.skipDuplicates || options.overwriteDuplicates) {
            const existing = this.findDuplicate(snippet.title, snippet.code);
            if (existing) {
              if (options.skipDuplicates) {
                result.skipped++;
                continue;
              } else if (options.overwriteDuplicates) {
                this.updateSnippet(existing.id, snippet);
                result.imported++;
                continue;
              }
            }
          }

          // 创建新片段
          this.createSnippet(snippet);
          result.imported++;
        } catch (error) {
          result.errors.push({ file: filePath, error: (error as Error).message });
        }
      }

      return result;
    } catch (error) {
      console.error('[ImportService] Markdown import failed:', error);
      result.errors.push({ file: filePath, error: (error as Error).message });
      return result;
    }
  }

  /**
   * 从 JSON 文件导入片段
   */
  async importFromJSON(filePath: string, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const snippets = JSON.parse(content);

      if (!Array.isArray(snippets)) {
        result.errors.push({ file: filePath, error: 'Invalid JSON format: expected array' });
        return result;
      }

      for (const snippet of snippets) {
        try {
          // 验证必需字段
          if (!snippet.title || !snippet.code || !snippet.language) {
            result.skipped++;
            continue;
          }

          // 检查重复
          if (options.skipDuplicates || options.overwriteDuplicates) {
            const existing = this.findDuplicate(snippet.title, snippet.code);
            if (existing) {
              if (options.skipDuplicates) {
                result.skipped++;
                continue;
              } else if (options.overwriteDuplicates) {
                this.updateSnippet(existing.id, snippet);
                result.imported++;
                continue;
              }
            }
          }

          // 创建新片段
          this.createSnippet(snippet);
          result.imported++;
        } catch (error) {
          result.errors.push({ file: filePath, error: (error as Error).message });
        }
      }

      return result;
    } catch (error) {
      console.error('[ImportService] JSON import failed:', error);
      result.errors.push({ file: filePath, error: (error as Error).message });
      return result;
    }
  }

  /**
   * 解析 Markdown 片段
   */
  private parseMarkdownSnippet(markdown: string): any | null {
    try {
      // 提取标题
      const titleMatch = markdown.match(/^#\s+(.+)$/m);
      if (!titleMatch) return null;
      const title = titleMatch[1].trim();

      // 提取代码块（语言名可能包含 +, # 等特殊字符如 C++, C#）
      const codeMatch = markdown.match(/```([^\n]+)\n([\s\S]+?)\n```/);
      if (!codeMatch) return null;
      const language = codeMatch[1];
      const code = codeMatch[2];

      // 提取描述（标题和元数据之间的内容）
      const descMatch = markdown.match(/^#.+\n\n(.+?)\n\n##/s);
      const description = descMatch ? descMatch[1].trim() : '';

      // 提取分类
      const categoryMatch = markdown.match(/- \*\*分类\*\*:\s*(.+)/);
      const category = categoryMatch ? categoryMatch[1].trim() : null;

      // 提取标签
      const tagsMatch = markdown.match(/- \*\*标签\*\*:\s*(.+)/);
      const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : [];

      return {
        title,
        description,
        code,
        language,
        category,
        tags
      };
    } catch (error) {
      console.error('[ImportService] Parse markdown failed:', error);
      return null;
    }
  }

  /**
   * 查找重复片段
   */
  private findDuplicate(title: string, code: string): any | null {
    try {
      const snippet = this.db.prepare(`
        SELECT * FROM snippets 
        WHERE title = ? AND code = ?
        LIMIT 1
      `).get(title, code);
      return snippet || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 创建片段
   */
  private createSnippet(snippet: any): void {
    const id = randomUUID();
    const now = new Date().toISOString();

    // 获取或创建分类
    let categoryId = null;
    if (snippet.category) {
      let category = this.db.prepare('SELECT id FROM categories WHERE name = ?').get(snippet.category) as any;
      if (!category) {
        const catId = randomUUID();
        this.db.prepare('INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)').run(catId, snippet.category, now);
        categoryId = catId;
      } else {
        categoryId = category.id;
      }
    }

    // 创建片段
    this.db.prepare(`
      INSERT INTO snippets (id, title, description, code, language, category_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, snippet.title, snippet.description || '', snippet.code, snippet.language, categoryId, now, now);

    // 添加标签
    if (snippet.tags && snippet.tags.length > 0) {
      for (const tagName of snippet.tags) {
        let tag = this.db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as any;
        if (!tag) {
          const tagId = randomUUID();
          this.db.prepare('INSERT INTO tags (id, name, usage_count, created_at) VALUES (?, ?, ?, ?)').run(tagId, tagName, 0, now);
          tag = { id: tagId };
        }

        // 关联标签
        this.db.prepare('INSERT INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)').run(id, tag.id);
        
        // 更新标签使用次数
        this.db.prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?').run(tag.id);
      }
    }
  }

  /**
   * 更新片段
   */
  private updateSnippet(id: string, snippet: any): void {
    const now = new Date().toISOString();

    // 获取或创建分类
    let categoryId = null;
    if (snippet.category) {
      let category = this.db.prepare('SELECT id FROM categories WHERE name = ?').get(snippet.category) as any;
      if (!category) {
        const catId = randomUUID();
        this.db.prepare('INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)').run(catId, snippet.category, now);
        categoryId = catId;
      } else {
        categoryId = category.id;
      }
    }

    // 更新片段
    this.db.prepare(`
      UPDATE snippets 
      SET title = ?, description = ?, code = ?, language = ?, category_id = ?, updated_at = ?
      WHERE id = ?
    `).run(snippet.title, snippet.description || '', snippet.code, snippet.language, categoryId, now, id);

    // 删除旧标签关联
    this.db.prepare('DELETE FROM snippet_tags WHERE snippet_id = ?').run(id);

    // 添加新标签
    if (snippet.tags && snippet.tags.length > 0) {
      for (const tagName of snippet.tags) {
        let tag = this.db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as any;
        if (!tag) {
          const tagId = randomUUID();
          this.db.prepare('INSERT INTO tags (id, name, usage_count, created_at) VALUES (?, ?, ?, ?)').run(tagId, tagName, 0, now);
          tag = { id: tagId };
        }

        // 关联标签
        this.db.prepare('INSERT INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)').run(id, tag.id);
        
        // 更新标签使用次数
        this.db.prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?').run(tag.id);
      }
    }
  }
}
