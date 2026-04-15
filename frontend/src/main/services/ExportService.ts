import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export interface ExportOptions {
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  format?: 'markdown' | 'json';
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface BatchExportResult {
  success: number;
  failed: number;
  errors: Array<{ snippetId: string; error: string }>;
  filePath?: string;
}

export class ExportService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 导出单个片段为 Markdown
   */
  async exportToMarkdown(snippetId: string, filePath: string, options: ExportOptions = {}): Promise<ExportResult> {
    try {
      const snippet = this.db.prepare('SELECT * FROM snippets WHERE id = ?').get(snippetId) as any;
      
      if (!snippet) {
        return { success: false, error: 'Snippet not found' };
      }

      // 获取分类
      let category = null;
      if (snippet.category_id) {
        category = this.db.prepare('SELECT name FROM categories WHERE id = ?').get(snippet.category_id) as any;
      }

      // 获取标签
      const tags = this.db.prepare(`
        SELECT t.name
        FROM tags t
        JOIN snippet_tags st ON t.id = st.tag_id
        WHERE st.snippet_id = ?
      `).all(snippetId) as any[];

      // 生成 Markdown 内容
      const markdown = this.generateMarkdown(snippet, category, tags, options);

      // 写入文件
      fs.writeFileSync(filePath, markdown, 'utf-8');

      return { success: true, filePath };
    } catch (error) {
      console.error('[ExportService] Export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 批量导出片段为 Markdown
   */
  async batchExportToMarkdown(snippetIds: string[], filePath: string, options: ExportOptions = {}): Promise<BatchExportResult> {
    const result: BatchExportResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      let allMarkdown = '';

      for (const snippetId of snippetIds) {
        try {
          const snippet = this.db.prepare('SELECT * FROM snippets WHERE id = ?').get(snippetId) as any;
          
          if (!snippet) {
            result.failed++;
            result.errors.push({ snippetId, error: 'Snippet not found' });
            continue;
          }

          // 获取分类
          let category = null;
          if (snippet.category_id) {
            category = this.db.prepare('SELECT name FROM categories WHERE id = ?').get(snippet.category_id) as any;
          }

          // 获取标签
          const tags = this.db.prepare(`
            SELECT t.name
            FROM tags t
            JOIN snippet_tags st ON t.id = st.tag_id
            WHERE st.snippet_id = ?
          `).all(snippetId) as any[];

          // 生成 Markdown 内容
          const markdown = this.generateMarkdown(snippet, category, tags, options);
          allMarkdown += markdown + '\n\n---\n\n';

          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({ snippetId, error: (error as Error).message });
        }
      }

      // 写入文件
      fs.writeFileSync(filePath, allMarkdown, 'utf-8');
      result.filePath = filePath;

      return result;
    } catch (error) {
      console.error('[ExportService] Batch export failed:', error);
      result.failed = snippetIds.length - result.success;
      result.errors.push({ snippetId: 'all', error: (error as Error).message });
      return result;
    }
  }

  /**
   * 导出为 JSON
   */
  async exportToJSON(snippetIds: string[], filePath: string): Promise<ExportResult> {
    try {
      const snippets = [];

      for (const snippetId of snippetIds) {
        const snippet = this.db.prepare('SELECT * FROM snippets WHERE id = ?').get(snippetId) as any;
        
        if (!snippet) continue;

        // 获取分类
        let category = null;
        if (snippet.category_id) {
          category = this.db.prepare('SELECT name FROM categories WHERE id = ?').get(snippet.category_id) as any;
        }

        // 获取标签
        const tags = this.db.prepare(`
          SELECT t.name
          FROM tags t
          JOIN snippet_tags st ON t.id = st.tag_id
          WHERE st.snippet_id = ?
        `).all(snippetId) as any[];

        snippets.push({
          id: snippet.id,
          title: snippet.title,
          description: snippet.description,
          code: snippet.code,
          language: snippet.language,
          category: category?.name,
          tags: tags.map(t => t.name),
          createdAt: snippet.created_at,
          updatedAt: snippet.updated_at
        });
      }

      // 写入 JSON 文件
      fs.writeFileSync(filePath, JSON.stringify(snippets, null, 2), 'utf-8');

      return { success: true, filePath };
    } catch (error) {
      console.error('[ExportService] JSON export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 生成 Markdown 内容
   */
  private generateMarkdown(snippet: any, category: any, tags: any[], options: ExportOptions): string {
    let markdown = '';

    // 标题
    markdown += `# ${snippet.title}\n\n`;

    // 描述
    if (snippet.description) {
      markdown += `${snippet.description}\n\n`;
    }

    // 元数据
    if (options.includeMetadata !== false) {
      markdown += '## 元数据\n\n';
      markdown += `- **语言**: ${snippet.language}\n`;
      if (category) {
        markdown += `- **分类**: ${category.name}\n`;
      }
      if (tags.length > 0) {
        markdown += `- **标签**: ${tags.map(t => t.name).join(', ')}\n`;
      }
      if (options.includeTimestamps !== false) {
        markdown += `- **创建时间**: ${new Date(snippet.created_at).toLocaleString('zh-CN')}\n`;
        markdown += `- **更新时间**: ${new Date(snippet.updated_at).toLocaleString('zh-CN')}\n`;
      }
      markdown += '\n';
    }

    // 代码
    markdown += '## 代码\n\n';
    markdown += '```' + snippet.language + '\n';
    markdown += snippet.code + '\n';
    markdown += '```\n';

    return markdown;
  }
}
