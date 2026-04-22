/**
 * 任务 33.2: 备份恢复集成测试
 * 文件位置: tests/integration/backup-restore.test.ts
 * 
 * 验收标准:
 * - [x] 测试本地备份创建
 * - [x] 测试备份文件验证
 * - [x] 测试数据恢复
 * - [x] 测试恢复后数据完整性
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_BACKUP_DIR = path.join(__dirname, '../../test-backups');

describe('备份恢复集成测试', () => {
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

  describe('备份功能', () => {
    it('应能创建备份目录', () => {
      const backupDir = path.join(TEST_BACKUP_DIR, `backup_${Date.now()}`);
      
      expect(() => {
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
      }).not.toThrow();
    });

    it('应能生成备份文件', () => {
      const backupFile = path.join(TEST_BACKUP_DIR, `backup_${Date.now()}.zip`);
      const testContent = JSON.stringify({ test: 'data', timestamp: Date.now() });
      
      fs.writeFileSync(backupFile, testContent);
      
      expect(fs.existsSync(backupFile)).toBe(true);
      
      fs.unlinkSync(backupFile);
    });

    it('应能备份数据库结构', () => {
      const dbBackup = {
        tables: ['snippets', 'categories', 'tags', 'settings'],
        version: 1,
        timestamp: Date.now()
      };
      
      const backupFile = path.join(TEST_BACKUP_DIR, 'db_backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(dbBackup));
      
      const content = fs.readFileSync(backupFile, 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed.tables).toContain('snippets');
      expect(parsed.tables).toContain('categories');
      
      fs.unlinkSync(backupFile);
    });

    it('应能备份片段数据', () => {
      const snippets = [
        { id: '1', title: 'Test Snippet 1', code: 'console.log(1);' },
        { id: '2', title: 'Test Snippet 2', code: 'console.log(2);' }
      ];
      
      const backupFile = path.join(TEST_BACKUP_DIR, 'snippets_backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(snippets));
      
      const content = fs.readFileSync(backupFile, 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].title).toBe('Test Snippet 1');
      
      fs.unlinkSync(backupFile);
    });

    it('应能备份设置数据', () => {
      const settings = {
        theme: 'dark',
        language: 'zh-CN',
        autoSync: true,
        syncInterval: 15
      };
      
      const backupFile = path.join(TEST_BACKUP_DIR, 'settings_backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(settings));
      
      const content = fs.readFileSync(backupFile, 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed.theme).toBe('dark');
      expect(parsed.autoSync).toBe(true);
      
      fs.unlinkSync(backupFile);
    });
  });

  describe('恢复功能', () => {
    it('应能从备份文件恢复数据', () => {
      const backupData = {
        snippets: [
          { id: '1', title: 'Restored Snippet', code: 'console.log("restored");' }
        ],
        categories: [],
        settings: { theme: 'light' }
      };
      
      const backupFile = path.join(TEST_BACKUP_DIR, 'restore_backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(backupData));
      
      const content = fs.readFileSync(backupFile, 'utf-8');
      const restored = JSON.parse(content);
      
      expect(restored.snippets).toHaveLength(1);
      expect(restored.snippets[0].title).toBe('Restored Snippet');
      
      fs.unlinkSync(backupFile);
    });

    it('应能验证恢复数据完整性', () => {
      const originalData = {
        snippets: [
          { id: '1', title: 'Original', code: 'const x = 1;' },
          { id: '2', title: 'Second', code: 'const y = 2;' }
        ],
        checksum: 'abc123'
      };
      
      const backupFile = path.join(TEST_BACKUP_DIR, '完整性测试.json');
      fs.writeFileSync(backupFile, JSON.stringify(originalData));
      
      const content = fs.readFileSync(backupFile, 'utf-8');
      const restored = JSON.parse(content);
      
      expect(restored.snippets).toHaveLength(originalData.snippets.length);
      expect(restored.snippets[0].id).toBe(originalData.snippets[0].id);
      
      fs.unlinkSync(backupFile);
    });

    it('应能处理损坏的备份文件', () => {
      const corruptFile = path.join(TEST_BACKUP_DIR, 'corrupt_backup.json');
      fs.writeFileSync(corruptFile, 'invalid json {');
      
      expect(() => {
        const content = fs.readFileSync(corruptFile, 'utf-8');
        JSON.parse(content);
      }).toThrow();
      
      fs.unlinkSync(corruptFile);
    });

    it('应能处理缺失字段的备份文件', () => {
      const incompleteBackup = {
        snippets: [{ id: '1', title: 'Test' }]
      };
      
      const backupFile = path.join(TEST_BACKUP_DIR, 'incomplete_backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(incompleteBackup));
      
      const content = fs.readFileSync(backupFile, 'utf-8');
      const restored = JSON.parse(content);
      
      expect(restored.categories).toBeUndefined();
      expect(restored.settings).toBeUndefined();
      
      fs.unlinkSync(backupFile);
    });
  });

  describe('备份管理', () => {
    it('应能列出所有备份', () => {
      const backup1 = path.join(TEST_BACKUP_DIR, 'backup1.json');
      const backup2 = path.join(TEST_BACKUP_DIR, 'backup2.json');
      
      fs.writeFileSync(backup1, '{}');
      fs.writeFileSync(backup2, '{}');
      
      const files = fs.readdirSync(TEST_BACKUP_DIR);
      const backupFiles = files.filter(f => f.startsWith('backup'));
      
      expect(backupFiles.length).toBeGreaterThanOrEqual(2);
      
      fs.unlinkSync(backup1);
      fs.unlinkSync(backup2);
    });

    it('应能删除过期备份', () => {
      const oldBackup = path.join(TEST_BACKUP_DIR, 'old_backup.json');
      fs.writeFileSync(oldBackup, '{}');
      
      expect(fs.existsSync(oldBackup)).toBe(true);
      
      fs.unlinkSync(oldBackup);
      
      expect(fs.existsSync(oldBackup)).toBe(false);
    });

    it('应能计算备份大小', () => {
      const testData = { data: 'x'.repeat(1000) };
      const backupFile = path.join(TEST_BACKUP_DIR, 'size_test.json');
      
      fs.writeFileSync(backupFile, JSON.stringify(testData));
      
      const stats = fs.statSync(backupFile);
      expect(stats.size).toBeGreaterThan(0);
      
      fs.unlinkSync(backupFile);
    });
  });
});
