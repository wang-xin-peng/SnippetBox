import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://8.141.108.146:8000/api/v1';
const TOKEN_KEY = 'auth_tokens';

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

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms timestamp
}

export class AuthService {
  private http: AxiosInstance;
  private tokens: StoredTokens | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL, timeout: 10000 });
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
    try {
      const res = await this.http.get('/auth/me', {
        headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
      });
      const d = res.data;
      return {
        id: d.id ?? d.user_id ?? '',
        email: d.email,
        username: d.username ?? d.name ?? d.email,
        avatar: d.avatar,
      };
    } catch {
      return null;
    }
  }

  // ── 是否已登录 ────────────────────────────────────────
  isLoggedIn(): boolean {
    return !!this.tokens?.accessToken;
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  // ── 令牌持久化（safeStorage 加密 + 文件存储）────────────────────
  private get tokenFilePath(): string {
    return path.join(app.getPath('userData'), 'auth_tokens.dat');
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

      if (this.tokens && this.tokens.expiresAt > Date.now()) {
        this.scheduleRefresh(this.tokens.expiresAt);
      } else if (this.tokens) {
        this.refreshToken().catch(() => this.clearTokens());
      }
    } catch {
      this.tokens = null;
    }
  }

  private clearTokens(): void {
    this.tokens = null;
    try { fs.unlinkSync(this.tokenFilePath); } catch { /* ignore */ }
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
