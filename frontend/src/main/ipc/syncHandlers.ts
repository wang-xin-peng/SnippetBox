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
      (sync as any).updatePendingCount();
      (sync as any).notifyRenderer();
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:pull', async () => {
    try {
      const result = await sync.pullChanges();
      (sync as any).updatePendingCount();
      (sync as any).notifyRenderer();
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
      const auth = require('../services/AuthService').getAuthService();
      const userId = auth.getCachedUser()?.id || 'local';
      // 登出时只清除当前用户的云端同步片段，保留其他用户本地片段和所有分类
      db.prepare("DELETE FROM snippets WHERE (storage_scope = 'cloud' OR sync_source = 'cloud') AND (user_id = ? OR user_id = 'local' OR user_id IS NULL)").run(userId);
      // 清除永久删除黑名单
      db.prepare('DELETE FROM deleted_cloud_ids').run();
      console.log('[SyncHandlers] Cloud snippets cleared for user', userId);
      return { success: true };
    } catch (e: any) {
      console.error('[SyncHandlers] clearAll error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:markLocalSnippetsSkipSync', () => {
    try {
      const db = getDatabaseManager().getDb();
      const auth = require('../services/AuthService').getAuthService();
      const userId = auth.getCachedUser()?.id || 'local';
      const result = db
        .prepare(`UPDATE snippets SET skip_sync = 1 WHERE COALESCE(storage_scope, 'local') = 'local' AND COALESCE(cloud_id, '') = '' AND (user_id = ? OR user_id = 'local' OR user_id IS NULL)`)
        .run(userId);
      return { success: true, data: { marked: result.changes } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:clearSkipSync', () => {
    try {
      const db = getDatabaseManager().getDb();
      const auth = require('../services/AuthService').getAuthService();
      const userId = auth.getCachedUser()?.id || 'local';
      db.prepare(`UPDATE snippets SET skip_sync = 0 WHERE skip_sync = 1 AND (user_id = ? OR user_id = 'local' OR user_id IS NULL)`).run(userId);
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

  ipcMain.handle('sync:syncMetadata', async () => {
    try {
      const result = await sync.syncMetadata();
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sync:waitForPendingSync', async () => {
    await sync.waitForPendingSync();
    return { success: true };
  });

  ipcMain.handle('sync:reconcileCategories', async () => {
    try {
      const count = sync.reconcileCategoriesFromSnippets();
      return { success: true, data: { reconciled: count } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  console.log('[SyncHandlers] Registered');
}