import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { SyncStatus, Conflict, ConflictResolution } from '../../shared/types/sync';

interface SyncState {
  status: SyncStatus;
  conflicts: Conflict[];
  isSyncing: boolean;
}

type Action =
  | { type: 'SET_STATUS'; payload: SyncStatus }
  | { type: 'SET_CONFLICTS'; payload: Conflict[] }
  | { type: 'SET_SYNCING'; payload: boolean };

const initialStatus: SyncStatus = {
  status: 'idle',
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
  isOnline: true,
};

const initialState: SyncState = {
  status: initialStatus,
  conflicts: [],
  isSyncing: false,
};

function reducer(state: SyncState, action: Action): SyncState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload, isSyncing: action.payload.status === 'syncing' };
    case 'SET_CONFLICTS':
      return { ...state, conflicts: action.payload };
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    default:
      return state;
  }
}

interface SyncContextValue extends SyncState {
  triggerSync: () => Promise<void>;
  resolveConflict: (conflict: Conflict, resolution: ConflictResolution) => Promise<void>;
  autoResolveAll: (strategy: 'local' | 'cloud' | 'latest') => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await window.electron.sync.getStatus();
      dispatch({ type: 'SET_STATUS', payload: s });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshStatus();

    // 监听主进程推送的状态变更
    const unsub = window.electron.sync.onStatusChanged((s) => {
      dispatch({ type: 'SET_STATUS', payload: s });
    });

    // 每分钟刷新一次状态
    const timer = setInterval(refreshStatus, 60000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [refreshStatus]);

  const triggerSync = useCallback(async () => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      const res = await window.electron.sync.sync();
      if (res.success && res.data) {
        dispatch({ type: 'SET_CONFLICTS', payload: res.data.conflicts ?? [] });
      }
    } finally {
      await refreshStatus();
    }
  }, [refreshStatus]);

  const resolveConflict = useCallback(
    async (conflict: Conflict, resolution: ConflictResolution) => {
      await window.electron.sync.resolveConflict(conflict, resolution);
      dispatch({ type: 'SET_CONFLICTS', payload: state.conflicts.filter((c) => c.snippetId !== conflict.snippetId) });
    },
    [state.conflicts]
  );

  const autoResolveAll = useCallback(
    async (strategy: 'local' | 'cloud' | 'latest') => {
      await window.electron.sync.autoResolve(state.conflicts, strategy);
      dispatch({ type: 'SET_CONFLICTS', payload: [] });
      await refreshStatus();
    },
    [state.conflicts, refreshStatus]
  );

  return (
    <SyncContext.Provider value={{ ...state, triggerSync, resolveConflict, autoResolveAll, refreshStatus }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
