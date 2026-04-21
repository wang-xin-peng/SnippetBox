import React, { useState } from 'react';
import { useSync } from '../../store/syncStore';
import { useAuth } from '../../store/authStore';
import { SyncProgress } from './SyncProgress';
import './Sync.css';

export const SyncIndicator: React.FC = () => {
  const { status, isSyncing, triggerSync } = useSync();
  const { isLoggedIn } = useAuth();
  const [showProgress, setShowProgress] = useState(false);

  if (!isLoggedIn) return null;

  const getIcon = () => {
    if (!status.isOnline) return '📴';
    if (isSyncing) return '🔄';
    if (status.status === 'error') return '⚠️';
    if (status.status === 'success') return '✅';
    if (status.pendingCount > 0) return '⏳';
    return '☁️';
  };

  const getTitle = () => {
    if (!status.isOnline) return '离线模式';
    if (isSyncing) return '同步中...';
    if (status.status === 'error') return `同步错误: ${status.error}`;
    if (status.pendingCount > 0) return `${status.pendingCount} 项待同步`;
    if (status.lastSyncAt) return `上次同步: ${new Date(status.lastSyncAt).toLocaleTimeString()}`;
    return '点击同步';
  };

  const handleClick = () => {
    if (isSyncing) {
      setShowProgress(true);
    } else {
      setShowProgress(true);
      triggerSync();
    }
  };

  return (
    <>
      <button
        className={`sync-indicator sync-indicator--${status.status}`}
        onClick={handleClick}
        title={getTitle()}
        aria-label={getTitle()}
        disabled={isSyncing}
      >
        <span className={`sync-icon ${isSyncing ? 'sync-icon--spinning' : ''}`}>
          {getIcon()}
        </span>
        {status.pendingCount > 0 && (
          <span className="sync-badge">{status.pendingCount}</span>
        )}
      </button>

      {showProgress && <SyncProgress onClose={() => setShowProgress(false)} />}
    </>
  );
};
