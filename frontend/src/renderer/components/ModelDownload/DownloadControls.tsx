import React from 'react';
import { DownloadProgress } from '../../../shared/types/model';
import './DownloadControls.css';

interface DownloadControlsProps {
  progress: DownloadProgress;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const DownloadControls: React.FC<DownloadControlsProps> = ({
  progress,
  onStart,
  onPause,
  onResume,
  onCancel,
  disabled = false
}) => {
  const renderButtons = () => {
    switch (progress.status) {
      case 'idle':
      case 'cancelled':
        return (
          <button 
            className="control-btn primary"
            onClick={onStart}
            disabled={disabled}
          >
            开始下载
          </button>
        );

      case 'error':
        return (
          <>
            <button 
              className="control-btn primary"
              onClick={onStart}
              disabled={disabled}
            >
              重试
            </button>
            <button 
              className="control-btn danger"
              onClick={onCancel}
              disabled={disabled}
            >
              取消
            </button>
          </>
        );

      case 'downloading':
        return (
          <>
            <button 
              className="control-btn secondary"
              onClick={onPause}
              disabled={disabled}
            >
              暂停
            </button>
            <button 
              className="control-btn danger"
              onClick={onCancel}
              disabled={disabled}
            >
              取消
            </button>
          </>
        );

      case 'paused':
        return (
          <>
            <button 
              className="control-btn primary"
              onClick={onResume}
              disabled={disabled}
            >
              继续
            </button>
            <button 
              className="control-btn danger"
              onClick={onCancel}
              disabled={disabled}
            >
              取消
            </button>
          </>
        );

      case 'completed':
        return (
          <div className="completed-message">
            ✓ 下载完成
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="download-controls">
      {renderButtons()}
    </div>
  );
};
