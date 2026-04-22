// 同步相关类型定义

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: Conflict[];
  errors: SyncError[];
}

export interface PushResult {
  pushed: number;
  errors: SyncError[];
}

export interface PullResult {
  pulled: number;
  conflicts: Conflict[];
  errors: SyncError[];
}

export interface Conflict {
  snippetId: string;
  localVersion: any;
  cloudVersion: any;
  type: 'update' | 'delete';
}

export type ConflictResolution = 'use-local' | 'use-cloud' | 'merge' | 'skip';

export interface SyncError {
  snippetId?: string;
  message: string;
  code?: string;
}

export type SyncStatusType = 'idle' | 'syncing' | 'error' | 'offline' | 'success';

export interface SyncStatus {
  status: SyncStatusType;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
  isOnline: boolean;
}

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  snippetId: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface QueueStatus {
  pending: number;
  failed: number;
  operations: OfflineOperation[];
}

export interface ConflictHistoryEntry {
  id: string;
  snippetId: string;
  resolvedAt: number;
  resolution: ConflictResolution;
  conflictType: 'update' | 'delete';
}
