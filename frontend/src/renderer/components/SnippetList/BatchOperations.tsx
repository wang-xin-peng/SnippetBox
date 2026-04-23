import React, { useState, useEffect } from 'react';
import { Category, Tag } from '../../../shared/types';
import { useAuth } from '../../store/authStore';

interface BatchResult {
  success: number;
  failed: number;
  errors: Array<{ snippetId: string; error: string }>;
}

interface BatchOperationsProps {
  selectedIds: Set<string>;
  onOperationComplete: (deletedIds?: string[]) => void;
}

type DialogType = 'delete' | 'tags' | 'category' | 'export' | null;

/**
 * 批量操作工具栏：删除、修改标签、修改分类、导出
 */
export const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedIds,
  onOperationComplete,
}) => {
  const { isLoggedIn, user } = useAuth();
  const [dialog, setDialog] = useState<DialogType>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);

  // 标签对话框状态
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // 分类对话框状态
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // 导出格式
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json'>('markdown');

  const ids = Array.from(selectedIds);

  useEffect(() => {
    if (dialog === 'tags') {
      window.electronAPI?.tag?.list?.().then(setAvailableTags).catch(console.error);
    }
    if (dialog === 'category') {
      const userId = isLoggedIn && user ? user.id : 'local';
      window.electronAPI?.category?.list?.(userId).then(setCategories).catch(console.error);
    }
  }, [dialog]);

  const closeDialog = () => {
    setDialog(null);
    setResult(null);
    setTagInput('');
    setSelectedCategoryId('');
  };

  // 批量删除
  const handleDelete = async () => {
    setLoading(true);
    try {
      const res: BatchResult = await window.electron.ipcRenderer.invoke('batch:delete', ids);
      setResult(res);
      if (res.success > 0) {
        onOperationComplete(ids.filter((id) => !res.errors.find((e) => e.snippetId === id)));
      }
    } catch (err) {
      setResult({ success: 0, failed: ids.length, errors: [{ snippetId: '', error: String(err) }] });
    } finally {
      setLoading(false);
    }
  };

  // 批量修改标签
  const handleUpdateTags = async () => {
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) return;
    setLoading(true);
    try {
      const res: BatchResult = await window.electron.ipcRenderer.invoke('batch:update-tags', ids, tags);
      setResult(res);
      if (res.success > 0) onOperationComplete();
    } catch (err) {
      setResult({ success: 0, failed: ids.length, errors: [{ snippetId: '', error: String(err) }] });
    } finally {
      setLoading(false);
    }
  };

  // 批量修改分类
  const handleUpdateCategory = async () => {
    if (!selectedCategoryId) return;
    setLoading(true);
    try {
      const res: BatchResult = await window.electron.ipcRenderer.invoke(
        'batch:update-category',
        ids,
        selectedCategoryId
      );
      setResult(res);
      if (res.success > 0) onOperationComplete();
    } catch (err) {
      setResult({ success: 0, failed: ids.length, errors: [{ snippetId: '', error: String(err) }] });
    } finally {
      setLoading(false);
    }
  };

  // 批量导出
  const handleExport = async () => {
    setLoading(true);
    try {
      const channel = exportFormat === 'json' ? 'export:json' : 'export:batch-markdown';
      const res = await window.electron.ipcRenderer.invoke(channel, ids);
      if (res && typeof res.success === 'number') {
        setResult(res as BatchResult);
      } else {
        setResult({ success: ids.length, failed: 0, errors: [] });
      }
    } catch (err) {
      setResult({ success: 0, failed: ids.length, errors: [{ snippetId: '', error: String(err) }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 工具栏 */}
      <div className="batch-operations-bar">
        <span className="batch-ops-label">批量操作：</span>
        <button className="batch-op-btn batch-op-delete" onClick={() => setDialog('delete')}>
          🗑 删除
        </button>
        <button className="batch-op-btn" onClick={() => setDialog('tags')}>
          🏷 修改标签
        </button>
        <button className="batch-op-btn" onClick={() => setDialog('category')}>
          📁 修改分类
        </button>
        <button className="batch-op-btn" onClick={() => setDialog('export')}>
          📤 导出
        </button>
      </div>

      {/* 删除确认对话框 */}
      {dialog === 'delete' && (
        <div className="batch-dialog-overlay" onClick={closeDialog}>
          <div className="batch-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>确认批量删除</h3>
            {!result ? (
              <>
                <p>确定要删除选中的 <strong>{ids.length}</strong> 个片段吗？此操作不可撤销。</p>
                <div className="batch-dialog-actions">
                  <button onClick={closeDialog} disabled={loading}>取消</button>
                  <button className="btn-danger" onClick={handleDelete} disabled={loading}>
                    {loading ? '删除中...' : '确认删除'}
                  </button>
                </div>
              </>
            ) : (
              <ResultView result={result} onClose={closeDialog} />
            )}
          </div>
        </div>
      )}

      {/* 修改标签对话框 */}
      {dialog === 'tags' && (
        <div className="batch-dialog-overlay" onClick={closeDialog}>
          <div className="batch-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>批量修改标签</h3>
            {!result ? (
              <>
                <p>为选中的 <strong>{ids.length}</strong> 个片段设置标签（将替换现有标签）：</p>
                <input
                  className="batch-input"
                  type="text"
                  placeholder="输入标签，用逗号分隔，如：react, hooks, typescript"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  autoFocus
                />
                {availableTags.length > 0 && (
                  <div className="batch-tag-suggestions">
                    {availableTags.slice(0, 10).map((tag) => (
                      <span
                        key={tag.id}
                        className="batch-tag-chip"
                        onClick={() => {
                          const existing = tagInput ? tagInput.split(',').map((t) => t.trim()) : [];
                          if (!existing.includes(tag.name)) {
                            setTagInput(existing.filter(Boolean).concat(tag.name).join(', '));
                          }
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="batch-dialog-actions">
                  <button onClick={closeDialog} disabled={loading}>取消</button>
                  <button onClick={handleUpdateTags} disabled={loading || !tagInput.trim()}>
                    {loading ? '更新中...' : '确认修改'}
                  </button>
                </div>
              </>
            ) : (
              <ResultView result={result} onClose={closeDialog} />
            )}
          </div>
        </div>
      )}

      {/* 修改分类对话框 */}
      {dialog === 'category' && (
        <div className="batch-dialog-overlay" onClick={closeDialog}>
          <div className="batch-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>批量修改分类</h3>
            {!result ? (
              <>
                <p>为选中的 <strong>{ids.length}</strong> 个片段设置分类：</p>
                <select
                  className="batch-select"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  <option value="">-- 请选择分类 --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="batch-dialog-actions">
                  <button onClick={closeDialog} disabled={loading}>取消</button>
                  <button onClick={handleUpdateCategory} disabled={loading || !selectedCategoryId}>
                    {loading ? '更新中...' : '确认修改'}
                  </button>
                </div>
              </>
            ) : (
              <ResultView result={result} onClose={closeDialog} />
            )}
          </div>
        </div>
      )}

      {/* 导出对话框 */}
      {dialog === 'export' && (
        <div className="batch-dialog-overlay" onClick={closeDialog}>
          <div className="batch-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>批量导出</h3>
            {!result ? (
              <>
                <p>导出选中的 <strong>{ids.length}</strong> 个片段：</p>
                <div className="batch-export-formats">
                  <label>
                    <input
                      type="radio"
                      value="markdown"
                      checked={exportFormat === 'markdown'}
                      onChange={() => setExportFormat('markdown')}
                    />
                    Markdown (.md)
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                    />
                    JSON (.json)
                  </label>
                </div>
                <div className="batch-dialog-actions">
                  <button onClick={closeDialog} disabled={loading}>取消</button>
                  <button onClick={handleExport} disabled={loading}>
                    {loading ? '导出中...' : '选择保存位置'}
                  </button>
                </div>
              </>
            ) : (
              <ResultView result={result} onClose={closeDialog} />
            )}
          </div>
        </div>
      )}
    </>
  );
};

/** 操作结果展示 */
const ResultView: React.FC<{ result: BatchResult; onClose: () => void }> = ({ result, onClose }) => (
  <div className="batch-result">
    <div className="batch-result-summary">
      <span className="result-success">✓ 成功：{result.success}</span>
      {result.failed > 0 && <span className="result-failed">✗ 失败：{result.failed}</span>}
    </div>
    {result.errors.length > 0 && (
      <details className="batch-result-errors">
        <summary>查看失败详情 ({result.errors.length})</summary>
        <ul>
          {result.errors.map((e, i) => (
            <li key={i}>
              {e.snippetId ? <code>{e.snippetId.slice(0, 8)}...</code> : ''}：{e.error}
            </li>
          ))}
        </ul>
      </details>
    )}
    <div className="batch-dialog-actions">
      <button onClick={onClose}>关闭</button>
    </div>
  </div>
);
