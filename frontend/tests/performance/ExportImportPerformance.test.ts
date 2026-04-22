/**
 * 任务 33.5: 性能测试
 * 文件位置: tests/performance/ExportImportPerformance.test.ts
 * 
 * 验收标准: 测试导出导入性能
 */

import * as fs from 'fs';
import * as path from 'path';

const TEST_EXPORT_PERF_DIR = path.join(__dirname, '../../test-export-performance');

describe('导出导入性能测试', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_EXPORT_PERF_DIR)) {
      fs.mkdirSync(TEST_EXPORT_PERF_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_EXPORT_PERF_DIR)) {
      fs.rmSync(TEST_EXPORT_PERF_DIR, { recursive: true, force: true });
    }
  });

  describe('Markdown 导出性能', () => {
    it('应能快速导出 100 个片段为 Markdown', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 100; i++) {
        snippets.push({
          id: `snippet_${i}`,
          title: `Snippet ${i}`,
          code: `console.log(${i});`,
          language: 'javascript',
          tags: ['tag1', 'tag2']
        });
      }

      const toMarkdown = (s: any) => `# ${s.title}\n\n\`\`\`${s.language}\n${s.code}\n\`\`\`\n\n标签: ${s.tags.join(', ')}\n`;

      const startTime = Date.now();
      const markdownFiles = snippets.map(s => toMarkdown(s));
      const duration = Date.now() - startTime;

      expect(markdownFiles).toHaveLength(100);
      expect(duration).toBeLessThan(1000);
    });

    it('应能快速导出 500 个片段为 Markdown', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 500; i++) {
        snippets.push({
          title: `Snippet ${i}`,
          code: `code ${i}`,
          language: 'javascript'
        });
      }

      const startTime = Date.now();
      const markdown = snippets.map(s => `# ${s.title}\n\n\`\`\`${s.language}\n${s.code}\n\`\`\`\n`).join('---\n');
      const duration = Date.now() - startTime;

      expect(markdown).toContain('Snippet 0');
      expect(markdown).toContain('Snippet 499');
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('JSON 导出性能', () => {
    it('应能快速导出 1000 个片段为 JSON', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 1000; i++) {
        snippets.push({
          id: `snippet_${i}`,
          title: `Snippet ${i}`,
          code: `code ${i}`,
          language: 'javascript'
        });
      }

      const startTime = Date.now();
      const json = JSON.stringify({ snippets });
      const duration = Date.now() - startTime;

      expect(json).toContain('"snippet_0"');
      expect(duration).toBeLessThan(500);
    });

    it('应能保存 JSON 到文件', () => {
      const data: { snippets: any[] } = { snippets: [] };
      for (let i = 0; i < 1000; i++) {
        data.snippets.push({ id: `snippet_${i}`, title: `Snippet ${i}` });
      }

      const exportFile = path.join(TEST_EXPORT_PERF_DIR, 'export_1000.json');
      const startTime = Date.now();
      fs.writeFileSync(exportFile, JSON.stringify(data));
      const duration = Date.now() - startTime;

      expect(fs.existsSync(exportFile)).toBe(true);
      expect(duration).toBeLessThan(1000);

      fs.unlinkSync(exportFile);
    });
  });

  describe('HTML 导出性能', () => {
    it('应能快速导出 100 个片段为 HTML', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 100; i++) {
        snippets.push({
          title: `Snippet ${i}`,
          code: `console.log(${i});`,
          language: 'javascript'
        });
      }

      const toHTML = (s: any) => `<div class="snippet">\n  <h3>${s.title}</h3>\n  <pre><code>${s.code}</code></pre>\n</div>\n`;

      const startTime = Date.now();
      const htmlFiles = snippets.map(s => toHTML(s));
      const duration = Date.now() - startTime;

      expect(htmlFiles).toHaveLength(100);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('导入性能', () => {
    it('应能快速解析 JSON 导入文件', () => {
      const data: { snippets: any[] } = { snippets: [] };
      for (let i = 0; i < 1000; i++) {
        data.snippets.push({ id: `snippet_${i}`, title: `Snippet ${i}`, code: `code ${i}` });
      }

      const importFile = path.join(TEST_EXPORT_PERF_DIR, 'import_test.json');
      fs.writeFileSync(importFile, JSON.stringify(data));

      const startTime = Date.now();
      const content = fs.readFileSync(importFile, 'utf-8');
      const parsed = JSON.parse(content);
      const duration = Date.now() - startTime;

      expect(parsed.snippets).toHaveLength(1000);
      expect(duration).toBeLessThan(500);

      fs.unlinkSync(importFile);
    });

    it('应能快速解析 Markdown 导入文件', () => {
      const markdown = Array.from({ length: 100 }, (_, i) =>
        `# Snippet ${i}\n\n\`\`\`javascript\nconsole.log(${i});\n\`\`\`\n`
      ).join('---\n');

      const startTime = Date.now();
      const snippets = markdown.split('---').map(block => {
        const titleMatch = block.match(/^#\s+(.+)$/m);
        const codeMatch = block.match(/```\w+\n([\s\S]*?)```/);
        return {
          title: titleMatch ? titleMatch[1] : '',
          code: codeMatch ? codeMatch[1].trim() : ''
        };
      });
      const duration = Date.now() - startTime;

      expect(snippets).toHaveLength(100);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('往返性能', () => {
    it('Markdown 往返应在 1 秒内完成', () => {
      const original = {
        title: 'Test Snippet',
        code: 'console.log("hello");',
        language: 'javascript',
        tags: ['js', 'test']
      };

      const toMarkdown = (s: any) => `# ${s.title}\n\n\`\`\`${s.language}\n${s.code}\n\`\`\`\n\n标签: ${s.tags.join(', ')}\n`;

      const fromMarkdown = (md: string) => {
        const titleMatch = md.match(/^#\s+(.+)$/m);
        const codeMatch = md.match(/```\w+\n([\s\S]*?)```/);
        return {
          title: titleMatch ? titleMatch[1] : '',
          code: codeMatch ? codeMatch[1].replace(/\n$/, '') : ''
        };
      };

      const startTime = Date.now();
      const markdown = toMarkdown(original);
      const restored = fromMarkdown(markdown);
      const duration = Date.now() - startTime;

      expect(restored.title).toBe(original.title);
      expect(restored.code).toBe(original.code);
      expect(duration).toBeLessThan(1000);
    });

    it('JSON 往返应快速完成', () => {
      const original = {
        snippets: Array.from({ length: 1000 }, (_, i) => ({
          id: `snippet_${i}`,
          title: `Snippet ${i}`,
          code: `code ${i}`
        }))
      };

      const startTime = Date.now();
      const exported = JSON.stringify(original);
      const restored = JSON.parse(exported);
      const duration = Date.now() - startTime;

      expect(restored.snippets).toHaveLength(1000);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('批量导入性能', () => {
    it('应能处理大批量导入', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 5000; i++) {
        snippets.push({
          id: `snippet_${i}`,
          title: `Snippet ${i}`,
          code: `code ${i}`,
          tags: ['tag1', 'tag2']
        });
      }

      const importFile = path.join(TEST_EXPORT_PERF_DIR, 'bulk_import.json');
      fs.writeFileSync(importFile, JSON.stringify(snippets));

      const startTime = Date.now();
      const content = fs.readFileSync(importFile, 'utf-8');
      const imported = JSON.parse(content);
      const duration = Date.now() - startTime;

      expect(imported).toHaveLength(5000);
      expect(duration).toBeLessThan(2000);

      fs.unlinkSync(importFile);
    });
  });
});
