import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID, createHash } from 'crypto';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
  duplicates?: Array<{ title: string; codeHash: string; action: string }>;
}

export interface ImportOptions {
  skipDuplicates?: boolean;
  overwriteDuplicates?: boolean;
  smartMerge?: boolean;
  logImport?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ImportService {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || new Database(':memory:');
  }

  /**
   * 验证导入文件
   */
  validateImportFile(fileName: string, format?: 'markdown' | 'json'): ValidationResult {
    const errors: string[] = [];
    const ext = path.extname(fileName).toLowerCase();

    if (format === 'markdown' || ext === '.md' || ext === '.markdown') {
      // Markdown 格式无需特殊验证
      return { valid: true, errors: [] };
    } else if (format === 'json' || ext === '.json') {
      // JSON 格式无需特殊验证
      return { valid: true, errors: [] };
    }

    errors.push('不支持的文件格式，请使用 .md、.markdown 或 .json 文件');
    return { valid: false, errors };
  }

  /**
   * 导入片段（UI 调用入口）
   */
  async importSnippets(
    filePath: string,
    options: { format?: 'markdown' | 'json'; duplicateStrategy?: 'skip' | 'overwrite' | 'rename' }
  ): Promise<{ imported: number; skipped: number; errors: string[]; success: boolean }> {
    const format = options.format || (filePath.endsWith('.json') ? 'json' : 'markdown');
    const importOptions: ImportOptions = {
      skipDuplicates: options.duplicateStrategy === 'skip',
      overwriteDuplicates: options.duplicateStrategy === 'overwrite',
      logImport: true
    };

    let result: ImportResult;

    if (format === 'json') {
      result = await this.importFromJSON(filePath, importOptions);
    } else {
      result = await this.importFromMarkdown(filePath, importOptions);
    }

    return {
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.map(e => e.error),
      success: result.errors.length === 0
    };
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
          if (options.skipDuplicates || options.overwriteDuplicates || options.smartMerge) {
            const existing = this.findDuplicate(snippet.title, snippet.code);
            if (existing) {
              if (options.skipDuplicates) {
                if (options.logImport) this.logImport('skip', snippet, result);
                result.skipped++;
                continue;
              } else if (options.overwriteDuplicates) {
                this.updateSnippet(existing.id, snippet);
                if (options.logImport) this.logImport('overwrite', snippet, result);
                result.imported++;
                continue;
              } else if (options.smartMerge) {
                const merged = this.smartMerge(existing, snippet);
                if (merged) {
                  this.updateSnippet(existing.id, merged);
                  if (options.logImport) this.logImport('smart_merge', snippet, result);
                } else {
                  if (options.logImport) this.logImport('keep_existing', snippet, result);
                }
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
      let snippets = JSON.parse(content);

      // 支持两种格式：数组 或 { snippets: [...] } 对象
      if (!Array.isArray(snippets)) {
        if (snippets.snippets && Array.isArray(snippets.snippets)) {
          snippets = snippets.snippets;
        } else {
          result.errors.push({ file: filePath, error: 'Invalid JSON format: expected array or object with snippets property' });
          return result;
        }
      }

      for (const snippet of snippets) {
        try {
          // 验证必需字段
          if (!snippet.title || !snippet.code || !snippet.language) {
            result.skipped++;
            continue;
          }

          // 检查重复
          if (options.skipDuplicates || options.overwriteDuplicates || options.smartMerge) {
            const existing = this.findDuplicate(snippet.title, snippet.code);
            if (existing) {
              if (options.skipDuplicates) {
                if (options.logImport) this.logImport('skip', snippet, result);
                result.skipped++;
                continue;
              } else if (options.overwriteDuplicates) {
                this.updateSnippet(existing.id, snippet);
                if (options.logImport) this.logImport('overwrite', snippet, result);
                result.imported++;
                continue;
              } else if (options.smartMerge) {
                const merged = this.smartMerge(existing, snippet);
                if (merged) {
                  this.updateSnippet(existing.id, merged);
                  if (options.logImport) this.logImport('smart_merge', snippet, result);
                } else {
                  if (options.logImport) this.logImport('keep_existing', snippet, result);
                }
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

      // 提取代码块
      const codeMatch = markdown.match(/```(\w+)\n([\s\S]+?)\n```/);
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
   * 计算代码哈希
   */
  private computeCodeHash(code: string): string {
    return createHash('sha256').update(code).digest('hex').substring(0, 16);
  }

  /**
   * 查找重复片段（基于标题 + 代码哈希）
   */
  private findDuplicate(title: string, code: string): any | null {
    try {
      const codeHash = this.computeCodeHash(code);
      const snippet = this.db.prepare(`
        SELECT s.* FROM snippets s
        WHERE s.title = ? AND s.code_hash = ?
        LIMIT 1
      `).get(title, codeHash);
      return snippet || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 智能合并片段（保留更新的版本）
   */
  private smartMerge(existing: any, imported: any): any {
    const existingUpdated = new Date(existing.updated_at).getTime();
    const importedUpdated = imported.updatedAt ? new Date(imported.updatedAt).getTime() : Date.now();

    if (importedUpdated > existingUpdated) {
      return {
        ...imported,
        id: existing.id,
        created_at: existing.created_at
      };
    }
    return null;
  }

  /**
   * 记录导入日志
   */
  private logImport(action: string, snippet: any, result: ImportResult): void {
    if (!result.duplicates) {
      result.duplicates = [];
    }
    result.duplicates.push({
      title: snippet.title,
      codeHash: this.computeCodeHash(snippet.code),
      action
    });
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
    const codeHash = this.computeCodeHash(snippet.code);
    this.db.prepare(`
      INSERT INTO snippets (id, title, description, code, code_hash, language, category_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, snippet.title, snippet.description || '', snippet.code, codeHash, snippet.language, categoryId, now, now);

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
