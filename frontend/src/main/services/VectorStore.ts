import { VectorDatabase } from '../database/vector';
import { DatabaseManager } from '../database';

interface SearchResult {
  snippetId: string;
  score: number;
}

export class VectorStore {
  private vectorDb: VectorDatabase | null = null;

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
    
    // 生成向量嵌入（这里使用模拟实现，实际应使用真实的嵌入模型）
    const embedding = this.generateEmbedding(content);
    const vectorId = `vector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!this.vectorDb) {
      throw new Error('Vector database not initialized');
    }

    this.vectorDb.insertVector({
      id: vectorId,
      snippetId,
      embedding: Buffer.from(embedding)
    });

    return vectorId;
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
    
    // 生成查询向量
    const queryEmbedding = this.generateEmbedding(query);
    
    if (!this.vectorDb) {
      throw new Error('Vector database not initialized');
    }
    
    // 获取所有向量
    const vectors = this.vectorDb.getAllVectors();
    
    // 计算相似度并排序
    const results = vectors.map(vector => {
      const vectorEmbedding = Array.from(vector.embedding);
      const score = this.cosineSimilarity(queryEmbedding, vectorEmbedding);
      return {
        snippetId: vector.snippetId,
        score
      };
    });

    // 排序并返回前 limit 个结果
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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

  private generateEmbedding(text: string): number[] {
    // 模拟向量嵌入生成
    // 实际应用中应使用真实的嵌入模型，如 OpenAI API 或本地模型
    const embedding: number[] = [];
    for (let i = 0; i < 128; i++) {
      embedding.push(Math.sin(i * text.length) * 0.5 + 0.5);
    }
    return embedding;
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
