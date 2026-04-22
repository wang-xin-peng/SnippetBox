import { ipcMain } from 'electron';
import BackupService from '../services/BackupService';
import Database from 'better-sqlite3';

class BackupHandlers {
  private backupService: BackupService;

  constructor(db: Database.Database) {
    this.backupService = new BackupService(db);
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // 创建备份
    ipcMain.handle('backup:create', async (_, backupPath?: string) => {
      try {
        const result = await this.backupService.createBackup(backupPath);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 启用自动备份
    ipcMain.handle('backup:enable-auto', (_, intervalDays: number) => {
      try {
        this.backupService.enableAutoBackup(intervalDays);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 禁用自动备份
    ipcMain.handle('backup:disable-auto', () => {
      try {
        this.backupService.disableAutoBackup();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 获取备份列表
    ipcMain.handle('backup:list', async () => {
      try {
        const backups = await this.backupService.listBackups();
        return { success: true, data: backups };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 删除备份
    ipcMain.handle('backup:delete', async (_, backupId: string) => {
      try {
        await this.backupService.deleteBackup(backupId);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 清理旧备份
    ipcMain.handle('backup:clean-old', async (_, keepDays: number) => {
      try {
        const deletedCount = await this.backupService.cleanOldBackups(keepDays);
        return { success: true, data: deletedCount };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 验证备份
    ipcMain.handle('backup:validate', (_, backupPath: string) => {
      try {
        const valid = this.backupService.validateBackup(backupPath);
        return { success: true, data: valid };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });
  }
}

export default BackupHandlers;