import React, { useState } from 'react';
import { useSync } from '../../store/syncStore';
import { Conflict, ConflictResolution } from '../../../shared/types/sync';
import './Sync.css';

interface Props {
  onClose: () => void;
}

export const ConflictResolverDialog: React.FC<Props> = ({ onClose }) => {
  const { conflicts, resolveConflict, autoResolveAll } = useSync();
  const [current, setCurrent] = useState(0);
  const [resolving, setResolving] = useState(false);

  const conflict = conflicts[current];

  const handleResolve = async (resolution: ConflictResolution) => {
    if (!conflict) return;
    setResolving(true);
    try {
      await resolveConflict(conflict, resolution);
      if (current >= conflicts.length - 1) {
        onClose();
      }
      // conflicts 数组更新后 current 自动指向下一个
    } finally {
      setResolving(false);
    }
  };

  const handleAutoResolve = async (strategy: 'local' | 'cloud' | 'latest') => {
    setResolving(true);
    try {
      await autoResolveAll(strategy);
      onClose();
    } finally {
      setResolving(false);
    }
  };

  if (!conflict) {
    return (
      <div className="sync-overlay" role="dialog" aria-modal="true">
        <div className="sync-dialog sync-dialog--sm">
          <div className="sync-dialog-header">
            <h2 className="sync-dialog-title">冲突解决</h2>
            <button className="sync-dialog-close" onClick={onClose} aria-label="关闭">✕</button>
          </div>
          <div className="sync-dialog-body sync-empty">✅ 没有待解决的冲突</div>
          <div className="sync-dialog-footer">
            <button className="sync-btn sync-btn--primary" onClick={onClose}>关闭</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sync-overlay" role="dialog" aria-modal="true" aria-label="冲突解决">
      <div className="sync-dialog sync-dialog--wide">
        <div className="sync-dialog-header">
          <h2 className="sync-dialog-title">
            冲突解决 ({current + 1} / {conflicts.length})
          </h2>
          <button className="sync-dialog-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        <div className="sync-dialog-body">
          <div className="conflict-type-badge">
            {conflict.type === 'update' ? '⚡ 更新冲突' : '🗑️ 删除冲突'}
          </div>

          <div className="conflict-versions">
            {/* 本地版本 */}
            <div className="conflict-version">
              <div className="conflict-version-header conflict-version-header--local">
                本地版本
                {conflict.localVersion && (
                  <span className="conflict-version-time">
                    {new Date(conflict.localVersion.updatedAt).toLocaleString()}
                  </span>
                )}
              </div>
              {conflict.localVersion ? (
                <div className="conflict-version-body">
                  <div className="conflict-field">
                    <span className="conflict-field-label">标题</span>
                    <span>{conflict.localVersion.title}</span>
                  </div>
                  <div className="conflict-field">
                    <span className="conflict-field-label">语言</span>
                    <span>{conflict.localVersion.language}</span>
                  </div>
                  <pre className="conflict-code">{conflict.localVersion.code?.slice(0, 300)}</pre>
                </div>
              ) : (
                <div className="conflict-deleted">（本地已删除）</div>
              )}
            </div>

            {/* 云端版本 */}
            <div className="conflict-version">
              <div className="conflict-version-header conflict-version-header--cloud">
                云端版本
                {conflict.cloudVersion && (
                  <span className="conflict-version-time">
                    {new Date(conflict.cloudVersion.updated_at ?? conflict.cloudVersion.updatedAt).toLocaleString()}
                  </span>
                )}
              </div>
              {conflict.cloudVersion ? (
                <div className="conflict-version-body">
                  <div className="conflict-field">
                    <span className="conflict-field-label">标题</span>
                    <span>{conflict.cloudVersion.title}</span>
                  </div>
                  <div className="conflict-field">
                    <span className="conflict-field-label">语言</span>
                    <span>{conflict.cloudVersion.language}</span>
                  </div>
                  <pre className="conflict-code">{conflict.cloudVersion.code?.slice(0, 300)}</pre>
                </div>
              ) : (
                <div className="conflict-deleted">（云端已删除）</div>
              )}
            </div>
          </div>

          {/* 批量操作 */}
          {conflicts.length > 1 && (
            <div className="conflict-batch">
              <span className="conflict-batch-label">批量解决剩余 {conflicts.length} 个冲突：</span>
              <button className="sync-btn sync-btn--sm" onClick={() => handleAutoResolve('local')} disabled={resolving}>
                全部用本地
              </button>
              <button className="sync-btn sync-btn--sm" onClick={() => handleAutoResolve('cloud')} disabled={resolving}>
                全部用云端
              </button>
              <button className="sync-btn sync-btn--sm" onClick={() => handleAutoResolve('latest')} disabled={resolving}>
                全部取最新
              </button>
            </div>
          )}
        </div>

        <div className="sync-dialog-footer">
          <button className="sync-btn sync-btn--local" onClick={() => handleResolve('use-local')} disabled={resolving}>
            使用本地版本
          </button>
          <button className="sync-btn sync-btn--cloud" onClick={() => handleResolve('use-cloud')} disabled={resolving}>
            使用云端版本
          </button>
          {conflict.type === 'update' && conflict.localVersion && conflict.cloudVersion && (
            <button className="sync-btn sync-btn--merge" onClick={() => handleResolve('merge')} disabled={resolving}>
              合并
            </button>
          )}
          <button className="sync-btn" onClick={() => handleResolve('skip')} disabled={resolving}>
            跳过
          </button>
        </div>
      </div>
    </div>
  );
};
