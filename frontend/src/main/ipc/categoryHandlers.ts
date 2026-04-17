import { ipcMain } from 'electron';
import { getDatabaseManager } from '../database';
import { CategoryManager } from '../services/CategoryManager';

let categoryManager: CategoryManager | null = null;

export function registerCategoryHandlers() {
  const dbManager = getDatabaseManager();
  const db = dbManager.getDb();
  categoryManager = new CategoryManager(db);

  ipcMain.handle('category:list', async () => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.getCategories();
  });

  ipcMain.handle('category:get', async (_event, id: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.getCategoryById(id);
  });

  ipcMain.handle('category:create', async (_event, name: string, color?: string, icon?: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.createCategory({ name, color, icon });
  });

  ipcMain.handle('category:update', async (_event, id: string, name?: string, color?: string, icon?: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.updateCategory(id, { name, color, icon });
  });

  ipcMain.handle('category:delete', async (_event, id: string) => {
    if (!categoryManager) throw new Error('CategoryManager not initialized');
    return categoryManager.deleteCategory(id);
  });

  console.log('Category handlers registered');
}
