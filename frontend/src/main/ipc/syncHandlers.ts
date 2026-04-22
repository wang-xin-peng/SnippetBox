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
