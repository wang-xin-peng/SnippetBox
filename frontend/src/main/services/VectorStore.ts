import { VectorDatabase } from '../database/vector';
import { DatabaseManager } from '../database';
import { getLocalEmbeddingService } from './LocalEmbeddingService';

interface SearchResult {
  snippetId: string;
  score: number;
}

export class VectorStore {
  private vectorDb: VectorDatabase | null = null;
  private embeddingService = getLocalEmbeddingService();

  constructor() {
    // 初始化将在需要时进行
  }

  private initialize(): void {
    if (this.vectorDb) return;
    
    const dbManager = DatabaseManager.getInstance();
    dbManager.connect();
    const db = dbManager.getDb();
    this.vectorDb = new VectorDatabase(db);
    this.vectorDb.initialize();
  }

  async addVector(snippetId: string, content: string): Promise<string> {
    this.initialize();
    
    try {
      // 确保嵌入服务已初始化
      if (!this.embeddingService.isModelLoaded()) {
        console.log('[VectorStore] Initializing embedding service...');
        await this.embeddingService.initialize();
      }

      // 使用嵌入服务生成向量
      const embedding = await this.embeddingService.embed(content);
      console.log(`[VectorStore] Generated embedding for snippet: ${snippetId}, dimension: ${embedding.length}`);
      
      const vectorId = `vector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (!this.vectorDb) {
        throw new Error('Vector database not initialized');
      }

      this.vectorDb.insertVector({
        id: vectorId,
        snippetId,
        embedding: Buffer.from(new Float32Array(embedding).buffer)
      });

      return vectorId;
    } catch (error) {
      console.error(`[VectorStore] Failed to add vector for snippet ${snippetId}:`, error);
      throw error;
    }
  }

  async batchAddVectors(snippets: Array<{ id: string; content: string }>): Promise<string[]> {
    this.initialize();
    
    const vectorIds: string[] = [];

    for (const snippet of snippets) {
      const vectorId = await this.addVector(snippet.id, snippet.content);
      vectorIds.push(vectorId);
    }

    return vectorIds;
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    this.initialize();
    
    try {
      // 确保嵌入服务已初始化
      if (!this.embeddingService.isModelLoaded()) {
        console.log('[VectorStore] Initializing embedding service for search...');
        await this.embeddingService.initialize();
      }

      // 生成查询向量
      const queryEmbedding = await this.embeddingService.embed(query);
      console.log(`[VectorStore] Generated query embedding, dimension: ${queryEmbedding.length}`);
      
      if (!this.vectorDb) {
        throw new Error('Vector database not initialized');
      }
      
      // 获取所有向量
      const vectors = this.vectorDb.getAllVectors();
      console.log(`[VectorStore] Found ${vectors.length} vectors in database`);
      
      if (vectors.length === 0) {
        console.log(`[VectorStore] No vectors found, returning empty results`);
        return [];
      }
      
      // 计算相似度并排序
      const results = vectors.map(vector => {
        // 将 Buffer 转换为 Float32Array
        const vectorEmbedding = Array.from(new Float32Array(vector.embedding.buffer));
        const score = this.cosineSimilarity(queryEmbedding, vectorEmbedding);
        return {
          snippetId: vector.snippetId,
          score
        };
      });

      // 排序并返回前 limit 个结果
      const topResults = results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      console.log(`[VectorStore] Top ${topResults.length} results:`, topResults.map(r => ({ id: r.snippetId, score: r.score.toFixed(4) })));
      return topResults;
    } catch (error) {
      console.error(`[VectorStore] Search failed:`, error);
      throw error;
    }
  }

  async deleteVector(snippetId: string): Promise<void> {
    this.initialize();
    
    if (!this.vectorDb) {
      throw new Error('Vector database not initialized');
    }
    
    this.vectorDb.deleteVector(snippetId);
  }

  async getVectorCount(): Promise<number> {
    this.initialize();
    
    if (!this.vectorDb) {
      throw new Error('Vector database not initialized');
    }
    
    return this.vectorDb.getVectorCount();
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] ** 2;
      norm2 += vec2[i] ** 2;
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }
}
