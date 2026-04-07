import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import './Layout.css';

function Layout() {
  const navigate = useNavigate();

  const handleNewSnippet = () => {
    navigate('/editor');
  };

  return (
    <div className="layout">
      <Sidebar onNewSnippet={handleNewSnippet} />
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
