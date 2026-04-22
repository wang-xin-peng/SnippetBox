import { ipcMain } from 'electron';
import SettingsManager, { Settings } from '../services/SettingsManager';
import Database from 'better-sqlite3';

class SettingsHandlers {
  private settingsManager: SettingsManager;

  constructor(db: Database.Database) {
    this.settingsManager = new SettingsManager(db);
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // 获取设置
    ipcMain.handle('settings:get', async () => {
      try {
        const settings = await this.settingsManager.getSettings();
        return { success: true, data: settings };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 更新设置
    ipcMain.handle('settings:update', async (_, settings: Partial<Settings>) => {
      try {
        await this.settingsManager.updateSettings(settings);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 重置设置
    ipcMain.handle('settings:reset', async () => {
      try {
        await this.settingsManager.resetSettings();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 导出设置
    ipcMain.handle('settings:export', async (_, filePath: string) => {
      try {
        await this.settingsManager.exportSettings(filePath);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 导入设置
    ipcMain.handle('settings:import', async (_, filePath: string) => {
      try {
        await this.settingsManager.importSettings(filePath);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });
  }
}

export default SettingsHandlers;