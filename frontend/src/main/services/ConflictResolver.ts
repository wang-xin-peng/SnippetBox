import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { getDatabaseManager } from '../database';
import { Conflict, ConflictResolution, ConflictHistoryEntry } from '../../shared/types/sync';

export class ConflictResolver {
  private db: Database.Database;

  constructor() {
    this.db = getDatabaseManager().getDb();
    this.ensureTable();
  }

  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conflict_history (
        id TEXT PRIMARY KEY,
        snippet_id TEXT NOT NULL,
        resolved_at INTEGER NOT NULL,
        resolution TEXT NOT NULL,
        conflict_type TEXT NOT NULL
      )
    `);
  }

  private getLocallyDeletedIds(): string[] {
    try {
      const rows = this.db
        .prepare(`SELECT snippet_id FROM offline_queue WHERE type = 'delete'`)
        .all() as { snippet_id: string }[];
      return rows.map((r) => r.snippet_id);
    } catch {
      return [];
    }
  }

  detectConflicts(localSnippets: any[], cloudSnippets: any[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const cloudMap = new Map(cloudSnippets.map((s) => [s.id, s]));

    // 已解决过的片段 ID，不再重复报冲突
    const resolvedIds = new Set<string>();
    try {
      const rows = this.db
        .prepare(`SELECT DISTINCT snippet_id FROM conflict_history`)
        .all() as { snippet_id: string }[];
      rows.forEach(r => resolvedIds.add(r.snippet_id));
    } catch { /* ignore */ }

    for (const local of localSnippets) {
      const cloudId = local.cloudId ?? local.id;
      const cloud = cloudMap.get(cloudId);
      if (!cloud) continue;
      if (resolvedIds.has(local.id)) continue;

      const localUpdated = new Date(local.updatedAt).getTime();
      const cloudUpdated = new Date(cloud.updated_at ?? cloud.updatedAt).getTime();

      if (Math.abs(localUpdated - cloudUpdated) > 1000) {
        conflicts.push({
          snippetId: local.id,
          localVersion: local,
          cloudVersion: cloud,
          type: 'update',
        });
      }
    }

    // 检测删除冲突
    const deletedIds = this.getLocallyDeletedIds();
    for (const cloudId of deletedIds) {
      const cloud = cloudMap.get(cloudId);
      if (cloud) {
        conflicts.push({
          snippetId: cloudId,
          localVersion: null,
          cloudVersion: cloud,
          type: 'delete',
        });
      }
    }

    return conflicts;
  }

  async resolveConflict(conflict: Conflict, resolution: ConflictResolution): Promise<void> {
    const { SnippetManager } = await import('./SnippetManager');
    const { getDatabaseManager } = await import('../database');
    const manager = new SnippetManager(getDatabaseManager().getDb());

    switch (resolution) {
      case 'use-local':
        // 标记为未同步，下次推送时会用本地版本覆盖云端
        this.db
          .prepare(`UPDATE snippets SET is_synced = 0 WHERE id = ?`)
          .run(conflict.snippetId);
        break;
      case 'use-cloud':
        if (conflict.type === 'delete') {
          // 云端有修改，恢复本地删除
          await manager.createSnippet(conflict.cloudVersion);
        } else {
          // 用云端版本覆盖本地
          await manager.updateSnippet(conflict.snippetId, {
            title: conflict.cloudVersion.title,
            code: conflict.cloudVersion.code,
            language: conflict.cloudVersion.language,
            description: conflict.cloudVersion.description,
          });
          // 标记为已同步，避免下次再检测到冲突
          this.db
            .prepare(`UPDATE snippets SET is_synced = 1 WHERE id = ?`)
            .run(conflict.snippetId);
        }
        break;
      case 'merge':
        if (conflict.localVersion && conflict.cloudVersion) {
          await manager.updateSnippet(conflict.snippetId, {
            title: conflict.cloudVersion.title,
            code: conflict.localVersion.code,
          });
          this.db
            .prepare(`UPDATE snippets SET is_synced = 0 WHERE id = ?`)
            .run(conflict.snippetId);
        }
        break;
      case 'skip':
        break;
    }

    this.recordHistory(conflict, resolution);
  }

  async autoResolve(
    conflicts: Conflict[],
    strategy: 'local' | 'cloud' | 'latest'
  ): Promise<void> {
    for (const conflict of conflicts) {
      let resolution: ConflictResolution;

      if (strategy === 'local') {
        resolution = 'use-local';
      } else if (strategy === 'cloud') {
        resolution = 'use-cloud';
      } else {
        // latest: 比较时间戳，选择最新的
        const localTime = conflict.localVersion
          ? new Date(conflict.localVersion.updatedAt).getTime()
          : 0;
        const cloudTime = conflict.cloudVersion
          ? new Date(
              conflict.cloudVersion.updated_at ?? conflict.cloudVersion.updatedAt
            ).getTime()
          : 0;
        resolution = localTime >= cloudTime ? 'use-local' : 'use-cloud';
      }

      await this.resolveConflict(conflict, resolution);
    }
  }

  private recordHistory(conflict: Conflict, resolution: ConflictResolution): void {
    try {
      this.db
        .prepare(
          `INSERT INTO conflict_history (id, snippet_id, resolved_at, resolution, conflict_type)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(randomUUID(), conflict.snippetId, Date.now(), resolution, conflict.type);
    } catch (e) {
      console.error('[ConflictResolver] Failed to record history:', e);
    }
  }

  getHistory(): ConflictHistoryEntry[] {
    const rows = this.db
      .prepare(`SELECT * FROM conflict_history ORDER BY resolved_at DESC LIMIT 100`)
      .all() as any[];
    return rows.map((r) => ({
      id: r.id,
      snippetId: r.snippet_id,
      resolvedAt: r.resolved_at,
      resolution: r.resolution,
      conflictType: r.conflict_type,
    }));
  }
}

let instance: ConflictResolver | null = null;
export function getConflictResolver(): ConflictResolver {
  if (!instance) instance = new ConflictResolver();
  return instance;
}
