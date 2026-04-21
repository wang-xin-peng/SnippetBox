import { getAuthService } from './AuthService';
import { CreateShareRequest, ShareInfo, ShareListItem } from '../../shared/types/share';

const API_BASE = process.env.API_BASE_URL ?? 'http://8.141.108.146:8000';

function extractError(err: any): string {
  const detail = err?.detail;
  if (!detail) return JSON.stringify(err);
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join('；');
  if (typeof detail === 'object') return detail.msg ?? JSON.stringify(detail);
  return String(detail);
}

export class ShareService {
  private getHeaders(): Record<string, string> {
    const token = getAuthService().getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // POST /api/v1/share
  async createShare(req: CreateShareRequest): Promise<ShareInfo> {
    const expiryMap: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30, 'never': 365 };
    const body: Record<string, any> = {
      snippet_id: req.snippetId,
      expires_in_days: expiryMap[req.expiry] ?? 7,
    };
    if (req.password) body.password = req.password;

    console.log('[ShareService] createShare request:', JSON.stringify(body));
    const res = await fetch(`${API_BASE}/api/v1/share`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[ShareService] createShare error:', res.status, JSON.stringify(err));
      throw new Error(extractError(err));
    }
    const data = await res.json();
    // 映射后端 snake_case 到前端格式
    return {
      id: data.short_code,
      snippetId: req.snippetId,
      shortCode: data.short_code,
      shortUrl: data.short_url,
      expiry: req.expiry,
      hasPassword: !!req.password,
      viewCount: 0,
      createdAt: Date.now(),
      expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : null,
    };
  }

  // GET /api/v1/shares
  async listShares(): Promise<ShareListItem[]> {
    const res = await fetch(`${API_BASE}/api/v1/shares`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`获取分享列表失败 (${res.status})`);
    const data: any[] = await res.json();
    return data.map(item => ({
      id: item.short_code,
      snippetId: item.snippet_id,
      shortCode: item.short_code,
      shortUrl: `${API_BASE}/s/${item.short_code}`,
      expiry: 'never' as const,
      hasPassword: item.has_password ?? false,
      viewCount: item.view_count ?? 0,
      createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
      expiresAt: item.expires_at ? new Date(item.expires_at).getTime() : null,
      snippetTitle: item.snippet_id,
      snippetLanguage: '',
    }));
  }

  // DELETE /api/v1/share/{short_code}
  async deleteShare(shortCode: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/share/${shortCode}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`删除分享失败 (${res.status})`);
  }

  // GET /api/v1/share/{short_code}/info
  async getShare(shortCode: string): Promise<ShareInfo> {
    const res = await fetch(`${API_BASE}/api/v1/share/${shortCode}/info`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`获取分享详情失败 (${res.status})`);
    return res.json();
  }

  // GET /api/v1/share/{short_code}/stats
  async getShareStats(shortCode: string): Promise<{ viewCount: number }> {
    const res = await fetch(`${API_BASE}/api/v1/share/${shortCode}/stats`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`获取分享统计失败 (${res.status})`);
    return res.json();
  }
}

let instance: ShareService | null = null;
export function getShareService(): ShareService {
  if (!instance) instance = new ShareService();
  return instance;
}
