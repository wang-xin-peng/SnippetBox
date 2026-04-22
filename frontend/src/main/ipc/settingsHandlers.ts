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

  // 检查是否首次启动
  ipcMain.handle('settings:isFirstLaunch', async () => {
    try {
      const settings = await getSettingsManager().getSettings();
      // 如果没有设置或者是默认设置，认为是首次启动
      const isFirst = !settings || Object.keys(settings).length === 0;
      return { success: true, isFirstLaunch: isFirst };
    } catch (error) {
      return { success: true, isFirstLaunch: true }; // 出错时默认为首次启动
    }
  });

  // 获取向导选择（搜索模式等）
  ipcMain.handle('settings:getWizardChoices', async () => {
    try {
      const settings = await getSettingsManager().getSettings();
      return { 
        success: true, 
        data: {
          searchMode: (settings as any)?.searchMode || 'lightweight',
          downloadModel: (settings as any)?.downloadModel || false
        }
      };
    } catch (error) {
      return { 
        success: true, 
        data: { searchMode: 'lightweight', downloadModel: false }
      };
    }
  });

  // 保存向导选择
  ipcMain.handle('settings:saveWizardChoices', async (_, choices: { searchMode?: string; downloadModel?: boolean }) => {
    try {
      const currentSettings = await getSettingsManager().getSettings();
      await getSettingsManager().updateSettings({
        ...currentSettings,
        ...choices
      } as any);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  console.log('[SettingsHandlers] Registered');
}