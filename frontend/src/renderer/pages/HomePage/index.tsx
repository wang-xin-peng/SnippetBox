import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CodeEditor } from '../../components/CodeEditor';
import { EditSnippetModal } from '../../components/SnippetEditor/EditSnippetModal';
import { ShareButton } from '../../components/Share/ShareButton';
import { Snippet } from '../../../shared/types';
import './HomePage.css';

interface OutletCtx {
  selectedCategory: string | null;
  setSelectedCategory: (v: string | null) => void;
  previewWidth: number;
  startDragRight: (e: React.MouseEvent) => void;
  refreshKey: number;
  showingFavorites: boolean;
  selectedSnippetId: string | null;
  triggerRefresh: () => void;
}

type SearchMode = 'keyword' | 'semantic';

function getLangColor(lang: string) {
  const map: Record<string, string> = {
    javascript: '#f7df1e', typescript: '#3178c6', python: '#3572a5',
    java: '#b07219', css: '#563d7c', html: '#e34c26', go: '#00add8',
    rust: '#dea584', cpp: '#f34b7d', shell: '#89e051', sql: '#e38c00',
  };
  return map[lang?.toLowerCase()] || '#8b949e';
}

function formatDate(d: any) {
  if (!d) return '';
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function HomePage() {
  const { selectedCategory, previewWidth, startDragRight, refreshKey, showingFavorites, selectedSnippetId, triggerRefresh } = useOutletContext<OutletCtx>();

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filtered, setFiltered] = useState<Snippet[]>([]);
  const [selected, setSelected] = useState<Snippet | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  const [hasSemanticSupport, setHasSemanticSupport] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadSnippets = useCallback(async () => {
    try {
      setLoading(true);
      const data: Snippet[] = await (window as any).electronAPI.snippet.list();
      setSnippets(data);
      // 加载完后直接更新 filtered，避免依赖 useEffect 链的时序问题
      setFiltered(prev => {
        // 如果当前没有搜索条件，直接用新数据
        return data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    } catch (e) {
      console.error('Failed to load snippets:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 启动时读取设置里的搜索模式
  useEffect(() => {
    (window as any).electron.ipcRenderer.invoke('settings:getWizardChoices').then((result: any) => {
      if (result?.success && result.data?.searchMode === 'local') {
        setSearchMode('semantic');
      }
    }).catch(() => {});
  }, []);

  // 检查是否支持语义搜索
  useEffect(() => {
    (window as any).electron.search.capability().then((cap: any) => {
      setHasSemanticSupport(cap.hasSemanticSearch);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadSnippets(); }, [loadSnippets, refreshKey]);

  useEffect(() => {
    const el = document.getElementById('snippet-count');
    if (el) el.textContent = filtered.length ? `${filtered.length} 个片段` : '';
  }, [filtered.length]);

  // 关键词过滤（本地，无需 IPC）
  const applyKeywordFilter = useCallback((allSnippets: Snippet[], query: string, category: string | null) => {
    let result = [...allSnippets];
    if (showingFavorites) result = result.filter(s => s.starred);
    if (category) result = result.filter(s => s.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setFiltered(result);
  }, [showingFavorites]);

  // 语义搜索（IPC）
  const runSemanticSearch = useCallback(async (query: string, category: string | null) => {
    if (!query.trim()) {
      setIsSearching(false);
      applyKeywordFilter(snippets, '', category);
      return;
    }
    setIsSearching(true);
    try {
      console.log('[HomePage] Starting semantic search for:', query);
      const results = await (window as any).electron.search.semantic(query);
      console.log('[HomePage] Semantic search returned:', results.length, 'results');
      console.log('[HomePage] Results:', results);

      if (results.length === 0 && snippets.length > 0) {
        // 向量库可能是空的，降级到关键词
        console.warn('[HomePage] Semantic search returned 0 results, falling back to keyword search');
        applyKeywordFilter(snippets, query, category);
        return;
      }

      let matched: Snippet[] = results
        .map((r: any) => {
          const id = r.snippet?.id ?? r.id;
          return snippets.find(sn => sn.id === id) ?? null;
        })
        .filter(Boolean) as Snippet[];
      
      console.log('[HomePage] Matched snippets:', matched.length);
      if (category) matched = matched.filter(s => s.category === category);
      setFiltered(matched);
    } catch (e) {
      console.error('Semantic search failed, falling back to keyword:', e);
      applyKeywordFilter(snippets, query, category);
    } finally {
      setIsSearching(false);
    }
  }, [snippets, applyKeywordFilter]);

  // 搜索 debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (searchMode === 'keyword') {
      applyKeywordFilter(snippets, searchQuery, selectedCategory);
    } else {
      // 语义搜索 debounce 500ms
      searchTimerRef.current = setTimeout(() => {
        runSemanticSearch(searchQuery, selectedCategory);
      }, 500);
    }

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [snippets, selectedCategory, searchQuery, searchMode, applyKeywordFilter, runSemanticSearch, showingFavorites]);

  const toggleSearchMode = () => {
    setSearchMode(prev => prev === 'keyword' ? 'semantic' : 'keyword');
    setSearchQuery('');
  };

  // 侧边栏点击片段时选中
  useEffect(() => {
    if (selectedSnippetId && snippets.length > 0) {
      const s = snippets.find(sn => sn.id === selectedSnippetId);
      if (s) setSelected(s);
    }
  }, [selectedSnippetId, snippets]);

  const handleToggleStar = async (snippet: Snippet, e: React.MouseEvent) => {
    e.stopPropagation();
    // 乐观更新：先立即更新 UI，不等 IPC 返回
    const newStarred = !snippet.starred;
    setSnippets(prev => prev.map(s => s.id === snippet.id ? { ...s, starred: newStarred } : s));
    if (selected?.id === snippet.id) setSelected(prev => prev ? { ...prev, starred: newStarred } : null);
    triggerRefresh();
    // 后台同步到数据库
    try {
      await (window as any).electronAPI.snippet.update(snippet.id, { starred: newStarred });
    } catch (err) {
      // 失败时回滚
      console.error('Toggle star failed, reverting:', err);
      setSnippets(prev => prev.map(s => s.id === snippet.id ? { ...s, starred: !newStarred } : s));
      if (selected?.id === snippet.id) setSelected(prev => prev ? { ...prev, starred: !newStarred } : null);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 批量选择
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleBatchMode = () => {
    setBatchMode(prev => { if (prev) setSelectedIds(new Set()); return !prev; });
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.size || !window.confirm(`确定删除选中的 ${selectedIds.size} 个片段吗？`)) return;
    try {
      await (window as any).electron.ipcRenderer.invoke('batch:delete', [...selectedIds]);
      const ids = selectedIds;
      setSnippets(prev => prev.filter(s => !ids.has(s.id)));
      setFiltered(prev => prev.filter(s => !ids.has(s.id)));
      if (selected && ids.has(selected.id)) setSelected(null);
      setSelectedIds(new Set());
      triggerRefresh();
    } catch (e) { console.error('Batch delete failed:', e); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await (window as any).electronAPI.snippet.delete(id);
      setSnippets(prev => prev.filter(s => s.id !== id));
      setFiltered(prev => prev.filter(s => s.id !== id));
      if (selected?.id === id) setSelected(null);
      triggerRefresh();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleCopy = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.code);
  };

  const handleEditSaved = () => {
    setEditingSnippet(null);
    // 重新加载并更新右侧预览
    (window as any).electronAPI.snippet.list().then((data: Snippet[]) => {
      setSnippets(data);
      setFiltered(data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      // 同步更新当前选中的片段
      if (selected) {
        const updated = data.find(s => s.id === selected.id);
        if (updated) setSelected(updated);
      }
    }).catch(console.error);
  };

  const isAiMode = searchMode === 'semantic';

  return (
    <div className="home-page">
      <div className="snippet-panel">
        {/* Search toolbar */}
        <div className="snippet-panel-toolbar">
          <div className={`search-box ${isAiMode ? 'search-box--ai' : ''}`}>
            <span className="search-icon">{isAiMode ? '🔮' : '🔍'}</span>
            <input
              className="search-input"
              placeholder={isAiMode ? 'AI 语义搜索...' : '搜索代码片段...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {isSearching && <span className="search-spinner" />}
            <button
              className={`search-mode-badge ${isAiMode ? 'search-mode-badge--ai' : ''}`}
              onClick={toggleSearchMode}
              title={!hasSemanticSupport && !isAiMode ? '需要先下载模型才能使用 AI 搜索' : '切换搜索模式'}
            >
              {isAiMode ? '✦ AI' : '✦ 关键词'}
            </button>
          </div>
          <button
            className={`toolbar-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="网格视图"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/>
              <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/>
              <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
              <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <button
            className={`toolbar-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="列表视图"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="2" width="13" height="2" rx="1" fill="currentColor"/>
              <rect x="1" y="6.5" width="13" height="2" rx="1" fill="currentColor"/>
              <rect x="1" y="11" width="13" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <button
            className={`toolbar-btn${batchMode ? ' active' : ''}`}
            onClick={toggleBatchMode}
            title="批量选择"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>

        {/* 批量操作栏 */}
        {batchMode && (
          <div className="batch-bar">
            <span className="batch-bar-count">已选 {selectedIds.size} / {filtered.length}</span>
            <button className="batch-bar-btn" onClick={() => setSelectedIds(new Set(filtered.map(s => s.id)))}>全选</button>
            <button className="batch-bar-btn" onClick={() => setSelectedIds(new Set())}>清除</button>
            {selectedIds.size > 0 && (
              <button className="batch-bar-btn batch-bar-btn--danger" onClick={handleBatchDelete}>
                🗑️ 删除 ({selectedIds.size})
              </button>
            )}
            <button className="batch-bar-btn batch-bar-btn--exit" onClick={toggleBatchMode}>退出批量</button>
          </div>
        )}
        {/* Sub toolbar */}
        <div className="snippet-panel-subbar">
          <div className="subbar-filters">
            <span className="filter-chip">语言 ▾</span>
            <span className="filter-chip">标签 ▾</span>
          </div>
          <div className="subbar-sort">
            <span>≡ 筛选</span>
          </div>
        </div>

        {loading ? (
          <div className="no-snippets"><div className="no-snippets-icon">⏳</div>加载中...</div>
        ) : (
          <div className={viewMode === 'grid' ? 'snippet-grid' : 'snippet-list'}>
            {filtered.length === 0 ? (
              <div className="no-snippets">
                <div className="no-snippets-icon">{isSearching ? '⏳' : '📭'}</div>
                <div>{isSearching ? '搜索中...' : (searchQuery ? '没有匹配的片段' : '暂无片段')}</div>
              </div>
            ) : (
              filtered.map(snippet => viewMode === 'grid' ? (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  isSelected={selected?.id === snippet.id}
                  onClick={() => setSelected(snippet)}
                  onDelete={handleDelete}
                  onToggleStar={handleToggleStar}
                  batchMode={batchMode}
                  checked={selectedIds.has(snippet.id)}
                  onToggleCheck={toggleSelect}
                />
              ) : (
                <SnippetListItem
                  key={snippet.id}
                  snippet={snippet}
                  isSelected={selected?.id === snippet.id}
                  onClick={() => setSelected(snippet)}
                  onDelete={handleDelete}
                  onToggleStar={handleToggleStar}
                  batchMode={batchMode}
                  checked={selectedIds.has(snippet.id)}
                  onToggleCheck={toggleSelect}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="resize-handle-right" onMouseDown={startDragRight} />

      <div className="preview-panel" style={{ width: previewWidth }}>
        {!selected ? (
          <div className="preview-empty">
            <div className="preview-empty-icon">{'</>'}</div>
            <div className="preview-empty-title">未选择代码片段</div>
            <div className="preview-empty-sub">从左侧列表中选择一个片段查看详情</div>
          </div>
        ) : (
          <PreviewPanel
            snippet={selected}
            onEdit={() => setEditingSnippet(selected)}
            onCopy={handleCopy}
            onDelete={e => handleDelete(selected.id, e)}
            onToggleStar={e => handleToggleStar(selected, e)}
          />
        )}
      </div>

      {editingSnippet && (
        <EditSnippetModal
          snippet={editingSnippet}
          onClose={() => setEditingSnippet(null)}
          onSaved={handleEditSaved}
        />
      )}

      {deleteConfirmId && (
        <div className="confirm-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">确认删除</div>
            <div className="confirm-msg">删除后无法恢复，确定要删除这个片段吗？</div>
            <div className="confirm-actions">
              <button className="confirm-btn" onClick={() => setDeleteConfirmId(null)}>取消</button>
              <button className="confirm-btn confirm-btn--danger" onClick={confirmDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Snippet Card ---- */
interface CardProps {
  snippet: Snippet;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onToggleStar: (snippet: Snippet, e: React.MouseEvent) => void;
  batchMode?: boolean;
  checked?: boolean;
  onToggleCheck?: (id: string, e: React.MouseEvent) => void;
}

function SnippetCard({ snippet, isSelected, onClick, onDelete, onToggleStar, batchMode, checked, onToggleCheck }: CardProps) {
  const lang = snippet.language?.toLowerCase() || '';
  const color = getLangColor(lang);

  const handleClick = () => {
    if (batchMode) onToggleCheck?.(snippet.id, { stopPropagation: () => {} } as any);
    else onClick();
  };

  return (
    <div className={`snippet-card ${isSelected ? 'selected' : ''} ${checked ? 'batch-checked' : ''}`} onClick={handleClick}>
      <div className="card-header">
        {batchMode ? (
          <input type="checkbox" checked={!!checked} onChange={() => {}} onClick={e => onToggleCheck?.(snippet.id, e)} style={{ marginRight: 6, cursor: 'pointer' }} />
        ) : (
          <span className="card-lang-icon" style={{ color }}>{'</>'}</span>
        )}
        <span className="card-title">{snippet.title}</span>
        {!batchMode && (
          <button className={`card-star ${snippet.starred ? 'starred' : ''}`} onClick={e => onToggleStar(snippet, e)}>
            {snippet.starred ? '★' : '☆'}
          </button>
        )}
      </div>

      {snippet.tags?.length > 0 && (
        <div className="card-desc">{snippet.tags.slice(0, 2).join(' · ')}</div>
      )}

      <div className="card-code-preview">
        {snippet.code.split('\n').slice(0, 4).join('\n')}
      </div>

      <div className="card-tags">
        {snippet.tags?.slice(0, 3).map((tag, i) => (
          <span key={i} className="card-tag">{tag}</span>
        ))}
      </div>

      <div className="card-footer">
        <div className="card-meta">
          <span className="card-meta-item">📅 {formatDate(snippet.updatedAt)}</span>
        </div>
        <span className="card-lang-badge">{snippet.language}</span>
        {!batchMode && <ShareButton snippet={snippet} iconOnly />}
      </div>
    </div>
  );
}

/* ---- Snippet List Item ---- */
function SnippetListItem({ snippet, isSelected, onClick, onToggleStar, batchMode, checked, onToggleCheck }: CardProps) {
  const lang = snippet.language?.toLowerCase() || '';
  const color = getLangColor(lang);

  const handleClick = () => {
    if (batchMode) onToggleCheck?.(snippet.id, { stopPropagation: () => {} } as any);
    else onClick();
  };

  return (
    <div className={`snippet-list-item ${isSelected ? 'selected' : ''} ${checked ? 'batch-checked' : ''}`} onClick={handleClick}>
      <div className="list-item-header">
        {batchMode ? (
          <input type="checkbox" checked={!!checked} onChange={() => {}} onClick={e => onToggleCheck?.(snippet.id, e)} style={{ marginRight: 6, cursor: 'pointer' }} />
        ) : (
          <span className="list-item-lang-icon" style={{ color }}>{'</>'}</span>
        )}
        <span className="list-item-title">{snippet.title}</span>
        {!batchMode && (
          <button className={`card-star ${snippet.starred ? 'starred' : ''}`} onClick={e => onToggleStar(snippet, e)}>
            {snippet.starred ? '★' : '☆'}
          </button>
        )}
      </div>

      {(snippet as any).description && (
        <div className="list-item-desc">{(snippet as any).description}</div>
      )}

      <div className="list-item-code-preview">
        {snippet.code.split('\n').slice(0, 5).join('\n')}
      </div>

      {snippet.tags?.length > 0 && (
        <div className="list-item-tags">
          {snippet.tags.slice(0, 5).map((tag, i) => (
            <span key={i} className="card-tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="list-item-footer">
        <span className="list-item-lang-badge">{snippet.language?.toLowerCase()}</span>
        <span className="list-item-date">📅 {formatDate(snippet.updatedAt)}</span>
      </div>
    </div>
  );
}

/* ---- Preview Panel ---- */
interface PreviewProps {
  snippet: Snippet;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleStar: (e: React.MouseEvent) => void;
}

function PreviewPanel({ snippet, onEdit, onCopy, onDelete, onToggleStar }: PreviewProps) {
  const handleDownload = () => {
    // 获取文件扩展名
    const langExtMap: Record<string, string> = {
      javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
      cpp: 'cpp', 'c++': 'cpp', csharp: 'cs', 'c#': 'cs',
      go: 'go', rust: 'rs', php: 'php', ruby: 'rb',
      swift: 'swift', kotlin: 'kt', html: 'html', css: 'css',
      sql: 'sql', shell: 'sh', bash: 'sh', dart: 'dart',
      r: 'r', yaml: 'yaml', json: 'json',
    };
    const ext = langExtMap[snippet.language?.toLowerCase()] || 'txt';
    const filename = `${snippet.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.${ext}`;
    
    // 创建下载链接
    const blob = new Blob([snippet.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleColorize = async () => {
    try {
      // 使用浏览器的打印功能生成带语法高亮的PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('请允许弹出窗口以生成染色版本');
        return;
      }
      
      // 生成带语法高亮的HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${snippet.title}</title>
  <style>
    body {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      padding: 20px;
      background: white;
      color: #333;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      margin: 0 0 5px 0;
    }
    .meta {
      color: #666;
      font-size: 14px;
    }
    .code {
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 13px;
      line-height: 1.5;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${snippet.title}</div>
    <div class="meta">语言: ${snippet.language} | 更新: ${formatDate(snippet.updatedAt)}</div>
  </div>
  <pre class="code">${snippet.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
      
      printWindow.document.write(html);
      printWindow.document.close();
      
      // 等待内容加载后自动打开打印对话框
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } catch (e) {
      console.error('Colorize failed:', e);
      alert('生成染色版本失败');
    }
  };
  return (
    <>
      <div className="preview-header">
        <div className="preview-title-row">
          <h2 className="preview-title">{snippet.title}</h2>
          <button
            className={`preview-star ${snippet.starred ? 'starred' : ''}`}
            onClick={onToggleStar}
          >{snippet.starred ? '★' : '☆'}</button>
        </div>
        <div className="preview-meta-row">
          <span className="preview-meta-item">📅 发布: {formatDate(snippet.createdAt)}</span>
          <span className="preview-meta-item">📅 更新: {formatDate(snippet.updatedAt)}</span>
          <span className="preview-meta-item">{snippet.language}</span>
        </div>
        {snippet.tags?.length > 0 && (
          <div className="preview-tags">
            {snippet.tags.map((tag, i) => (
              <span key={i} className="preview-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="preview-actions">
        <button className="action-btn primary" onClick={onCopy}>📋 复制代码</button>
        <button className="action-btn" onClick={onEdit}>✏️ 编辑信息</button>
        <ShareButton snippet={snippet} />
        <button className="action-btn" onClick={handleDownload}>📤 下载</button>
        <div className="action-btn-spacer" />
        <button className="action-btn danger" onClick={onDelete}>🗑️ 删除</button>
        <button className="action-btn colorize" onClick={handleColorize}>🎨 染色</button>
      </div>

      <div className="preview-code-area">
        <CodeEditor
          value={snippet.code}
          language={snippet.language?.toLowerCase() || 'plaintext'}
          readOnly
          height="100%"
          theme="vs-dark"
        />
      </div>
    </>
  );
}
