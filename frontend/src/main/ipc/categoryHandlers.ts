import { ipcMain } from 'electron';
import { getDatabaseManager } from '../database';
import { CategoryManager } from '../services/CategoryManager';
import { getAuthService } from '../services/AuthService';

let categoryManager: CategoryManager | null = null;

// 懒加载 SyncService，避免循环依赖
function getSyncServiceLazy() {
  try {
    const { getSyncService } = require('../services/SyncService');
    const auth = getAuthService();
    if (!auth.isLoggedIn()) return null;
    return getSyncService();
  } catch {
    return null;
  }
}

async function getEffectiveUserId(userId?: string): Promise<string> {
  const authService = getAuthService();
  if (authService.isLoggedIn()) {
    const user = authService.getCachedUser();
    return user?.id || 'local';
  }
  return 'local';
}

export function registerCategoryHandlers() {
  const dbManager = getDatabaseManager();
  const db = dbManager.getDb();
  categoryManager = new CategoryManager(db);

  ipcMain.handle('category:list', async (_event, userId?: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.getCategories(await getEffectiveUserId(userId));
  });

  ipcMain.handle('category:get', async (_event, id: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.getCategoryById(id);
  });

  ipcMain.handle('category:create', async (_event, dto: { name: string; color?: string; icon?: string; description?: string }, userId?: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    const result = await categoryManager.createCategory(dto, await getEffectiveUserId(userId));
    // 异步推送元数据到云端，不阻塞响应
    getSyncServiceLazy()?.syncMetadata().catch(() => {});
    return result;
  });

  ipcMain.handle('category:update', async (_event, id: string, dto: { name?: string; color?: string; icon?: string }) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    const result = await categoryManager.updateCategory(id, dto);
    getSyncServiceLazy()?.syncMetadata().catch(() => {});
    return result;
  });

  ipcMain.handle('category:delete', async (_event, id: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.deleteCategory(id);
  });

  ipcMain.handle('category:ensureDefaults', async (_event, userId?: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    await categoryManager.ensureDefaultCategories(await getEffectiveUserId(userId));
    return true;
  });

  ipcMain.handle('category:reassignLocalToUser', (_event, userId: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.reassignLocalCategoriesToUser(userId);
  });

  console.log('Category handlers registered');
}