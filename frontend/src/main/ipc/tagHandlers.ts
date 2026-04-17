import { ipcMain } from 'electron';
import { getDatabaseManager } from '../database';
import { TagManager } from '../services/TagManager';

let tagManager: TagManager | null = null;

export function registerTagHandlers() {
  const dbManager = getDatabaseManager();
  const db = dbManager.getDb();
  tagManager = new TagManager(db);

  ipcMain.handle('tag:list', async () => {
    if (!tagManager) throw new Error('TagManager not initialized');
    return tagManager.getTags();
  });

  ipcMain.handle('tag:get', async (_event, id: string) => {
    if (!tagManager) throw new Error('TagManager not initialized');
    return tagManager.getTagById(id);
  });

  ipcMain.handle('tag:create', async (_event, name: string) => {
    if (!tagManager) throw new Error('TagManager not initialized');
    return tagManager.createTag({ name });
  });

  ipcMain.handle('tag:findByName', async (_event, name: string) => {
    if (!tagManager) throw new Error('TagManager not initialized');
    return tagManager.getTagByName(name);
  });

  ipcMain.handle('tag:delete', async (_event, id: string) => {
    if (!tagManager) throw new Error('TagManager not initialized');
    return tagManager.deleteTag(id);
  });

  ipcMain.handle('tag:merge', async (_event, sourceId: string, targetId: string) => {
    if (!tagManager) throw new Error('TagManager not initialized');
    return tagManager.mergeTags(sourceId, targetId);
  });

  console.log('Tag handlers registered');
}
