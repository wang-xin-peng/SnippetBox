import { ipcMain } from 'electron';
import { getDatabaseManager } from '../database';
import { SnippetManager } from '../services/SnippetManager';
import { ExportService } from '../services/ExportService';
import { dialog } from 'electron';

let snippetManager: SnippetManager | null = null;
let exportService: ExportService | null = null;

// 注册批量操作相关的 IPC 处理器
export function registerBatchHandlers() {
  console.log('[BatchHandlers] Registering batch operation IPC handlers...');

  try {
    const dbManager = getDatabaseManager();
    const db = dbManager.getDb();
    snippetManager = new SnippetManager(db);
    exportService = new ExportService(db);
    console.log('[BatchHandlers] Services initialized successfully');
  } catch (error) {
    console.error('[BatchHandlers] Failed to initialize services:', error);
    return;
  }

  // 批量删除（事务：全部成功或全部回滚）
  ipcMain.handle('batch:delete', async (_event, snippetIds: string[]) => {
    if (!snippetManager) throw new Error('SnippetManager not initialized');
    console.log('[BatchHandlers] Batch delete:', snippetIds.length, 'snippets');
    return snippetManager.batchDelete(snippetIds);
  });

  // 批量修改标签（事务）
  ipcMain.handle('batch:update-tags', async (_event, snippetIds: string[], tags: string[]) => {
    if (!snippetManager) throw new Error('SnippetManager not initialized');
    console.log('[BatchHandlers] Batch update tags:', snippetIds.length, 'snippets');
    return snippetManager.batchUpdateTags(snippetIds, tags);
  });

  // 批量修改分类（事务）
  ipcMain.handle('batch:update-category', async (_event, snippetIds: string[], categoryId: string) => {
    if (!snippetManager) throw new Error('SnippetManager not initialized');
    console.log('[BatchHandlers] Batch update category:', snippetIds.length, 'snippets');
    return snippetManager.batchUpdateCategory(snippetIds, categoryId);
  });

  // 批量导出
  ipcMain.handle('batch:export', async (_event, snippetIds: string[], format: string) => {
    if (!exportService) throw new Error('ExportService not initialized');
    console.log('[BatchHandlers] Batch export:', snippetIds.length, 'snippets, format:', format);

    const isJson = format === 'json';
    const result = await dialog.showSaveDialog({
      title: isJson ? '批量导出为 JSON' : '批量导出为 Markdown',
      defaultPath: isJson ? 'snippets.json' : 'snippets.md',
      filters: isJson
        ? [{ name: 'JSON Files', extensions: ['json'] }]
        : [{ name: 'Markdown Files', extensions: ['md'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: 0, failed: 0, errors: [] };
    }

    if (isJson) {
      return exportService.exportToJSON(snippetIds, result.filePath);
    }
    return exportService.batchExportToMarkdown(snippetIds, result.filePath);
  });

  console.log('[BatchHandlers] All batch operation handlers registered successfully');
}
