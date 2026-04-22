import { ipcMain } from 'electron';
import { getDatabaseManager } from '../database';
import { SearchEngine } from '../services/SearchEngine';
import { getLocalEmbeddingService } from '../services/LocalEmbeddingService';
import { VectorStore } from '../services/VectorStore';

let searchEngine: SearchEngine | null = null;
const embeddingService = getLocalEmbeddingService();
let vectorStore: VectorStore | null = null;

/**
 * 注册搜索相关的 IPC 处理器
 */
export function registerSearchHandlers() {
  console.log('[SearchHandlers] Registering search IPC handlers...');
  
  try {
    const dbManager = getDatabaseManager();
    const db = dbManager.getDb();
    searchEngine = new SearchEngine(db);
    vectorStore = new VectorStore();
    
    // 初始化嵌入服务（异步，不阻塞）
    embeddingService.initialize().catch(err => {
      console.warn('[SearchHandlers] Embedding service unavailable (model not downloaded)')
    })

    
    console.log('[SearchHandlers] SearchEngine initialized successfully');
  } catch (error) {
    console.error('[SearchHandlers] Failed to initialize SearchEngine:', error);
    return;
  }

  // 关键词搜索
  ipcMain.handle('search:keyword', async (_event, query: string) => {
    try {
      console.log('[SearchHandlers] Keyword search:', query);
      if (!searchEngine) throw new Error('SearchEngine not initialized');
      const results = await searchEngine.search(query);
      console.log('[SearchHandlers] Found', results.length, 'results');
      return results;
    } catch (error) {
      console.error('[SearchHandlers] Keyword search failed:', error);
      throw error;
    }
  });

  // 语义搜索
  ipcMain.handle('search:semantic', async (_event, query: string) => {
    try {
      console.log('[SearchHandlers] Semantic search:', query);
      
      if (!embeddingService) throw new Error('EmbeddingService not initialized');
      if (!vectorStore) throw new Error('VectorStore not initialized');
      if (!searchEngine) throw new Error('SearchEngine not initialized');
      
      // 检查向量数量
      const vectorCount = await vectorStore.getVectorCount();
      console.log(`[SearchHandlers] Vector count in DB: ${vectorCount}`);
      
      if (vectorCount === 0) {
        console.warn('[SearchHandlers] No vectors in DB, returning empty results. Please generate vectors first.');
        return [];
      }

      // 确保嵌入服务已初始化
      if (!embeddingService.isModelLoaded()) {
        console.log('[SearchHandlers] Model not loaded, initializing...');
        await embeddingService.initialize();
      }
      
      // 向量相似度搜索（增加返回数量）
      console.log('[SearchHandlers] Searching similar vectors...');
      const vectorResults = await vectorStore.search(query, 30);
      console.log('[SearchHandlers] Found', vectorResults.length, 'vector results:', vectorResults);
      
      // 获取完整的片段信息
      const dbManager = getDatabaseManager();
      const db = dbManager.getDb();
      const results = vectorResults.map((result: { snippetId: string; score: number }) => {
        const snippet = db.prepare('SELECT * FROM snippets WHERE id = ?').get(result.snippetId) as any;
        if (!snippet) return null;
        
        return {
          snippet: {
            id: snippet.id,
            title: snippet.title,
            code: snippet.code,
            language: snippet.language,
            createdAt: new Date(snippet.created_at),
            updatedAt: new Date(snippet.updated_at)
          },
          similarity: result.score
        };
      }).filter(Boolean);
      
      console.log('[SearchHandlers] Found', results.length, 'semantic results');
      return results;
    } catch (error) {
      console.error('[SearchHandlers] Semantic search failed:', error);
      throw error;
    }
  });

  // 混合搜索（关键词 + 语义）
  ipcMain.handle('search:hybrid', async (_event, query: string) => {
    try {
      console.log('[SearchHandlers] Hybrid search:', query);
      
      if (!searchEngine) throw new Error('SearchEngine not initialized');
      if (!embeddingService) throw new Error('EmbeddingService not initialized');
      if (!vectorStore) throw new Error('VectorStore not initialized');
      
      // 并行执行关键词搜索和语义搜索
      const [keywordResults, semanticResults] = await Promise.all([
        searchEngine.search(query),
        (async () => {
          try {
            const isLoaded = await embeddingService!.isModelLoaded();
            if (!isLoaded) {
              await embeddingService!.initialize();
            }
            const vectorResults = await vectorStore!.search(query, 10);
            
            // 获取完整片段信息
            const dbManager = getDatabaseManager();
            const db = dbManager.getDb();
            return vectorResults.map((result: { snippetId: string; score: number }) => {
              const snippet = db.prepare('SELECT * FROM snippets WHERE id = ?').get(result.snippetId) as any;
              if (!snippet) return null;
              
              return {
                snippet: {
                  id: snippet.id,
                  title: snippet.title,
                  code: snippet.code,
                  language: snippet.language,
                  createdAt: new Date(snippet.created_at),
                  updatedAt: new Date(snippet.updated_at)
                },
                similarity: result.score
              };
            }).filter(Boolean);
          } catch (error) {
            console.warn('[SearchHandlers] Semantic search failed in hybrid mode:', error);
            return [];
          }
        })()
      ]);
      
      // 合并结果并去重
      const resultMap = new Map();
      
      // 添加关键词搜索结果（给予较高的基础分数）
      keywordResults.forEach((result: any) => {
        resultMap.set(result.id, {
          ...result,
          score: result.relevance * 2.0, // 提高关键词搜索的权重
          source: 'keyword'
        });
      });
      
      // 添加语义搜索结果
      semanticResults.forEach((result: any) => {
        if (resultMap.has(result.snippet.id)) {
          // 如果已存在，合并分数（关键词 + 语义）
          const existing = resultMap.get(result.snippet.id);
          existing.score = existing.score + result.similarity * 1.5; // 语义作为补充
          existing.source = 'hybrid';
        } else {
          // 纯语义结果，分数较低
          resultMap.set(result.snippet.id, {
            ...result.snippet,
            score: result.similarity * 0.8, // 降低纯语义结果的权重
            source: 'semantic'
          });
        }
      });
      
      // 按分数排序
      const mergedResults = Array.from(resultMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      
      console.log('[SearchHandlers] Hybrid search completed:', mergedResults.length, 'results');
      return mergedResults;
    } catch (error) {
      console.error('[SearchHandlers] Hybrid search failed:', error);
      throw error;
    }
  });

  // 检查搜索能力
  ipcMain.handle('search:capability', async () => {
    try {
      const hasModel = embeddingService ? embeddingService.isModelLoaded() : false;
      return {
        hasKeywordSearch: true,
        hasSemanticSearch: hasModel,
        hasHybridSearch: hasModel
      };
    } catch (error) {
      console.error('[SearchHandlers] Failed to check capability:', error);
      return {
        hasKeywordSearch: true,
        hasSemanticSearch: false,
        hasHybridSearch: false
      };
    }
  });

  // 云端语义搜索
  ipcMain.handle('search:cloudSemantic', async (_event, query: string) => {
    try {
      console.log('[SearchHandlers] Cloud semantic search:', query);
      
      const authService = (await import('../services/AuthService')).getAuthService();
      const token = authService.getAccessToken();
      
      if (!token) {
        throw new Error('未登录，无法使用云端搜索');
      }

      const axios = (await import('axios')).default;
      const BASE_URL = 'http://8.141.108.146:8000/api/v1';

      // 1. 先生成查询向量
      const embedResponse = await axios.post(
        `${BASE_URL}/embed`,
        { text: query },
        { timeout: 30000 }
      );
      
      const queryVector = embedResponse.data.vector;
      console.log('[SearchHandlers] Query vector generated, dimension:', queryVector.length);

      // 2. 使用向量搜索
      const searchResponse = await axios.post(
        `${BASE_URL}/vector-sync/search`,
        {
          query_vector: queryVector,
          limit: 20,
          threshold: 0.5
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000
        }
      );

      const results = searchResponse.data.results || [];
      console.log('[SearchHandlers] Found', results.length, 'cloud semantic results');

      // 转换为前端格式
      return results.map((result: any) => ({
        snippet: {
          id: result.snippet_id,
          title: result.title,
          language: result.language,
          code: result.code,
          description: result.description,
          category: result.category,
          tags: result.tags || [],
          createdAt: new Date(result.created_at),
          updatedAt: new Date(result.updated_at),
        },
        score: result.similarity,
      }));
    } catch (error: any) {
      console.error('[SearchHandlers] Cloud semantic search failed:', error);
      if (error.response?.status === 401) {
        throw new Error('登录已过期，请重新登录');
      }
      throw error;
    }
  });

  console.log('[SearchHandlers] All search handlers registered successfully');
}
