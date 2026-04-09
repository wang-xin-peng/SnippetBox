import { ipcMain } from 'electron';
import { TagManager } from '../services/TagManager';
import { getDatabaseManager } from '../database';
import { CreateTagDTO } from '../../shared/types';

/**
 * 注册标签相关的 IPC 处理器
 */
export function registerTagHandlers() {
  const db = getDatabaseManager().getDB();
  const tagManager = new TagManager(db);

  // 创建标签
  ipcMain.handle('tag:create', async (_event, name: string) => {
    try {
      const dto: CreateTagDTO = { name };
      return await tagManager.createTag(dto);
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  });

  // 获取所有标签
  ipcMain.handle('tag:list', async () => {
    try {
      return await tagManager.getTags();
    } catch (error) {
      console.error('Error listing tags:', error);
      throw error;
    }
  });

  // 获取单个标签
  ipcMain.handle('tag:get', async (_event, id: string) => {
    try {
      return await tagManager.getTagById(id);
    } catch (error) {
      console.error('Error getting tag:', error);
      throw error;
    }
  });

  // 按名称查找标签
  ipcMain.handle('tag:findByName', async (_event, name: string) => {
    try {
      return await tagManager.getTagByName(name);
    } catch (error) {
      console.error('Error finding tag by name:', error);
      throw error;
    }
  });

  // 删除标签
  ipcMain.handle('tag:delete', async (_event, id: string) => {
    try {
      await tagManager.deleteTag(id);
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  });

  // 合并标签
  ipcMain.handle('tag:merge', async (_event, sourceId: string, targetId: string) => {
    try {
      await tagManager.mergeTags(sourceId, targetId);
    } catch (error) {
      console.error('Error merging tags:', error);
      throw error;
    }
  });
}
