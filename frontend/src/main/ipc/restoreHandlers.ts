import { ipcMain } from 'electron';
import RestoreService from '../services/RestoreService';
import Database from 'better-sqlite3';

class RestoreHandlers {
  private restoreService: RestoreService;

  constructor(db: Database.Database) {
    this.restoreService = new RestoreService(db);
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // 验证备份文件
    ipcMain.handle('restore:validate', async (_, backupPath: string) => {
      try {
        const result = await this.restoreService.validateBackup(backupPath);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 从备份恢复
    ipcMain.handle('restore:from-backup', async (_, options: { backupPath: string; mode: 'overwrite' | 'merge' }) => {
      try {
        const result = await this.restoreService.restoreFromBackup(options.backupPath, options.mode);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 预览备份内容
    ipcMain.handle('restore:preview', async (_, backupPath: string) => {
      try {
        const result = await this.restoreService.previewBackup(backupPath);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });
  }
}

export default RestoreHandlers;