import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
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

// 根据分类名称返回 emoji 图标和颜色
function getCategoryStyle(name: string): { icon: string; color: string } {
  const map: Record<string, { icon: string; color: string }> = {
    react:      { icon: '⚛️', color: '#61dafb' },
    javascript: { icon: '🟨', color: '#f7df1e' },
    typescript: { icon: '🔷', color: '#3178c6' },
    css:        { icon: '🎨', color: '#563d7c' },
    html:       { icon: '🌐', color: '#e34c26' },
    python:     { icon: '🐍', color: '#3572a5' },
    java:       { icon: '☕', color: '#b07219' },
    go:         { icon: '🐹', color: '#00add8' },
    rust:       { icon: '🦀', color: '#dea584' },
    node:       { icon: '🟢', color: '#68a063' },
    'node.js':  { icon: '🟢', color: '#68a063' },
    sql:        { icon: '🗄️', color: '#e38c00' },
    shell:      { icon: '💻', color: '#89e051' },
    vue:        { icon: '💚', color: '#42b883' },
    angular:    { icon: '🔴', color: '#dd0031' },
    swift:      { icon: '🍎', color: '#fa7343' },
    kotlin:     { icon: '🟣', color: '#7f52ff' },
    php:        { icon: '🐘', color: '#777bb4' },
    ruby:       { icon: '💎', color: '#cc342d' },
    dart:       { icon: '🎯', color: '#0175c2' },
  };
  const key = name.toLowerCase();
  return map[key] || { icon: '📁', color: '#8b949e' };
}

function Sidebar({
  onCategorySelect,
  selectedCategory,
  onSnippetSelect,
  onFavoritesSelect,
  showingFavorites,
  refreshKey,
}: SidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [snippets, setSnippets] = useState<SnippetItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const api = (window as any).electronAPI;
      const [cats, snips] = await Promise.all([api.category.list(), api.snippet.list()]);
      setCategories(cats);
      setSnippets(snips);
      setExpanded(new Set(cats.map((c: Category) => c.id)));
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

  return (
    <div className="sidebar">
      {/* 收藏夹 */}
      <div
        className={`sidebar-favorites ${showingFavorites ? 'active' : ''}`}
        onClick={onFavoritesSelect}
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
            className={`category-header-all ${!selectedCategory && !showingFavorites ? 'active' : ''}`}
            onClick={() => onCategorySelect?.(null)}
          >
            全部
          </button>
        </div>

        {categories.map(cat => {
          const style = getCategoryStyle(cat.name);
          const isOpen = expanded.has(cat.id);
          const isActive = selectedCategory === cat.name || selectedCategory === cat.id;
          const children = getSnippets(cat.id, cat.name);
          const count = getCount(cat.id, cat.name);

          return (
            <div key={cat.id} className="category-group">
              <div
                className={`category-row ${isActive ? 'active' : ''}`}
                onClick={() => { toggle(cat.id); onCategorySelect?.(cat.name); }}
              >
                <span className={`category-chevron ${isOpen ? 'open' : ''}`}>›</span>
                <span className="category-icon">{style.icon}</span>
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
    </div>
  );
}

export default Sidebar;
