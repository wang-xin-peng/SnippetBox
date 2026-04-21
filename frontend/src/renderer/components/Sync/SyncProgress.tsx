import React, { useEffect, useState } from 'react';
import { useSync } from '../../store/syncStore';
import { ConflictResolverDialog } from './ConflictResolverDialog';
import './Sync.css';

interface Props {
  onClose: () => void;
}

export const SyncProgress: React.FC<Props> = ({ onClose }) => {
  const { status, isSyncing, conflicts, triggerSync, autoResolveAll } = useSync();
  const [showConflicts, setShowConflicts] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const h = await window.electron.sync.getConflictHistory();
      setHistory(h.slice(0, 10));
    } catch {
      // ignore
    }
  };

  return (
    <div className="sync-overlay" role="dialog" aria-modal="true" aria-label="同步进度">
      <div className="sync-dialog">
        <div className="sync-dialog-header">
          <h2 className="sync-dialog-title">云同步</h2>
          <button className="sync-dialog-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        <div className="sync-dialog-body">
          {/* 状态区 */}
          <div className={`sync-status-card sync-status-card--${status.status}`}>
            <div className="sync-status-icon">
              {isSyncing ? '🔄' : status.status === 'error' ? '⚠️' : status.status === 'success' ? '✅' : '☁️'}
            </div>
            <div className="sync-status-info">
              <div className="sync-status-label">
                {isSyncing ? '同步中...' : status.status === 'error' ? '同步失败' : status.status === 'success' ? '同步完成' : '就绪'}
              </div>
              {status.error && <div className="sync-status-error">{status.error}</div>}
              {status.lastSyncAt && (
                <div className="sync-status-time">
                  上次同步: {new Date(status.lastSyncAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* 统计 */}
          <div className="sync-stats">
            <div className="sync-stat">
              <span className="sync-stat-value">{status.pendingCount}</span>
              <span className="sync-stat-label">待同步</span>
            </div>
            <div className="sync-stat">
              <span className="sync-stat-value">{conflicts.length}</span>
              <span className="sync-stat-label">冲突</span>
            </div>
            <div className="sync-stat">
              <span className={`sync-stat-value ${status.isOnline ? 'sync-online' : 'sync-offline'}`}>
                {status.isOnline ? '在线' : '离线'}
              </span>
              <span className="sync-stat-label">网络</span>
            </div>
          </div>

          {/* 冲突提示 */}
          {conflicts.length > 0 && (
            <div className="sync-conflict-banner">
              <span>⚠️ 发现 {conflicts.length} 个冲突需要处理</span>
              <div className="sync-conflict-actions">
                <button className="sync-btn sync-btn--sm" onClick={() => setShowConflicts(true)}>
                  手动解决
                </button>
                <button className="sync-btn sync-btn--sm sync-btn--secondary" onClick={() => autoResolveAll('latest')}>
                  自动解决（取最新）
                </button>
              </div>
            </div>
          )}

          {/* 同步历史 */}
          {history.length > 0 && (
            <div className="sync-history">
              <div className="sync-history-title">冲突解决历史</div>
              {history.map((h) => (
                <div key={h.id} className="sync-history-item">
                  <span className="sync-history-type">{h.conflictType === 'update' ? '更新' : '删除'}</span>
                  <span className="sync-history-resolution">{h.resolution}</span>
                  <span className="sync-history-time">{new Date(h.resolvedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sync-dialog-footer">
          <button
            className="sync-btn sync-btn--primary"
            onClick={triggerSync}
            disabled={isSyncing || !status.isOnline}
          >
            {isSyncing ? '同步中...' : '立即同步'}
          </button>
          <button className="sync-btn" onClick={onClose}>关闭</button>
        </div>
      </div>

      {showConflicts && <ConflictResolverDialog onClose={() => setShowConflicts(false)} />}
    </div>
  );
};
