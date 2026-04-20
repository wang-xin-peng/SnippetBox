import { useState, useRef, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { NewSnippetModal } from '../SnippetEditor/NewSnippetModal';
import './Layout.css';

function Layout() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showingFavorites, setShowingFavorites] = useState(false);
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [previewWidth, setPreviewWidth] = useState(420);
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
      if (!isDraggingRight.current) return;
      const delta = startX - e.clientX;
      setPreviewWidth(Math.max(280, Math.min(600, startWidth + delta)));
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
        </div>
      </header>

      {/* 下方内容区 */}
      <div className="layout-body">
        {/* 左侧边栏 */}
        <aside className="layout-sidebar" style={{ width: sidebarWidth }}>
          <Sidebar
            onNewSnippet={handleNewSnippet}
            onCategorySelect={id => { setSelectedCategory(id); setShowingFavorites(false); }}
            selectedCategory={selectedCategory}
            onSnippetSelect={setSelectedSnippetId}
            onFavoritesSelect={() => { setShowingFavorites(true); setSelectedCategory(null); }}
            showingFavorites={showingFavorites}
            refreshKey={refreshKey}
          />
        </aside>

        {/* 左拖拽条 */}
        <div className="resize-handle" onMouseDown={startDragLeft} />

        {/* 中间+右侧内容 */}
        <main className="layout-main">
          <Outlet context={{ selectedCategory, setSelectedCategory, previewWidth, startDragRight, refreshKey, showingFavorites, selectedSnippetId, triggerRefresh }} />
        </main>
      </div>

      {showNewModal && (
        <NewSnippetModal onClose={handleModalClose} onSaved={handleModalSaved} />
      )}
    </div>
  );
}

export default Layout;
