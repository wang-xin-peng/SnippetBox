import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import archiver = require('archiver');

export interface ExportOptions {
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  format?: 'markdown' | 'json';
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  count?: number;
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

    const zipPath = filePath.endsWith('.zip') ? filePath : filePath.replace(/\.[^.]+$/, '.zip');

    return new Promise((resolve) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        result.filePath = zipPath;
        resolve(result);
      });

      archive.on('error', (err) => {
        result.errors.push({ snippetId: 'all', error: err.message });
        result.failed = snippetIds.length - result.success;
        resolve(result);
      });

      archive.pipe(output);

      const usedNames = new Map<string, number>();

      for (const snippetId of snippetIds) {
        try {
          const snippet = this.db.prepare('SELECT * FROM snippets WHERE id = ?').get(snippetId) as any;

          if (!snippet) {
            result.failed++;
            result.errors.push({ snippetId, error: 'Snippet not found' });
            continue;
          }

          let category = null;
          if (snippet.category_id) {
            category = this.db.prepare('SELECT name FROM categories WHERE id = ?').get(snippet.category_id) as any;
          }

          const tags = this.db.prepare(`
            SELECT t.name
            FROM tags t
            JOIN snippet_tags st ON t.id = st.tag_id
            WHERE st.snippet_id = ?
          `).all(snippetId) as any[];

          const markdown = this.generateMarkdown(snippet, category, tags, options);

          let baseName = snippet.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'untitled';
          if (usedNames.has(baseName)) {
            const count = usedNames.get(baseName)! + 1;
            usedNames.set(baseName, count);
            baseName = `${baseName}_${count}`;
          } else {
            usedNames.set(baseName, 1);
          }

          archive.append(markdown, { name: `${baseName}.md` });
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({ snippetId, error: (error as Error).message });
        }
      }

      archive.finalize();
    });
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

      return { success: true, filePath, count: snippets.length };
    } catch (error) {
      console.error('[ExportService] JSON export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 导出片段为 PDF
   */
  async exportToPDF(snippetIds: string[], filePath: string): Promise<ExportResult> {
    try {
      // 收集所有片段数据
      const snippets: any[] = [];
      for (const snippetId of snippetIds) {
        const snippet = this.db.prepare('SELECT * FROM snippets WHERE id = ?').get(snippetId) as any;
        if (!snippet) continue;

        let category = null;
        if (snippet.category_id) {
          category = this.db.prepare('SELECT name FROM categories WHERE id = ?').get(snippet.category_id) as any;
        }

        const tags = this.db.prepare(`
          SELECT t.name FROM tags t
          JOIN snippet_tags st ON t.id = st.tag_id
          WHERE st.snippet_id = ?
        `).all(snippetId) as any[];

        snippets.push({ ...snippet, category, tags });
      }

      if (snippets.length === 0) {
        return { success: false, error: 'No snippets found' };
      }

      // 生成 HTML
      const html = this.buildPDFHtml(snippets);

      // 用 Electron 内置的 printToPDF（Chromium 渲染，零字体依赖，CJK 完美）
      const { BrowserWindow } = require('electron');
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: { sandbox: true, nodeIntegration: false },
      });

      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        landscape: false,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      win.destroy();
      fs.writeFileSync(filePath, pdfBuffer);

      return { success: true, filePath };
    } catch (error) {
      console.error('[ExportService] PDF export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private buildPDFHtml(snippets: any[]): string {
    const snippetHtml = snippets.map((s, i) => {
      const tagsHtml = s.tags?.length
        ? `<span class="tag">标签: ${s.tags.map((t: any) => this.escapeHtml(t.name)).join(', ')}</span>`
        : '';

      return `
        <div class="snippet">
          <h1 class="title">${this.escapeHtml(s.title)}</h1>
          ${s.description ? `<p class="desc">${this.escapeHtml(s.description)}</p>` : ''}
          <div class="meta">
            <span>语言: ${this.escapeHtml(s.language)}</span>
            ${s.category ? `<span>分类: ${this.escapeHtml(s.category.name)}</span>` : ''}
            ${tagsHtml}
          </div>
          <div class="time">
            创建: ${new Date(s.created_at).toLocaleString('zh-CN')} | 更新: ${new Date(s.updated_at).toLocaleString('zh-CN')}
          </div>
          <hr>
          <pre class="code"><code>${this.escapeHtml(s.code)}</code></pre>
        </div>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 20mm; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB",
                 "Noto Sans CJK SC", "Source Han Sans CN", sans-serif;
    color: #333; line-height: 1.6;
  }
  .snippet {
    page-break-after: always;
    padding-bottom: 10mm;
  }
  .snippet:last-child { page-break-after: avoid; }
  .title { font-size: 20pt; margin: 0 0 8px 0; }
  .desc { font-size: 12pt; color: #666; margin: 0 0 8px 0; }
  .meta { font-size: 9pt; color: #555; margin-bottom: 4px; }
  .meta span { margin-right: 16px; }
  .tag { margin-right: 0; }
  .time { font-size: 8pt; color: #999; margin-bottom: 12px; }
  hr { border: none; border-top: 1px solid #ddd; margin-bottom: 12px; }
  .code {
    background: #f5f5f5; border-radius: 4px; padding: 12px;
    font-family: "Cascadia Code", "Fira Code", "Consolas",
                 "Microsoft YaHei Mono", "Noto Sans Mono CJK SC",
                 monospace;
    font-size: 9pt; line-height: 1.5;
    white-space: pre-wrap; word-break: break-all;
    overflow-wrap: break-word;
  }
  .code code { font-family: inherit; }
</style></head><body>${snippetHtml}</body></html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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