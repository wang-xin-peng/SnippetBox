import axios, { AxiosInstance } from 'axios';
import { getDatabaseManager } from '../database';
import { getAuthService } from './AuthService';

const BASE_URL = 'http://8.141.108.146:8000/api/v1';

/**
 * 云端向量同步服务
 * 负责将本地向量同步到云端
 */
export class VectorSyncService {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL, timeout: 30000 });
  }

  /**
   * 同步单个片段的向量到云端
   */
  async syncSnippetVector(snippetId: string, cloudId: string): Promise<boolean> {
    try {
      const token = getAuthService().getAccessToken();
      if (!token) {
        console.warn('[VectorSync] No auth token, skipping vector sync');
        return false;
      }

      const db = getDatabaseManager().getDb();
      
      // 从本地数据库获取向量
      const vectorRow = db
        .prepare('SELECT vector FROM snippet_vectors WHERE snippet_id = ?')
        .get(snippetId) as any;

      if (!vectorRow || !vectorRow.vector) {
        console.log(`[VectorSync] No vector found for snippet ${snippetId}`);
        return false;
      }

      // 解析向量数据
      const vector = JSON.parse(vectorRow.vector);
      
      // 上传到云端
      await this.http.post(
        '/vector-sync/upload',
        {
          snippet_id: cloudId,
          vector: vector
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log(`[VectorSync] Successfully synced vector for snippet ${snippetId}`);
      return true;
    } catch (error: any) {
      console.error(`[VectorSync] Failed to sync vector for snippet ${snippetId}:`, error.message);
      return false;
    }
  }

  /**
   * 批量同步向量
   */
  async batchSyncVectors(snippets: Array<{ localId: string; cloudId: string }>): Promise<{
    success: number;
    failed: number;
  }> {
    const result = { success: 0, failed: 0 };

    try {
      const token = getAuthService().getAccessToken();
      if (!token) {
        console.warn('[VectorSync] No auth token, skipping batch vector sync');
        return result;
      }

      const db = getDatabaseManager().getDb();
      const vectors: Array<{ snippet_id: string; vector: number[] }> = [];

      // 收集所有向量
      for (const { localId, cloudId } of snippets) {
        const vectorRow = db
          .prepare('SELECT vector FROM snippet_vectors WHERE snippet_id = ?')
          .get(localId) as any;

        if (vectorRow && vectorRow.vector) {
          vectors.push({
            snippet_id: cloudId,
            vector: JSON.parse(vectorRow.vector)
          });
        }
      }

      if (vectors.length === 0) {
        console.log('[VectorSync] No vectors to sync');
        return result;
      }

      // 批量上传
      const response = await this.http.post(
        '/vector-sync/batch-upload',
        vectors,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      result.success = response.data.success_count || 0;
      result.failed = response.data.error_count || 0;

      console.log(`[VectorSync] Batch sync completed: ${result.success} success, ${result.failed} failed`);
    } catch (error: any) {
      console.error('[VectorSync] Batch sync failed:', error.message);
      result.failed = snippets.length;
    }

    return result;
  }

  /**
   * 删除云端向量
   */
  async deleteCloudVector(cloudId: string): Promise<boolean> {
    try {
      const token = getAuthService().getAccessToken();
      if (!token) {
        return false;
      }

      await this.http.delete(`/vector-sync/${cloudId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`[VectorSync] Successfully deleted cloud vector ${cloudId}`);
      return true;
    } catch (error: any) {
      console.error(`[VectorSync] Failed to delete cloud vector ${cloudId}:`, error.message);
      return false;
    }
  }

  /**
   * 获取云端向量统计
   */
  async getCloudVectorStats(): Promise<{ total: number; unique: number } | null> {
    try {
      const token = getAuthService().getAccessToken();
      if (!token) {
        return null;
      }

      const response = await this.http.get('/vectors/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      return {
        total: response.data.total_vectors || 0,
        unique: response.data.unique_snippets || 0
      };
    } catch (error: any) {
      console.error('[VectorSync] Failed to get cloud vector stats:', error.message);
      return null;
    }
  }
}

// 单例
let instance: VectorSyncService | null = null;

export function getVectorSyncService(): VectorSyncService {
  if (!instance) {
    instance = new VectorSyncService();
  }
  return instance;
}
