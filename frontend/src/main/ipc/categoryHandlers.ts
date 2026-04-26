import { ipcMain } from 'electron';
import { getDatabaseManager } from '../database';
import { CategoryManager } from '../services/CategoryManager';
import { getAuthService } from '../services/AuthService';

let categoryManager: CategoryManager | null = null;

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
    return categoryManager.createCategory(dto, await getEffectiveUserId(userId));
  });

  ipcMain.handle('category:update', async (_event, id: string, dto: { name?: string; color?: string; icon?: string }) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.updateCategory(id, dto);
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

  console.log('Category handlers registered');
}
