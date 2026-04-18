/**
 * 重新生成所有向量
 * 删除旧向量，使用新的方式（包含标题、描述、代码）重新生成
 */

import { DatabaseManager } from '../database';
import { VectorStore } from '../services/VectorStore';
import { VectorDatabase } from '../database/vector';

export async function regenerateVectors(): Promise<void> {
  console.log('[RegenerateVectors] Starting vector regeneration...');
  
  try {
    const dbManager = DatabaseManager.getInstance();
    dbManager.connect();
    const db = dbManager.getDb();
    
    // 获取所有片段
    const snippets = db.prepare('SELECT id, title, code, description FROM snippets').all() as Array<{
      id: string;
      title: string;
      code: string;
      description?: string;
    }>;
    
    console.log(`[RegenerateVectors] Found ${snippets.length} snippets`);
    
    if (snippets.length === 0) {
      console.log('[RegenerateVectors] No snippets found');
      return;
    }
    
    // 清空现有向量
    console.log('[RegenerateVectors] Clearing existing vectors...');
    const vectorDb = new VectorDatabase(db);
    vectorDb.initialize();
    
    db.prepare('DELETE FROM snippet_vector_mapping').run();
    db.prepare('DELETE FROM snippet_vectors').run();
    console.log('[RegenerateVectors] Existing vectors cleared');
    
    // 重新生成向量
    const vectorStore = new VectorStore();
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < snippets.length; i++) {
      const snippet = snippets[i];
      try {
        // 组合标题、描述和代码
        const content = [
          snippet.title,
          snippet.description || '',
          snippet.code
        ].filter(Boolean).join('\n');
        
        console.log(`[RegenerateVectors] Generating vector ${i + 1}/${snippets.length}: ${snippet.title}`);
        console.log(`[RegenerateVectors] Content length: ${content.length} chars`);
        
        await vectorStore.addVector(snippet.id, content);
        successCount++;
        
        // 每处理 1 个片段后就让出主线程，避免阻塞 UI
        await new Promise(resolve => setImmediate(resolve));
      } catch (error) {
        failCount++;
        console.error(`[RegenerateVectors] Failed to generate vector for snippet ${snippet.id}:`, error);
      }
    }
    
    console.log(`[RegenerateVectors] Vector regeneration complete!`);
    console.log(`[RegenerateVectors] Success: ${successCount}, Failed: ${failCount}`);
    
    // 验证结果
    const finalCount = vectorDb.getVectorCount();
    console.log(`[RegenerateVectors] Final vector count: ${finalCount}`);
    
  } catch (error) {
    console.error('[RegenerateVectors] Vector regeneration failed:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  regenerateVectors()
    .then(() => {
      console.log('Vector regeneration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Vector regeneration failed:', error);
      process.exit(1);
    });
}
