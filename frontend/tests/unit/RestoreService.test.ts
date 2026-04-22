jest.mock('better-sqlite3');
jest.mock('fs');
jest.mock('zlib');

import { RestoreService, BackupValidation, RestoreResult, BackupPreview } from '../../src/main/services/RestoreService';
import * as fs from 'fs';
import * as zlib from 'zlib';

describe('RestoreService', () => {
  let restoreService: RestoreService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      exec: jest.fn(),
      prepare: jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue(null),
        run: jest.fn()
      })
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
    (fs.createReadStream as jest.Mock).mockReturnValue({
      pipe: jest.fn().mockReturnValue({
        pipe: jest.fn()
      })
    });
    (fs.createWriteStream as jest.Mock).mockReturnValue({
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          setTimeout(callback, 0);
        }
        return {};
      })
    });
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test'));

    (zlib.createGunzip as jest.Mock).mockReturnValue({
      pipe: jest.fn().mockReturnValue({
        on: jest.fn()
      })
    });

    restoreService = new RestoreService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBackup', () => {
    it('should validate existing backup file', async () => {
      const mockBackupDb = {
        prepare: jest.fn()
          .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ name: 'snippets' }, { name: 'categories' }, { name: 'tags' }]) })
          .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 5 }) }),
        close: jest.fn()
      };

      (require('better-sqlite3') as any).mockImplementation(() => mockBackupDb);

      const result = await restoreService.validateBackup('test-backup.zip');

      expect(result.valid).toBe(true);
      expect(result.snippetCount).toBe(5);
    });

    it('should reject non-existing backup file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await restoreService.validateBackup('non-existent.zip');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('备份文件不存在');
    });

    it('should reject empty backup file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 0 });

      const result = await restoreService.validateBackup('empty.zip');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('备份文件为空');
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore backup in merge mode', async () => {
      const mockBackupDb = {
        prepare: jest.fn()
          .mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) })
          .mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) })
          .mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) })
          .mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) })
          .mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) }),
        close: jest.fn()
      };

      (require('better-sqlite3') as any).mockImplementation(() => mockBackupDb);

      const result = await restoreService.restoreFromBackup('test-backup.zip', 'merge');

      expect(result).toBeDefined();
    });

    it('should handle invalid backup file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await restoreService.restoreFromBackup('invalid.zip', 'overwrite');

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('previewBackup', () => {
    it('should preview backup content', async () => {
      const mockBackupDb = {
        prepare: jest.fn()
          .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 3 }) })
          .mockReturnValueOnce({
            all: jest.fn().mockReturnValue([
              { id: '1', title: 'Snippet 1', language: 'javascript', category: 'Test' },
              { id: '2', title: 'Snippet 2', language: 'python', category: 'Test' }
            ])
          }),
        close: jest.fn()
      };

      (require('better-sqlite3') as any).mockImplementation(() => mockBackupDb);

      const result = await restoreService.previewBackup('test-backup.zip');

      expect(result.snippetCount).toBe(3);
      expect(result.snippets.length).toBe(2);
      expect(result.totalSize).toBe(1024);
    });
  });

  describe('BackupValidation interface', () => {
    it('should have correct structure', () => {
      const validation: BackupValidation = {
        valid: true,
        errors: [],
        snippetCount: 10,
        size: 2048
      };

      expect(validation.valid).toBe(true);
      expect(validation.snippetCount).toBe(10);
      expect(validation.size).toBe(2048);
    });
  });

  describe('RestoreResult interface', () => {
    it('should have correct structure', () => {
      const result: RestoreResult = {
        restored: 5,
        skipped: 2,
        errors: []
      };

      expect(result.restored).toBe(5);
      expect(result.skipped).toBe(2);
      expect(result.errors).toEqual([]);
    });
  });

  describe('BackupPreview interface', () => {
    it('should have correct structure', () => {
      const preview: BackupPreview = {
        snippetCount: 10,
        snippets: [
          { id: '1', title: 'Test', language: 'javascript', category: 'Test' }
        ],
        totalSize: 1024
      };

      expect(preview.snippetCount).toBe(10);
      expect(preview.snippets.length).toBe(1);
      expect(preview.totalSize).toBe(1024);
    });
  });
});