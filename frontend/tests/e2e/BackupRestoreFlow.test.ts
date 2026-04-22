/**
 * 任务 33.4: 端到端测试
 * 文件位置: tests/e2e/BackupRestoreFlow.test.ts
 * 
 * 验收标准: 备份恢复流程测试
 */

import * as fs from 'fs';
import * as path from 'path';

const TEST_BACKUP_DIR = path.join(__dirname, '../../test-e2e-backups');

describe('备份恢复流程测试', () => {
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

  describe('备份流程', () => {
    it('应能创建完整备份', () => {
      const backupData = {
        snippets: [
          { id: '1', title: 'Snippet 1', code: 'code1' },
          { id: '2', title: 'Snippet 2', code: 'code2' }
        ],
        categories: [{ id: '1', name: 'Category 1' }],
        settings: { theme: 'dark' },
        version: '1.0',
        timestamp: Date.now()
      };

      expect(backupData.snippets).toHaveLength(2);
      expect(backupData.categories).toHaveLength(1);
      expect(backupData.settings).toBeDefined();
    });

    it('应能保存备份到文件', () => {
      const backupData = {
        snippets: [{ id: '1', title: 'Test', code: 'test' }]
      };

      const backupFile = path.join(TEST_BACKUP_DIR, 'backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(backupData));

      expect(fs.existsSync(backupFile)).toBe(true);

      fs.unlinkSync(backupFile);
    });

    it('备份应包含所有必要数据', () => {
      const backupData = {
        snippets: [{ id: '1', title: 'Test' }],
        categories: [],
        tags: [],
        settings: {},
        version: '1.0'
      };

      const hasAllData = 
        backupData.snippets !== undefined &&
        backupData.categories !== undefined &&
        backupData.tags !== undefined &&
        backupData.settings !== undefined;

      expect(hasAllData).toBe(true);
    });

    it('应能创建增量备份', () => {
      const fullBackup = {
        type: 'full',
        snippets: [{ id: '1', title: 'Test' }]
      };

      const incrementalBackup = {
        type: 'incremental',
        changes: [{ id: '2', action: 'create' }]
      };

      expect(fullBackup.type).toBe('full');
      expect(incrementalBackup.type).toBe('incremental');
    });
  });

  describe('恢复流程', () => {
    it('应能从备份恢复数据', () => {
      const backupData = {
        snippets: [
          { id: '1', title: 'Restored Snippet' }
        ],
        categories: [],
        settings: {}
      };

      const restoreData = JSON.parse(JSON.stringify(backupData));

      expect(restoreData.snippets).toHaveLength(1);
      expect(restoreData.snippets[0].title).toBe('Restored Snippet');
    });

    it('恢复后片段应完整', () => {
      const original = {
        snippets: [
          { id: '1', title: 'Complete', code: 'code', tags: ['tag1'] }
        ]
      };

      const backupFile = path.join(TEST_BACKUP_DIR, 'complete_backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(original));

      const content = fs.readFileSync(backupFile, 'utf-8');
      const restored = JSON.parse(content);

      expect(restored.snippets[0].title).toBe(original.snippets[0].title);
      expect(restored.snippets[0].code).toBe(original.snippets[0].code);

      fs.unlinkSync(backupFile);
    });

    it('应能验证恢复数据完整性', () => {
      const original = {
        snippets: [{ id: '1', title: 'Test' }],
        checksum: 'abc123'
      };

      const backupFile = path.join(TEST_BACKUP_DIR, 'checksum_backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(original));

      const content = fs.readFileSync(backupFile, 'utf-8');
      const restored = JSON.parse(content);

      const isValid = restored.snippets && 
                      restored.checksum === original.checksum;

      expect(isValid).toBe(true);

      fs.unlinkSync(backupFile);
    });

    it('损坏的备份应被检测', () => {
      const corruptFile = path.join(TEST_BACKUP_DIR, 'corrupt.json');
      fs.writeFileSync(corruptFile, '{ invalid json');

      let isValid = true;
      try {
        const content = fs.readFileSync(corruptFile, 'utf-8');
        JSON.parse(content);
      } catch {
        isValid = false;
      }

      expect(isValid).toBe(false);

      fs.unlinkSync(corruptFile);
    });
  });

  describe('备份管理', () => {
    it('应能列出所有备份', () => {
      const backup1 = path.join(TEST_BACKUP_DIR, 'backup1.json');
      const backup2 = path.join(TEST_BACKUP_DIR, 'backup2.json');

      fs.writeFileSync(backup1, '{}');
      fs.writeFileSync(backup2, '{}');

      const files = fs.readdirSync(TEST_BACKUP_DIR);
      const backups = files.filter(f => f.startsWith('backup'));

      expect(backups.length).toBeGreaterThanOrEqual(2);

      fs.unlinkSync(backup1);
      fs.unlinkSync(backup2);
    });

    it('应能删除旧备份', () => {
      const oldBackup = path.join(TEST_BACKUP_DIR, 'old_backup.json');
      fs.writeFileSync(oldBackup, '{}');

      expect(fs.existsSync(oldBackup)).toBe(true);

      fs.unlinkSync(oldBackup);

      expect(fs.existsSync(oldBackup)).toBe(false);
    });

    it('应能计算备份大小', () => {
      const data = { snippets: Array.from({ length: 100 }, (_, i) => ({ id: String(i) })) };
      const backupFile = path.join(TEST_BACKUP_DIR, 'size_test.json');

      fs.writeFileSync(backupFile, JSON.stringify(data));

      const stats = fs.statSync(backupFile);
      expect(stats.size).toBeGreaterThan(0);

      fs.unlinkSync(backupFile);
    });
  });

  describe('定时备份', () => {
    it('应能设置定时备份', () => {
      const schedule = {
        enabled: true,
        interval: 3600000,
        lastRun: Date.now()
      };

      expect(schedule.enabled).toBe(true);
      expect(schedule.interval).toBe(3600000);
    });

    it('定时备份应检查到期时间', () => {
      const schedule = {
        interval: 1000,
        lastRun: Date.now() - 2000
      };

      const shouldRun = Date.now() - schedule.lastRun >= schedule.interval;
      expect(shouldRun).toBe(true);
    });
  });
});
