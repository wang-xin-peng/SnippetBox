import React, { useState, useEffect } from 'react';
import { useSync } from '../../store/syncStore';
import { useAuth } from '../../store/authStore';
import './Sync.css';

interface Props {
  onClose: () => void;
}

export const SyncSettings: React.FC<Props> = ({ onClose }) => {
  const { status, refreshStatus } = useSync();
  const { isLoggedIn } = useAuth();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [storageUsage, setStorageUsage] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshStatus();
    loadQueueStatus();
    if (isLoggedIn) {
      loadStorageUsage();
    }
  }, [isLoggedIn]);

  // 每次组件挂载时更新存储使用情况
  useEffect(() => {
    if (isLoggedIn) {
      loadStorageUsage();
    }
  }, []);

  const loadQueueStatus = async () => {
    try {
      const q = await window.electron.sync.getQueueStatus();
      setQueueStatus(q);
    } catch {
      // ignore
    }
  };

  const loadStorageUsage = async () => {
    try {
      const result = await window.electron.sync.getStorageUsage();
      if (result.success) {
        setStorageUsage(result.data);
      } else {
        console.error('Failed to load storage usage:', result.error);
      }
    } catch (error) {
      console.error('Failed to load storage usage:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (autoSyncEnabled) {
        await window.electron.sync.enableAutoSync(intervalMinutes);
      } else {
        await window.electron.sync.disableAutoSync();
      }
      await refreshStatus();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClearFailed = async () => {
    await window.electron.sync.clearFailedQueue();
    await loadQueueStatus();
  };

  return (
    <div className="sync-overlay" role="dialog" aria-modal="true" aria-label="同步设置">
      <div className="sync-dialog">
        <div className="sync-dialog-header">
          <h2 className="sync-dialog-title">同步设置</h2>
          <button className="sync-dialog-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        <div className="sync-dialog-body">
          {!isLoggedIn && (
            <div className="sync-warning">⚠️ 请先登录以使用云同步功能</div>
          )}

          {/* 自动同步 */}
          <div className="sync-setting-group">
            <label className="sync-setting-label">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                disabled={!isLoggedIn}
              />
              启用自动同步
            </label>

            {autoSyncEnabled && (
              <div className="sync-setting-row">
                <label htmlFor="sync-interval">同步间隔（分钟）</label>
                <select
                  id="sync-interval"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                >
                  <option value={5}>5 分钟</option>
                  <option value={15}>15 分钟</option>
                  <option value={30}>30 分钟</option>
                  <option value={60}>1 小时</option>
                </select>
              </div>
            )}
          </div>

          {/* 离线队列状态 */}
          {queueStatus && (
            <div className="sync-setting-group">
              <div className="sync-setting-title">离线队列</div>
              <div className="sync-queue-stats">
                <span>待处理: {queueStatus.pending}</span>
                <span>失败: {queueStatus.failed}</span>
              </div>
              {queueStatus.failed > 0 && (
                <button className="sync-btn sync-btn--sm sync-btn--danger" onClick={handleClearFailed}>
                  清除失败项
                </button>
              )}
            </div>
          )}

          {/* 存储使用情况 */}
          {isLoggedIn && storageUsage && (
            <div className="sync-setting-group">
              <div className="sync-setting-title">存储使用情况</div>
              <div className="sync-storage-info">
                <div className="sync-storage-bar-container">
                  <div 
                    className="sync-storage-bar" 
                    style={{
                      width: `${Math.min(storageUsage.usage_percentage, 100)}%`,
                      backgroundColor: storageUsage.usage_percentage > 90 ? '#ff4d4f' : storageUsage.usage_percentage > 70 ? '#faad14' : '#52c41a'
                    }}
                  ></div>
                </div>
                <div className="sync-storage-text">
                  <span>{storageUsage.current_usage_mb < 0.01 ? '< 0.01' : storageUsage.current_usage_mb.toFixed(2)} MB / {storageUsage.total_limit_mb.toFixed(0)} MB</span>
                  <span>{storageUsage.usage_percentage.toFixed(1)}%</span>
                </div>
                {storageUsage.usage_percentage > 90 && (
                  <div className="sync-storage-warning">⚠️ 存储容量即将用完，请清理不需要的片段</div>
                )}
              </div>
            </div>
          )}

          {/* 当前状态 */}
          <div className="sync-setting-group">
            <div className="sync-setting-title">当前状态</div>
            <div className="sync-status-row">
              <span>网络: {status.isOnline ? '在线' : '离线'}</span>
              <span>待同步: {status.pendingCount} 项</span>
              {status.lastSyncAt && (
                <span>上次同步: {new Date(status.lastSyncAt).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        <div className="sync-dialog-footer">
          <button className="sync-btn sync-btn--primary" onClick={handleSave} disabled={saving || !isLoggedIn}>
            {saving ? '保存中...' : '保存'}
          </button>
          <button className="sync-btn" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
};
