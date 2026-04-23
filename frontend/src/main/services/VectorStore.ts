import { VectorDatabase } from '../database/vector';
import { DatabaseManager } from '../database';
import { getEmbeddingWorkerManager } from './EmbeddingWorkerManager';
import { prepareRetrievalText } from './embeddingModel';

interface SearchResult {
  snippetId: string;
  score: number;
}

export class VectorStore {
  private vectorDb: VectorDatabase | null = null;
  private workerManager = getEmbeddingWorkerManager();

  constructor() {}

  private initDb(): void {
    if (this.vectorDb) return;
    const dbManager = DatabaseManager.getInstance();
    dbManager.connect();
    const db = dbManager.getDb();
    this.vectorDb = new VectorDatabase(db);
    this.vectorDb.initialize();
  }

  private async ensureWorker(): Promise<void> {
    if (!this.workerManager.isWorkerRunning()) {
      await this.workerManager.initialize();
    }
  }

  async addVector(snippetId: string, content: string): Promise<string> {
    this.initDb();
    await this.ensureWorker();

    const embedding = await this.workerManager.embed(prepareRetrievalText(content, 'passage'));
    console.log(`[VectorStore] Generated embedding for snippet: ${snippetId}, dim: ${embedding.length}`);

    const vectorId = `vector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.vectorDb!.insertVector({
      id: vectorId,
      snippetId,
      embedding: Buffer.from(new Float32Array(embedding).buffer),
    });
    return vectorId;
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    this.initDb();
    await this.ensureWorker();

    const queryEmbedding = await this.workerManager.embed(prepareRetrievalText(query, 'query'));
    const vectors = this.vectorDb!.getAllVectors();
    console.log(`[VectorStore] Found ${vectors.length} vectors in database`);
    if (vectors.length === 0) return [];

    // 计算所有相似度
    const allResults = vectors.map(v => ({
      snippetId: v.snippetId,
      score: this.cosineSimilarity(queryEmbedding, Array.from(new Float32Array(v.embedding.buffer))),
    })).sort((a, b) => b.score - a.score);

    // 显示所有结果的分数（用于调试）
    console.log(`[VectorStore] Query: "${query}"`);
    console.log(`[VectorStore] All results with scores:`, 
      allResults.map(r => ({ id: r.snippetId.substring(0, 8), score: r.score.toFixed(4) }))
    );

    const results = allResults.slice(0, limit);

    console.log(`[VectorStore] Returning ${results.length} results after ranking`);
    return results;
  }

  async deleteVector(snippetId: string): Promise<void> {
    this.initDb();
    this.vectorDb!.deleteVector(snippetId);
  }

  async getVectorCount(): Promise<number> {
    this.initDb();
    return this.vectorDb!.getVectorCount();
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    let dot = 0, n1 = 0, n2 = 0;
    for (let i = 0; i < vec1.length; i++) {
      dot += vec1[i] * vec2[i];
      n1 += vec1[i] * vec1[i];
      n2 += vec2[i] * vec2[i];
    }
    const denom = Math.sqrt(n1) * Math.sqrt(n2);
    return denom === 0 ? 0 : dot / denom;
  }
}
