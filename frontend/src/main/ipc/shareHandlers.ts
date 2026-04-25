import { ipcMain } from 'electron';
import { getShareService } from '../services/ShareService';
import { getDatabaseManager } from '../database';
import { CreateShareRequest } from '../../shared/types/share';

export function registerShareHandlers() {
  const share = getShareService();

  ipcMain.handle('share:create', async (_e, req: CreateShareRequest) => {
    try {
      // 用 cloud_id 替换本地 id
      let snippetId = req.snippetId;
      try {
        const db = getDatabaseManager().getDb();
        const row = db.prepare(`SELECT cloud_id FROM snippets WHERE id = ?`).get(req.snippetId) as { cloud_id: string | null } | undefined;
        console.log('[ShareHandlers] snippet lookup:', req.snippetId, 'result:', row);
        if (row?.cloud_id) {
          snippetId = row.cloud_id;
          console.log('[ShareHandlers] Using cloud_id:', snippetId);
        } else {
          console.log('[ShareHandlers] No cloud_id found for snippet, using local id');
        }
      } catch (e) {
        console.error('[ShareHandlers] DB lookup error:', e);
      }

      const result = await share.createShare({ ...req, snippetId });
      return { success: true, data: result };
    } catch (err: any) {
      console.error('[ShareHandlers] create failed:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('share:list', async () => {
    try {
      const result = await share.listShares();
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('share:delete', async (_e, shareId: string) => {
    try {
      await share.deleteShare(shareId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('share:get', async (_e, shareId: string) => {
    try {
      const result = await share.getShare(shareId);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
