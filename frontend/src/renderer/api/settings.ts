import type { WizardChoices } from '@shared/types/wizard';

export const settingsApi = {
  /**
   * 检测是否首次启动
   */
  async isFirstLaunch(): Promise<boolean> {
    return window.electron.ipcRenderer.invoke('settings:isFirstLaunch');
  },

  /**
   * 标记首次启动完成
   */
  async markFirstLaunchComplete(): Promise<void> {
    const result = await window.electron.ipcRenderer.invoke('settings:markFirstLaunchComplete');
    if (!result.success) {
      throw new Error(result.error || 'Failed to mark first launch complete');
    }
  },

  /**
   * 保存向导选择
   */
  async saveWizardChoices(choices: WizardChoices): Promise<void> {
    const result = await window.electron.ipcRenderer.invoke('settings:saveWizardChoices', choices);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save wizard choices');
    }
  },

  /**
   * 获取向导选择
   */
  async getWizardChoices(): Promise<WizardChoices | undefined> {
    const result = await window.electron.ipcRenderer.invoke('settings:getWizardChoices');
    if (!result.success) {
      throw new Error(result.error || 'Failed to get wizard choices');
    }
    return result.data;
  },

  /**
   * 重置首次启动状态（用于测试）
   */
  async resetFirstLaunch(): Promise<void> {
    const result = await window.electron.ipcRenderer.invoke('settings:resetFirstLaunch');
    if (!result.success) {
      throw new Error(result.error || 'Failed to reset first launch');
    }
  },
};
