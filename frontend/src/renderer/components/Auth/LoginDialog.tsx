import React, { useState } from 'react';
import { AuthForm } from './AuthForm';
import { useAuth } from '../../store/authStore';

interface LoginDialogProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ onClose, onSwitchToRegister }) => {
  const { login, loading, error, clearError } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (values: Record<string, string>) => {
    const ok = await login(values.email, values.password, rememberMe);
    if (ok) onClose();
  };

  return (
    <div className="auth-dialog-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="auth-dialog-close" onClick={onClose} aria-label="关闭">×</button>

        <AuthForm
          fields={[
            { name: 'email', label: '邮箱', type: 'email', placeholder: '请输入邮箱地址', icon: '✉' },
            { name: 'password', label: '密码', type: 'password', placeholder: '输入密码', icon: '🔒' },
          ]}
          submitLabel="登录"
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
          extra={
            <div className="auth-row">
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                记住我
              </label>
              <button
                type="button"
                className="auth-link"
                onClick={() => alert('忘记密码功能即将上线')}
              >
                忘记密码?
              </button>
            </div>
          }
        />

        <div className="auth-divider"><span>或使用第三方账号</span></div>
        <div className="auth-oauth-row">
          <button className="auth-oauth-btn" onClick={() => alert('GitHub 登录即将上线')}>
            <span>⌥</span> Github
          </button>
          <button className="auth-oauth-btn" onClick={() => alert('Google 登录即将上线')}>
            <span>✉</span> Google
          </button>
        </div>

        <p className="auth-switch">
          还没有账户？
          <button
            type="button"
            className="auth-link"
            onClick={() => { clearError(); onSwitchToRegister(); }}
          >
            立即注册
          </button>
        </p>
      </div>
    </div>
  );
};
