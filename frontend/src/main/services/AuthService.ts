import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://8.141.108.146:8000/api/v1';
const TOKEN_KEY = 'auth_tokens';

function extractError(err: any): string {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message ?? '未知错误';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join('；');
  }
  if (typeof detail === 'object') return detail.msg ?? JSON.stringify(detail);
  return String(detail);
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthCapabilities {
  supportsPasswordAuth: boolean;
  supportsRegistration: boolean;
  supportsGithubAuth: boolean;
  supportsGoogleAuth: boolean;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms timestamp
}

export class AuthService {
  private http: AxiosInstance;
  private tokens: StoredTokens | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private capabilitiesCache: { value: AuthCapabilities; expiresAt: number } | null = null;
  private cachedUser: User | null = null;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL, timeout: 5000 });
    this.loadTokens();
  }

  // ── 注册 ──────────────────────────────────────────────
  async register(email: string, password: string, username: string): Promise<void> {
    await this.http.post('/auth/register', { email, password, username });
  }

  // ── 登录 ──────────────────────────────────────────────
  async login(email: string, password: string, rememberMe = true): Promise<LoginResult> {
    const res = await this.http.post('/auth/login', { email, password });
    const data = res.data;

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      // JWT 默认 30 分钟，提前 5 分钟刷新
      expiresAt: Date.now() + (data.expires_in ?? 1800) * 1000,
    };

    this.tokens = tokens;
    if (rememberMe) {
      this.saveTokens(tokens);
    }
    this.scheduleRefresh(tokens.expiresAt);

    const user = await this.getCurrentUser();
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user!,
    };
  }

  // ── 发送邮箱验证码 ─────────────────────────────────────
  async sendCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.http.post('/auth/send-code', { email });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  }

  // ── 验证码登录 ────────────────────────────────────────
  async loginWithCode(email: string, code: string): Promise<LoginResult> {
    const res = await this.http.post('/auth/login-with-code', { email, code });
    const data = res.data;

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 1800) * 1000,
    };

    this.tokens = tokens;
    this.saveTokens(tokens);
    this.scheduleRefresh(tokens.expiresAt);

    const user = await this.getCurrentUser();
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user!,
    };
  }

  // ── 发送注册验证码 ─────────────────────────────────────
  async sendRegisterCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.http.post('/auth/send-register-code', { email });
      console.log('[AuthService] sendRegisterCode response:', JSON.stringify(response.data));
      return { success: true };
    } catch (err: any) {
      console.error('[AuthService] sendRegisterCode error:', err?.response?.status, err?.response?.data);
      // 即使是 4xx 错误，也应该返回错误信息
      if (err?.response?.status === 409) {
        return { success: false, error: err.response.data?.detail || '该邮箱已注册，请直接登录' };
      }
      return { success: false, error: extractError(err) };
    }
  }

  // ── 发送重置密码验证码 ──────────────────────────────────
  async sendResetCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.http.post('/auth/send-reset-code', { email });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  }

  // ── 重置密码 ──────────────────────────────────────────
  async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.http.post('/auth/reset-password', { email, code, new_password: newPassword });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  }

  // ── 修改用户名 ──────────────────────────────────────
  async updateUsername(newUsername: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await this.http.put('/auth/username', { username: newUsername }, {
        headers: { Authorization: `Bearer ${this.tokens?.accessToken}` }
      });
      const d = res.data;
      return {
        success: true,
        user: {
          id: d.id ?? '',
          email: d.email,
          username: d.username,
          avatar: d.avatar,
        }
      };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  }

  // ── 修改密码 ──────────────────────────────────────
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.http.put('/auth/password', { current_password: currentPassword, new_password: newPassword }, {
        headers: { Authorization: `Bearer ${this.tokens?.accessToken}` }
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  }

  // ── 发送修改密码验证码 ──────────────────────────────────────
  async sendChangePasswordCode(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.http.post('/auth/change-password/send-code', {}, {
        headers: { Authorization: `Bearer ${this.tokens?.accessToken}` }
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  }

  // ── 验证修改密码验证码并修改密码 ──────────────────────────────────────
  async verifyChangePasswordCode(email: string, code: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.http.post('/auth/change-password/verify', { email, code, current_password: currentPassword, new_password: newPassword }, {
        headers: { Authorization: `Bearer ${this.tokens?.accessToken}` }
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  }

  // ── 注销账号 ──────────────────────────────────────
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.http.delete('/auth/account', {
        headers: { Authorization: `Bearer ${this.tokens?.accessToken}` }
      });
      this.clearTokens();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  }

  async sendDeleteAccountCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AuthService] sendDeleteAccountCode, hasToken:', !!this.tokens, 'tokenPreview:', this.tokens?.accessToken?.slice(0, 20));
      await this.http.post('/auth/delete-account/send-code', { email }, {
        headers: { Authorization: `Bearer ${this.tokens?.accessToken}` }
      });
      return { success: true };
    } catch (err: any) {
      console.error('[AuthService] sendDeleteAccountCode failed:', err?.response?.status, err?.response?.data || err.message);
      return { success: false, error: extractError(err) };
    }
  }

  async verifyDeleteAccountCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.http.post('/auth/delete-account/verify', { email, code }, {
        headers: { Authorization: `Bearer ${this.tokens?.accessToken}` }
      });
      this.clearTokens();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  }

  // ── 验证注册验证码并完成注册 ─────────────────────────────
  async verifyRegisterCode(email: string, code: string, password: string, username: string): Promise<LoginResult> {
    const res = await this.http.post('/auth/register-with-code', { email, code, password, username });
    const data = res.data;

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 1800) * 1000,
    };

    this.tokens = tokens;
    this.saveTokens(tokens);
    this.scheduleRefresh(tokens.expiresAt);

    const user = await this.getCurrentUser();
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user!,
    };
  }

  // ── 登出 ──────────────────────────────────────────────
  async logout(): Promise<void> {
    try {
      if (this.tokens) {
        await this.http.post(
          '/auth/logout',
          {},
          { headers: { Authorization: `Bearer ${this.tokens.accessToken}` } }
        );
      }
    } catch {
      // 忽略服务端错误，本地一定清除
    } finally {
      this.clearTokens();
    }
  }

  // ── 刷新令牌 ──────────────────────────────────────────
  async refreshToken(): Promise<string> {
    if (!this.tokens?.refreshToken) throw new Error('No refresh token');

    const res = await this.http.post('/auth/refresh', {
      refresh_token: this.tokens.refreshToken,
    });

    const data = res.data;
    const updated: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? this.tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 1800) * 1000,
    };

    this.tokens = updated;
    this.saveTokens(updated);
    this.scheduleRefresh(updated.expiresAt);
    return updated.accessToken;
  }

  // ── 获取当前用户 ──────────────────────────────────────
  async getCurrentUser(): Promise<User | null> {
    if (!this.tokens?.accessToken) return null;
    // 如果 token 已过期，先刷新
    if (this.tokens.expiresAt <= Date.now()) {
      try {
        await this.refreshToken();
      } catch {
        return null;
      }
    }
    try {
      const res = await this.http.get('/auth/me', {
        headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
      });
      const d = res.data;
      const user = {
        id: d.id ?? d.user_id ?? '',
        email: d.email,
        username: d.username ?? d.name ?? d.email,
        avatar: d.avatar,
      };
      this.cachedUser = user;
      return user;
    } catch {
      return this.cachedUser; // 网络失败时返回缓存
    }
  }

  // 不发网络请求，直接返回缓存的用户信息
  getCachedUser(): User | null {
    return this.cachedUser;
  }

  // ── 是否已登录 ────────────────────────────────────────
  isLoggedIn(): boolean {
    if (!this.tokens?.accessToken) return false;
    // token 未过期，或者有 refresh token 可以续期
    return this.tokens.expiresAt > Date.now() || !!this.tokens.refreshToken;
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  async getCapabilities(): Promise<AuthCapabilities> {
    if (this.capabilitiesCache && this.capabilitiesCache.expiresAt > Date.now()) {
      return this.capabilitiesCache.value;
    }

    const fallback: AuthCapabilities = {
      supportsPasswordAuth: true,
      supportsRegistration: true,
      supportsGithubAuth: false,
      supportsGoogleAuth: false,
    };

    try {
      const res = await axios.get(`${BASE_URL.replace(/\/api\/v1$/, '')}/openapi.json`, { timeout: 5000 });
      const paths = res.data?.paths ?? {};

      const value: AuthCapabilities = {
        supportsPasswordAuth: Boolean(paths['/api/v1/auth/login']),
        supportsRegistration: Boolean(paths['/api/v1/auth/register']),
        supportsGithubAuth: Boolean(paths['/api/v1/auth/github'] || paths['/api/v1/auth/github/login']),
        supportsGoogleAuth: Boolean(paths['/api/v1/auth/google'] || paths['/api/v1/auth/google/login']),
      };

      this.capabilitiesCache = {
        value,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      return value;
    } catch {
      return fallback;
    }
  }

  // ── 令牌持久化（safeStorage 加密 + 文件存储）────────────────────
  private get tokenFilePath(): string {
    return path.join(app.getPath('userData'), 'auth_tokens.dat');
  }

  private get userFilePath(): string {
    return path.join(app.getPath('userData'), 'auth_user.json');
  }

  private saveTokens(tokens: StoredTokens): void {
    try {
      const json = JSON.stringify(tokens);
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(json);
        fs.writeFileSync(this.tokenFilePath, encrypted);
      } else {
        fs.writeFileSync(this.tokenFilePath, json, 'utf-8');
      }
    } catch (e) {
      console.error('[AuthService] Failed to save tokens:', e);
    }
    // 同时持久化缓存的用户信息
    if (this.cachedUser) {
      try {
        fs.writeFileSync(this.userFilePath, JSON.stringify(this.cachedUser), 'utf-8');
      } catch {}
    }
  }

  private loadTokens(): void {
    try {
      if (!fs.existsSync(this.tokenFilePath)) return;
      const raw = fs.readFileSync(this.tokenFilePath);
      let json: string;
      if (safeStorage.isEncryptionAvailable()) {
        json = safeStorage.decryptString(raw as Buffer);
      } else {
        json = raw.toString('utf-8');
      }
      this.tokens = JSON.parse(json);

      // 恢复缓存的用户信息
      try {
        if (fs.existsSync(this.userFilePath)) {
          this.cachedUser = JSON.parse(fs.readFileSync(this.userFilePath, 'utf-8'));
        }
      } catch {}

      if (this.tokens && this.tokens.expiresAt > Date.now()) {
        this.scheduleRefresh(this.tokens.expiresAt);
      } else if (this.tokens) {
        // token 过期，后台静默刷新，不阻塞启动
        this.refreshToken().catch(() => this.clearTokens());
      }
    } catch {
      this.tokens = null;
    }
  }

  private clearTokens(): void {
    this.tokens = null;
    this.cachedUser = null;
    try { fs.unlinkSync(this.tokenFilePath); } catch { /* ignore */ }
    try { fs.unlinkSync(this.userFilePath); } catch { /* ignore */ }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // access_token 过期前 5 分钟自动刷新
  private scheduleRefresh(expiresAt: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const delay = expiresAt - Date.now() - 5 * 60 * 1000;
    if (delay <= 0) {
      this.refreshToken().catch(() => this.clearTokens());
      return;
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshToken().catch(() => this.clearTokens());
    }, delay);
  }
}

// 单例
let instance: AuthService | null = null;
export function getAuthService(): AuthService {
  if (!instance) instance = new AuthService();
  return instance;
}
