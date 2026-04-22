import React, { useState } from 'react';

export interface AuthFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password';
  placeholder: string;
  icon: string;
}

interface AuthFormProps {
  fields: AuthFormField[];
  submitLabel: string;
  loading: boolean;
  error: string | null;
  onSubmit: (values: Record<string, string>) => void;
  extra?: React.ReactNode;
}

/** 通用认证表单，支持邮箱格式和密码强度校验 */
export const AuthForm: React.FC<AuthFormProps> = ({
  fields,
  submitLabel,
  loading,
  error,
  onSubmit,
  extra,
}) => {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, '']))
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    fields.forEach((f) => {
      const val = values[f.name]?.trim();
      if (!val) {
        errs[f.name] = `${f.label}不能为空`;
        return;
      }
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errs[f.name] = '请输入有效的邮箱地址';
      }

    });

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(values);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {fields.map((f) => (
        <div key={f.name} className="auth-field">
          <label className="auth-label">
            <span className="auth-label-icon">{f.icon}</span>
            {f.label}
          </label>
          <input
            className={`auth-input${fieldErrors[f.name] ? ' auth-input-error' : ''}`}
            type={f.type}
            placeholder={f.placeholder}
            value={values[f.name]}
            onChange={(e) => {
              setValues((v) => ({ ...v, [f.name]: e.target.value }));
              if (fieldErrors[f.name]) setFieldErrors((fe) => ({ ...fe, [f.name]: '' }));
            }}
            autoComplete={f.name === 'password' ? 'current-password' : f.name}
          />
          {fieldErrors[f.name] && (
            <span className="auth-field-error">{fieldErrors[f.name]}</span>
          )}
        </div>
      ))}

      {extra}

      {error && <div className="auth-error-banner">{error}</div>}

      <button className="auth-submit-btn" type="submit" disabled={loading}>
        {loading ? '处理中...' : `${submitLabel} →`}
      </button>
    </form>
  );
};
