import { ipcMain } from 'electron';
import { getDatabaseManager } from '../database';
import { SnippetManager } from '../services/SnippetManager';

let snippetManager: SnippetManager | null = null;

/**
 * 注册批量操作相关的 IPC 处理器
 */
export function registerBatchHandlers() {
  console.log('[BatchHandlers] Registering batch operation IPC handlers...');
  
  try {
    const dbManager = getDatabaseManager();
    const db = dbManager.getDb();
    snippetManager = new SnippetManager(db);
    console.log('[BatchHandlers] SnippetManager initialized successfully');
  } catch (error) {
    console.error('[BatchHandlers] Failed to initialize SnippetManager:', error);
    return;
  }

  // 批量删除
  ipcMain.handle('batch:delete', async (_event, snippetIds: string[]) => {
    try {
      console.log('[BatchHandlers] Batch delete:', snippetIds.length, 'snippets');
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      return await snippetManager.batchDelete(snippetIds);
    } catch (error) {
      console.error('[BatchHandlers] Batch delete failed:', error);
      throw error;
    }
  });

  // 批量修改标签
  ipcMain.handle('batch:update-tags', async (_event, snippetIds: string[], tags: string[]) => {
    try {
      console.log('[BatchHandlers] Batch update tags:', snippetIds.length, 'snippets');
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      return await snippetManager.batchUpdateTags(snippetIds, tags);
    } catch (error) {
      console.error('[BatchHandlers] Batch update tags failed:', error);
      throw error;
    }
  });

  // 批量修改分类
  ipcMain.handle('batch:update-category', async (_event, snippetIds: string[], categoryId: string) => {
    try {
      console.log('[BatchHandlers] Batch update category:', snippetIds.length, 'snippets');
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      return await snippetManager.batchUpdateCategory(snippetIds, categoryId);
    } catch (error) {
      console.error('[BatchHandlers] Batch update category failed:', error);
      throw error;
    }
  });

  console.log('[BatchHandlers] All batch operation handlers registered successfully');
}
