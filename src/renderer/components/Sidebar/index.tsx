import { NavLink } from 'react-router-dom';
import Button from '../Button';
import './Sidebar.css';

interface SidebarProps {
  onNewSnippet?: () => void;
}

function Sidebar({ onNewSnippet }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">SnippetBox</h2>
      </div>

      <div className="sidebar-content">
        <Button onClick={onNewSnippet} className="new-snippet-btn">
          ➕ 新建片段
        </Button>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📚</span>
            <span>所有片段</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">⚙️</span>
            <span>设置</span>
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
