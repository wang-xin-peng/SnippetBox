import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../store/authStore';

interface LoginDialogProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
}

type LoginMode = 'password' | 'code';

export const LoginDialog: React.FC<LoginDialogProps> = ({ onClose, onSwitchToRegister }) => {
  const { login, loading, error, clearError, checkAuth } = useAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [capsLock, setCapsLock] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  const remainingCooldown = useMemo(
    () => Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)),
    [cooldownUntil]
  );

  useEffect(() => {
    if (remainingCooldown <= 0) return;
    const timer = window.setInterval(() => {
      if (Date.now() >= cooldownUntil) {
        setCooldownUntil(0);
        window.clearInterval(timer);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [cooldownUntil, remainingCooldown]);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCodeCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [codeCooldown]);

  const validatePasswordMode = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = '邮箱不能为空';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = '请输入有效的邮箱地址';
    if (!password) errs.password = '密码不能为空';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateCodeMode = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = '邮箱不能为空';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = '请输入有效的邮箱地址';
    if (!code.trim()) errs.code = '验证码不能为空';
    else if (!/^\d{6}$/.test(code.trim())) errs.code = '验证码应为6位数字';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      setFieldErrors((prev) => ({ ...prev, email: '请先输入邮箱地址' }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldErrors((prev) => ({ ...prev, email: '请输入有效的邮箱地址' }));
      return;
    }
    if (codeCooldown > 0) return;

    setSendingCode(true);
    setCodeError('');
    try {
      const res = await window.electron.ipcRenderer.invoke('auth:sendCode', email.trim());
      if (res.success) {
        setCodeSent(true);
        setCodeCooldown(60);
        setFieldErrors((prev) => ({ ...prev, email: '' }));
      } else {
        setCodeError(res.error || '发送验证码失败');
      }
    } catch (err: any) {
      setCodeError(err.message || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remainingCooldown > 0 || !validatePasswordMode()) return;
    const ok = await login(email.trim(), password, rememberMe);
    if (ok) onClose();
    else {
      const attempts = Number(sessionStorage.getItem('auth_login_attempts') || '0') + 1;
      sessionStorage.setItem('auth_login_attempts', String(attempts));
      if (attempts >= 5) {
        const until = Date.now() + 30_000;
        setCooldownUntil(until);
        sessionStorage.setItem('auth_login_attempts', '0');
      }
    }
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCodeMode()) return;

    setCodeError('');
    try {
      const res = await window.electron.ipcRenderer.invoke('auth:loginWithCode', email.trim(), code.trim());
      if (res.success) {
        await checkAuth();
        setTimeout(async () => {
          try {
            const pullResult = await window.electron.ipcRenderer.invoke('sync:pull');
            if (pullResult.success) {
              console.log(`[Auth] Successfully pulled ${pullResult.data?.pulled ?? 0} snippets from cloud`);
            }
            window.dispatchEvent(new Event('snippets-refresh'));
          } catch (error) {
            console.error('[Auth] Login post-processing failed:', error);
          }
        }, 300);
        onClose();
      } else {
        setCodeError(res.error || '验证码错误');
      }
    } catch (err: any) {
      setCodeError(err.message || '登录失败');
    }
  };

  return (
    <div className="auth-dialog-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="auth-dialog-close" onClick={onClose} aria-label="关闭">×</button>

        <div className="auth-title-wrap">
          <h2 className="auth-title">欢迎回来</h2>
          <p className="auth-subtitle">使用已同步的云端账户继续工作</p>
        </div>

        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`auth-mode-tab ${loginMode === 'password' ? 'active' : ''}`}
            onClick={() => { setLoginMode('password'); clearError(); }}
          >
            密码登录
          </button>
          <button
            type="button"
            className={`auth-mode-tab ${loginMode === 'code' ? 'active' : ''}`}
            onClick={() => { setLoginMode('code'); clearError(); setCodeError(''); }}
          >
            验证码登录
          </button>
        </div>

        <form className="auth-form" onSubmit={loginMode === 'password' ? handlePasswordLogin : handleCodeLogin} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login_email"><span className="auth-label-icon">✉</span>邮箱</label>
            <input
              id="login_email"
              className={`auth-input${fieldErrors.email ? ' auth-input-error' : ''}`}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })); }}
              placeholder="请输入邮箱地址"
              autoComplete="email"
            />
            {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
          </div>

          {loginMode === 'password' ? (
            <div className="auth-field">
              <label className="auth-label" htmlFor="login_password"><span className="auth-label-icon">🔒</span>密码</label>
              <div className="auth-input-wrap">
                <input
                  id="login_password"
                  className={`auth-input${fieldErrors.password ? ' auth-input-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })); }}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  placeholder="输入密码"
                  autoComplete="current-password"
                />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
              {capsLock && <span className="auth-helper-text">检测到大写锁定已开启。</span>}
            </div>
          ) : (
            <div className="auth-field">
              <label className="auth-label" htmlFor="login_code"><span className="auth-label-icon">🔢</span>验证码</label>
              <div className="auth-input-row">
                <input
                  id="login_code"
                  className={`auth-input${fieldErrors.code ? ' auth-input-error' : ''}`}
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setFieldErrors((prev) => ({ ...prev, code: '' })); }}
                  placeholder="输入6位验证码"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <button
                  type="button"
                  className="auth-code-btn"
                  onClick={handleSendCode}
                  disabled={sendingCode || codeCooldown > 0}
                >
                  {sendingCode ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}秒` : codeSent ? '重新获取' : '获取验证码'}
                </button>
              </div>
              {fieldErrors.code && <span className="auth-field-error">{fieldErrors.code}</span>}
              {codeError && <span className="auth-field-error">{codeError}</span>}
            </div>
          )}

          {loginMode === 'password' && (
            <div className="auth-row">
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                记住我
              </label>
              <span className="auth-muted-link" title="当前后端未开放找回密码接口">忘记密码暂未开放</span>
            </div>
          )}

          {remainingCooldown > 0 && (
            <div className="auth-error-banner">登录尝试过多，请在 {remainingCooldown} 秒后重试。</div>
          )}
          {error && <div className="auth-error-banner">{error}</div>}

          <button className="auth-submit-btn" type="submit" disabled={loading || remainingCooldown > 0}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

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