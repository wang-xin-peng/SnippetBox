import React from 'react';
import './SyncDialog.css';

interface SyncDialogProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SyncDialog: React.FC<SyncDialogProps> = ({ count, onConfirm, onCancel }) => {
  return (
    <div className="sync-dialog-overlay">
      <div className="sync-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="sync-dialog-header">
          <h3>snippetbox</h3>
        </div>
        <div className="sync-dialog-body">
          <p>检测到 {count} 个本地片段。</p>
          <p>是否将这些片段合并到您的云端账户？</p>
          <ul>
            <li>点击"确定"：本地片段将上传到云端，登录后可查看</li>
            <li>点击"取消"：本地片段保留在本地，登录状态下不会显示</li>
          </ul>
          <p className="sync-dialog-note">退出登录后，本地片段仍可正常查看。</p>
        </div>
        <div className="sync-dialog-actions">
          <button className="sync-dialog-btn sync-dialog-btn-cancel" onClick={onCancel}>
            取消
          </button>
          <button className="sync-dialog-btn sync-dialog-btn-confirm" onClick={onConfirm}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
