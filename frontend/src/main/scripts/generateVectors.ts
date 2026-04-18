/**
 * 为所有现有片段生成向量的脚本
 * 这个脚本应该在应用启动时运行一次，为所有没有向量的片段生成向量
 */

import { DatabaseManager } from '../database';
import { VectorStore } from '../services/VectorStore';
import { VectorDatabase } from '../database/vector';

export async function generateVectorsForExistingSnippets(): Promise<void> {
  console.log('[GenerateVectors] Starting vector generation for existing snippets...');
  
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
    
    console.log(`[GenerateVectors] Found ${snippets.length} snippets`);
    
    if (snippets.length === 0) {
      console.log('[GenerateVectors] No snippets found, skipping vector generation');
      return;
    }
    
    // 检查哪些片段已经有向量
    const vectorDb = new VectorDatabase(db);
    vectorDb.initialize();
    const existingVectors = vectorDb.getAllVectors();
    const existingSnippetIds = new Set(existingVectors.map(v => v.snippetId));
    
    console.log(`[GenerateVectors] Found ${existingVectors.length} existing vectors`);
    
    // 过滤出没有向量的片段
    const snippetsWithoutVectors = snippets.filter(s => !existingSnippetIds.has(s.id));
    
    if (snippetsWithoutVectors.length === 0) {
      console.log('[GenerateVectors] All snippets already have vectors');
      return;
    }
    
    console.log(`[GenerateVectors] Generating vectors for ${snippetsWithoutVectors.length} snippets...`);
    
    // 为没有向量的片段生成向量
    const vectorStore = new VectorStore();
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < snippetsWithoutVectors.length; i++) {
      const snippet = snippetsWithoutVectors[i];
      try {
        // 组合标题、描述和代码，提高语义搜索准确性
        const content = [
          snippet.title,
          snippet.description || '',
          snippet.code
        ].filter(Boolean).join('\n');
        
        await vectorStore.addVector(snippet.id, content);
        successCount++;
        console.log(`[GenerateVectors] Generated vector for snippet ${i + 1}/${snippetsWithoutVectors.length}: ${snippet.id} (${snippet.title})`);
        
        // 每处理 1 个片段后就让出主线程，避免阻塞 UI
        await new Promise(resolve => setImmediate(resolve));
      } catch (error) {
        failCount++;
        console.error(`[GenerateVectors] Failed to generate vector for snippet ${snippet.id}:`, error);
      }
    }
    
    console.log(`[GenerateVectors] Vector generation complete: ${successCount} succeeded, ${failCount} failed`);
  } catch (error) {
    console.error('[GenerateVectors] Vector generation failed:', error);
  }
}
