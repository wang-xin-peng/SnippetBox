import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { LoginDialog } from '../Auth/LoginDialog';
import { RegisterDialog } from '../Auth/RegisterDialog';
import { ResetPasswordDialog } from '../Auth/ResetPasswordDialog';
import '../Auth/Auth.css';
import './UserMenu.css';

type AuthModal = 'login' | 'register' | 'resetPassword' | null;

export const UserMenu: React.FC = () => {
  const { isLoggedIn, user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState<AuthModal>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (loading) return <div className="user-menu-loading">...</div>;

  if (!isLoggedIn) {
    return (
      <>
        <div className="user-menu-guest">
          <button className="user-menu-btn-outline" onClick={() => setModal('login')}>
            登录
          </button>
          <button className="user-menu-btn-primary" onClick={() => setModal('register')}>
            注册
          </button>
        </div>

        {modal === 'login' && (
          <LoginDialog
            onClose={() => setModal(null)}
            onSwitchToRegister={() => setModal('register')}
            onSwitchToResetPassword={() => setModal('resetPassword')}
          />
        )}
        {modal === 'register' && (
          <RegisterDialog
            onClose={() => setModal(null)}
            onSwitchToLogin={() => setModal('login')}
          />
        )}
        {modal === 'resetPassword' && (
          <ResetPasswordDialog
            onClose={() => setModal(null)}
            onBackToLogin={() => setModal('login')}
          />
        )}
      </>
    );
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-avatar-btn"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="用户菜单"
        aria-expanded={menuOpen}
      >
        {user?.avatar ? (
          <img src={user.avatar} alt={user.username} className="user-avatar-img" />
        ) : (
          <span className="user-avatar-initials">{initials}</span>
        )}
        <span className="user-name">{user?.username}</span>
        <span className="user-menu-caret">{menuOpen ? '▲' : '▼'}</span>
      </button>

      {menuOpen && (
        <div className="user-dropdown">
          <div className="user-dropdown-info">
            <span className="user-dropdown-name">{user?.username}</span>
            <span className="user-dropdown-email">{user?.email}</span>
          </div>
          <hr className="user-dropdown-divider" />
          <button
            className="user-dropdown-item"
            onClick={() => { setMenuOpen(false); navigate('/settings'); }}
          >
            ⚙ 账户设置
          </button>
          <button
            className="user-dropdown-item user-dropdown-logout"
            onClick={async () => { setMenuOpen(false); await logout(); }}
          >
            ↩ 退出登录
          </button>
        </div>
      )}
    </div>
  );
};
