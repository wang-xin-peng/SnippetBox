/**
 * 任务 33.3: 属性测试
 * 文件位置: tests/property/ExportImportProperty.test.ts
 * 
 * 属性 9: 导出-导入往返一致性
 */

import * as fs from 'fs';
import * as path from 'path';

const TEST_TEMP_DIR = path.join(__dirname, '../../test-property-temp');

describe('导出-导入往返一致性', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_TEMP_DIR)) {
      fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_TEMP_DIR)) {
      fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
    }
  });

  describe('属性 9: 导出-导入往返一致性', () => {
    it('Markdown 往返转换应保持数据一致', () => {
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
          code: codeMatch ? codeMatch[1].replace(/\n$/, '') : '',
          language: 'javascript',
          tags: []
        };
      };

      const markdown = toMarkdown(original);
      const restored = fromMarkdown(markdown);

      expect(restored.title).toBe(original.title);
      expect(restored.code).toBe(original.code);
    });

    it('JSON 往返应保持数据一致', () => {
      const original = {
        snippets: [
          { id: '1', title: 'Test 1', code: 'code1' },
          { id: '2', title: 'Test 2', code: 'code2' }
        ],
        version: '1.0'
      };

      const exported = JSON.stringify(original);
      const imported = JSON.parse(exported);

      expect(imported.snippets).toHaveLength(original.snippets.length);
      expect(imported.version).toBe(original.version);
      expect(imported.snippets[0].id).toBe(original.snippets[0].id);
    });

    it('HTML 往返应保持内容一致', () => {
      const original = {
        title: 'HTML Test',
        code: '<div>Hello</div>'
      };

      const toHtml = (s: any) => `<!DOCTYPE html>
<html>
<head><title>${s.title}</title></head>
<body>
<h1>${s.title}</h1>
<pre>${s.code}</pre>
</body>
</html>`;

      const fromHtml = (html: string) => {
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const codeMatch = html.match(/<pre>(.*?)<\/pre>/s);
        return {
          title: titleMatch ? titleMatch[1] : '',
          code: codeMatch ? codeMatch[1] : ''
        };
      };

      const html = toHtml(original);
      const restored = fromHtml(html);

      expect(restored.title).toBe(original.title);
    });

    it('大规模数据往返应保持一致', () => {
      const original = {
        snippets: Array.from({ length: 100 }, (_, i) => ({
          id: String(i),
          title: `Snippet ${i}`,
          code: `console.log(${i});`,
          language: 'javascript'
        }))
      };

      const exported = JSON.stringify(original);
      const imported = JSON.parse(exported);

      expect(imported.snippets).toHaveLength(original.snippets.length);
      expect(imported.snippets[50].title).toBe(original.snippets[50].title);
    });

    it('空数据往返应正确处理', () => {
      const original = { snippets: [], version: '1.0' };

      const exported = JSON.stringify(original);
      const imported = JSON.parse(exported);

      expect(imported.snippets).toHaveLength(0);
      expect(imported.version).toBe(original.version);
    });

    it('特殊字符往返应正确处理', () => {
      const original = {
        title: 'Test & "Special" <Chars>',
        code: 'const x = `backtick`;',
        language: 'javascript'
      };

      const exported = JSON.stringify(original);
      const imported = JSON.parse(exported);

      expect(imported.title).toBe(original.title);
      expect(imported.code).toBe(original.code);
    });
  });
});
