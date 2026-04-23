import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  conflictStrategy: 'local' | 'cloud' | 'latest' | 'manual';
}

export interface SearchSettings {
  searchMode: 'local' | 'cloud' | 'auto';
  maxResults: number;
}

export interface BackupSettings {
  autoBackup: boolean;
  backupInterval: number;
  keepBackups: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  editor: EditorSettings;
  sync: SyncSettings;
  search: SearchSettings;
  backup: BackupSettings;
  [key: string]: any;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  language: 'zh-CN',
  editor: {
    fontSize: 14,
    fontFamily: 'Consolas, Monaco, monospace',
    tabSize: 2,
    wordWrap: true
  },
  sync: {
    autoSync: false,
    syncInterval: 30,
    conflictStrategy: 'manual'
  },
  search: {
    searchMode: 'local',
    maxResults: 100
  },
  backup: {
    autoBackup: true,
    backupInterval: 1,
    keepBackups: 7
  }
};

export class SettingsManager {
  private db: Database.Database;
  private settingsCache: Settings | null = null;

  constructor(db?: Database.Database) {
    this.db = db || new Database(':memory:');
    this.initializeSettings();
  }

  private initializeSettings(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);

      const result = this.db.prepare('SELECT COUNT(*) as count FROM settings').get() as any;
      if (result.count === 0) {
        this.saveSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('[SettingsManager] Initialize failed:', error);
    }
  }

  /**
   * 获取设置
   */
  async getSettings(): Promise<Settings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }

    try {
      const rows = this.db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: Record<string, any> = {};

      for (const row of rows) {
        try {
          settingsMap[row.key] = JSON.parse(row.value);
        } catch {
          settingsMap[row.key] = row.value;
        }
      }

      this.settingsCache = this.mergeWithDefaults(settingsMap);
      return this.settingsCache;
    } catch (error) {
      console.error('[SettingsManager] Get settings failed:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 更新设置
   */
  async updateSettings(settings: Partial<Settings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = this.deepMerge(currentSettings, settings);

      await this.saveSettings(updatedSettings);
      this.settingsCache = updatedSettings;
    } catch (error) {
      console.error('[SettingsManager] Update settings failed:', error);
      throw new Error('更新设置失败');
    }
  }

  /**
   * 保存设置
   */
  private saveSettings(settings: Settings): void {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, JSON.stringify(value), now);
    }
  }

  /**
   * 重置设置
   */
  async resetSettings(): Promise<void> {
    try {
      this.db.exec('DELETE FROM settings');
      await this.saveSettings(DEFAULT_SETTINGS);
      this.settingsCache = DEFAULT_SETTINGS;
    } catch (error) {
      console.error('[SettingsManager] Reset settings failed:', error);
      throw new Error('重置设置失败');
    }
  }

  /**
   * 导出设置
   */
  async exportSettings(filePath: string): Promise<void> {
    try {
      const settings = await this.getSettings();
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings
      };

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    } catch (error) {
      console.error('[SettingsManager] Export settings failed:', error);
      throw new Error('导出设置失败');
    }
  }

  /**
   * 导入设置
   */
  async importSettings(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('设置文件不存在');
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const importData = JSON.parse(content);

      if (!importData.settings) {
        throw new Error('设置文件格式错误');
      }

      const settings = this.validateSettings(importData.settings);
      await this.updateSettings(settings);
    } catch (error) {
      console.error('[SettingsManager] Import settings failed:', error);
      throw new Error('导入设置失败');
    }
  }

  /**
   * 验证设置
   */
  private validateSettings(settings: any): Settings {
    return {
      theme: this.validateTheme(settings.theme),
      language: this.validateLanguage(settings.language),
      editor: this.validateEditorSettings(settings.editor),
      sync: this.validateSyncSettings(settings.sync),
      search: this.validateSearchSettings(settings.search),
      backup: this.validateBackupSettings(settings.backup)
    };
  }

  private validateTheme(theme: any): 'light' | 'dark' | 'auto' {
    if (['light', 'dark', 'auto'].includes(theme)) {
      return theme;
    }
    return DEFAULT_SETTINGS.theme;
  }

  private validateLanguage(language: any): 'zh-CN' | 'en-US' {
    if (['zh-CN', 'en-US'].includes(language)) {
      return language;
    }
    return DEFAULT_SETTINGS.language;
  }

  private validateEditorSettings(editor: any): EditorSettings {
    if (!editor || typeof editor !== 'object') {
      return DEFAULT_SETTINGS.editor;
    }

    return {
      fontSize: this.validateNumber(editor.fontSize, 10, 24, DEFAULT_SETTINGS.editor.fontSize),
      fontFamily: typeof editor.fontFamily === 'string' ? editor.fontFamily : DEFAULT_SETTINGS.editor.fontFamily,
      tabSize: this.validateNumber(editor.tabSize, 1, 8, DEFAULT_SETTINGS.editor.tabSize),
      wordWrap: typeof editor.wordWrap === 'boolean' ? editor.wordWrap : DEFAULT_SETTINGS.editor.wordWrap
    };
  }

  private validateSyncSettings(sync: any): SyncSettings {
    if (!sync || typeof sync !== 'object') {
      return DEFAULT_SETTINGS.sync;
    }

    const validStrategies = ['local', 'cloud', 'latest', 'manual'];
    return {
      autoSync: typeof sync.autoSync === 'boolean' ? sync.autoSync : DEFAULT_SETTINGS.sync.autoSync,
      syncInterval: this.validateNumber(sync.syncInterval, 1, 1440, DEFAULT_SETTINGS.sync.syncInterval),
      conflictStrategy: validStrategies.includes(sync.conflictStrategy)
        ? sync.conflictStrategy
        : DEFAULT_SETTINGS.sync.conflictStrategy
    };
  }

  private validateSearchSettings(search: any): SearchSettings {
    if (!search || typeof search !== 'object') {
      return DEFAULT_SETTINGS.search;
    }

    const validModes = ['local', 'cloud', 'auto'];
    return {
      searchMode: validModes.includes(search.searchMode)
        ? search.searchMode
        : DEFAULT_SETTINGS.search.searchMode,
      maxResults: this.validateNumber(search.maxResults, 10, 1000, DEFAULT_SETTINGS.search.maxResults)
    };
  }

  private validateBackupSettings(backup: any): BackupSettings {
    if (!backup || typeof backup !== 'object') {
      return DEFAULT_SETTINGS.backup;
    }

    return {
      autoBackup: typeof backup.autoBackup === 'boolean' ? backup.autoBackup : DEFAULT_SETTINGS.backup.autoBackup,
      backupInterval: this.validateNumber(backup.backupInterval, 1, 30, DEFAULT_SETTINGS.backup.backupInterval),
      keepBackups: this.validateNumber(backup.keepBackups, 1, 30, DEFAULT_SETTINGS.backup.keepBackups)
    };
  }

  private validateNumber(value: any, min: number, max: number, defaultValue: number): number {
    const num = Number(value);
    if (Number.isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

  /**
   * 合并设置与默认值
   */
  private mergeWithDefaults(settingsMap: Record<string, any>): Settings {
    return {
      ...settingsMap,
      theme: settingsMap.theme || DEFAULT_SETTINGS.theme,
      language: settingsMap.language || DEFAULT_SETTINGS.language,
      editor: { ...DEFAULT_SETTINGS.editor, ...settingsMap.editor },
      sync: { ...DEFAULT_SETTINGS.sync, ...settingsMap.sync },
      search: { ...DEFAULT_SETTINGS.search, ...settingsMap.search },
      backup: { ...DEFAULT_SETTINGS.backup, ...settingsMap.backup }
    };
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) {
      return target;
    }

    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}

export default SettingsManager;
