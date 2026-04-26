import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Snippet } from '../../../shared/types';
import { useAuth } from '../../store/authStore';
import { ShareDialog } from './ShareDialog';
import './Share.css';

interface ShareButtonProps {
  snippet: Snippet;
  // 仅显示图标，不显示文字（用于列表卡片）
  iconOnly?: boolean;
}

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ snippet, iconOnly = false }) => {
  const { isLoggedIn } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      showToast('请先登录才能分享代码片段', 'info');
      return;
    }
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
  };

  return (
    <>
      <button
        className={`share-trigger-btn${iconOnly ? ' share-trigger-btn--icon-only' : ''}`}
        onClick={handleClick}
        title="分享代码片段"
        aria-label="分享代码片段"
      >
        <span>🔗</span>
        {!iconOnly && <span>分享</span>}
      </button>

      {showDialog && createPortal(
        <ShareDialog snippet={snippet} onClose={handleClose} />,
        document.body
      )}

      {toast && createPortal(
        <div className={`share-toast share-toast--${toast.type}`} role="alert">
          {toast.message}
        </div>,
        document.body
      )}
    </>
  );
};
