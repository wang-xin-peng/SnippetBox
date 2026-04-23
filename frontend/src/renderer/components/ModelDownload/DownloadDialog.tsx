import React, { useState, useEffect } from 'react';
import { DownloadProgress as DownloadProgressType } from '../../../shared/types/model';
import { DownloadProgress } from './DownloadProgress';
import { DownloadControls } from './DownloadControls';
import { MirrorSelector } from './MirrorSelector';
import './DownloadDialog.css';

interface DownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const DownloadDialog: React.FC<DownloadDialogProps> = ({ 
  isOpen, 
  onClose,
  onComplete 
}) => {
  const [progress, setProgress] = useState<DownloadProgressType>({
    downloaded: 0,
    total: 0,
    percentage: 0,
    speed: 0,
    remainingTime: 0,
    status: 'idle'
  });
  const [selectedMirror, setSelectedMirror] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const resetPageInteraction = () => {
    document.body.style.overflow = 'unset';
    document.body.style.pointerEvents = 'auto';
  };

  // 调试日志
  useEffect(() => {
    console.log('[DownloadDialog] isOpen changed:', isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'auto';
      
      loadProgress();
      
      // 监听进度更新
      const removeListener = window.electron.model.onProgress((newProgress) => {
        setProgress(newProgress);
        
        // 下载完成时通知
        if (newProgress.status === 'completed' && onComplete) {
          resetPageInteraction();
          onComplete();
        }
      });

      return () => {
        removeListener();
        resetPageInteraction();
      };
    } else {
      resetPageInteraction();
    }
  }, [isOpen, onComplete]);

  const loadProgress = async () => {
    try {
      const currentProgress = await window.electron.model.getProgress();
      setProgress(currentProgress);
    } catch (error) {
      console.error('加载进度失败:', error);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const result = await window.electron.model.startDownload(selectedMirror);
      if (!result.success) {
        alert(`下载失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`下载失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      const result = await window.electron.model.pauseDownload();
      if (!result.success) {
        console.error('暂停失败:', result.error);
      }
    } catch (error: any) {
      console.error('暂停失败:', error.message);
    }
  };

  const handleResume = async () => {
    try {
      const result = await window.electron.model.resumeDownload();
      if (!result.success) {
        console.error('恢复失败:', result.error);
      }
    } catch (error: any) {
      console.error('恢复失败:', error.message);
    }
  };

  const handleCancel = async () => {
    try {
      const result = await window.electron.model.cancelDownload();
      if (!result.success) {
        console.error('取消失败:', result.error);
      } else {
        await loadProgress();
      }
    } catch (error: any) {
      console.error('取消失败:', error.message);
    }
  };

  const handleClose = () => {
    resetPageInteraction();
    console.log('[DownloadDialog] Closing dialog, body overflow reset');
    onClose();
  };

  if (!isOpen) {
    console.log('[DownloadDialog] Not rendering (isOpen=false)');
    return null;
  }

  console.log('[DownloadDialog] Rendering dialog, progress status:', progress.status);

  return (
    <div 
      className="download-dialog-overlay" 
      onClick={(e) => {
        console.log('[DownloadDialog] Overlay clicked');
        // 点击背景关闭（仅在非下载状态）
        if (e.target === e.currentTarget && progress.status !== 'downloading') {
          handleClose();
        }
      }}
    >
      <div className="download-dialog" onClick={(e) => {
        console.log('[DownloadDialog] Dialog clicked');
        e.stopPropagation();
      }}>
        <div className="dialog-header">
          <h2 className="dialog-title">模型下载</h2>
          <button 
            className="close-btn"
            onClick={handleClose}
            disabled={isLoading || progress.status === 'downloading'}
          >
            ×
          </button>
        </div>

        <div className="dialog-content">
          <MirrorSelector 
            onSelect={setSelectedMirror}
            disabled={progress.status === 'downloading' || isLoading}
          />

          <DownloadProgress progress={progress} />

          <DownloadControls
            progress={progress}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
            disabled={false}
          />
        </div>
      </div>
    </div>
  );
};
