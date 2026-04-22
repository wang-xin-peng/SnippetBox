import axios, { AxiosInstance } from 'axios';
import { BrowserWindow } from 'electron';
import { getDatabaseManager } from '../database';
import { getAuthService } from './AuthService';
import { getOfflineQueue } from './OfflineQueue';
import { getConflictResolver } from './ConflictResolver';
import {
  SyncResult,
  PushResult,
  PullResult,
  SyncStatus,
  SyncStatusType,
  SyncError,
  Conflict,
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

  // ── 网络状态监测 ──────────────────────────────────────
  private setupNetworkMonitor(): void {
    // 每 30 秒检测一次网络
    setInterval(() => this.checkOnlineStatus(), 30000);
    this.checkOnlineStatus();
  }

  private async checkOnlineStatus(): Promise<boolean> {
    try {
      await axios.get(`http://8.141.108.146:8000/health`, { timeout: 5000 });
      const wasOffline = !this.isOnline;
      this.isOnline = true;
      this.status.isOnline = true;

      // 网络恢复时自动处理离线队列
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

  private async processOfflineQueue(): Promise<void> {
    const queue = getOfflineQueue();
    const ops = queue.getPendingOperations();
    if (ops.length === 0) return;

    const token = getAuthService().getAccessToken();
    if (!token) return;

    for (const op of ops) {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        if (op.type === 'create') {
          await this.http.post('/snippets', op.data, { headers });
        } else if (op.type === 'update') {
          await this.http.put(`/snippets/${op.snippetId}`, op.data, { headers });
        } else if (op.type === 'delete') {
          await this.http.delete(`/snippets/${op.snippetId}`, { headers });
        }
        await queue.markProcessed(op.id);
      } catch (e) {
        console.error('[SyncService] Failed to process offline op:', op.id, e);
      }
    }

    this.updatePendingCount();
    this.notifyRenderer();
  }

  // ── 推送本地变更 ──────────────────────────────────────
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
      // 获取未同步的片段
      const unsynced = db
        .prepare(`SELECT * FROM snippets WHERE is_synced = 0`)
        .all() as any[];

      const headers = { Authorization: `Bearer ${token}` };

      for (const row of unsynced) {
        try {
          const payload = {
            title: row.title,
            code: row.code,
            language: row.language,
            description: row.description,
            category: row.category_id,
          };

          let cloudId = row.cloud_id;
          if (cloudId) {
            await this.http.put(`/snippets/${cloudId}`, payload, { headers });
          } else {
            const res = await this.http.post('/snippets', payload, { headers });
            cloudId = res.data?.id ?? res.data?.snippet_id;
          }

          // 标记为已同步
          db.prepare(
            `UPDATE snippets SET is_synced = 1, cloud_id = ? WHERE id = ?`
          ).run(cloudId ?? null, row.id);

          result.pushed++;
        } catch (e: any) {
          const errMsg = e?.response?.data?.detail ?? e.message;
          result.errors.push({ snippetId: row.id, message: errMsg });

          // 加入离线队列
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

  // ── 拉取云端变更 ──────────────────────────────────────
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
      const localSnippets = db.prepare(`SELECT * FROM snippets`).all() as any[];

      // 检测冲突
      const resolver = getConflictResolver();
      const conflicts = resolver.detectConflicts(
        localSnippets.map((s) => ({
          ...s,
          cloudId: s.cloud_id,
          updatedAt: new Date(s.updated_at),
        })),
        cloudSnippets
      );
      result.conflicts = conflicts;

      const conflictIds = new Set(conflicts.map((c) => c.snippetId));

      for (const cloud of cloudSnippets) {
        const cloudId = cloud.id ?? cloud.snippet_id;
        if (conflictIds.has(cloudId)) continue;

        try {
          const existing = db
            .prepare(`SELECT id FROM snippets WHERE cloud_id = ?`)
            .get(cloudId) as { id: string } | undefined;

          if (existing) {
            db.prepare(
              `UPDATE snippets SET title=?, code=?, language=?, description=?, is_synced=1, updated_at=? WHERE cloud_id=?`
            ).run(
              cloud.title,
              cloud.code,
              cloud.language,
              cloud.description ?? null,
              Date.now(),
              cloudId
            );
          } else {
            const { randomUUID } = await import('crypto');
            db.prepare(
              `INSERT OR IGNORE INTO snippets (id, title, code, language, description, is_synced, cloud_id, created_at, updated_at, access_count)
               VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 0)`
            ).run(
              randomUUID(),
              cloud.title,
              cloud.code,
              cloud.language ?? 'plaintext',
              cloud.description ?? null,
              cloudId,
              Date.now(),
              Date.now()
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

  // ── 完整同步 ──────────────────────────────────────────
  async sync(): Promise<SyncResult> {
    this.setStatus('syncing');
    this.notifyRenderer();

    try {
      const pushResult = await this.pushChanges();
      const pullResult = await this.pullChanges();

      const result: SyncResult = {
        pushed: pushResult.pushed,
        pulled: pullResult.pulled,
        conflicts: pullResult.conflicts,
        errors: [...pushResult.errors, ...pullResult.errors],
      };

      this.status.lastSyncAt = Date.now();
      this.setStatus(result.errors.length > 0 ? 'error' : 'success');
      this.status.error =
        result.errors.length > 0 ? result.errors[0].message : null;

      this.notifyRenderer();
      return result;
    } catch (e: any) {
      this.setStatus('error');
      this.status.error = e.message;
      this.notifyRenderer();
      throw e;
    }
  }

  // ── 同步状态 ──────────────────────────────────────────
  getSyncStatus(): SyncStatus {
    this.updatePendingCount();
    return { ...this.status };
  }

  private setStatus(s: SyncStatusType): void {
    this.status.status = s;
  }

  private updatePendingCount(): void {
    try {
      const db = getDatabaseManager().getDb();
      const row = db
        .prepare(`SELECT COUNT(*) as cnt FROM snippets WHERE is_synced = 0`)
        .get() as { cnt: number };
      const queueStatus = getOfflineQueue().getQueueStatus();
      this.status.pendingCount = row.cnt + queueStatus.pending;
    } catch {
      this.status.pendingCount = 0;
    }
  }

  // ── 自动同步 ──────────────────────────────────────────
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

  // ── 通知渲染进程 ──────────────────────────────────────
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
