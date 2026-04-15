import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

interface WizardChoices {
  downloadModel: boolean;
  searchMode: 'local' | 'lightweight';
}

interface AppSettings {
  firstLaunchCompleted: boolean;
  wizardChoices?: WizardChoices;
  lastVersion?: string;
}

export class SettingsManager {
  private settingsPath: string;
  private settings: AppSettings | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
  }

  /**
   * 初始化设置管理器
   */
  async initialize(): Promise<void> {
    await this.loadSettings();
  }

  /**
   * 加载设置
   */
  private async loadSettings(): Promise<void> {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf-8');
      this.settings = JSON.parse(data);
    } catch (error) {
      // 文件不存在或解析失败，使用默认设置
      this.settings = {
        firstLaunchCompleted: false,
      };
    }
  }

  /**
   * 保存设置
   */
  private async saveSettings(): Promise<void> {
    if (!this.settings) {
      throw new Error('Settings not initialized');
    }

    try {
      const dir = path.dirname(this.settingsPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * 检测是否首次启动
   */
  async isFirstLaunch(): Promise<boolean> {
    if (!this.settings) {
      await this.loadSettings();
    }
    return !this.settings?.firstLaunchCompleted;
  }

  /**
   * 标记已完成首次启动
   */
  async markFirstLaunchComplete(): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }
    
    if (this.settings) {
      this.settings.firstLaunchCompleted = true;
      this.settings.lastVersion = app.getVersion();
      await this.saveSettings();
    }
  }

  /**
   * 保存用户在向导中的选择
   */
  async saveWizardChoices(choices: WizardChoices): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    if (this.settings) {
      this.settings.wizardChoices = choices;
      await this.saveSettings();
    }
  }

  /**
   * 获取向导选择
   */
  async getWizardChoices(): Promise<WizardChoices | undefined> {
    if (!this.settings) {
      await this.loadSettings();
    }
    return this.settings?.wizardChoices;
  }

  /**
   * 重置首次启动状态（用于测试）
   */
  async resetFirstLaunch(): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    if (this.settings) {
      this.settings.firstLaunchCompleted = false;
      delete this.settings.wizardChoices;
      await this.saveSettings();
    }
  }
}
