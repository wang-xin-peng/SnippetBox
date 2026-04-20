import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

export interface ExportOptions {
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  format?: 'markdown' | 'json' | 'pdf';
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  message?: string;
}

export interface BatchExportResult {
  success: number;
  failed: number;
  errors: Array<{ snippetId: string; error: string }>;
  filePath?: string;
  message?: string;
}

export class ExportService {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || new Database(':memory:');
  }

  /**
   * 导出多个片段
   */
  async exportSnippets(
    snippets: Array<{ id: string; title: string; code: string; language: string; category?: string; tags?: string[] }>,
    options: ExportOptions = {},
    filePath: string
  ): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const snippetIds = snippets.map(s => s.id);

      if (options.format === 'pdf') {
        const result = await this.exportToPdf(snippetIds, filePath, options);
        return {
          success: result.success,
          message: result.success ? 'PDF 导出成功' : (result.error || 'PDF 导出失败'),
          filePath: result.filePath
        };
      } else {
        const result = await this.batchExportToMarkdown(snippetIds, filePath, options);
        return {
          success: result.failed === 0,
          message: result.failed === 0 ? 'Markdown 导出成功' : `导出完成，${result.failed} 个片段失败`,
          filePath: result.filePath
        };
      }
    } catch (error) {
      console.error('[ExportService] Export failed:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * 生成预览内容
   */
  generatePreview(
    snippet: { id: string; title: string; code: string; language: string; description?: string; category?: string; tags?: string[]; createdAt?: Date; updatedAt?: Date },
    options: ExportOptions = {}
  ): string {
    const category = snippet.category ? { name: snippet.category } : null;
    const tags = snippet.tags ? snippet.tags.map(t => ({ name: t })) : [];
    return this.generateMarkdown(snippet, category, tags, options);
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

  /**
   * 将 Markdown 转换为 HTML
   */
  private markdownToHtml(markdown: string): string {
    let html = markdown;

    // 转义 HTML 特殊字符
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');

    // 代码块高亮
    html = html.replace(/```(\w+)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

    // 标题
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 粗体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 换行
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  /**
   * 生成 PDF 样式
   */
  private generatePdfStyle(): string {
    return `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          color: #333;
        }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        h3 { color: #7f8c8d; }
        pre {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 5px;
          padding: 15px;
          overflow-x: auto;
        }
        code {
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 14px;
        }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
        strong { color: #2c3e50; }
      </style>
    `;
  }

  /**
   * 导出为 PDF
   */
  async exportToPdf(snippetIds: string[], filePath: string, options: ExportOptions = {}): Promise<ExportResult> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      let allHtml = '<html><head><meta charset="utf-8">' + this.generatePdfStyle() + '</head><body>';

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

        // 生成 Markdown
        const markdown = this.generateMarkdown(snippet, category, tags, options);
        const snippetHtml = this.markdownToHtml(markdown);

        allHtml += snippetHtml + '<hr style="page-break-after: always; border: none; border-top: 1px solid #ddd; margin: 30px 0;">';
      }

      allHtml += '</body></html>';

      await page.setContent(allHtml, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
      });

      await browser.close();

      return { success: true, filePath };
    } catch (error) {
      console.error('[ExportService] PDF export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}
