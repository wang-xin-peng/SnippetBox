jest.mock('better-sqlite3');
jest.mock('fs');
jest.mock('zlib');

import { BackupService, BackupResult, Backup } from '../../src/main/services/BackupService';
import * as fs from 'fs';

describe('BackupService', () => {
  let backupService: BackupService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      backup: jest.fn()
    };

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.readdirSync as jest.Mock).mockReturnValue([
      'snippetbox-backup-20230101-120000.zip',
      'snippetbox-backup-20230102-120000.zip'
    ]);
    (fs.statSync as jest.Mock).mockImplementation(() => ({
      size: 1024,
      mtimeMs: Date.now()
    }));
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (fs.copyFileSync as jest.Mock).mockImplementation(() => {});

    backupService = new BackupService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('createBackup', () => {
    it('should create backup successfully', async () => {
      const result = await backupService.createBackup();

      expect(result.backupId).toMatch(/backup-\d+/);
      expect(result.filePath).toContain('snippetbox-backup-');
      expect(result.filePath).toMatch(/\.zip$/);
      expect(result.size).toBe(1024);
      expect(result.timestamp).toBeGreaterThan(0);
      expect(mockDb.backup).toHaveBeenCalled();
    });

    it('should use custom backup path', async () => {
      const customPath = 'C:\\custom\\backup.zip';
      const result = await backupService.createBackup(customPath);

      expect(result.filePath).toBe(customPath);
    });
  });

  describe('listBackups', () => {
    it('should return backup list', async () => {
      const backups = await backupService.listBackups();

      expect(Array.isArray(backups)).toBe(true);
      expect(backups.length).toBe(2);
      backups.forEach(backup => {
        expect(backup).toHaveProperty('backupId');
        expect(backup).toHaveProperty('filePath');
        expect(backup).toHaveProperty('size');
        expect(backup).toHaveProperty('timestamp');
        expect(backup).toHaveProperty('date');
      });
    });

    it('should return empty array on error', async () => {
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('读取失败');
      });

      const backups = await backupService.listBackups();
      expect(backups).toEqual([]);
    });
  });

  describe('cleanOldBackups', () => {
    it('should clean old backups', async () => {
      const oldBackupTime = Date.now() - (8 * 24 * 60 * 60 * 1000);
      (fs.statSync as jest.Mock).mockImplementation(() => ({
        size: 1024,
        mtimeMs: oldBackupTime
      }));

      const deletedCount = await backupService.cleanOldBackups(7);
      expect(deletedCount).toBe(2);
    });
  });

  describe('validateBackup', () => {
    it('should validate existing backup', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });

      const result = backupService.validateBackup('backup.zip');
      expect(result).toBe(true);
    });

    it('should invalidate non-existing backup', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = backupService.validateBackup('non-existent.zip');
      expect(result).toBe(false);
    });
  });

  describe('enableAutoBackup', () => {
    it('should enable auto backup without error', () => {
      expect(() => backupService.enableAutoBackup(1)).not.toThrow();
      backupService.disableAutoBackup();
    });
  });

  describe('disableAutoBackup', () => {
    it('should disable auto backup', () => {
      backupService.enableAutoBackup(1);
      expect(() => backupService.disableAutoBackup()).not.toThrow();
    });
  });

  describe('BackupResult interface', () => {
    it('should have correct structure', () => {
      const result: BackupResult = {
        backupId: 'backup-123',
        filePath: '/path/to/backup.zip',
        size: 2048,
        timestamp: Date.now()
      };

      expect(result.backupId).toBe('backup-123');
      expect(result.filePath).toBe('/path/to/backup.zip');
      expect(result.size).toBe(2048);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Backup interface', () => {
    it('should have correct structure', () => {
      const backup: Backup = {
        backupId: 'backup-123',
        filePath: '/path/to/backup.zip',
        size: 2048,
        timestamp: Date.now(),
        date: '2023-01-01'
      };

      expect(backup.backupId).toBe('backup-123');
      expect(backup.date).toBe('2023-01-01');
    });
  });
});