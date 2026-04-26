import { ipcMain, dialog } from 'electron';
import { getDatabaseManager } from '../database';
import { ImportService } from '../services/ImportService';

let importService: ImportService | null = null;

/**
 * 注册导入相关的 IPC 处理器
 */
export function registerImportHandlers() {
  console.log('[ImportHandlers] Registering import IPC handlers...');
  
  try {
    const dbManager = getDatabaseManager();
    const db = dbManager.getDb();
    importService = new ImportService(db);
    console.log('[ImportHandlers] ImportService initialized successfully');
  } catch (error) {
    console.error('[ImportHandlers] Failed to initialize ImportService:', error);
    return;
  }

  // 从 Markdown 导入
  ipcMain.handle('import:markdown', async (_event, options?: { skipDuplicates?: boolean; overwriteDuplicates?: boolean }) => {
    try {
      console.log('[ImportHandlers] Import from Markdown');
      if (!importService) throw new Error('ImportService not initialized');

      // 显示打开对话框
      const result = await dialog.showOpenDialog({
        title: '从 Markdown 导入',
        filters: [
          { name: 'Markdown Files', extensions: ['md'] }
        ],
        properties: ['openFile', 'multiSelections']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { imported: 0, skipped: 0, errors: [], canceled: true };
      }

      // 导入所有选中的文件
      let totalImported = 0;
      let totalSkipped = 0;
      const allErrors: Array<{ file: string; error: string }> = [];

      for (const filePath of result.filePaths) {
        const importResult = await importService.importFromMarkdown(filePath, options);
        totalImported += importResult.imported;
        totalSkipped += importResult.skipped;
        allErrors.push(...importResult.errors);
      }

      return {
        imported: totalImported,
        skipped: totalSkipped,
        errors: allErrors,
        canceled: false
      };
    } catch (error) {
      console.error('[ImportHandlers] Import from Markdown failed:', error);
      throw error;
    }
  });

  // 从 JSON 导入
  ipcMain.handle('import:json', async (_event, options?: { skipDuplicates?: boolean; overwriteDuplicates?: boolean }) => {
    try {
      console.log('[ImportHandlers] Import from JSON');
      if (!importService) throw new Error('ImportService not initialized');

      // 显示打开对话框
      const result = await dialog.showOpenDialog({
        title: '从 JSON 导入',
        filters: [
          { name: 'JSON Files', extensions: ['json'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { imported: 0, skipped: 0, errors: [], canceled: true };
      }

      const importResult = await importService.importFromJSON(result.filePaths[0], options);
      return { ...importResult, canceled: false };
    } catch (error) {
      console.error('[ImportHandlers] Import from JSON failed:', error);
      throw error;
    }
  });

  console.log('[ImportHandlers] All import handlers registered successfully');
}
