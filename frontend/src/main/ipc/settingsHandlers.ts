import { ipcMain } from 'electron';
import SettingsManager, { Settings } from '../services/SettingsManager';
import { getDatabaseManager } from '../database';

let settingsManager: SettingsManager | null = null;

function getSettingsManager(): SettingsManager {
  if (!settingsManager) {
    const db = getDatabaseManager().getDb();
    settingsManager = new SettingsManager(db);
  }
  return settingsManager;
}

export function registerSettingsHandlers(): void {
  // 获取设置
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = await getSettingsManager().getSettings();
      return { success: true, data: settings };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 更新设置
  ipcMain.handle('settings:update', async (_, settings: Partial<Settings>) => {
    try {
      await getSettingsManager().updateSettings(settings);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 重置设置
  ipcMain.handle('settings:reset', async () => {
    try {
      await getSettingsManager().resetSettings();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 导出设置
  ipcMain.handle('settings:export', async (_, filePath: string) => {
    try {
      await getSettingsManager().exportSettings(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 导入设置
  ipcMain.handle('settings:import', async (_, filePath: string) => {
    try {
      await getSettingsManager().importSettings(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}