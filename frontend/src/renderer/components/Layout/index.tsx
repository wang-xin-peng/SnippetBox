import { useState, useRef, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { NewSnippetModal } from '../SnippetEditor/NewSnippetModal';
import { UserMenu } from '../Header/UserMenu';
import { SyncIndicator } from '../Sync/SyncIndicator';
import './Layout.css';

function Layout() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showingFavorites, setShowingFavorites] = useState(false);
  const [showingTrash, setShowingTrash] = useState(false);
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [previewWidth, setPreviewWidth] = useState(580); // 调整为580px，让片段列表默认约400px
  const [showNewModal, setShowNewModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNewSnippet = () => setShowNewModal(true);
  const handleModalClose = () => setShowNewModal(false);
  const handleModalSaved = () => {
    setShowNewModal(false);
    setRefreshKey(k => k + 1);
  };

  const triggerRefresh = () => setRefreshKey(k => k + 1);

  const startDragLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingLeft.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMove = (e: MouseEvent) => {
      if (!isDraggingLeft.current) return;
      const delta = e.clientX - startX;
      setSidebarWidth(Math.max(160, Math.min(360, startWidth + delta)));
    };
    const onUp = () => {
      isDraggingLeft.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  const startDragRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRight.current = true;
    const startX = e.clientX;
    const startWidth = previewWidth;

    const onMove = (e: MouseEvent) => {
      if (!isDraggingRight.current || !containerRef.current) return;
      const delta = startX - e.clientX;
      // 移除最大宽度限制，允许用户自由调整
      // 最小宽度保持在350px，确保预览面板有足够空间
      setPreviewWidth(Math.max(350, startWidth + delta));
    };
    const onUp = () => {
      isDraggingRight.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [previewWidth]);

  return (
    <div className="layout" ref={containerRef}>
      {/* 顶部栏 */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <span>💾</span>
          </div>
          <div className="topbar-brand-text">
            <span className="topbar-title">代码片段管理器</span>
            <span className="topbar-subtitle">轻量级代码片段管理工具</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="topbar-count" id="snippet-count"></span>
          <button className="btn-new-snippet" onClick={handleNewSnippet}>
            + 新建片段
          </button>
          <SyncIndicator />
          <UserMenu />
        </div>
      </header>

      {/* 下方内容区 */}
      <div className="layout-body">
        {/* 左侧边栏 */}
        <aside className="layout-sidebar" style={{ width: sidebarWidth }}>
          <Sidebar
            onNewSnippet={handleNewSnippet}
            onCategorySelect={id => { setSelectedCategory(id); setShowingFavorites(false); setShowingTrash(false); }}
            selectedCategory={selectedCategory}
            onSnippetSelect={setSelectedSnippetId}
            onFavoritesSelect={() => { setShowingFavorites(true); setSelectedCategory(null); setShowingTrash(false); }}
            onTrashSelect={() => { setShowingTrash(true); setShowingFavorites(false); setSelectedCategory(null); }}
            showingFavorites={showingFavorites}
            showingTrash={showingTrash}
            refreshKey={refreshKey}
          />
        </aside>

        {/* 左拖拽条 */}
        <div className="resize-handle" onMouseDown={startDragLeft} />

        {/* 中间+右侧内容 */}
        <main className="layout-main">
          <Outlet context={{ selectedCategory, setSelectedCategory, previewWidth, startDragRight, refreshKey, showingFavorites, showingTrash, selectedSnippetId, triggerRefresh }} />
        </main>
      </div>

      {showNewModal && (
        <NewSnippetModal onClose={handleModalClose} onSaved={handleModalSaved} />
      )}
    </div>
  );
}

export default Layout;
