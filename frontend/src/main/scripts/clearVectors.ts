// 清空所有向量的脚本

import { DatabaseManager } from '../database';

export function clearAllVectors(): void {
  console.log('[ClearVectors] Clearing all vectors...');
  
  try {
    const dbManager = DatabaseManager.getInstance();
    dbManager.connect();
    const db = dbManager.getDb();
    
    // 删除所有向量
    const result = db.prepare('DELETE FROM snippet_vectors').run();
    
    console.log(`[ClearVectors] Cleared ${result.changes} vectors`);
  } catch (error) {
    console.error('[ClearVectors] Failed to clear vectors:', error);
  }
}
