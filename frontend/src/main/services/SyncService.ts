import axios, { AxiosInstance } from 'axios';
import { BrowserWindow } from 'electron';
import { getDatabaseManager } from '../database';
import { getAuthService } from './AuthService';
import { getOfflineQueue } from './OfflineQueue';
import {
  SyncResult,
  PushResult,
  PullResult,
  SyncStatus,
  SyncStatusType,
} from '../../shared/types/sync';

const BASE_URL = 'http://8.141.108.146:8000/api/v1';

export class SyncService {
  private http: AxiosInstance;
  private status: SyncStatus = {
    status: 'idle',
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
    isOnline: true,
  };
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL, timeout: 15000 });
    this.setupNetworkMonitor();
  }

  private setupNetworkMonitor(): void {
    // 延迟首次检测，避免阻塞启动
    setTimeout(() => this.checkOnlineStatus(), 1000);
    setInterval(() => this.checkOnlineStatus(), 30000);
  }

  private async checkOnlineStatus(): Promise<boolean> {
    try {
      await axios.get(`http://8.141.108.146:8000/health`, { timeout: 2000 });
      const wasOffline = !this.isOnline;
      this.isOnline = true;
      this.status.isOnline = true;

      if (wasOffline) {
        console.log('[SyncService] Network restored, processing offline queue...');
        this.processOfflineQueue();
      }
      return true;
    } catch {
      this.isOnline = false;
      this.status.isOnline = false;
      return false;
    }
  }

  private async quickCheckOnlineStatus(): Promise<boolean> {
    try {
      await axios.get(`http://8.141.108.146:8000/health`, { timeout: 2000 });
      this.isOnline = true;
      this.status.isOnline = true;
      return true;
    } catch {
      this.isOnline = false;
      this.status.isOnline = false;
      return false;
    }
  }

  private async processOfflineQueue(): Promise<void> {
    const queue = getOfflineQueue();
    const ops = queue.getPendingOperations();
    if (ops.length === 0) {
      // 没有离线队列，直接走完整同步
      this.sync().catch((e) => console.error('[SyncService] Sync after reconnect failed:', e));
      return;
    }

    const token = getAuthService().getAccessToken();
    if (!token) return;

    const db = getDatabaseManager().getDb();

    for (const op of ops) {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        if (op.type === 'create') {
          // create 操作统一由 pushChanges 处理，避免重复推送
          // 只需标记为已处理，pushChanges 会根据 is_synced=0 重新推
          await queue.markProcessed(op.id);
        } else if (op.type === 'update') {
          const cloudId = op.data?.cloudId ?? op.snippetId;
          await this.http.put(`/snippets/${cloudId}`, op.data, { headers });
          await queue.markProcessed(op.id);
        } else if (op.type === 'delete') {
          const cloudId = op.data?.cloudId ?? op.snippetId;
          const hardDelete = op.data?.hardDelete ? '?hard_delete=true' : '';
          await this.http.delete(`/snippets/${cloudId}${hardDelete}`, { headers });
          await queue.markProcessed(op.id);
        }
      } catch (e) {
        console.error('[SyncService] Failed to process offline op:', op.id, e);
      }
    }

    // 处理完队列后执行完整同步
    this.sync().catch((e) => console.error('[SyncService] Sync after reconnect failed:', e));
  }

  /**
   * 同步分类和标签元数据（双向）
   * 推送本地分类/标签到云端，并拉取云端新增的分类/标签到本地
   */
  async syncMetadata(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
    const result = { pushed: 0, pulled: 0, errors: [] as string[] };
    const token = getAuthService().getAccessToken();
    if (!token || !this.isOnline) return result;

    try {
      const db = getDatabaseManager().getDb();
      const headers = { Authorization: `Bearer ${token}` };
      const currentUser = await getAuthService().getCurrentUser();
      const userId = currentUser?.id || 'local';

      // 收集本地分类（排除默认分类前缀 cat_local_ 和 cat_<userId>_）
      const localCategories = db.prepare(
        `SELECT id, name, color, icon, created_at, updated_at FROM categories
         WHERE user_id IN ('local', ?) AND name NOT LIKE '#%'`
      ).all(userId) as any[];

      // 收集本地标签
      const localTags = db.prepare(
        `SELECT id, name, created_at FROM tags`
      ).all() as any[];

      const payload = {
        categories: localCategories.map(c => ({
          name: c.name,
          color: c.color || '#6c757d',
          icon: c.icon || 'fas fa-folder',
          created_at: new Date(c.created_at).toISOString(),
          updated_at: new Date(c.updated_at || c.created_at).toISOString(),
        })),
        tags: localTags.map(t => ({
          name: t.name,
          created_at: new Date(t.created_at).toISOString(),
        })),
      };

      const res = await this.http.post('/sync/metadata', payload, { headers });
      const { categories: cloudCats, tags: cloudTags } = res.data;

      // 将云端返回的分类合并到本地（按名称去重）
      const insertCat = db.prepare(
        `INSERT OR IGNORE INTO categories (id, name, color, icon, created_at, updated_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const cat of (cloudCats || [])) {
        const existing = db.prepare('SELECT id FROM categories WHERE name = ? AND user_id IN (?, \'local\')')
          .get(cat.name, userId) as any;
        if (!existing) {
          const { randomUUID } = await import('crypto');
          insertCat.run(
            randomUUID(), cat.name, cat.color || '#6c757d', cat.icon || 'fas fa-folder',
            new Date(cat.created_at).getTime(), new Date(cat.updated_at).getTime(), userId
          );
          result.pulled++;
        }
      }

      // 将云端返回的标签合并到本地（按名称去重）
      const insertTag = db.prepare(
        `INSERT OR IGNORE INTO tags (id, name, usage_count, created_at) VALUES (?, ?, 0, ?)`
      );
      for (const tag of (cloudTags || [])) {
        const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag.name) as any;
        if (!existing) {
          const { randomUUID } = await import('crypto');
          insertTag.run(randomUUID(), tag.name, new Date(tag.created_at).getTime());
          result.pulled++;
        }
      }

      result.pushed = payload.categories.length + payload.tags.length;
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e.message;
      result.errors.push(msg);
      console.warn('[SyncService] Metadata sync failed:', msg);
    }

    return result;
  }

  async pushChanges(): Promise<PushResult> {
    const result: PushResult = { pushed: 0, errors: [] };
    const token = getAuthService().getAccessToken();
    if (!token) {
      result.errors.push({ message: '未登录，无法推送' });
      return result;
    }

    if (!this.isOnline) {
      result.errors.push({ message: '网络不可用，变更已加入离线队列' });
      return result;
    }

    try {
      const db = getDatabaseManager().getDb();
      const unsynced = db
        .prepare(`SELECT * FROM snippets WHERE is_synced = 0 AND COALESCE(skip_sync, 0) = 0 AND COALESCE(storage_scope, 'local') = 'local'`)
        .all() as any[];

      const headers = { Authorization: `Bearer ${token}` };

      for (const row of unsynced) {
        try {
          // 将 category_id 转换为分类名称推送给云端
          let categoryName: string | null = null;
          if (row.category_id) {
            const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(row.category_id) as any;
            categoryName = cat?.name ?? null;
          }

          const payload = {
            title: row.title,
            code: row.code,
            language: row.language,
            description: row.description,
            category: categoryName,
          };

          let cloudId = row.cloud_id;
          if (cloudId) {
            await this.http.put(`/snippets/${cloudId}`, payload, { headers });
          } else {
            const res = await this.http.post('/snippets', payload, { headers });
            cloudId = res.data?.id ?? res.data?.snippet_id ?? res.data?.data?.id;
          }

          if (!cloudId) {
            console.warn(`[SyncService] No cloudId returned for snippet ${row.id}, skipping is_synced update`);
            continue;
          }

          const updateResult = db.prepare(
            `UPDATE snippets SET is_synced = 1, cloud_id = ?, storage_scope = COALESCE(storage_scope, 'local') WHERE id = ?`
          ).run(cloudId ?? null, row.id);
          if (updateResult.changes === 0) {
            console.warn(`[SyncService] Failed to update is_synced for snippet ${row.id}`);
          }

          result.pushed++;
        } catch (e: any) {
          const errMsg = e?.response?.data?.detail ?? e.message;
          result.errors.push({ snippetId: row.id, message: errMsg });

          if (!this.isOnline) {
            await getOfflineQueue().enqueue({
              type: row.cloud_id ? 'update' : 'create',
              snippetId: row.id,
              data: { title: row.title, code: row.code, language: row.language },
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (e: any) {
      result.errors.push({ message: e.message });
    }

    this.updatePendingCount();
    return result;
  }

  async pullChanges(): Promise<PullResult> {
    const result: PullResult = { pulled: 0, conflicts: [], errors: [] };
    const token = getAuthService().getAccessToken();
    if (!token) {
      result.errors.push({ message: '未登录，无法拉取' });
      return result;
    }

    if (!this.isOnline) {
      result.errors.push({ message: '网络不可用' });
      return result;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await this.http.get('/snippets', { headers });
      const cloudSnippets: any[] = res.data?.snippets ?? res.data ?? [];

      const db = getDatabaseManager().getDb();
      const currentUser = await getAuthService().getCurrentUser();
      const cloudUserId = currentUser?.id || 'local';

      // 加载永久删除黑名单
      const blacklist = new Set(
        (db.prepare('SELECT cloud_id FROM deleted_cloud_ids').all() as { cloud_id: string }[]).map(r => r.cloud_id)
      );

      for (const cloud of cloudSnippets) {
        const cloudId = cloud.id ?? cloud.snippet_id;

        // 跳过已永久删除的片段
        if (blacklist.has(cloudId)) continue;
        const cloudUpdatedAt = new Date(cloud.updated_at ?? cloud.updatedAt).getTime();

        try {
          const existing = db
            .prepare(`SELECT * FROM snippets WHERE cloud_id = ?`)
            .get(cloudId) as any | undefined;

          let categoryId: string | null = null;
          if (cloud.category) {
            const cat = db.prepare(
              'SELECT id FROM categories WHERE name = ? AND user_id = ?'
            ).get(cloud.category, cloudUserId) as { id: string } | undefined;
            categoryId = cat?.id || null;
          }

          if (existing) {
            const localUpdatedAt = existing.updated_at;
            if (cloudUpdatedAt > localUpdatedAt) {
              db.prepare(
                `UPDATE snippets SET title=?, code=?, language=?, description=?, is_synced=1, updated_at=?, category_id=?, category_name=? WHERE cloud_id=?`
              ).run(
                cloud.title,
                cloud.code,
                cloud.language,
                cloud.description ?? null,
                cloudUpdatedAt,
                categoryId,
                cloud.category ?? null,
                cloudId
              );
            }
          } else {
            const { randomUUID } = await import('crypto');
            db.prepare(
              `INSERT OR IGNORE INTO snippets (id, title, code, language, description, is_synced, cloud_id, created_at, updated_at, access_count, storage_scope, category_id, category_name, sync_source) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 0, 'cloud', ?, ?, 'cloud')`
            ).run(
              randomUUID(),
              cloud.title,
              cloud.code,
              cloud.language ?? 'plaintext',
              cloud.description ?? null,
              cloudId,
              Date.now(),
              cloudUpdatedAt,
              categoryId,
              cloud.category ?? null
            );
          }
          result.pulled++;
        } catch (e: any) {
          result.errors.push({ snippetId: cloudId, message: e.message });
        }
      }
    } catch (e: any) {
      result.errors.push({ message: e?.response?.data?.detail ?? e.message });
    }

    return result;
  }

  async sync(): Promise<SyncResult> {
    this.setStatus('syncing');
    this.notifyRenderer();

    try {
      // 先同步分类/标签元数据，确保片段同步时分类名称已存在
      const metaResult = await this.syncMetadata();
      if (metaResult.errors.length > 0) {
        console.warn('[SyncService] Metadata sync had errors:', metaResult.errors);
      }

      const pushResult = await this.pushChanges();
      const pullResult = await this.pullChanges();

      const result: SyncResult = {
        pushed: pushResult.pushed,
        pulled: pullResult.pulled,
        conflicts: [],
        errors: [...pushResult.errors, ...pullResult.errors],
      };

      this.status.lastSyncAt = Date.now();
      this.setStatus(result.errors.length > 0 ? 'error' : 'success');
      this.status.error = result.errors.length > 0 ? result.errors[0].message : null;
      this.updatePendingCount();
      const dbg = getDatabaseManager().getDb().prepare(`SELECT COUNT(*) as cnt FROM snippets WHERE is_synced = 0 AND COALESCE(skip_sync, 0) = 0 AND COALESCE(storage_scope, 'local') = 'local'`).get() as any;
      console.log(`[SyncService] After sync: pendingCount=${this.status.pendingCount}, actual DB count=${dbg.cnt}`);
      this.notifyRenderer();
      return result;
    } catch (e: any) {
      this.setStatus('error');
      this.status.error = e.message;
      this.notifyRenderer();
      throw e;
    }
  }

  getSyncStatus(): SyncStatus {
    this.quickCheckOnlineStatus().catch(() => {});
    this.updatePendingCount();
    return { ...this.status };
  }

  clearCloudOnlySnippets(): number {
    const db = getDatabaseManager().getDb();
    const result = db
      .prepare(`DELETE FROM snippets WHERE sync_source = 'cloud'`)
      .run();
    this.updatePendingCount();
    this.notifyRenderer();
    return result.changes;
  }

  private setStatus(s: SyncStatusType): void {
    this.status.status = s;
  }

  private updatePendingCount(): void {
    try {
      const db = getDatabaseManager().getDb();
      const row = db
        .prepare(`SELECT COUNT(*) as cnt FROM snippets WHERE is_synced = 0 AND COALESCE(skip_sync, 0) = 0 AND COALESCE(storage_scope, 'local') = 'local'`)
        .get() as { cnt: number };
      const queueStatus = getOfflineQueue().getQueueStatus();
      this.status.pendingCount = row.cnt + queueStatus.pending;
    } catch {
      this.status.pendingCount = 0;
    }
  }

  enableAutoSync(intervalMinutes: number): void {
    this.disableAutoSync();
    const ms = intervalMinutes * 60 * 1000;
    this.autoSyncTimer = setInterval(() => {
      if (getAuthService().isLoggedIn() && this.isOnline) {
        this.sync().catch((e) => console.error('[SyncService] Auto sync failed:', e));
      }
    }, ms);
    console.log(`[SyncService] Auto sync enabled every ${intervalMinutes} min`);
  }

  disableAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  async getStorageUsage(): Promise<any> {
    const token = getAuthService().getAccessToken();
    if (!token) {
      throw new Error('未登录，无法获取存储使用情况');
    }

    if (!this.isOnline) {
      throw new Error('网络不可用');
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await this.http.get('/storage', { headers });
      return res.data;
    } catch (e: any) {
      console.error('[SyncService] Failed to get storage usage:', e);
      throw e;
    }
  }

  private notifyRenderer(): void {
    try {
      const wins = BrowserWindow.getAllWindows();
      wins.forEach((w) => {
        w.webContents.send('sync:statusChanged', this.getSyncStatus());
      });
    } catch {
      // 窗口可能已关闭
    }
  }
}

let instance: SyncService | null = null;
export function getSyncService(): SyncService {
  if (!instance) instance = new SyncService();
  return instance;
}
