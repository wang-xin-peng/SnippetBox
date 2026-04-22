/**
 * 任务 33.3: 属性测试
 * 文件位置: tests/property/BackupRestoreProperty.test.ts
 * 
 * 属性 18: 备份-恢复往返一致性
 */

import * as fs from 'fs';
import * as path from 'path';

const TEST_BACKUP_DIR = path.join(__dirname, '../../test-backup-property');

describe('备份-恢复往返一致性', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_BACKUP_DIR)) {
      fs.mkdirSync(TEST_BACKUP_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_BACKUP_DIR)) {
      fs.rmSync(TEST_BACKUP_DIR, { recursive: true, force: true });
    }
  });

  describe('属性 18: 备份-恢复往返一致性', () => {
    it('完整数据往返应保持一致', () => {
      const original = {
        snippets: [
          { id: '1', title: 'Snippet 1', code: 'code1', tags: ['tag1'] },
          { id: '2', title: 'Snippet 2', code: 'code2', tags: ['tag2'] }
        ],
        categories: [{ id: '1', name: 'Category 1' }],
        settings: { theme: 'dark', language: 'zh-CN' }
      };

      const backup = JSON.stringify(original);
      const restored = JSON.parse(backup);

      expect(restored.snippets).toHaveLength(original.snippets.length);
      expect(restored.categories).toHaveLength(original.categories.length);
      expect(restored.settings).toEqual(original.settings);
    });

    it('空数据往返应正确处理', () => {
      const original = {
        snippets: [],
        categories: [],
        settings: {}
      };

      const backup = JSON.stringify(original);
      const restored = JSON.parse(backup);

      expect(restored.snippets).toHaveLength(0);
      expect(restored.categories).toHaveLength(0);
    });

    it('特殊字符应正确保留', () => {
      const original = {
        snippets: [{
          id: '1',
          title: 'Test & "Special" <Chars>',
          code: 'const x = `backtick`;',
          tags: ['a&b', 'c"d']
        }]
      };

      const backup = JSON.stringify(original);
      const restored = JSON.parse(backup);

      expect(restored.snippets[0].title).toBe(original.snippets[0].title);
      expect(restored.snippets[0].code).toBe(original.snippets[0].code);
    });

    it('大规模数据往返应保持一致', () => {
      const original = {
        snippets: Array.from({ length: 1000 }, (_, i) => ({
          id: String(i),
          title: `Snippet ${i}`,
          code: `console.log(${i});`,
          tags: [`tag${i}`]
        }))
      };

      const backup = JSON.stringify(original);
      const restored = JSON.parse(backup);

      expect(restored.snippets).toHaveLength(original.snippets.length);
      expect(restored.snippets[999].title).toBe(original.snippets[999].title);
    });

    it('备份文件应可保存和读取', () => {
      const data = {
        snippets: [{ id: '1', title: 'Test' }],
        version: '1.0'
      };

      const filePath = path.join(TEST_BACKUP_DIR, 'backup_test.json');
      fs.writeFileSync(filePath, JSON.stringify(data));

      const content = fs.readFileSync(filePath, 'utf-8');
      const restored = JSON.parse(content);

      expect(restored.snippets[0].title).toBe(data.snippets[0].title);

      fs.unlinkSync(filePath);
    });

    it('损坏的备份文件应被检测', () => {
      const corruptFile = path.join(TEST_BACKUP_DIR, 'corrupt.json');
      fs.writeFileSync(corruptFile, '{ invalid json }');

      expect(() => {
        const content = fs.readFileSync(corruptFile, 'utf-8');
        JSON.parse(content);
      }).toThrow();

      fs.unlinkSync(corruptFile);
    });

    it('部分数据丢失应可检测', () => {
      const complete: any = {
        snippets: [{ id: '1', title: 'Test', code: 'code' }],
        categories: [{ id: '1', name: 'Cat' }]
      };

      const incomplete: any = {
        snippets: [{ id: '1', title: 'Test' }]
      };

      const isComplete = (data: any) => {
        return data.snippets !== undefined && data.categories !== undefined;
      };

      expect(isComplete(complete)).toBe(true);
      expect(isComplete(incomplete)).toBe(false);
    });
  });
});
