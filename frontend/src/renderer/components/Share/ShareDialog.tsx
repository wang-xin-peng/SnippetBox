import React, { useState } from 'react';
import { Snippet } from '../../../shared/types';
import { ShareExpiry, ShareInfo } from '../../../shared/types/share';
import './Share.css';

interface ShareDialogProps {
  snippet: Snippet;
  onClose: () => void;
}

const EXPIRY_OPTIONS: { value: ShareExpiry; label: string }[] = [
  { value: '1d', label: '1 天' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: 'never', label: '永久' },
];

export const ShareDialog: React.FC<ShareDialogProps> = ({ snippet, onClose }) => {
  const [expiry, setExpiry] = useState<ShareExpiry>('7d');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electron.ipcRenderer.invoke('share:create', {
        snippetId: snippet.id,
        expiry,
        password: usePassword && password ? password : undefined,
      });
      if (res.success) {
        setShareInfo(res.data);
      } else {
        setError(res.error ?? '生成失败，请重试');
      }
    } catch (e: any) {
      setError(e.message ?? '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareInfo) return;
    try {
      await navigator.clipboard.writeText(shareInfo.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = shareInfo.shortUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="share-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-dialog" role="dialog" aria-modal="true" aria-label="分享代码片段">
        <div className="share-dialog-header">
          <h2 className="share-dialog-title">🔗 分享代码片段</h2>
          <button className="share-dialog-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        <div className="share-dialog-body">
          <div className="share-field">
            <span className="share-label">片段名称</span>
            <div style={{ fontSize: 13, color: '#374151', padding: '6px 0' }}>{snippet.title}</div>
          </div>

          {/* 有效期 */}
          <div className="share-field">
            <label className="share-label" htmlFor="share-expiry">有效期</label>
            <select
              id="share-expiry"
              className="share-select"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value as ShareExpiry)}
              disabled={!!shareInfo}
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* 密码保护 */}
          <div className="share-field">
            <label className="share-checkbox-label">
              <input
                type="checkbox"
                checked={usePassword}
                onChange={(e) => setUsePassword(e.target.checked)}
                disabled={!!shareInfo}
              />
              启用密码保护（可选）
            </label>
            {usePassword && (
              <input
                className="share-input"
                type="password"
                placeholder="设置访问密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!shareInfo}
                autoComplete="new-password"
              />
            )}
          </div>

          {/* 生成进度 */}
          {loading && (
            <div className="share-progress">
              <div className="share-spinner" />
              正在生成短链接...
            </div>
          )}

          {/* 错误提示 */}
          {error && <div className="share-error">⚠️ {error}</div>}

          {/* 生成的链接 */}
          {shareInfo && (
            <>
              <div className="share-success">✅ 短链接已生成，复制后即可分享</div>
              <div className="share-url-box">
                <span className="share-url-text">{shareInfo.shortUrl}</span>
                <button
                  className={`share-copy-btn${copied ? ' share-copy-btn--copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '✓ 已复制' : '复制'}
                </button>
              </div>
              {shareInfo.expiresAt && (
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  过期时间：{new Date(shareInfo.expiresAt).toLocaleString()}
                </div>
              )}
            </>
          )}
        </div>

        <div className="share-dialog-footer">
          <button className="share-btn" onClick={onClose}>关闭</button>
          {!shareInfo && (
            <button
              className="share-btn share-btn--primary"
              onClick={handleGenerate}
              disabled={loading || (usePassword && !password)}
            >
              {loading ? '生成中...' : '生成短链接'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
