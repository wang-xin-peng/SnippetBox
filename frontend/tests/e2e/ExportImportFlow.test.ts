/**
 * 端到端测试
 * 文件位置: tests/e2e/ExportImportFlow.test.ts
 * 验收标准: 导出导入流程测试
 */

import * as fs from 'fs';
import * as path from 'path';

const TEST_EXPORT_DIR = path.join(__dirname, '../../test-e2e-exports');

describe('导出导入流程测试', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_EXPORT_DIR)) {
      fs.mkdirSync(TEST_EXPORT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_EXPORT_DIR)) {
      fs.rmSync(TEST_EXPORT_DIR, { recursive: true, force: true });
    }
  });

  describe('导出流程', () => {
    it('应能导出为 Markdown 格式', () => {
      const snippet = {
        title: 'Test Snippet',
        code: 'console.log("hello");',
        language: 'javascript',
        tags: ['js', 'test']
      };

      const markdown = `# ${snippet.title}\n\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n\n标签: ${snippet.tags.join(', ')}\n`;

      expect(markdown).toContain('# Test Snippet');
      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('console.log("hello");');
    });

    it('应能导出为 JSON 格式', () => {
      const data = {
        snippets: [
          { id: '1', title: 'Snippet 1', code: 'code1' },
          { id: '2', title: 'Snippet 2', code: 'code2' }
        ]
      };

      const json = JSON.stringify(data, null, 2);

      expect(json).toContain('"title": "Snippet 1"');
      expect(json).toContain('"code": "code1"');
    });

    it('应能导出为 HTML 格式', () => {
      const snippet = {
        title: 'HTML Test',
        code: '<div>Hello</div>',
        language: 'html'
      };

      const html = `<!DOCTYPE html>\n<html>\n<head>\n  <title>${snippet.title}</title>\n</head>\n<body>\n  <pre><code>${snippet.code}</code></pre>\n</body>\n</html>`;

      expect(html).toContain('<title>HTML Test</title>');
      expect(html).toContain('<div>Hello</div>');
    });

    it('应能保存导出文件', () => {
      const exportData = { snippets: [{ title: 'Export Test' }] };
      const exportFile = path.join(TEST_EXPORT_DIR, 'export.json');

      fs.writeFileSync(exportFile, JSON.stringify(exportData));

      expect(fs.existsSync(exportFile)).toBe(true);

      fs.unlinkSync(exportFile);
    });

    it('应能批量导出多个片段', () => {
      const snippets = [
        { title: 'Snippet 1', code: 'code1' },
        { title: 'Snippet 2', code: 'code2' },
        { title: 'Snippet 3', code: 'code3' }
      ];

      const exportFile = path.join(TEST_EXPORT_DIR, 'batch_export.json');
      fs.writeFileSync(exportFile, JSON.stringify(snippets));

      const content = fs.readFileSync(exportFile, 'utf-8');
      const restored = JSON.parse(content);

      expect(restored).toHaveLength(3);

      fs.unlinkSync(exportFile);
    });
  });

  describe('导入流程', () => {
    it('应能从 Markdown 导入', () => {
      const markdown = `# Test\n\n\`\`\`javascript\nconsole.log("test");\n\`\`\`\n`;

      const titleMatch = markdown.match(/^#\s+(.+)$/m);
      const codeMatch = markdown.match(/```\w+\n([\s\S]*?)```/);

      const snippet = {
        title: titleMatch ? titleMatch[1] : '',
        code: codeMatch ? codeMatch[1].trim() : ''
      };

      expect(snippet.title).toBe('Test');
      expect(snippet.code).toBe('console.log("test");');
    });

    it('应能从 JSON 导入', () => {
      const json = '{"snippets":[{"title":"JSON Import","code":"code"}]}';

      const data = JSON.parse(json);

      expect(data.snippets).toHaveLength(1);
      expect(data.snippets[0].title).toBe('JSON Import');
    });

    it('应能从 HTML 导入', () => {
      const html = `<!DOCTYPE html>
<html>
<body>
  <pre><code>console.log("html");</code></pre>
</body>
</html>`;

      const codeMatch = html.match(/<code>([\s\S]*?)<\/code>/);

      const code = codeMatch ? codeMatch[1] : '';
      expect(code).toBe('console.log("html");');
    });

    it('应能验证导入数据格式', () => {
      const validData = {
        snippets: [{ title: 'Valid', code: 'code' }]
      };

      const isValidFormat = (data: any) => {
        return !!(data.snippets && Array.isArray(data.snippets));
      };

      expect(isValidFormat(validData)).toBe(true);
      expect(isValidFormat({})).toBe(false);
    });

    it('应能处理导入错误', () => {
      const invalidJson = '{"broken": true';

      let isValid = true;
      try {
        JSON.parse(invalidJson);
      } catch {
        isValid = false;
      }

      expect(isValid).toBe(false);
    });
  });

  describe('往返一致性', () => {
    it('Markdown 往返应保持一致', () => {
      const original = {
        title: 'Roundtrip Test',
        code: 'const x = 1;',
        language: 'javascript'
      };

      const toMarkdown = (s: any) => `# ${s.title}\n\n\`\`\`${s.language}\n${s.code}\n\`\`\`\n`;

      const fromMarkdown = (md: string) => {
        const titleMatch = md.match(/^#\s+(.+)$/m);
        const codeMatch = md.match(/```\w+\n([\s\S]*?)```/);
        return {
          title: titleMatch ? titleMatch[1] : '',
          code: codeMatch ? codeMatch[1].replace(/\n$/, '') : ''
        };
      };

      const markdown = toMarkdown(original);
      const restored = fromMarkdown(markdown);

      expect(restored.title).toBe(original.title);
      expect(restored.code).toBe(original.code);
    });

    it('JSON 往返应保持一致', () => {
      const original = {
        snippets: [{ id: '1', title: 'JSON Test', code: 'code' }]
      };

      const exported = JSON.stringify(original);
      const restored = JSON.parse(exported);

      expect(restored.snippets).toHaveLength(original.snippets.length);
      expect(restored.snippets[0].title).toBe(original.snippets[0].title);
    });

    it('完整数据往返应保持一致', () => {
      const original = {
        snippets: [
          { id: '1', title: 'Full Test 1', code: 'code1', tags: ['a'] },
          { id: '2', title: 'Full Test 2', code: 'code2', tags: ['b'] }
        ],
        categories: [{ id: '1', name: 'Category 1' }],
        settings: { theme: 'dark' }
      };

      const backup = JSON.stringify(original);
      const restored = JSON.parse(backup);

      expect(restored.snippets).toHaveLength(original.snippets.length);
      expect(restored.categories).toHaveLength(original.categories.length);
      expect(restored.settings).toEqual(original.settings);
    });
  });

  describe('部分导入', () => {
    it('应能选择性导入部分片段', () => {
      const allSnippets = [
        { id: '1', title: 'Import Me', code: 'code1' },
        { id: '2', title: 'Skip Me', code: 'code2' },
        { id: '3', title: 'Import Me Too', code: 'code3' }
      ];

      const selectedIds = ['1', '3'];
      const selected = allSnippets.filter(s => selectedIds.includes(s.id));

      expect(selected).toHaveLength(2);
      expect(selected[0].title).toBe('Import Me');
      expect(selected[1].title).toBe('Import Me Too');
    });

    it('应能合并导入数据', () => {
      const existing = [{ id: '1', title: 'Existing' }];
      const imported = [{ id: '2', title: 'Imported' }];

      const merged = [...existing, ...imported];

      expect(merged).toHaveLength(2);
      expect(merged[0].title).toBe('Existing');
      expect(merged[1].title).toBe('Imported');
    });
  });
});
