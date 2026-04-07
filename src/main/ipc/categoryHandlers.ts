import { ipcMain } from 'electron';
import { CategoryManager } from '../services/CategoryManager';
import { getDatabaseManager } from '../database';
import { CreateCategoryDTO, UpdateCategoryDTO } from '../../shared/types';

/**
 * 注册分类相关的 IPC 处理器
 */
export function registerCategoryHandlers() {
  const db = getDatabaseManager().getDB();
  const categoryManager = new CategoryManager(db);

  // 创建分类
  ipcMain.handle('category:create', async (_event, name: string, color?: string, icon?: string) => {
    try {
      const dto: CreateCategoryDTO = { name, color, icon };
      return await categoryManager.createCategory(dto);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  });

  // 获取所有分类
  ipcMain.handle('category:list', async () => {
    try {
      return await categoryManager.getCategories();
    } catch (error) {
      console.error('Error listing categories:', error);
      throw error;
    }
  });

  // 获取单个分类
  ipcMain.handle('category:get', async (_event, id: string) => {
    try {
      return await categoryManager.getCategoryById(id);
    } catch (error) {
      console.error('Error getting category:', error);
      throw error;
    }
  });

  // 更新分类
  ipcMain.handle('category:update', async (_event, id: string, name?: string, color?: string, icon?: string) => {
    try {
      const dto: UpdateCategoryDTO = { name, color, icon };
      return await categoryManager.updateCategory(id, dto);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  });

  // 删除分类
  ipcMain.handle('category:delete', async (_event, id: string) => {
    try {
      await categoryManager.deleteCategory(id);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  });
}
