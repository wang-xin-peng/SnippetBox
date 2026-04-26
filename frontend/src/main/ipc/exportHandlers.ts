import { ipcMain, dialog } from 'electron';
import { getDatabaseManager } from '../database';
import { ExportService } from '../services/ExportService';

let exportService: ExportService | null = null;

/**
 * 注册导出相关的 IPC 处理器
 */
export function registerExportHandlers() {
  console.log('[ExportHandlers] Registering export IPC handlers...');
  
  try {
    const dbManager = getDatabaseManager();
    const db = dbManager.getDb();
    exportService = new ExportService(db);
    console.log('[ExportHandlers] ExportService initialized successfully');
  } catch (error) {
    console.error('[ExportHandlers] Failed to initialize ExportService:', error);
    return;
  }

  // 导出单个片段为 Markdown
  ipcMain.handle('export:markdown', async (_event, snippetId: string) => {
    try {
      console.log('[ExportHandlers] Export to Markdown:', snippetId);
      if (!exportService) throw new Error('ExportService not initialized');

      // 显示保存对话框
      const result = await dialog.showSaveDialog({
        title: '导出为 Markdown',
        defaultPath: 'snippet.md',
        filters: [
          { name: 'Markdown Files', extensions: ['md'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'User canceled' };
      }

      return await exportService.exportToMarkdown(snippetId, result.filePath);
    } catch (error) {
      console.error('[ExportHandlers] Export to Markdown failed:', error);
      throw error;
    }
  });

  // 批量导出为 Markdown（ZIP 压缩包）
  ipcMain.handle('export:batch-markdown', async (_event, snippetIds: string[]) => {
    try {
      console.log('[ExportHandlers] Batch export to Markdown:', snippetIds.length, 'snippets');
      if (!exportService) throw new Error('ExportService not initialized');

      const result = await dialog.showSaveDialog({
        title: '批量导出为 Markdown',
        defaultPath: 'snippets.zip',
        filters: [
          { name: 'ZIP Archives', extensions: ['zip'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: 0, failed: 0, errors: [] };
      }

      return await exportService.batchExportToMarkdown(snippetIds, result.filePath);
    } catch (error) {
      console.error('[ExportHandlers] Batch export to Markdown failed:', error);
      throw error;
    }
  });

  // 导出为 JSON
  ipcMain.handle('export:json', async (_event, snippetIds: string[]) => {
    try {
      console.log('[ExportHandlers] Export to JSON:', snippetIds.length, 'snippets');
      if (!exportService) throw new Error('ExportService not initialized');

      // 显示保存对话框
      const result = await dialog.showSaveDialog({
        title: '导出为 JSON',
        defaultPath: 'snippets.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'User canceled' };
      }

      return await exportService.exportToJSON(snippetIds, result.filePath);
    } catch (error) {
      console.error('[ExportHandlers] Export to JSON failed:', error);
      throw error;
    }
  });

  // 导出为 PDF
  ipcMain.handle('export:pdf', async (_event, snippetIds: string[]) => {
    try {
      console.log('[ExportHandlers] Export to PDF:', snippetIds.length, 'snippets');
      if (!exportService) throw new Error('ExportService not initialized');

      const result = await dialog.showSaveDialog({
        title: '导出为 PDF',
        defaultPath: 'snippets.pdf',
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'User canceled' };
      }

      return await exportService.exportToPDF(snippetIds, result.filePath);
    } catch (error) {
      console.error('[ExportHandlers] Export to PDF failed:', error);
      throw error;
    }
  });

  console.log('[ExportHandlers] All export handlers registered successfully');
}
