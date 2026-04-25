import { useState, useEffect, useCallback } from 'react';
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

  const goHomeFirst = (cb: () => void) => {
    if (location.pathname !== '/') {
      navigate('/');
      // 等待导航完成后再执行回调，避免 HomePage 未挂载时 showingTrash 状态丢失
      setTimeout(cb, 50);
    } else {
      cb();
    }
  };
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
      // 只在首次加载时初始化展开状态，避免每次刷新都重置导致闪烁
      if (!expandedInitialized) {
        setExpanded(new Set(sortedCats.map((c: Category) => c.id)));
        setExpandedInitialized(true);
      }

      try {
        const trashItems = await (window as any).electronAPI?.trash?.list();
        setTrashCount(trashItems?.length || 0);
      } catch {}
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
        if ((s as any).storageScope !== 'cloud' && !(s as any).cloudId) return false;
      } else {
        if ((s as any).storageScope === 'cloud' || (s as any).cloudId) return false;
      }
      return (s as any).categoryId === catId || s.category === catName;
    });
  };
  const getCount = (catId: string, catName: string) => getSnippets(catId, catName).length;
  const favCount = snippets.filter(s => {
    if (!s.starred) return false;
    if (isLoggedIn) {
      return (s as any).storageScope === 'cloud' || (s as any).cloudId;
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
        onClick={() => goHomeFirst(() => onFavoritesSelect?.())}
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
        onClick={() => goHomeFirst(() => onTrashSelect?.())}
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
          onClick={() => goHomeFirst(() => onCategorySelect?.(null))}
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

          const handleCategoryClick = () => {
            // 如果未展开，先展开
            if (!isOpen) {
              toggle(cat.id);
            }
            // 选择分类
            goHomeFirst(() => onCategorySelect?.(cat.name));
          };

          return (
            <div key={cat.id} className="category-group">
              <div
                className={`category-row ${isActive ? 'active' : ''}`}
              >
                <span 
                  className={`category-chevron ${isOpen ? 'open' : ''}`}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    toggle(cat.id); 
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </span>
                <span 
                  className="category-icon" 
                  style={{ color: cat.color || '#8b949e', cursor: 'pointer' }}
                  onClick={handleCategoryClick}
                >
                  {cat.icon || <i className="fas fa-folder"></i>}
                </span>
                <span 
                  className="category-name"
                  style={{ cursor: 'pointer', flex: 1 }}
                  onClick={handleCategoryClick}
                >{cat.name}</span>
                <span className="category-badge">{count}</span>
              </div>

              {isOpen && children.length > 0 && (
                <div className="category-children">
                  {children.map(s => (
                    <button
                      key={s.id}
                      className="snippet-nav-item"
                      onClick={e => { e.stopPropagation(); onSnippetSelect?.(s.id); }}
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
