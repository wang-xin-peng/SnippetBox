import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import archiver = require('archiver');
import PDFDocument = require('pdfkit');

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

      return { success: true, filePath };
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
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: 'SnippetBox Export',
          Author: 'SnippetBox',
          CreationDate: new Date()
        }
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const chineseFont = this.findChineseFont();
      if (chineseFont.path !== 'Helvetica') {
        try {
          const fontBuffer = fs.readFileSync(chineseFont.path);
          doc.registerFont(chineseFont.name, fontBuffer);
        } catch (err) {
          console.error(`[ExportService] Failed to register font: ${err}`);
        }
      }

      for (let i = 0; i < snippetIds.length; i++) {
        const snippetId = snippetIds[i];
        const snippet = this.db.prepare('SELECT * FROM snippets WHERE id = ?').get(snippetId) as any;

        if (!snippet) {
          console.warn(`[ExportService] Snippet not found: ${snippetId}`);
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

        if (i > 0) {
          doc.addPage();
        }

        doc.fontSize(20).font('Helvetica-Bold').text(snippet.title, { align: 'left' });
        doc.moveDown(0.5);

        if (snippet.description) {
          doc.fontSize(12).font(chineseFont.name).fillColor('#666666');
          doc.text(snippet.description, { align: 'left' });
          doc.moveDown(0.5);
        }

        doc.fillColor('#333333');
        doc.fontSize(10).font(chineseFont.name);

        let metadataText = `语言: ${snippet.language}`;

        if (category) {
          metadataText += `  |  分类: ${category.name}`;
        }

        if (tags.length > 0) {
          metadataText += `  |  标签: ${tags.map(t => t.name).join(', ')}`;
        }

        doc.text(metadataText, { align: 'left' });
        doc.moveDown(0.3);

        const timestampText = `创建: ${new Date(snippet.created_at).toLocaleString('zh-CN')}  |  更新: ${new Date(snippet.updated_at).toLocaleString('zh-CN')}`;
        doc.fillColor('#888888').fontSize(9).font(chineseFont.name).text(timestampText, { align: 'left' });
        doc.moveDown(1);

        doc.strokeColor('#dddddd').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        const codeStartY = doc.y;
        const codeBlockHeight = Math.max(100, Math.min(doc.heightOfString(snippet.code, { width: 495, align: 'left' }) + 40, 400));

        doc.fillColor('#f5f5f5').rect(50, codeStartY, 495, codeBlockHeight).fill();
        doc.fillColor('#333333');

        doc.fontSize(10).font('Courier');
        doc.text(snippet.code, 60, codeStartY + 15, {
          width: 475,
          align: 'left',
          lineGap: 4
        });

        doc.y = codeStartY + codeBlockHeight + 20;
      }

      doc.end();

      return new Promise((resolve) => {
        writeStream.on('finish', () => {
          resolve({ success: true, filePath });
        });
        writeStream.on('error', (error) => {
          console.error('[ExportService] Write stream error:', error);
          resolve({ success: false, error: error.message });
        });
      });
    } catch (error) {
      console.error('[ExportService] PDF export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private findChineseFont(): { path: string; name: string } {
    const ttfFonts = [
      { path: 'C:/Windows/Fonts/simhei.ttf', name: 'SimHei' },
      { path: 'C:/Windows/Fonts/simkai.ttf', name: 'KaiTi' },
      { path: 'C:/Windows/Fonts/simfang.ttf', name: 'FangSong' },
      { path: 'C:/Windows/Fonts/simli.ttf', name: 'LiSu' },
      { path: 'C:/Windows/Fonts/simsun.ttc', name: 'SimSun' },
      { path: 'C:/Windows/Fonts/msyh.ttc', name: 'MicrosoftYaHei' },
      { path: 'C:/Windows/Fonts/msyhbd.ttc', name: 'MicrosoftYaHeiBold' },
      { path: 'C:/Windows/Fonts/arialuni.ttf', name: 'ArialUnicodeMS' },
      { path: 'C:/Windows/Fonts/NotoSansCJKsc-Regular.ttc', name: 'NotoSansCJK' },
      { path: 'C:/Windows/Fonts/SourceHanSansSC-Regular.ttc', name: 'SourceHanSans' },
      { path: 'C:/Windows/Fonts/SourceHanSansCN-Regular.ttc', name: 'SourceHanSansCN' },
      { path: 'C:/Windows/Fonts/PingFang.ttf', name: 'PingFang' },
      { path: 'C:/Windows/Fonts/Hiragino Sans GB.ttc', name: 'HiraginoSansGB' },
    ];

    for (const font of ttfFonts) {
      if (fs.existsSync(font.path)) {
        console.log(`[ExportService] Found Chinese TTF font: ${font.path}`);
        return font;
      }
    }

    const fontDirs = [
      'C:/Windows/Fonts',
      'C:/Program Files/Fonts',
      'C:/Program Files (x86)/Fonts',
      process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}/Microsoft/Windows/Fonts` : '',
    ].filter(Boolean);

    for (const dir of fontDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (/^(simhei|simkai|simfang|simli|simsun|msyh|arialuni|noto|cjk|han|source.*sans|pingfang|hiragino).*\.(ttf|ttc|otf)$/i.test(file)) {
            const fontPath = path.join(dir, file);
            const fontName = file.replace(/\.(ttf|ttc|otf)$/i, '');
            console.log(`[ExportService] Found Chinese font via directory scan: ${fontPath}`);
            return { path: fontPath, name: fontName };
          }
        }
      } catch (err) {
        continue;
      }
    }

    console.log('[ExportService] No Chinese TTF font found, using Helvetica');
    return { path: 'Helvetica', name: 'Helvetica' };
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
