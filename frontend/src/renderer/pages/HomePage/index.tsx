import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CodeEditor } from '../../components/CodeEditor';
import { EditSnippetModal } from '../../components/SnippetEditor/EditSnippetModal';
import { ShareButton } from '../../components/Share/ShareButton';
import { Snippet } from '../../../shared/types';
import { useAuth } from '../../store/authStore';
import './HomePage.css';

interface OutletCtx {
  selectedCategory: string | null;
  setSelectedCategory: (v: string | null) => void;
  categoryUpdateKey: number;
  previewWidth: number;
  startDragRight: (e: React.MouseEvent) => void;
  refreshKey: number;
  showingFavorites: boolean;
  showingTrash: boolean;
  selectedSnippetId: string | null;
  setSelectedSnippetId: (id: string | null) => void;
  triggerRefresh: () => void;
}

type SearchMode = 'keyword' | 'semantic';
type SortOption = 'updatedAt' | 'createdAt' | 'title' | 'language';

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
  const { selectedCategory, setSelectedCategory, categoryUpdateKey, previewWidth, startDragRight, refreshKey, showingFavorites, showingTrash, selectedSnippetId, setSelectedSnippetId, triggerRefresh } = useOutletContext<OutletCtx>();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filtered, setFiltered] = useState<Snippet[]>([]);
  const [selected, setSelected] = useState<Snippet | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  const [hasSemanticSupport, setHasSemanticSupport] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterLang, setFilterLang] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trashSnippets, setTrashSnippets] = useState<Snippet[]>([]);
  const [trashSelected, setTrashSelected] = useState<Snippet | null>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoSwitchingCategory = useRef(false); // 标记是否是自动切换分类

  const loadSnippets = useCallback(async () => {
    try {
      setSnippets([]);
      setFiltered([]);
      setLoading(true);
      const data = await (window as any).electronAPI?.snippet?.list?.() || [];
      // 直接使用 React 状态的 isLoggedIn，避免状态不一致
      const filteredData = isLoggedIn
        ? data.filter((s: any) => !s.skipSync)
        : data.filter((s: any) => s.storageScope !== 'cloud' && !s.cloudId);
      // 只设置过滤后的数据，避免闪现
      setSnippets(filteredData);
      const sorted = filteredData.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setFiltered(sorted);
    } catch (e) {
      console.error('Failed to load snippets:', e);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

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

  useEffect(() => { 
    if (!authLoading) {
      loadSnippets(); 
    }
  }, [refreshKey, authLoading, loadSnippets]);

  // 监听登录状态变化，立即重新加载片段
  useEffect(() => {
    if (!authLoading) {
      loadSnippets();
    }
  }, [isLoggedIn, authLoading, loadSnippets]);

  useEffect(() => {
    console.log('[Trash] useEffect triggered, showingTrash:', showingTrash, 'refreshKey:', refreshKey);
    if (showingTrash) {
      console.log('[Trash] Calling trash:list...');
      (window as any).electronAPI?.trash?.list()?.then((data: Snippet[]) => {
        console.log('[Trash] trash:list returned:', data?.length, 'items', data);
        setTrashSnippets(data);
        setTrashSelected(null);
      }).catch((e: any) => {
        console.error('[Trash] trash:list failed:', e);
      });
    }
  }, [showingTrash, refreshKey]);

  // 监听登录后的刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      loadSnippets();
    };

    window.addEventListener('snippets-refresh', handleRefresh);
    return () => window.removeEventListener('snippets-refresh', handleRefresh);
  }, [loadSnippets]);

  // 监听登录后分类切换事件：重置选中分类，显示全部片段
  useEffect(() => {
    const handleCategoriesRefresh = () => {
      setSelectedCategory(null);
    };

    window.addEventListener('categories-refresh', handleCategoriesRefresh);
    return () => window.removeEventListener('categories-refresh', handleCategoriesRefresh);
  }, []);

  useEffect(() => {
    const el = document.getElementById('snippet-count');
    if (el) el.textContent = `${filtered.length} 个片段`;
  }, [filtered.length]);

  // 关键词过滤（本地，无需 IPC）
  const applyKeywordFilter = useCallback((allSnippets: Snippet[], query: string, category: string | null) => {
    const q = query.trim().toLowerCase();
    
    // 一次性过滤，避免多次遍历
    const result = allSnippets.filter(s => {
      // 存储范围过滤
      if (isLoggedIn) {
        if (s.skipSync) return false;
      } else {
        if ((s.storageScope ?? 'local') === 'cloud' || s.cloudId) return false;
      }
      
      // 分类过滤和收藏过滤互斥，分类优先
      if (category) {
        if (s.category !== category) return false;
      } else if (showingFavorites) {
        if (!s.starred) return false;
      }
      
      // 语言筛选
      if (filterLang && s.language?.toLowerCase() !== filterLang.toLowerCase()) return false;
      
      // 标签筛选
      if (filterTag && !s.tags.some(t => t.toLowerCase() === filterTag.toLowerCase())) return false;
      
      // 搜索关键词过滤
      if (q) {
        return s.title.toLowerCase().includes(q) ||
               s.code.toLowerCase().includes(q) ||
               s.tags.some(t => t.toLowerCase().includes(q));
      }
      
      return true;
    });
    
    // 排序
    result.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'language') return (a.language || '').localeCompare(b.language || '');
      if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    setFiltered(result);
  }, [showingFavorites, isLoggedIn, filterLang, filterTag, sortBy]);

  // 语义搜索（IPC）
  const runSemanticSearch = useCallback(async (query: string, category: string | null) => {
    if (!query.trim()) {
      setIsSearching(false);
      applyKeywordFilter(snippets, '', category);
      return;
    }
    setIsSearching(true);
    try {
      const results = await (window as any).electron.search.semantic(query);

      if (results.length === 0 && snippets.length > 0) {
        // 向量库可能是空的，降级到关键词
        applyKeywordFilter(snippets, query, category);
        return;
      }

      let matched: Snippet[] = results
        .map((r: any) => {
          const id = r.snippet?.id ?? r.id;
          return snippets.find(sn => sn.id === id) ?? null;
        })
        .filter(Boolean) as Snippet[];
      
      if (category) matched = matched.filter(s => s.category === category);
      setFiltered(matched);
    } catch (e) {
      console.error('Semantic search failed, falling back to keyword:', e);
      applyKeywordFilter(snippets, query, category);
    } finally {
      setIsSearching(false);
    }
  }, [snippets, applyKeywordFilter]);

  // 切换分类或收藏夹时，清空选中的片段（除非是自动切换）
  useEffect(() => {
    if (!isAutoSwitchingCategory.current) {
      setSelected(null);
      setSelectedSnippetId(null);
    }
    isAutoSwitchingCategory.current = false; // 重置标志
  }, [selectedCategory, showingFavorites, setSelectedSnippetId]);

  // 搜索 debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (searchMode === 'keyword') {
      // 关键词搜索立即执行
      applyKeywordFilter(snippets, searchQuery, selectedCategory);
    } else if (searchMode === 'semantic') {
      // 语义搜索 debounce 300ms（减少延迟）
      searchTimerRef.current = setTimeout(() => {
        runSemanticSearch(searchQuery, selectedCategory);
      }, 300);
    }

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [snippets, selectedCategory, categoryUpdateKey, searchQuery, searchMode, applyKeywordFilter, runSemanticSearch, showingFavorites]);

  // 登录状态变化时重新过滤片段
  useEffect(() => {
    applyKeywordFilter(snippets, searchQuery, selectedCategory);
    setSelected(null);
  }, [isLoggedIn]);

  const toggleSearchMode = () => {
    setSearchMode(prev => prev === 'keyword' ? 'semantic' : 'keyword');
    setSearchQuery('');
  };

  // 侧边栏点击片段时选中，并自动切换到该片段所属的分类
  useEffect(() => {
    if (selectedSnippetId && snippets.length > 0) {
      const s = snippets.find(sn => sn.id === selectedSnippetId);
      if (s) {
        setSelected(s);
        // 如果片段有分类，且当前选中的分类不是该片段的分类，则自动切换
        if (s.category && s.category !== selectedCategory) {
          isAutoSwitchingCategory.current = true; // 标记为自动切换
          setSelectedCategory(s.category);
        }
      }
    }
  }, [selectedSnippetId, snippets, selectedCategory, setSelectedCategory]);

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
  const [trashDeleteConfirmId, setTrashDeleteConfirmId] = useState<string | null>(null);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // 批量选择
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 点击外部关闭所有下拉
  useEffect(() => {
    const close = () => { setLangDropdownOpen(false); setTagDropdownOpen(false); setSortDropdownOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

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

  const handleBatchDelete = () => {
    if (!selectedIds.size) return;
    setShowBatchDeleteConfirm(true);
  };

  const confirmBatchDelete = async () => {
    setShowBatchDeleteConfirm(false);
    try {
      await (window as any).electron.ipcRenderer.invoke('batch:delete', [...selectedIds]);
      const ids = selectedIds;
      setSnippets(prev => prev.filter(s => !ids.has(s.id)));
      setFiltered(prev => prev.filter(s => !ids.has(s.id)));
      if (selected && ids.has(selected.id)) setSelected(null);
      setSelectedIds(new Set());
      // 使用 requestIdleCallback 延迟刷新
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => triggerRefresh());
      } else {
        setTimeout(() => triggerRefresh(), 100);
      }
    } catch (e) { 
      console.error('Batch delete failed:', e); 
    }
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
      console.log('[Delete] Calling snippet:delete for id:', id);
      const result = await (window as any).electronAPI.snippet.delete(id);
      console.log('[Delete] snippet:delete result:', result);
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
    // 触发 Sidebar 刷新
    triggerRefresh();
  };

  const isAiMode = searchMode === 'semantic';

  const handleRestoreSnippet = async (id: string) => {
    try {
      await (window as any).electronAPI?.trash?.restore(id);
      setTrashSnippets(prev => prev.filter(s => s.id !== id));
      if (trashSelected?.id === id) setTrashSelected(null);
      // 使用 requestIdleCallback 在浏览器空闲时刷新，避免阻塞 UI
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => triggerRefresh());
      } else {
        setTimeout(() => triggerRefresh(), 100);
      }
    } catch (e) {
      console.error('Restore failed:', e);
    }
  };

  const handlePermanentDelete = (id: string) => {
    setTrashDeleteConfirmId(id);
  };

  const confirmPermanentDelete = async () => {
    if (!trashDeleteConfirmId) return;
    const id = trashDeleteConfirmId;
    setTrashDeleteConfirmId(null);
    try {
      await (window as any).electronAPI?.trash?.permanentDelete(id);
      setTrashSnippets(prev => prev.filter(s => s.id !== id));
      if (trashSelected?.id === id) setTrashSelected(null);
      // 使用 requestIdleCallback 在浏览器空闲时刷新，避免阻塞 UI
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => triggerRefresh());
      } else {
        setTimeout(() => triggerRefresh(), 100);
      }
    } catch (e) {
      console.error('Permanent delete failed:', e);
    }
  };

  const handleEmptyTrash = () => {
    setShowEmptyTrashConfirm(true);
  };

  const confirmEmptyTrash = async () => {
    setShowEmptyTrashConfirm(false);
    try {
      await (window as any).electronAPI?.trash?.empty();
      setTrashSnippets([]);
      setTrashSelected(null);
      // 使用 requestIdleCallback 在浏览器空闲时刷新，避免阻塞 UI
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => triggerRefresh());
      } else {
        setTimeout(() => triggerRefresh(), 100);
      }
    } catch (e) {
      console.error('Empty trash failed:', e);
    }
  };

  if (showingTrash) {
    return (
      <div className="home-page">
        <div className="snippet-panel">
          <div className="snippet-panel-toolbar">
            <div className="search-box" style={{ flex: 1 }}>
              <span className="search-icon">🗑️</span>
              <span style={{ color: '#8b949e', fontSize: 14 }}>回收站 ({trashSnippets.length})</span>
            </div>
            {trashSnippets.length > 0 && (
              <button className="batch-bar-btn batch-bar-btn--danger" onClick={handleEmptyTrash}>
                清空回收站
              </button>
            )}
          </div>
          {trashSnippets.length === 0 ? (
            <div className="no-snippets">
              <div className="no-snippets-icon">🗑️</div>
              <div>回收站为空</div>
            </div>
          ) : (
            <div className="snippet-list">
              {trashSnippets.map(snippet => (
                <div
                  key={snippet.id}
                  className={`snippet-list-item ${trashSelected?.id === snippet.id ? 'selected' : ''}`}
                  onClick={() => setTrashSelected(snippet)}
                >
                  <div className="list-item-header">
                    <span className="list-item-lang-icon" style={{ color: getLangColor(snippet.language?.toLowerCase() || '') }}>{'</>'}</span>
                    <span className="list-item-title">{snippet.title}</span>
                  </div>
                  <div className="list-item-code-preview">
                    {snippet.code.split('\n').slice(0, 3).join('\n')}
                  </div>
                  <div className="list-item-footer">
                    <span className="list-item-lang-badge">{snippet.language?.toLowerCase()}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="action-btn"
                        style={{ fontSize: 12, padding: '2px 8px' }}
                        onClick={e => { e.stopPropagation(); handleRestoreSnippet(snippet.id); }}
                      >♻️ 恢复</button>
                      <button
                        className="action-btn danger"
                        style={{ fontSize: 12, padding: '2px 8px' }}
                        onClick={e => { e.stopPropagation(); handlePermanentDelete(snippet.id); }}
                      >彻底删除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="resize-handle-right" onMouseDown={startDragRight} />
        <div className="preview-panel" style={{ width: previewWidth }}>
          {!trashSelected ? (
            <div className="preview-empty">
              <div className="preview-empty-icon">🗑️</div>
              <div className="preview-empty-title">回收站</div>
              <div className="preview-empty-sub">选择一个片段查看详情，或恢复/永久删除</div>
            </div>
          ) : (
            <>
              <div className="preview-header">
                <div className="preview-title-row">
                  <h2 className="preview-title">{trashSelected.title}</h2>
                </div>
                <div className="preview-meta-row">
                  <span className="preview-meta-item">{trashSelected.language}</span>
                  <span className="preview-meta-item">📅 删除于: {formatDate(trashSelected.deletedAt || trashSelected.updatedAt)}</span>
                </div>
              </div>
              <div className="preview-actions">
                <button className="action-btn primary" onClick={() => handleRestoreSnippet(trashSelected.id)}>♻️ 恢复片段</button>
                <button className="action-btn danger" onClick={() => handlePermanentDelete(trashSelected.id)}>彻底删除</button>
              </div>
              <div className="preview-code-area">
                <CodeEditor
                  value={trashSelected.code}
                  language={trashSelected.language?.toLowerCase() || 'plaintext'}
                  readOnly
                  height="100%"
                  theme="custom-dark"
                />
              </div>
            </>
          )}
        </div>

        {/* 回收站确认对话框 */}
        {trashDeleteConfirmId && (
          <div className="confirm-overlay" onClick={() => setTrashDeleteConfirmId(null)}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <div className="confirm-title">确认彻底删除</div>
              <div className="confirm-msg">永久删除后无法恢复，确定要彻底删除这个片段吗？</div>
              <div className="confirm-actions">
                <button className="confirm-btn" onClick={() => setTrashDeleteConfirmId(null)}>取消</button>
                <button className="confirm-btn confirm-btn--danger" onClick={confirmPermanentDelete}>彻底删除</button>
              </div>
            </div>
          </div>
        )}

        {showEmptyTrashConfirm && (
          <div className="confirm-overlay" onClick={() => setShowEmptyTrashConfirm(false)}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <div className="confirm-title">确认清空回收站</div>
              <div className="confirm-msg">确定要清空回收站吗？所有片段将被永久删除，无法恢复！</div>
              <div className="confirm-actions">
                <button className="confirm-btn" onClick={() => setShowEmptyTrashConfirm(false)}>取消</button>
                <button className="confirm-btn confirm-btn--danger" onClick={confirmEmptyTrash}>清空回收站</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="snippet-panel">
        {/* Search toolbar */}
        <div className="snippet-panel-toolbar">
          <div className={`search-box ${isAiMode ? 'search-box--ai' : ''}`}>
            <span className="search-icon">{isAiMode ? '🔮' : '🔍'}</span>
            <input
              className="search-input"
              placeholder={isAiMode ? '智能语义搜索...' : '搜索代码片段...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {isSearching && <span className="search-spinner" />}
            <button
              className={`search-mode-badge ${isAiMode ? 'search-mode-badge--ai' : ''}`}
              onClick={toggleSearchMode}
              title={!hasSemanticSupport && !isAiMode ? '需要先下载模型才能使用 AI 搜索' : '切换搜索模式'}
            >
              {isAiMode ? '✦ 语义' : '✦ 关键词'}
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
            {/* 语言筛选下拉 */}
            <div className="filter-dropdown-wrap" onClick={e => e.stopPropagation()}>
              <span
                className={`filter-chip ${filterLang ? 'filter-chip--active' : ''}`}
                onClick={() => { setLangDropdownOpen(o => !o); setTagDropdownOpen(false); setSortDropdownOpen(false); }}
              >
                {filterLang ? filterLang : '语言'} ▾
              </span>
              {langDropdownOpen && (
                <div className="filter-dropdown">
                  <div
                    className={`filter-dropdown-item ${!filterLang ? 'active' : ''}`}
                    onClick={() => { setFilterLang(null); setLangDropdownOpen(false); }}
                  >全部语言</div>
                  {Array.from(new Set(snippets.map(s => s.language?.toLowerCase()).filter(Boolean))).sort().map(lang => (
                    <div
                      key={lang}
                      className={`filter-dropdown-item ${filterLang === lang ? 'active' : ''}`}
                      onClick={() => { setFilterLang(lang === filterLang ? null : lang!); setLangDropdownOpen(false); }}
                    >
                      <span className="filter-dropdown-dot" style={{ background: getLangColor(lang!) }} />
                      {lang}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 标签筛选下拉 */}
            <div className="filter-dropdown-wrap" onClick={e => e.stopPropagation()}>
              <span
                className={`filter-chip ${filterTag ? 'filter-chip--active' : ''}`}
                onClick={() => { setTagDropdownOpen(o => !o); setLangDropdownOpen(false); setSortDropdownOpen(false); }}
              >
                {filterTag ? filterTag : '标签'} ▾
              </span>
              {tagDropdownOpen && (
                <div className="filter-dropdown">
                  <div
                    className={`filter-dropdown-item ${!filterTag ? 'active' : ''}`}
                    onClick={() => { setFilterTag(null); setTagDropdownOpen(false); }}
                  >全部标签</div>
                  {Array.from(new Set(snippets.flatMap(s => s.tags || []).filter(Boolean))).sort().map(tag => (
                    <div
                      key={tag}
                      className={`filter-dropdown-item ${filterTag === tag ? 'active' : ''}`}
                      onClick={() => { setFilterTag(tag === filterTag ? null : tag); setTagDropdownOpen(false); }}
                    >{tag}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 排序下拉 */}
          <div className="filter-dropdown-wrap" onClick={e => e.stopPropagation()}>
            <span
              className={`subbar-sort ${sortBy !== 'updatedAt' ? 'subbar-sort--active' : ''}`}
              onClick={() => { setSortDropdownOpen(o => !o); setLangDropdownOpen(false); setTagDropdownOpen(false); }}
            >
              ≡ 筛选
            </span>
            {sortDropdownOpen && (
              <div className="filter-dropdown filter-dropdown--right">
                {([
                  { value: 'updatedAt', label: '最近更新' },
                  { value: 'createdAt', label: '创建时间' },
                  { value: 'title', label: '名称 A-Z' },
                ] as { value: SortOption; label: string }[]).map(opt => (
                  <div
                    key={opt.value}
                    className={`filter-dropdown-item ${sortBy === opt.value ? 'active' : ''}`}
                    onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); }}
                  >{opt.label}</div>
                ))}
              </div>
            )}
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
                  onClick={() => {
                    setSelected(snippet);
                    setSelectedSnippetId(snippet.id);
                  }}
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
                  onClick={() => {
                    setSelected(snippet);
                    setSelectedSnippetId(snippet.id);
                  }}
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
            onSaved={loadSnippets}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            setSearchQuery={setSearchQuery}
            triggerRefresh={triggerRefresh}
            showingFavorites={showingFavorites}
            showingTrash={showingTrash}
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
            <div className="confirm-msg">片段将被移到回收站，确定要删除吗？</div>
            <div className="confirm-actions">
              <button className="confirm-btn" onClick={() => setDeleteConfirmId(null)}>取消</button>
              <button className="confirm-btn confirm-btn--danger" onClick={confirmDelete}>删除</button>
            </div>
          </div>
        </div>
      )}

      {showBatchDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowBatchDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">确认批量删除</div>
            <div className="confirm-msg">确定删除选中的 {selectedIds.size} 个片段吗？片段将被移到回收站。</div>
            <div className="confirm-actions">
              <button className="confirm-btn" onClick={() => setShowBatchDeleteConfirm(false)}>取消</button>
              <button className="confirm-btn confirm-btn--danger" onClick={confirmBatchDelete}>删除</button>
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
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(snippet.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

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
          <>
            <button className="card-copy-btn" onClick={handleCopy} title="复制代码">
              {copied ? '✅' : '📋'}
            </button>
            <button className={`card-star ${snippet.starred ? 'starred' : ''}`} onClick={e => onToggleStar(snippet, e)}>
              {snippet.starred ? '★' : '☆'}
            </button>
          </>
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
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(snippet.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

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
          <>
            <button className="card-copy-btn" onClick={handleCopy} title="复制代码">
              {copied ? '✅' : '📋'}
            </button>
            <button className={`card-star ${snippet.starred ? 'starred' : ''}`} onClick={e => onToggleStar(snippet, e)}>
              {snippet.starred ? '★' : '☆'}
            </button>
          </>
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
  onSaved?: () => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  triggerRefresh: () => void;
  showingFavorites: boolean;
  showingTrash: boolean;
}

function PreviewPanel({ snippet, onEdit, onCopy, onDelete, onToggleStar, onSaved, selectedCategory, setSelectedCategory, setSearchQuery, triggerRefresh, showingFavorites, showingTrash }: PreviewProps) {
  const [code, setCode] = useState(snippet.code);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 当切换片段时重置代码
  useEffect(() => {
    setCode(snippet.code);
    setHasChanges(false);
  }, [snippet.id, snippet.code]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setHasChanges(newCode !== snippet.code);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      await (window as any).electronAPI?.snippet?.update(snippet.id, { code });
      setHasChanges(false);
      onSaved?.(); // 触发刷新
    } catch (e) {
      console.error('Save failed:', e);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

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
          {snippet.category && (
            <span 
              className="preview-meta-item preview-meta-category" 
              onClick={() => {
                // 通过设置 selectedCategory 来切换分类
                setSelectedCategory(snippet.category);
                setSearchQuery('');
                // 触发刷新以确保状态同步
                setTimeout(() => {
                  triggerRefresh();
                }, 50);
              }}
              title="点击查看该分类的所有片段"
            >
              <i className="fas fa-folder"></i> {snippet.category}
            </span>
          )}
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
        <button className="action-btn" onClick={onEdit}>
          <i className="fas fa-edit"></i> 编辑信息
        </button>
        {hasChanges && (
          <button 
            className="action-btn primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <i className="fas fa-save"></i> {isSaving ? '保存中...' : '保存代码'}
          </button>
        )}
        <button className="action-btn danger" onClick={onDelete}>
          <i className="fas fa-trash"></i> 删除
        </button>
        <ShareButton snippet={snippet} />
        <button className="action-btn" onClick={handleDownload}>
          <i className="fas fa-download"></i> 下载
        </button>
        <button className="action-btn print" onClick={handleColorize}>
          <i className="fas fa-print"></i> 打印
        </button>
      </div>

      <div className="preview-code-area">
        <CodeEditor
          value={code}
          onChange={handleCodeChange}
          language={snippet.language?.toLowerCase() || 'plaintext'}
          readOnly={false}
          height="100%"
          theme="custom-dark"
        />
      </div>
    </>
  );
}
