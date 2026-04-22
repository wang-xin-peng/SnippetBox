import { ipcMain } from 'electron';
import { getSyncService } from '../services/SyncService';
import { getConflictResolver } from '../services/ConflictResolver';
import { getOfflineQueue } from '../services/OfflineQueue';
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
      return { success: true, data: result };
    } catch (e: any) {
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

  // 批量上传所有片段的向量到云端
  ipcMain.handle('sync:uploadAllVectors', async () => {
    try {
      const { getVectorSyncService } = await import('../services/VectorSyncService');
      const { getDatabaseManager } = await import('../database');
      const { getAuthService } = await import('../services/AuthService');
      
      const authService = getAuthService();
      const token = authService.getAccessToken();
      
      if (!token) {
        return { success: false, error: '未登录，无法上传向量' };
      }

      const db = getDatabaseManager().getDb();
      
      // 获取所有已同步的片段
      const snippets = db
        .prepare('SELECT id, cloud_id FROM snippets WHERE cloud_id IS NOT NULL AND deleted_at IS NULL')
        .all() as any[];

      if (snippets.length === 0) {
        return { success: true, data: { success: 0, failed: 0, message: '没有需要上传的片段' } };
      }

      console.log(`[SyncHandlers] Uploading vectors for ${snippets.length} snippets...`);

      const vectorSync = getVectorSyncService();
      const result = await vectorSync.batchSyncVectors(
        snippets.map(s => ({ localId: s.id, cloudId: s.cloud_id }))
      );

      console.log(`[SyncHandlers] Vector upload completed: ${result.success} success, ${result.failed} failed`);

      return { 
        success: true, 
        data: { 
          ...result, 
          message: `成功上传 ${result.success} 个向量${result.failed > 0 ? `，失败 ${result.failed} 个` : ''}` 
        } 
      };
    } catch (e: any) {
      console.error('[SyncHandlers] Upload all vectors failed:', e);
      return { success: false, error: e.message };
    }
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

  console.log('[SyncHandlers] Registered');
}
