import { useState, useRef, useCallback, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { NewSnippetModal } from '../SnippetEditor/NewSnippetModal';
import { UserMenu } from '../Header/UserMenu';
import { SyncIndicator } from '../Sync/SyncIndicator';
import { useTheme } from '../../store/themeStore';
import './Layout.css';

function Layout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryUpdateKey, setCategoryUpdateKey] = useState(0); // 用于强制更新
  const [showingFavorites, setShowingFavorites] = useState(false);
  const [showingTrash, setShowingTrash] = useState(false);
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [previewWidth, setPreviewWidth] = useState(580);
  const [showNewModal, setShowNewModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileView, setMobileView] = useState<'sidebar' | 'snippets' | 'detail'>('sidebar');
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 检测是否为移动端
  const isMobile = () => window.innerWidth <= 768;

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile()) {
        setMobileView('sidebar');
        document.body.removeAttribute('data-mobile-view');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 更新 body 的 data-mobile-view 属性
  useEffect(() => {
    if (isMobile()) {
      document.body.setAttribute('data-mobile-view', mobileView);
    }
  }, [mobileView]);

  // 监听 selectedSnippetId 变化，切换到详情页
  useEffect(() => {
    if (selectedSnippetId && isMobile()) {
      setMobileView('detail');
    }
  }, [selectedSnippetId]);

  const handleNewSnippet = () => setShowNewModal(true);
  const handleModalClose = () => setShowNewModal(false);
  const handleModalSaved = () => {
    setShowNewModal(false);
    setRefreshKey(k => k + 1);
  };

  // 移动端：选择分类后显示片段列表
  const handleCategorySelectMobile = (category: string | null) => {
    setSelectedCategory(category);
    if (isMobile()) {
      setMobileView('snippets');
    }
  };

  // 移动端：选择片段后显示详情
  const handleSnippetSelectMobile = (snippetId: string) => {
    setSelectedSnippetId(snippetId);
    if (isMobile()) {
      setMobileView('detail');
    }
  };

  // 移动端：返回按钮
  const handleMobileBack = () => {
    if (mobileView === 'detail') {
      setMobileView('snippets');
      setSelectedSnippetId(null);
    } else if (mobileView === 'snippets') {
      setMobileView('sidebar');
      setSelectedCategory(null);
    }
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
          {isMobile() && mobileView !== 'sidebar' && (
            <button className="btn-mobile-back" onClick={handleMobileBack}>
              <i className="fas fa-arrow-left"></i>
            </button>
          )}
          <div className="topbar-logo">
            <i className="fas fa-code" style={{ fontSize: '18px' }}></i>
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
          <button 
            className="btn-theme-toggle" 
            onClick={toggleTheme}
            title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
          >
            <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'}`}></i>
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
            onCategorySelect={id => { 
              setSelectedCategory(id);
              setCategoryUpdateKey(k => k + 1); // 强制触发更新
              setShowingFavorites(false); 
              setShowingTrash(false);
              if (isMobile()) setMobileView('snippets');
            }}
            selectedCategory={selectedCategory}
            onSnippetSelect={id => {
              setSelectedSnippetId(id);
              if (isMobile()) setMobileView('detail');
            }}
            onFavoritesSelect={() => { 
              setShowingFavorites(true); 
              setSelectedCategory(null); 
              setShowingTrash(false);
              if (isMobile()) setMobileView('snippets');
            }}
            onTrashSelect={() => { 
              setShowingTrash(true); 
              setShowingFavorites(false); 
              setSelectedCategory(null);
              if (isMobile()) setMobileView('snippets');
            }}
            showingFavorites={showingFavorites}
            showingTrash={showingTrash}
            refreshKey={refreshKey}
          />
        </aside>

        {/* 左拖拽条 */}
        <div className="resize-handle" onMouseDown={startDragLeft} />

        {/* 中间+右侧内容 */}
        <main className="layout-main">
          <Outlet context={{ 
            selectedCategory, 
            setSelectedCategory, 
            categoryUpdateKey,
            previewWidth, 
            startDragRight, 
            refreshKey, 
            showingFavorites, 
            showingTrash, 
            selectedSnippetId,
            setSelectedSnippetId,
            triggerRefresh 
          }} />
        </main>
      </div>

      {showNewModal && (
        <NewSnippetModal onClose={handleModalClose} onSaved={handleModalSaved} />
      )}
    </div>
  );
}

export default Layout;
