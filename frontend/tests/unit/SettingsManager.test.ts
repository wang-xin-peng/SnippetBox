jest.mock('better-sqlite3');
jest.mock('fs');

import { SettingsManager, Settings } from '../../src/main/services/SettingsManager';
import * as fs from 'fs';

describe('SettingsManager', () => {
  let settingsManager: SettingsManager;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      exec: jest.fn(),
      prepare: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue({ count: 0 }),
        all: jest.fn().mockReturnValue([]),
        run: jest.fn()
      })
    };

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.readFileSync as jest.Mock).mockImplementation(() => '{}');

    settingsManager = new SettingsManager(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return default settings when no settings exist', async () => {
      const settings = await settingsManager.getSettings();

      expect(settings).toBeDefined();
      expect(settings.theme).toBe('auto');
      expect(settings.language).toBe('zh-CN');
      expect(settings.editor.fontSize).toBe(14);
      expect(settings.editor.wordWrap).toBe(true);
    });

    it('should return cached settings on subsequent calls', async () => {
      await settingsManager.getSettings();
      await settingsManager.getSettings();

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should update theme setting', async () => {
      await settingsManager.updateSettings({ theme: 'dark' });

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should update editor settings', async () => {
      await settingsManager.updateSettings({
        editor: { fontSize: 16, fontFamily: 'monospace', tabSize: 4, wordWrap: false }
      });

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should update nested settings', async () => {
      await settingsManager.updateSettings({
        sync: { autoSync: true, syncInterval: 60, conflictStrategy: 'cloud' }
      });

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('resetSettings', () => {
    it('should reset all settings to default', async () => {
      await settingsManager.resetSettings();

      expect(mockDb.exec).toHaveBeenCalledWith('DELETE FROM settings');
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('exportSettings', () => {
    it('should export settings to file', async () => {
      await settingsManager.exportSettings('/path/to/settings.json');

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('importSettings', () => {
    it('should import settings from valid file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        settings: {
          theme: 'dark',
          language: 'en-US',
          editor: { fontSize: 16, fontFamily: 'monospace', tabSize: 4, wordWrap: false },
          sync: { autoSync: true, syncInterval: 30, conflictStrategy: 'cloud' },
          search: { searchMode: 'cloud', maxResults: 50 },
          backup: { autoBackup: false, backupInterval: 7, keepBackups: 14 }
        }
      }));

      await settingsManager.importSettings('/path/to/settings.json');

      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should throw error for non-existent file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(settingsManager.importSettings('/non/existent'))
        .rejects.toThrow();
    });

    it('should throw error for invalid file format', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      await expect(settingsManager.importSettings('/path/to/settings.json'))
        .rejects.toThrow();
    });
  });

  describe('Settings interface', () => {
    it('should have correct structure', () => {
      const settings: Settings = {
        theme: 'dark',
        language: 'en-US',
        editor: {
          fontSize: 16,
          fontFamily: 'monospace',
          tabSize: 4,
          wordWrap: false
        },
        sync: {
          autoSync: true,
          syncInterval: 60,
          conflictStrategy: 'cloud'
        },
        search: {
          searchMode: 'cloud',
          maxResults: 50
        },
        backup: {
          autoBackup: false,
          backupInterval: 7,
          keepBackups: 14
        }
      };

      expect(settings.theme).toBe('dark');
      expect(settings.editor.fontSize).toBe(16);
      expect(settings.sync.conflictStrategy).toBe('cloud');
    });
  });
});