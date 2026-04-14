import React from 'react';
import { DownloadProgress as DownloadProgressType } from '../../../shared/types/model';
import './DownloadProgress.css';

interface DownloadProgressProps {
  progress: DownloadProgressType;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({ progress }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0 || !isFinite(seconds)) return '--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    switch (progress.status) {
      case 'idle': return '准备中';
      case 'downloading': return '下载中';
      case 'paused': return '已暂停';
      case 'completed': return '已完成';
      case 'error': return '下载失败';
      case 'cancelled': return '已取消';
      default: return '';
    }
  };

  return (
    <div className="download-progress">
      <div className="progress-header">
        <span className="progress-status">{getStatusText()}</span>
        <span className="progress-percentage">{progress.percentage}%</span>
      </div>

      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="progress-details">
        <div className="progress-detail-item">
          <span className="detail-label">已下载:</span>
          <span className="detail-value">
            {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
          </span>
        </div>

        {progress.status === 'downloading' && (
          <>
            <div className="progress-detail-item">
              <span className="detail-label">速度:</span>
              <span className="detail-value">{formatBytes(progress.speed)}/s</span>
            </div>

            <div className="progress-detail-item">
              <span className="detail-label">剩余时间:</span>
              <span className="detail-value">{formatTime(progress.remainingTime)}</span>
            </div>
          </>
        )}

        {progress.status === 'error' && progress.error && (
          <div className="progress-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{progress.error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
