import { ipcMain } from 'electron';
import { getDatabaseManager } from '../database';
import { SearchEngine } from '../services/SearchEngine';
import { getLocalEmbeddingService } from '../services/LocalEmbeddingService';
import { VectorStore } from '../services/VectorStore';

let searchEngine: SearchEngine | null = null;
const embeddingService = getLocalEmbeddingService();
let vectorStore: VectorStore | null = null;

function expandSearchTerms(query: string): string[] {
  const normalized = query.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];

  const genericSuffixes = ['方法', '方式', '相关', '怎么做', '如何', '技巧', '方案', '实现'];
  const result = new Set<string>([normalized]);

  let stripped = normalized;
  for (const suffix of genericSuffixes) {
    if (stripped.endsWith(suffix) && stripped.length > suffix.length) {
      stripped = stripped.slice(0, -suffix.length).trim();
      if (stripped) result.add(stripped);
    }
  }

  const cnParts = normalized.match(/[\u4e00-\u9fa5]{2,}/g) ?? [];
  cnParts.forEach(part => {
    result.add(part);
    for (let i = 0; i < part.length - 1; i++) {
      const chunk = part.slice(i, i + 2);
      if (chunk.length === 2) result.add(chunk);
    }
    for (let i = 0; i < part.length - 2; i++) {
      const chunk = part.slice(i, i + 3);
      if (chunk.length === 3) result.add(chunk);
    }
  });

  const wordParts = normalized
    .toLowerCase()
    .split(/[\s,./\\|+_\-:;!?()[\]{}]+/)
    .map(part => part.trim())
    .filter(part => part.length >= 2);
  wordParts.forEach(part => result.add(part));

  return Array.from(result).filter(Boolean);
}

function computeTextMatchScore(query: string, snippet: { title?: string; code?: string; language?: string }): number {
  const normalizedQuery = query.trim().toLowerCase();
  const title = (snippet.title ?? '').toLowerCase();
  const code = (snippet.code ?? '').toLowerCase();
  const language = (snippet.language ?? '').toLowerCase();

  if (!normalizedQuery) return 0;

  let score = 0;
  if (title === normalizedQuery) score += 1.2;
  if (title.startsWith(normalizedQuery)) score += 0.7;
  if (title.includes(normalizedQuery)) score += 0.5;
  if (code.includes(normalizedQuery)) score += 0.15;
  if (language.includes(normalizedQuery)) score += 0.05;

  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  const compactTitle = title.replace(/\s+/g, '');
  if (compactTitle === compactQuery) score += 0.35;
  if (compactTitle.includes(compactQuery)) score += 0.15;

  return score;
}

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
      
      const expandedTerms = expandSearchTerms(query);

      // 检查向量数量
      const vectorCount = await vectorStore.getVectorCount();
      console.log(`[SearchHandlers] Vector count in DB: ${vectorCount}`);

      // 确保嵌入服务已初始化
      if (!embeddingService.isModelLoaded()) {
        console.log('[SearchHandlers] Model not loaded, initializing...');
        await embeddingService.initialize();
      }

      const dbManager = getDatabaseManager();
      const db = dbManager.getDb();

      const merged = new Map<string, { snippet: any; similarity: number }>();

      if (vectorCount > 0) {
        console.log('[SearchHandlers] Searching similar vectors...');
        for (const term of expandedTerms.slice(0, 6)) {
          const vectorResults = await vectorStore.search(term, 20);
          for (const result of vectorResults) {
            const snippet = db.prepare('SELECT * FROM snippets WHERE id = ?').get(result.snippetId) as any;
            if (!snippet) continue;

            const existing = merged.get(snippet.id);
            const boostedScore = result.score + (term === query.trim() ? 0.12 : 0.04);
            if (!existing || boostedScore > existing.similarity) {
              merged.set(snippet.id, {
                snippet: {
                  id: snippet.id,
                  title: snippet.title,
                  code: snippet.code,
                  language: snippet.language,
                  createdAt: new Date(snippet.created_at),
                  updatedAt: new Date(snippet.updated_at)
                },
                similarity: boostedScore
              });
            }
          }
        }
      }

      const keywordResults = await searchEngine.searchMultipleKeywords(expandedTerms);
      for (const keyword of keywordResults) {
        const existing = merged.get(keyword.id);
        const keywordScore = 0.75 + keyword.relevance * 0.2;
        if (!existing || keywordScore > existing.similarity) {
          merged.set(keyword.id, {
            snippet: {
              id: keyword.id,
              title: keyword.title,
              code: keyword.code,
              language: keyword.language,
              createdAt: keyword.createdAt,
              updatedAt: keyword.createdAt
            },
            similarity: keywordScore
          });
        }
      }

      const results = Array.from(merged.values())
        .map((result) => ({
          ...result,
          similarity: result.similarity + computeTextMatchScore(query, result.snippet),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20);

      console.log('[SearchHandlers] Found', results.length, 'semantic results after hybrid merge');
      return results;
    } catch (error) {
      console.error('[SearchHandlers] Semantic search failed:', error);
      if (searchEngine) {
        const fallbackTerms = expandSearchTerms(query);
        const fallback = await searchEngine.searchMultipleKeywords(fallbackTerms);
        return fallback.map(result => ({
          snippet: {
            id: result.id,
            title: result.title,
            code: result.code,
            language: result.language,
            createdAt: result.createdAt,
            updatedAt: result.createdAt
          },
          similarity: 0.6 + result.relevance * 0.2
        }));
      }
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

  console.log('[SearchHandlers] All search handlers registered successfully');
}
