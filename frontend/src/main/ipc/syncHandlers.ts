import { ipcMain } from 'electron';
import { getSyncService } from '../services/SyncService';
import { getConflictResolver } from '../services/ConflictResolver';
import { getOfflineQueue } from '../services/OfflineQueue';
import { getDatabaseManager } from '../database';
import { ConflictResolution } from '../../shared/types/sync';

export function registerSyncHandlers() {
  const sync = getSyncService();
  const resolver = getConflictResolver();
  const queue = getOfflineQueue();

  ipcMain.handle('sync:push', async () => {
    try {
      const result = await sync.pushChanges();
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:pull', async () => {
    try {
      const result = await sync.pullChanges();
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:sync', async () => {
    try {
      const result = await sync.sync();
      console.log(`[SyncHandlers] sync completed: pushed=${result.pushed}, pulled=${result.pulled}, errors=${result.errors.length}`);
      return { success: true, data: result };
    } catch (e: any) {
      console.error('[SyncHandlers] sync failed:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:getStatus', () => {
    return sync.getSyncStatus();
  });

  ipcMain.handle('sync:enableAutoSync', (_e, intervalMinutes: number) => {
    sync.enableAutoSync(intervalMinutes);
    return { success: true };
  });

  ipcMain.handle('sync:disableAutoSync', () => {
    sync.disableAutoSync();
    return { success: true };
  });

  ipcMain.handle(
    'sync:resolveConflict',
    async (_e, conflict: any, resolution: ConflictResolution) => {
      try {
        await resolver.resolveConflict(conflict, resolution);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
  );

  ipcMain.handle(
    'sync:autoResolve',
    async (_e, conflicts: any[], strategy: 'local' | 'cloud' | 'latest') => {
      try {
        await resolver.autoResolve(conflicts, strategy);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
  );

  ipcMain.handle('sync:getConflictHistory', () => {
    return resolver.getHistory();
  });

  ipcMain.handle('sync:getQueueStatus', () => {
    return queue.getQueueStatus();
  });

  ipcMain.handle('sync:clearFailedQueue', () => {
    queue.clearFailed();
    return { success: true };
  });

  ipcMain.handle('sync:clearCloudOnlySnippets', () => {
    try {
      const cleared = sync.clearCloudOnlySnippets();
      return { success: true, data: { cleared } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('snippet:clearAll', () => {
    try {
      const db = getDatabaseManager().getDb();
      // 清除所有片段
      db.prepare('DELETE FROM snippets').run();
      // 清除所有分类
      db.prepare('DELETE FROM categories').run();
      // 清除所有标签
      db.prepare('DELETE FROM tags').run();
      // 清除永久删除黑名单
      db.prepare('DELETE FROM deleted_cloud_ids').run();
      console.log('[SyncHandlers] All snippets, categories, tags cleared');
      return { success: true };
    } catch (e: any) {
      console.error('[SyncHandlers] clearAll error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:markLocalSnippetsSkipSync', () => {
    try {
      const db = getDatabaseManager().getDb();
      const result = db
        .prepare(`UPDATE snippets SET skip_sync = 1 WHERE COALESCE(storage_scope, 'local') = 'local' AND COALESCE(cloud_id, '') = ''`)
        .run();
      return { success: true, data: { marked: result.changes } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:clearSkipSync', () => {
    try {
      const db = getDatabaseManager().getDb();
      db.prepare(`UPDATE snippets SET skip_sync = 0 WHERE skip_sync = 1`).run();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:getStorageUsage', async () => {
    try {
      const usage = await sync.getStorageUsage();
      return { success: true, data: usage };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  console.log('[SyncHandlers] Registered');
}
