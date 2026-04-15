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

  useEffect(() => {
    if (isOpen) {
      loadProgress();
      
      // 监听进度更新
      const removeListener = window.electron.model.onProgress((newProgress) => {
        setProgress(newProgress);
        
        // 下载完成时通知
        if (newProgress.status === 'completed' && onComplete) {
          onComplete();
        }
      });

      return () => {
        removeListener();
      };
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
    setIsLoading(true);
    try {
      const result = await window.electron.model.pauseDownload();
      if (!result.success) {
        alert(`暂停失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`暂停失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const result = await window.electron.model.resumeDownload();
      if (!result.success) {
        alert(`恢复失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`恢复失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    // 如果是错误状态，直接取消不需要确认
    if (progress.status !== 'error' && progress.status !== 'cancelled') {
      if (!confirm('确定要取消下载吗？已下载的内容将被删除。')) {
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await window.electron.model.cancelDownload();
      if (!result.success) {
        alert(`取消失败: ${result.error}`);
      } else {
        // 取消成功后重新加载进度
        await loadProgress();
      }
    } catch (error: any) {
      alert(`取消失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (progress.status === 'downloading') {
      if (!confirm('下载正在进行中，确定要关闭吗？下载将在后台继续。')) {
        return;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="download-dialog-overlay">
      <div className="download-dialog">
        <div className="dialog-header">
          <h2 className="dialog-title">模型下载</h2>
          <button 
            className="close-btn"
            onClick={handleClose}
            disabled={isLoading}
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
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
};
