import React from 'react';
import { useSync } from '../../store/syncStore';
import './Sync.css';

interface Props {
  onClose: () => void;
}

export const SyncProgress: React.FC<Props> = ({ onClose }) => {
  const { status, isSyncing, triggerSync } = useSync();

  return (
    <div className="sync-overlay" role="dialog" aria-modal="true" aria-label="同步进度">
      <div className="sync-dialog">
        <div className="sync-dialog-header">
          <h2 className="sync-dialog-title">云同步</h2>
          <button className="sync-dialog-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        <div className="sync-dialog-body">
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

          <div className="sync-stats">
            <div className="sync-stat">
              <span className="sync-stat-value">{status.pendingCount}</span>
              <span className="sync-stat-label">待同步</span>
            </div>
            <div className="sync-stat">
              <span className={`sync-stat-value ${status.isOnline ? 'sync-online' : 'sync-offline'}`}>
                {status.isOnline ? '在线' : '离线'}
              </span>
              <span className="sync-stat-label">网络</span>
            </div>
          </div>
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
    </div>
  );
};
