import { SettingsManager } from '../../src/main/services/SettingsManager';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/user/data'),
    getVersion: jest.fn(() => '0.1.0'),
  },
}));

// Mock fs/promises
jest.mock('fs/promises');

describe('SettingsManager', () => {
  let settingsManager: SettingsManager;
  const mockSettingsPath = path.join('/mock/user/data', 'settings.json');

  beforeEach(() => {
    settingsManager = new SettingsManager();
    jest.clearAllMocks();
  });

  describe('isFirstLaunch', () => {
    it('should return true when settings file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await settingsManager.isFirstLaunch();

      expect(result).toBe(true);
    });

    it('should return true when firstLaunchCompleted is false', async () => {
      const mockSettings = JSON.stringify({ firstLaunchCompleted: false });
      (fs.readFile as jest.Mock).mockResolvedValue(mockSettings);

      const result = await settingsManager.isFirstLaunch();

      expect(result).toBe(true);
    });

    it('should return false when firstLaunchCompleted is true', async () => {
      const mockSettings = JSON.stringify({ firstLaunchCompleted: true });
      (fs.readFile as jest.Mock).mockResolvedValue(mockSettings);

      const result = await settingsManager.isFirstLaunch();

      expect(result).toBe(false);
    });
  });

  describe('markFirstLaunchComplete', () => {
    it('should set firstLaunchCompleted to true and save settings', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await settingsManager.markFirstLaunchComplete();

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockSettingsPath,
        expect.stringContaining('"firstLaunchCompleted": true'),
        'utf-8'
      );
    });

    it('should save the app version', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await settingsManager.markFirstLaunchComplete();

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockSettingsPath,
        expect.stringContaining('"lastVersion": "0.1.0"'),
        'utf-8'
      );
    });
  });

  describe('saveWizardChoices', () => {
    it('should save wizard choices to settings', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const choices = {
        downloadModel: true,
        searchMode: 'local' as const,
      };

      await settingsManager.saveWizardChoices(choices);

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockSettingsPath,
        expect.stringContaining('"downloadModel": true'),
        'utf-8'
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockSettingsPath,
        expect.stringContaining('"searchMode": "local"'),
        'utf-8'
      );
    });
  });

  describe('getWizardChoices', () => {
    it('should return wizard choices from settings', async () => {
      const mockSettings = JSON.stringify({
        firstLaunchCompleted: true,
        wizardChoices: {
          downloadModel: false,
          searchMode: 'lightweight',
        },
      });
      (fs.readFile as jest.Mock).mockResolvedValue(mockSettings);

      const result = await settingsManager.getWizardChoices();

      expect(result).toEqual({
        downloadModel: false,
        searchMode: 'lightweight',
      });
    });

    it('should return undefined when no wizard choices exist', async () => {
      const mockSettings = JSON.stringify({ firstLaunchCompleted: true });
      (fs.readFile as jest.Mock).mockResolvedValue(mockSettings);

      const result = await settingsManager.getWizardChoices();

      expect(result).toBeUndefined();
    });
  });

  describe('resetFirstLaunch', () => {
    it('should reset firstLaunchCompleted to false', async () => {
      const mockSettings = JSON.stringify({
        firstLaunchCompleted: true,
        wizardChoices: { downloadModel: true, searchMode: 'local' },
      });
      (fs.readFile as jest.Mock).mockResolvedValue(mockSettings);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await settingsManager.resetFirstLaunch();

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockSettingsPath,
        expect.stringContaining('"firstLaunchCompleted": false'),
        'utf-8'
      );
    });

    it('should remove wizard choices', async () => {
      const mockSettings = JSON.stringify({
        firstLaunchCompleted: true,
        wizardChoices: { downloadModel: true, searchMode: 'local' },
      });
      (fs.readFile as jest.Mock).mockResolvedValue(mockSettings);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await settingsManager.resetFirstLaunch();

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0][1];
      expect(writeCall).not.toContain('wizardChoices');
    });
  });
});
