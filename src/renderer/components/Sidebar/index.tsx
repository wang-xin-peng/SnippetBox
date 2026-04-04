import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">SnippetBox</h1>
      </div>

      <nav className="sidebar-nav">
        <Link to="/" className={`sidebar-link ${isActive('/')}`}>
          <span className="sidebar-icon">📝</span>
          <span>所有片段</span>
        </Link>
        <Link to="/editor" className={`sidebar-link ${isActive('/editor')}`}>
          <span className="sidebar-icon">➕</span>
          <span>新建片段</span>
        </Link>
        <Link to="/settings" className={`sidebar-link ${isActive('/settings')}`}>
          <span className="sidebar-icon">⚙️</span>
          <span>设置</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-stats">
          <span>0 个片段</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
