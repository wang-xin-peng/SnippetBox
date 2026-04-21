import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import CategoryTagManager from '../CategoryTagManager';
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
  showingFavorites?: boolean;
  refreshKey?: number;
}

function Sidebar({
  onCategorySelect,
  selectedCategory,
  onSnippetSelect,
  onFavoritesSelect,
  showingFavorites,
  refreshKey,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const goHomeFirst = (cb: () => void) => {
    if (location.pathname !== '/') {
      navigate('/');
    }
    cb();
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [snippets, setSnippets] = useState<SnippetItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [tags, setTags] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const api = (window as any).electronAPI;
      const [cats, snips, tagList] = await Promise.all([
        api.category.list(), 
        api.snippet.list(),
        api.tag.list()
      ]);
      
      // 将"未分类"放到最后
      const sortedCats = cats.sort((a: Category, b: Category) => {
        if (a.name === '未分类') return 1;
        if (b.name === '未分类') return -1;
        return 0;
      });
      
      setCategories(sortedCats);
      setSnippets(snips);
      setTags(tagList || []);
      setExpanded(new Set(sortedCats.map((c: Category) => c.id)));
    } catch (e) {
      console.error('Sidebar load failed:', e);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getSnippets = (catId: string, catName: string) => snippets.filter(s => s.category === catName || s.category === catId);
  const getCount = (catId: string, catName: string) => getSnippets(catId, catName).length;
  const favCount = snippets.filter(s => s.starred).length;

  // 分类管理操作
  const handleAddCategory = async (category: Omit<Category, 'id'>) => {
    try {
      await (window as any).electronAPI.category.create(category);
      await loadData();
    } catch (e) {
      console.error('Failed to add category:', e);
      alert('添加分类失败：' + (e as Error).message);
    }
  };

  const handleUpdateCategory = async (category: Category) => {
    try {
      await (window as any).electronAPI.category.update(category.id, {
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
    if (!confirm('确定要删除这个分类吗？该分类下的代码片段会被移到"未分类"。')) {
      return;
    }
    try {
      await (window as any).electronAPI.category.delete(categoryId);
      await loadData();
    } catch (e) {
      console.error('Failed to delete category:', e);
      alert('删除分类失败：' + (e as Error).message);
    }
  };

  const handleAddTag = async (tag: { name: string }) => {
    try {
      await (window as any).electronAPI.tag.create(tag);
      await loadData();
    } catch (e) {
      console.error('Failed to add tag:', e);
      alert('添加标签失败：' + (e as Error).message);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('确定要删除这个标签吗？')) {
      return;
    }
    try {
      await (window as any).electronAPI.tag.delete(tagId);
      await loadData();
    } catch (e) {
      console.error('Failed to delete tag:', e);
      alert('删除标签失败：' + (e as Error).message);
    }
  };

  const handleMergeTags = async (sourceId: string, targetId: string) => {
    try {
      await (window as any).electronAPI.tag.merge(sourceId, targetId);
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
        <span className="sidebar-fav-icon">{showingFavorites ? '★' : '☆'}</span>
        <span className="sidebar-fav-label">收藏夹</span>
        <span className="sidebar-section-badge">{favCount}</span>
      </div>

      <div className="sidebar-divider" />

      {/* 分类 */}
      <div className="sidebar-categories">
        <div className="category-header">
          <span className="category-header-title">分类</span>
          <button
            className="category-header-manage"
            onClick={() => setShowCategoryManager(true)}
            title="管理分类和标签"
          >
            ⚙️
          </button>
          <button
            className={`category-header-all ${!selectedCategory && !showingFavorites ? 'active' : ''}`}
            onClick={() => goHomeFirst(() => onCategorySelect?.(null))}
          >
            全部
          </button>
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
                onClick={() => { toggle(cat.id); goHomeFirst(() => onCategorySelect?.(cat.name)); }}
              >
                <span className={`category-chevron ${isOpen ? 'open' : ''}`}>›</span>
                <span className="category-icon" style={{ color: cat.color || '#8b949e' }}>
                  {cat.icon || '📁'}
                </span>
                <span className="category-name">{cat.name}</span>
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
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span>⚙️</span>
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
