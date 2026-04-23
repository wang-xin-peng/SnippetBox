import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../store/authStore';
import './Auth.css';

interface RegisterDialogProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

type RegisterStep = 'form' | 'verify';

export const RegisterDialog: React.FC<RegisterDialogProps> = ({ onClose, onSwitchToLogin }) => {
  const { register, loading, error, clearError, checkAuth } = useAuth();

  const [step, setStep] = useState<RegisterStep>('form');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCodeCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [codeCooldown]);

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  }, [password]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = '姓名不能为空';
    else if (username.trim().length < 3) errs.username = '姓名至少 3 个字符';
    if (!email.trim()) errs.email = '邮箱不能为空';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = '请输入有效的邮箱地址';
    if (!password) errs.password = '密码不能为空';
    else if (password.length < 8) errs.password = '密码至少 8 位';
    else if (passwordStrength < 3) errs.password = '密码强度不足，建议混合大小写、数字和符号';
    if (!confirm) errs.confirm = '请再次输入密码';
    else if (password && confirm !== password) errs.confirm = '两次密码不一致';
    if (!acceptedTerms) errs.terms = '请先同意使用条款';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateCode = () => {
    const errs: Record<string, string> = {};
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
      const res = await window.electron.ipcRenderer.invoke('auth:sendRegisterCode', email.trim());
      if (res.success) {
        setCodeSent(true);
        setCodeCooldown(60);
        setStep('verify');
      } else {
        setCodeError(res.error || '发送验证码失败');
      }
    } catch (err: any) {
      setCodeError(err.message || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'form') {
      if (!validateForm()) return;
      await handleSendCode();
    } else {
      if (!validateCode()) return;
      setCodeError('');
      try {
        const res = await window.electron.ipcRenderer.invoke('auth:verifyRegisterCode', email.trim(), code.trim(), password, username);
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
              console.error('[Auth] Register post-processing failed:', error);
            }
          }, 300);
          onClose();
        } else {
          setCodeError(res.error || '注册失败');
        }
      } catch (err: any) {
        setCodeError(err.message || '注册失败');
      }
    }
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
          <div className="auth-title-wrap">
            <h2 className="auth-title">创建云端账户</h2>
            <p className="auth-subtitle">
              {step === 'form' ? '注册后即可同步片段、跨设备恢复和分享代码' : '请输入发送到邮箱的验证码'}
            </p>
          </div>

          {step === 'form' ? (
            <>
              {field('username', '姓名', '👤', username, setUsername, 'text', '请输入姓名')}
              {field('email', '邮箱', '✉', email, setEmail, 'email', '请输入邮箱地址')}
              {field('password', '密码', '🔒', password, setPassword, 'password', '设置密码', { show: showPassword, onToggle: () => setShowPassword((v) => !v) })}
              {field('confirm', '确认密码', '🔒', confirm, setConfirm, 'password', '再次输入密码', { show: showConfirm, onToggle: () => setShowConfirm((v) => !v) })}

              <div className="auth-password-strength">
                <span>密码强度</span>
                <div className="auth-password-bars">
                  {[0, 1, 2, 3].map((index) => (
                    <span key={index} className={`auth-password-bar ${index < passwordStrength ? 'active' : ''}`} />
                  ))}
                </div>
                <span className="auth-password-label">
                  {['很弱', '较弱', '中等', '较强', '很强'][passwordStrength]}
                </span>
              </div>

              <label className="auth-checkbox">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    setFieldErrors((prev) => ({ ...prev, terms: '' }));
                  }}
                />
                <span>我已阅读并同意本地使用条款与云同步协议</span>
              </label>
              {fieldErrors.terms && <span className="auth-field-error">{fieldErrors.terms}</span>}
            </>
          ) : (
            <>
              <div className="auth-field">
                <label className="auth-label"><span className="auth-label-icon">✉</span>验证码</label>
                <div className="auth-input-row">
                  <input
                    id="register_code"
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
                    {sendingCode ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}秒` : '重新获取'}
                  </button>
                </div>
                {fieldErrors.code && <span className="auth-field-error">{fieldErrors.code}</span>}
                {codeError && <span className="auth-field-error">{codeError}</span>}
              </div>
              <button
                type="button"
                className="auth-link"
                onClick={() => { setStep('form'); setCodeError(''); }}
              >
                ← 返回修改信息
              </button>
            </>
          )}

          {error && <div className="auth-error-banner">{error}</div>}

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? '注册中...' : step === 'form' ? '获取验证码' : '完成注册'}
          </button>
        </form>

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