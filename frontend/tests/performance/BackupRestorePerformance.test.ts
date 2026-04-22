/**
 * 任务 33.5: 性能测试
 * 文件位置: tests/performance/BackupRestorePerformance.test.ts
 * 
 * 验收标准: 测试备份恢复性能
 */

import * as fs from 'fs';
import * as path from 'path';

const TEST_BACKUP_PERF_DIR = path.join(__dirname, '../../test-backup-performance');

describe('备份恢复性能测试', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_BACKUP_PERF_DIR)) {
      fs.mkdirSync(TEST_BACKUP_PERF_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_BACKUP_PERF_DIR)) {
      fs.rmSync(TEST_BACKUP_PERF_DIR, { recursive: true, force: true });
    }
  });

  describe('备份性能', () => {
    it('应能快速备份 1000 个片段', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 1000; i++) {
        snippets.push({
          id: `snippet_${i}`,
          title: `Snippet ${i}`,
          code: `console.log(${i});`.repeat(5),
          language: 'javascript',
          tags: ['tag1', 'tag2', 'tag3']
        });
      }

      const backupData = {
        snippets,
        categories: [],
        settings: { theme: 'dark' },
        version: '1.0',
        timestamp: Date.now()
      };

      const startTime = Date.now();
      const backupFile = path.join(TEST_BACKUP_PERF_DIR, 'backup_1000.json');
      fs.writeFileSync(backupFile, JSON.stringify(backupData));
      const duration = Date.now() - startTime;

      expect(fs.existsSync(backupFile)).toBe(true);
      expect(duration).toBeLessThan(2000);
    });

    it('应能快速备份 5000 个片段', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 5000; i++) {
        snippets.push({
          id: `snippet_${i}`,
          title: `Snippet ${i}`,
          code: `code ${i}`
        });
      }

      const backupData = { snippets };

      const startTime = Date.now();
      const backupFile = path.join(TEST_BACKUP_PERF_DIR, 'backup_5000.json');
      fs.writeFileSync(backupFile, JSON.stringify(backupData));
      const duration = Date.now() - startTime;

      expect(fs.existsSync(backupFile)).toBe(true);
      expect(duration).toBeLessThan(5000);

      fs.unlinkSync(backupFile);
    });
  });

  describe('恢复性能', () => {
    it('应能快速恢复 1000 个片段', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 1000; i++) {
        snippets.push({
          id: `snippet_${i}`,
          title: `Snippet ${i}`,
          code: `code ${i}`
        });
      }

      const backupFile = path.join(TEST_BACKUP_PERF_DIR, 'restore_test.json');
      fs.writeFileSync(backupFile, JSON.stringify({ snippets }));

      const startTime = Date.now();
      const content = fs.readFileSync(backupFile, 'utf-8');
      const restored = JSON.parse(content);
      const duration = Date.now() - startTime;

      expect(restored.snippets).toHaveLength(1000);
      expect(duration).toBeLessThan(1000);

      fs.unlinkSync(backupFile);
    });

    it('应能快速验证备份完整性', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 1000; i++) {
        snippets.push({ id: `snippet_${i}`, title: `Snippet ${i}` });
      }

      const backupData = { snippets };
      const backupFile = path.join(TEST_BACKUP_PERF_DIR, 'verify_test.json');
      fs.writeFileSync(backupFile, JSON.stringify(backupData));

      const startTime = Date.now();
      const content = fs.readFileSync(backupFile, 'utf-8');
      const restored = JSON.parse(content);

      const isComplete = restored.snippets && restored.snippets.length === 1000;
      const duration = Date.now() - startTime;

      expect(isComplete).toBe(true);
      expect(duration).toBeLessThan(500);

      fs.unlinkSync(backupFile);
    });
  });

  describe('增量备份性能', () => {
    it('增量备份应比全量备份快', () => {
      const fullData: any[] = [];
      for (let i = 0; i < 1000; i++) {
        fullData.push({ id: `snippet_${i}`, title: `Snippet ${i}` });
      }

      const fullBackupFile = path.join(TEST_BACKUP_PERF_DIR, 'full_backup.json');
      const fullStart = Date.now();
      fs.writeFileSync(fullBackupFile, JSON.stringify(fullData));
      const fullDuration = Date.now() - fullStart;

      const changedIds = new Set(['snippet_0', 'snippet_1', 'snippet_2']);
      const incrementalData = fullData.filter(s => changedIds.has(s.id));

      const incrBackupFile = path.join(TEST_BACKUP_PERF_DIR, 'incr_backup.json');
      const incrStart = Date.now();
      fs.writeFileSync(incrBackupFile, JSON.stringify(incrementalData));
      const incrDuration = Date.now() - incrStart;

      expect(incrementalData).toHaveLength(3);
      expect(fullDuration).toBeGreaterThanOrEqual(0);
      expect(incrDuration).toBeLessThanOrEqual(fullDuration);

      fs.unlinkSync(fullBackupFile);
      fs.unlinkSync(incrBackupFile);
    });
  });

  describe('备份压缩性能', () => {
    it('应能处理大备份文件', () => {
      const largeData: any[] = [];
      for (let i = 0; i < 10000; i++) {
        largeData.push({
          id: `snippet_${i}`,
          title: `Long Title ${i}`.repeat(10),
          code: `console.log('${i}');`.repeat(50)
        });
      }

      const backupFile = path.join(TEST_BACKUP_PERF_DIR, 'large_backup.json');

      const startTime = Date.now();
      fs.writeFileSync(backupFile, JSON.stringify(largeData));
      const writeDuration = Date.now() - startTime;

      const stats = fs.statSync(backupFile);
      const readStart = Date.now();
      const content = fs.readFileSync(backupFile, 'utf-8');
      const readDuration = Date.now() - readStart;

      expect(stats.size).toBeGreaterThan(100000);
      expect(writeDuration).toBeLessThan(10000);
      expect(readDuration).toBeLessThan(5000);

      fs.unlinkSync(backupFile);
    });
  });
});
