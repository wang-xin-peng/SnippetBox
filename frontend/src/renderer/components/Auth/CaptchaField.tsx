import React, { useMemo } from 'react';

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

interface CaptchaFieldProps {
  value: string;
  onChange: (value: string) => void;
  captcha: string;
  onRefresh: () => void;
  error?: string;
}

export function createCaptchaCode() {
  return randomCode();
}

export const CaptchaField: React.FC<CaptchaFieldProps> = ({ value, onChange, captcha, onRefresh, error }) => {
  const background = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      left: `${8 + i * 16}%`,
      top: `${10 + ((i * 13) % 45)}%`,
      rotate: `${-24 + i * 9}deg`,
    }));
  }, [captcha]);

  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor="captcha_input">
        <span className="auth-label-icon">🛡</span>验证码
      </label>
      <div className="auth-captcha-row">
        <div className="auth-captcha-visual" aria-hidden="true">
          {background.map((item, index) => (
            <span
              key={`${captcha}-${index}`}
              className="auth-captcha-noise"
              style={{ left: item.left, top: item.top, transform: `rotate(${item.rotate})` }}
            >
              /
            </span>
          ))}
          <span className="auth-captcha-text">{captcha}</span>
        </div>
        <button type="button" className="auth-captcha-refresh" onClick={onRefresh}>
          换一张
        </button>
      </div>
      <input
        id="captcha_input"
        className={`auth-input${error ? ' auth-input-error' : ''}`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="请输入图中的字符"
        autoComplete="off"
        maxLength={5}
      />
      {error && <span className="auth-field-error">{error}</span>}
    </div>
  );
};
