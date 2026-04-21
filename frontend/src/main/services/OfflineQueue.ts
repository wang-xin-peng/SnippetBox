import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { getDatabaseManager } from '../database';
import { OfflineOperation, QueueStatus } from '../../shared/types/sync';

const MAX_RETRY = 3;

export class OfflineQueue {
  private db: Database.Database;

  constructor() {
    this.db = getDatabaseManager().getDb();
    this.ensureTable();
  }

  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        snippet_id TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0
      )
    `);
  }

  async enqueue(operation: Omit<OfflineOperation, 'id' | 'retryCount'>): Promise<void> {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT OR REPLACE INTO offline_queue (id, type, snippet_id, data, timestamp, retry_count)
         VALUES (?, ?, ?, ?, ?, 0)`
      )
      .run(id, operation.type, operation.snippetId, JSON.stringify(operation.data), operation.timestamp);
  }

  async processQueue(): Promise<void> {
    const rows = this.db
      .prepare(`SELECT * FROM offline_queue WHERE retry_count < ? ORDER BY timestamp ASC`)
      .all(MAX_RETRY) as any[];

    for (const row of rows) {
      try {
        const op: OfflineOperation = {
          id: row.id,
          type: row.type,
          snippetId: row.snippet_id,
          data: JSON.parse(row.data),
          timestamp: row.timestamp,
          retryCount: row.retry_count,
        };
        // 实际同步由 SyncService 调用，这里标记为已处理
        await this.markProcessed(op.id);
      } catch {
        this.db
          .prepare(`UPDATE offline_queue SET retry_count = retry_count + 1 WHERE id = ?`)
          .run(row.id);
      }
    }
  }

  async markProcessed(id: string): Promise<void> {
    this.db.prepare(`DELETE FROM offline_queue WHERE id = ?`).run(id);
  }

  getPendingOperations(): OfflineOperation[] {
    const rows = this.db
      .prepare(`SELECT * FROM offline_queue WHERE retry_count < ? ORDER BY timestamp ASC`)
      .all(MAX_RETRY) as any[];
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      snippetId: r.snippet_id,
      data: JSON.parse(r.data),
      timestamp: r.timestamp,
      retryCount: r.retry_count,
    }));
  }

  getQueueStatus(): QueueStatus {
    const all = this.db.prepare(`SELECT * FROM offline_queue ORDER BY timestamp ASC`).all() as any[];
    const ops: OfflineOperation[] = all.map((r) => ({
      id: r.id,
      type: r.type,
      snippetId: r.snippet_id,
      data: JSON.parse(r.data),
      timestamp: r.timestamp,
      retryCount: r.retry_count,
    }));
    return {
      pending: ops.filter((o) => o.retryCount < MAX_RETRY).length,
      failed: ops.filter((o) => o.retryCount >= MAX_RETRY).length,
      operations: ops,
    };
  }

  clearFailed(): void {
    this.db.prepare(`DELETE FROM offline_queue WHERE retry_count >= ?`).run(MAX_RETRY);
  }
}

let instance: OfflineQueue | null = null;
export function getOfflineQueue(): OfflineQueue {
  if (!instance) instance = new OfflineQueue();
  return instance;
}
