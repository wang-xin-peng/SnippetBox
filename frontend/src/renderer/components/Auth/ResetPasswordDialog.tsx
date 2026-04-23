import React, { useState, useEffect } from 'react';

interface ResetPasswordDialogProps {
  onClose: () => void;
  onBackToLogin: () => void;
}

export const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({ onClose, onBackToLogin }) => {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [codeSent, setCodeSent] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCodeCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [codeCooldown]);

  const validateEmail = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = '邮箱不能为空';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = '请输入有效的邮箱地址';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateReset = () => {
    const errs: Record<string, string> = {};
    if (!code.trim()) errs.code = '验证码不能为空';
    else if (!/^\d{6}$/.test(code.trim())) errs.code = '验证码应为6位数字';
    if (!newPassword) errs.newPassword = '新密码不能为空';
    else if (newPassword.length < 8) errs.newPassword = '密码至少8位';
    if (!confirmPassword) errs.confirmPassword = '请确认密码';
    else if (newPassword !== confirmPassword) errs.confirmPassword = '两次密码不一致';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;
    if (codeCooldown > 0) return;

    setSendingCode(true);
    setGlobalError('');
    try {
      const res = await window.electron.ipcRenderer.invoke('auth:sendResetCode', email.trim());
      if (res.success) {
        setCodeSent(true);
        setCodeCooldown(60);
        setStep('reset');
        setFieldErrors({});
      } else {
        setGlobalError(res.error || '发送验证码失败');
      }
    } catch (err: any) {
      setGlobalError(err.message || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateReset()) return;

    setSubmitting(true);
    setGlobalError('');
    try {
      const res = await window.electron.ipcRenderer.invoke('auth:resetPassword', email.trim(), code.trim(), newPassword);
      if (res.success) {
        setSuccess(true);
      } else {
        setGlobalError(res.error || '重置密码失败');
      }
    } catch (err: any) {
      setGlobalError(err.message || '重置密码失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (codeCooldown > 0) return;
    setSendingCode(true);
    setGlobalError('');
    try {
      const res = await window.electron.ipcRenderer.invoke('auth:sendResetCode', email.trim());
      if (res.success) {
        setCodeCooldown(60);
      } else {
        setGlobalError(res.error || '发送验证码失败');
      }
    } catch (err: any) {
      setGlobalError(err.message || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  return (
    <div className="auth-dialog-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="auth-dialog-close" onClick={onClose} aria-label="关闭">×</button>

        <div className="auth-title-wrap">
          <h2 className="auth-title">重置密码</h2>
          <p className="auth-subtitle">
            {success ? '密码已重置成功' : '通过邮箱验证码重置您的密码'}
          </p>
        </div>

        {success ? (
          <div className="auth-form">
            <div className="auth-success-banner">
              ✓ 密码重置成功，请使用新密码登录
            </div>
            <button
              className="auth-submit-btn"
              type="button"
              onClick={onBackToLogin}
            >
              返回登录
            </button>
          </div>
        ) : step === 'email' ? (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label" htmlFor="reset_email"><span className="auth-label-icon">✉</span>邮箱</label>
              <input
                id="reset_email"
                className={`auth-input${fieldErrors.email ? ' auth-input-error' : ''}`}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })); }}
                placeholder="请输入注册时使用的邮箱地址"
                autoComplete="email"
              />
              {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
            </div>

            {globalError && <div className="auth-error-banner">{globalError}</div>}

            <button
              className="auth-submit-btn"
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode}
            >
              {sendingCode ? '发送中...' : '发送验证码'}
            </button>

            <p className="auth-switch">
              <button type="button" className="auth-link" onClick={onBackToLogin}>
                ← 返回登录
              </button>
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleReset} noValidate>
            <div className="auth-field">
              <label className="auth-label"><span className="auth-label-icon">✉</span>邮箱</label>
              <div className="auth-email-display">{email}</div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reset_code"><span className="auth-label-icon">🔢</span>验证码</label>
              <div className="auth-input-row">
                <input
                  id="reset_code"
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
                  onClick={handleResendCode}
                  disabled={sendingCode || codeCooldown > 0}
                >
                  {sendingCode ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}秒` : '重新获取'}
                </button>
              </div>
              {fieldErrors.code && <span className="auth-field-error">{fieldErrors.code}</span>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reset_new_password"><span className="auth-label-icon">🔒</span>新密码</label>
              <div className="auth-input-wrap">
                <input
                  id="reset_new_password"
                  className={`auth-input${fieldErrors.newPassword ? ' auth-input-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, newPassword: '' })); }}
                  placeholder="输入新密码（至少8位）"
                  autoComplete="new-password"
                />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {fieldErrors.newPassword && <span className="auth-field-error">{fieldErrors.newPassword}</span>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reset_confirm_password"><span className="auth-label-icon">🔒</span>确认密码</label>
              <input
                id="reset_confirm_password"
                className={`auth-input${fieldErrors.confirmPassword ? ' auth-input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: '' })); }}
                placeholder="再次输入新密码"
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && <span className="auth-field-error">{fieldErrors.confirmPassword}</span>}
            </div>

            {globalError && <div className="auth-error-banner">{globalError}</div>}

            <button className="auth-submit-btn" type="submit" disabled={submitting}>
              {submitting ? '重置中...' : '重置密码'}
            </button>

            <p className="auth-switch">
              <button type="button" className="auth-link" onClick={() => { setStep('email'); setGlobalError(''); }}>
                ← 返回上一步
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
