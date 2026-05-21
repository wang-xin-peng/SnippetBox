export const API_CONFIG = {
  baseUrl: process.env.API_BASE_URL ?? 'http://localhost:8000',
  apiV1: '/api/v1',
  health: '/health',
};

export function getApiBaseUrl(): string {
  return API_CONFIG.baseUrl;
}

export function getApiV1Url(): string {
  return `${API_CONFIG.baseUrl}${API_CONFIG.apiV1}`;
}

export function getHealthUrl(): string {
  return `${API_CONFIG.baseUrl}${API_CONFIG.health}`;
}
