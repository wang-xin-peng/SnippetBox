// 短链接分享相关类型定义

export type ShareExpiry = '1d' | '7d' | '30d' | 'never';

export interface CreateShareRequest {
  snippetId: string;
  expiry: ShareExpiry;
  password?: string;
}

export interface ShareInfo {
  id: string;
  snippetId: string;
  shortCode: string;
  shortUrl: string;
  expiry: ShareExpiry;
  hasPassword: boolean;
  viewCount: number;
  createdAt: number;
  expiresAt: number | null;
}

export interface ShareListItem extends ShareInfo {
  snippetTitle: string;
  snippetLanguage: string;
}
