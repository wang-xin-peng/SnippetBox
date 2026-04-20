import { ipcMain } from 'electron';
import { SettingsManager } from '../services/SettingsManager';

const settingsManager = new SettingsManager();

export function registerSettingsHandlers() {
  // 初始化设置管理器
  settingsManager.initialize().catch(console.error);

  // 检测是否首次启动
  ipcMain.handle('settings:isFirstLaunch', async () => {
    try {
      return await settingsManager.isFirstLaunch();
    } catch (error) {
      console.error('Failed to check first launch:', error);
      return false;
    }
  });

  // 标记首次启动完成
  ipcMain.handle('settings:markFirstLaunchComplete', async () => {
    try {
      await settingsManager.markFirstLaunchComplete();
      return { success: true };
    } catch (error) {
      console.error('Failed to mark first launch complete:', error);
      return { success: false, error: String(error) };
    }
  });

  // 保存向导选择
  ipcMain.handle('settings:saveWizardChoices', async (_, choices) => {
    try {
      await settingsManager.saveWizardChoices(choices);
      return { success: true };
    } catch (error) {
      console.error('Failed to save wizard choices:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取向导选择
  ipcMain.handle('settings:getWizardChoices', async () => {
    try {
      const choices = await settingsManager.getWizardChoices();
      return { success: true, data: choices };
    } catch (error) {
      console.error('Failed to get wizard choices:', error);
      return { success: false, error: String(error) };
    }
  });

  // 重置首次启动状态（用于测试）
  ipcMain.handle('settings:resetFirstLaunch', async () => {
    try {
      await settingsManager.resetFirstLaunch();
      return { success: true };
    } catch (error) {
      console.error('Failed to reset first launch:', error);
      return { success: false, error: String(error) };
    }
  });
}
