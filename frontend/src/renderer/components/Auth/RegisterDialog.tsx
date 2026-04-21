import React, { useState } from 'react';
import { useAuth } from '../../store/authStore';
import './Auth.css';

interface RegisterDialogProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterDialog: React.FC<RegisterDialogProps> = ({ onClose, onSwitchToLogin }) => {
  const { register, loading, error, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = '姓名不能为空';
    if (!email.trim()) errs.email = '邮箱不能为空';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = '请输入有效的邮箱地址';
    if (!password) errs.password = '密码不能为空';
    else if (password.length < 8) errs.password = '密码至少 8 位';
    if (!confirm) errs.confirm = '请再次输入密码';
    else if (password && confirm !== password) errs.confirm = '两次密码不一致';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const ok = await register(email, password, username);
    if (ok) onClose();
  };

  const field = (
    id: string,
    label: string,
    icon: string,
    value: string,
    onChange: (v: string) => void,
    type: string,
    placeholder: string,
    toggle?: { show: boolean; onToggle: () => void }
  ) => (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        <span className="auth-label-icon">{icon}</span>{label}
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          id={id}
          className={`auth-input${fieldErrors[id] ? ' auth-input-error' : ''}`}
          type={toggle ? (toggle.show ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => { onChange(e.target.value); setFieldErrors((fe) => ({ ...fe, [id]: '' })); }}
          autoComplete={id === 'password' || id === 'confirm' ? 'new-password' : id}
          style={toggle ? { paddingRight: 40, width: '100%' } : { width: '100%' }}
        />
        {toggle && (
          <button
            type="button"
            className="auth-eye-btn"
            onClick={toggle.onToggle}
            aria-label={toggle.show ? '隐藏密码' : '显示密码'}
          >
            {toggle.show ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
      {fieldErrors[id] && <span className="auth-field-error">{fieldErrors[id]}</span>}
    </div>
  );

  return (
    <div className="auth-dialog-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="auth-dialog-close" onClick={onClose} aria-label="关闭">×</button>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {field('username', '姓名', '👤', username, setUsername, 'text', '请输入姓名')}
          {field('email', '邮箱', '✉', email, setEmail, 'email', '请输入邮箱地址')}
          {field('password', '密码', '🔒', password, setPassword, 'password', '设置密码', { show: showPassword, onToggle: () => setShowPassword((v) => !v) })}
          {field('confirm', '确认密码', '🔒', confirm, setConfirm, 'password', '再次输入密码', { show: showConfirm, onToggle: () => setShowConfirm((v) => !v) })}

          {error && <div className="auth-error-banner">{error}</div>}

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? '处理中...' : '注册 →'}
          </button>
        </form>

        <div className="auth-divider"><span>或使用第三方账号</span></div>
        <div className="auth-oauth-row">
          <button className="auth-oauth-btn" type="button" onClick={() => alert('GitHub 登录即将上线')}>
            <span>⌥</span> Github
          </button>
          <button className="auth-oauth-btn" type="button" onClick={() => alert('Google 登录即将上线')}>
            <span>✉</span> Google
          </button>
        </div>

        <p className="auth-switch">
          已有账户？
          <button type="button" className="auth-link" onClick={() => { clearError(); onSwitchToLogin(); }}>
            立即登录
          </button>
        </p>
      </div>
    </div>
  );
};
