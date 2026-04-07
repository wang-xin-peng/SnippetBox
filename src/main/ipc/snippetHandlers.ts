import { ipcMain } from 'electron';
import { SnippetManager } from '../services/SnippetManager';
import { SearchEngine } from '../services/SearchEngine';
import { getDatabaseManager } from '../database';
import { CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter } from '../../shared/types';

/**
 * 注册片段相关的 IPC 处理器
 */
export function registerSnippetHandlers() {
  const db = getDatabaseManager().getDB();
  const snippetManager = new SnippetManager(db);
  const searchEngine = new SearchEngine(db);

  // 创建片段
  ipcMain.handle('snippet:create', async (_event, data: CreateSnippetDTO) => {
    try {
      return snippetManager.createSnippet(data);
    } catch (error) {
      console.error('Error creating snippet:', error);
      throw error;
    }
  });

  // 获取片段列表
  ipcMain.handle('snippet:list', async (_event, filter?: SnippetFilter) => {
    try {
      return snippetManager.listSnippets(filter);
    } catch (error) {
      console.error('Error listing snippets:', error);
      throw error;
    }
  });

  // 获取单个片段
  ipcMain.handle('snippet:get', async (_event, id: string) => {
    try {
      return snippetManager.getSnippet(id);
    } catch (error) {
      console.error('Error getting snippet:', error);
      throw error;
    }
  });

  // 更新片段
  ipcMain.handle('snippet:update', async (_event, id: string, data: UpdateSnippetDTO) => {
    try {
      return snippetManager.updateSnippet(id, data);
    } catch (error) {
      console.error('Error updating snippet:', error);
      throw error;
    }
  });

  // 删除片段
  ipcMain.handle('snippet:delete', async (_event, id: string) => {
    try {
      snippetManager.deleteSnippet(id);
    } catch (error) {
      console.error('Error deleting snippet:', error);
      throw error;
    }
  });

  // 搜索片段
  ipcMain.handle('snippet:search', async (_event, query: string) => {
    try {
      return await searchEngine.search(query);
    } catch (error) {
      console.error('Error searching snippets:', error);
      throw error;
    }
  });
}
