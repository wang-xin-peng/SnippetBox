import React, { useState, useEffect, useCallback } from 'react';
import { ShareListItem } from '../../../shared/types/share';
import './Share.css';

interface ShareManagerProps {
  onClose: () => void;
}

export const ShareManager: React.FC<ShareManagerProps> = ({ onClose }) => {
  const [shares, setShares] = useState<ShareListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electron.ipcRenderer.invoke('share:list');
      if (res.success) {
        setShares(res.data);
      } else {
        setError(res.error ?? '加载失败');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  const handleCopy = async (share: ShareListItem) => {
    try {
      await navigator.clipboard.writeText(share.shortUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = share.shortUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(share.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (shareId: string, shortCode: string) => {
    if (!window.confirm('确定要删除这个分享链接吗？删除后链接将立即失效。')) return;
    setDeletingId(shareId);
    try {
      const res = await window.electron.ipcRenderer.invoke('share:delete', shortCode);
      if (res.success) {
        setShares((prev) => prev.filter((s) => s.id !== shareId));
      } else {
        alert(res.error ?? '删除失败');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const isExpired = (share: ShareListItem) =>
    share.expiresAt !== null && share.expiresAt < Date.now();

  const formatExpiry = (share: ShareListItem) => {
    if (!share.expiresAt) return '永久有效';
    if (isExpired(share)) return '已过期';
    return `${new Date(share.expiresAt).toLocaleDateString()} 过期`;
  };

  return (
    <div className="share-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-dialog share-dialog--wide" role="dialog" aria-modal="true" aria-label="分享管理">
        <div className="share-dialog-header">
          <h2 className="share-dialog-title">📋 我的分享</h2>
          <button className="share-dialog-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        <div className="share-dialog-body">
          {loading && (
            <div className="share-progress">
              <div className="share-spinner" />
              加载中...
            </div>
          )}

          {error && <div className="share-error">⚠️ {error}</div>}

          {!loading && !error && shares.length === 0 && (
            <div className="share-empty">暂无分享记录，去分享一个代码片段吧</div>
          )}

          {!loading && shares.length > 0 && (
            <div className="share-list">
              {shares.map((share) => (
                <div key={share.id} className="share-item">
                  <div className="share-item-header">
                    <span className="share-item-title">{share.snippetTitle}</span>
                    <div className="share-item-actions">
                      <button
                        className={`share-copy-btn${copiedId === share.id ? ' share-copy-btn--copied' : ''}`}
                        onClick={() => handleCopy(share)}
                        title="复制链接"
                      >
                        {copiedId === share.id ? '✓ 已复制' : '复制链接'}
                      </button>
                      <button
                        className="share-btn share-btn--sm share-btn--danger"
                        onClick={() => handleDelete(share.id, share.shortCode)}
                        disabled={deletingId === share.id}
                        title="删除分享"
                      >
                        {deletingId === share.id ? '...' : '删除'}
                      </button>
                    </div>
                  </div>

                  <div className="share-item-url">{share.shortUrl}</div>

                  <div className="share-item-meta">
                    <span className={`share-badge ${isExpired(share) ? 'share-badge--expired' : 'share-badge--active'}`}>
                      {formatExpiry(share)}
                    </span>
                    <span className="share-badge share-badge--lang">{share.snippetLanguage}</span>
                    <span>👁 {share.viewCount} 次访问</span>
                    <span>创建于 {new Date(share.createdAt).toLocaleDateString()}</span>
                    {share.hasPassword && <span>🔒 密码保护</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="share-dialog-footer">
          <button className="share-btn" onClick={loadShares} disabled={loading}>
            刷新
          </button>
          <button className="share-btn share-btn--primary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
};
