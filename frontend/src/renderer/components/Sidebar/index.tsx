import { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import CategoryTagManager from '../CategoryTagManager';
import { useAuth } from '../../store/authStore';
import './Sidebar.css';

interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

interface SnippetItem {
  id: string;
  title: string;
  category?: string;
  starred?: boolean;
}

interface SidebarProps {
  onNewSnippet?: () => void;
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategory?: string | null;
  onSnippetSelect?: (snippetId: string) => void;
  onFavoritesSelect?: () => void;
  onTrashSelect?: () => void;
  showingFavorites?: boolean;
  showingTrash?: boolean;
  refreshKey?: number;
}

function Sidebar({
  onCategorySelect,
  selectedCategory,
  onSnippetSelect,
  onFavoritesSelect,
  onTrashSelect,
  showingFavorites,
  showingTrash,
  refreshKey,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user } = useAuth();
  // 用 ref 保存最新的回调，避免 loadData 依赖外部函数引用
  const onCategorySelectRef = useRef(onCategorySelect);
  useEffect(() => { onCategorySelectRef.current = onCategorySelect; }, [onCategorySelect]);
  const onFavoritesSelectRef = useRef(onFavoritesSelect);
  useEffect(() => { onFavoritesSelectRef.current = onFavoritesSelect; }, [onFavoritesSelect]);
  const onTrashSelectRef = useRef(onTrashSelect);
  useEffect(() => { onTrashSelectRef.current = onTrashSelect; }, [onTrashSelect]);
  const onSnippetSelectRef = useRef(onSnippetSelect);
  useEffect(() => { onSnippetSelectRef.current = onSnippetSelect; }, [onSnippetSelect]);

  const goHomeFirst = useCallback((cb: () => void) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(cb, 100);
    } else {
      cb();
    }
  }, [location.pathname, navigate]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [snippets, setSnippets] = useState<SnippetItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedInitialized, setExpandedInitialized] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [tags, setTags] = useState<any[]>([]);

  const [trashCount, setTrashCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const api = (window as any).electronAPI;
      if (!api) return;
      const userId = isLoggedIn && user ? user.id : 'local';      
      await api.category?.ensureDefaults?.(userId);
      
      const [cats, snips, tagList] = await Promise.all([
        api.category?.list?.(userId) || [], 
        api.snippet?.list?.() || [],
        api.tag?.list?.() || []
      ]);
      
      const sortedCats = cats
        .filter((c: Category) => !c.name.startsWith('#')) // 过滤掉以 # 开头的无效分类
        .sort((a: Category, b: Category) => {
          if (a.name === '未分类') return 1;
          if (b.name === '未分类') return -1;
          return 0;
        });
      
      setCategories(sortedCats);
      setSnippets(snips);
      setTags(tagList || []);
      // 只在首次加载时初始化展开状态：默认只展开"未分类"
      if (!expandedInitialized) {
        const uncategorized = sortedCats.find((c: Category) => c.name === '未分类');
        setExpanded(uncategorized ? new Set([uncategorized.id]) : new Set());
        setExpandedInitialized(true);
        // 默认选中"未分类"
        if (uncategorized) {
          onCategorySelectRef.current?.(uncategorized.name);
        }
      }

      try {
        const trashItems = await (window as any).electronAPI?.trash?.list();
        setTrashCount(trashItems?.length || 0);
      } catch { /* ignore */ }
    } catch (e) {
      console.error('Sidebar load failed:', e);
    }
  }, [isLoggedIn, user]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getSnippets = (catId: string, catName: string) => {
    return snippets.filter(s => {
      if (isLoggedIn) {
        if ((s as any).skipSync) return false;
      } else {
        if ((s as any).storageScope === 'cloud' || (s as any).cloudId) return false;
      }
      const sCategory = s.category || '';
      const sCategoryId = (s as any).categoryId || '';
      // 匹配分类：按 id 或名称匹配；若片段无分类则归入"未分类"
      if (catName === '未分类') {
        return sCategoryId === catId || sCategory === catName || (!sCategoryId && !sCategory);
      }
      return sCategoryId === catId || sCategory === catName;
    });
  };
  const getCount = (catId: string, catName: string) => getSnippets(catId, catName).length;
  const favCount = snippets.filter(s => {
    if (!s.starred) return false;
    if (isLoggedIn) {
      return !(s as any).skipSync;
    } else {
      return (s as any).storageScope !== 'cloud' && !(s as any).cloudId;
    }
  }).length;

  // 分类管理操作
  const handleAddCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const userId = isLoggedIn && user ? user.id : 'local';
      await (window as any).electronAPI?.category?.create?.(category, userId);
      await loadData();
    } catch (e) {
      console.error('Failed to add category:', e);
      alert('添加分类失败：' + (e as Error).message);
    }
  };

  const handleUpdateCategory = async (category: Category) => {
    try {
      await (window as any).electronAPI?.category?.update?.(category.id, {
        name: category.name,
        color: category.color,
        icon: category.icon
      });
      await loadData();
    } catch (e) {
      console.error('Failed to update category:', e);
      alert('更新分类失败：' + (e as Error).message);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await (window as any).electronAPI?.category?.delete?.(categoryId);
      await loadData();
    } catch (e) {
      console.error('Failed to delete category:', e);
      alert('删除分类失败：' + (e as Error).message);
    }
  };

  const handleAddTag = async (tag: { name: string }) => {
    try {
      await (window as any).electronAPI?.tag?.create?.(tag);
      await loadData();
    } catch (e) {
      console.error('Failed to add tag:', e);
      alert('添加标签失败：' + (e as Error).message);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await (window as any).electronAPI?.tag?.delete?.(tagId);
      await loadData();
    } catch (e) {
      console.error('Failed to delete tag:', e);
      alert('删除标签失败：' + (e as Error).message);
    }
  };

  const handleMergeTags = async (sourceId: string, targetId: string) => {
    try {
      await (window as any).electronAPI?.tag?.merge?.(sourceId, targetId);
      await loadData();
    } catch (e) {
      console.error('Failed to merge tags:', e);
      alert('合并标签失败：' + (e as Error).message);
    }
  };

  return (
    <div className="sidebar">
      {/* 收藏夹 */}
      <div
        className={`sidebar-favorites ${showingFavorites ? 'active' : ''}`}
        onClick={() => goHomeFirst(() => onFavoritesSelectRef.current?.())}
      >
        <span className="sidebar-fav-icon">
          <i className={`${showingFavorites ? 'fas' : 'far'} fa-star`}></i>
        </span>
        <span className="sidebar-fav-label">收藏夹</span>
        <span className="sidebar-section-badge">{favCount}</span>
      </div>

      <div className="sidebar-divider" />

      <div
        className={`sidebar-favorites ${showingTrash ? 'active' : ''}`}
        onClick={() => goHomeFirst(() => onTrashSelectRef.current?.())}
      >
        <span className="sidebar-fav-icon">
          <i className="fas fa-trash-alt"></i>
        </span>
        <span className="sidebar-fav-label">回收站</span>
        {trashCount > 0 && <span className="sidebar-section-badge">{trashCount}</span>}
      </div>

      <div className="sidebar-divider" />

      {/* 分类 */}
      <div className="sidebar-categories">
        <div
          className={`sidebar-favorites ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => goHomeFirst(() => onCategorySelectRef.current?.(null))}
        >
          <span className="sidebar-fav-icon">
            <i className="fas fa-layer-group"></i>
          </span>
          <span className="sidebar-fav-label">分类</span>
        </div>

        {categories.map(cat => {
          const isOpen = expanded.has(cat.id);
          const isActive = selectedCategory === cat.name || selectedCategory === cat.id;
          const children = getSnippets(cat.id, cat.name);
          const count = getCount(cat.id, cat.name);

          return (
            <div key={cat.id} className="category-group">
              <div
                className={`category-row ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setExpanded(new Set([cat.id]));
                  if (location.pathname !== '/') {
                    navigate('/');
                    setTimeout(() => onCategorySelectRef.current?.(cat.name), 100);
                  } else {
                    onCategorySelectRef.current?.(cat.name);
                  }
                }}
              >
                <span 
                  className={`category-chevron ${isOpen ? 'open' : ''}`}
                  onClick={(e) => { 
                    e.stopPropagation();
                    // 箭头单独控制展开/收起，不影响选中状态
                    toggle(cat.id);
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </span>
                <span 
                  className="category-icon" 
                  style={{ color: cat.color || '#8b949e' }}
                >
                  {cat.icon
                    ? cat.icon.startsWith('fa')
                      ? <i className={cat.icon}></i>
                      : cat.icon
                    : <i className="fas fa-folder"></i>
                  }
                </span>
                <span 
                  className="category-name"
                  style={{ flex: 1 }}
                >{cat.name}</span>
                <span className="category-badge">{count}</span>
              </div>

              {isOpen && children.length > 0 && (
                <div className="category-children">
                  {children.map(s => (
                    <button
                      key={s.id}
                      className="snippet-nav-item"
                      onClick={e => { e.stopPropagation(); onSnippetSelectRef.current?.(s.id); }}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部 */}
      <div className="sidebar-bottom">
        <button
          className="nav-item"
          onClick={() => setShowCategoryManager(true)}
        >
          <span><i className="fas fa-folder-plus"></i></span>
          <span>管理分类与标签</span>
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span><i className="fas fa-cog"></i></span>
          <span>设置</span>
        </NavLink>
      </div>

      {/* 分类和标签管理器 */}
      {showCategoryManager && (
        <CategoryTagManager
          isOpen={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          categories={categories}
          tags={tags}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddTag={handleAddTag}
          onDeleteTag={handleDeleteTag}
          onMergeTags={handleMergeTags}
        />
      )}
    </div>
  );
}

export default Sidebar;
