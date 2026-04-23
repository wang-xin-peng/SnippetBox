import * as ort from 'onnxruntime-node';
import * as path from 'path';
import * as fs from 'fs';
import { getEmbeddingModelDir } from './embeddingModel';

/**
 * 简化的嵌入服务
 * 直接使用 ONNX Runtime，不依赖 transformers 库
 */
export class SimpleEmbeddingService {
  private session: ort.InferenceSession | null = null;
  private vocab: Map<string, number> = new Map();
  private modelPath: string;
  private isInitialized = false;

  constructor() {
    this.modelPath = getEmbeddingModelDir();
  }

  /**
   * 初始化模型
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const modelFile = path.join(this.modelPath, 'model.onnx');
      
      // 检查模型文件是否存在
      if (!fs.existsSync(modelFile)) {
        console.log('[SimpleEmbedding] Model file not found, using mock embeddings');
        return;
      }

      // 加载词汇表
      await this.loadVocab();

      // 加载 ONNX 模型
      console.log('[SimpleEmbedding] Loading ONNX model...');
      this.session = await ort.InferenceSession.create(modelFile, {
        executionProviders: ['cpu'],
      });

      this.isInitialized = true;
      console.log('[SimpleEmbedding] Model initialized successfully');
    } catch (error) {
      console.error('[SimpleEmbedding] Failed to initialize:', error);
      // 不抛出错误，允许降级到模拟向量
    }
  }

  /**
   * 加载词汇表
   */
  private async loadVocab(): Promise<void> {
    try {
      const vocabFile = path.join(this.modelPath, 'vocab.txt');
      
      if (!fs.existsSync(vocabFile)) {
        console.log('[SimpleEmbedding] Vocab file not found, using simple tokenization');
        return;
      }

      const vocabContent = fs.readFileSync(vocabFile, 'utf-8');
      const lines = vocabContent.split('\n');
      
      lines.forEach((line, index) => {
        const token = line.trim();
        if (token) {
          this.vocab.set(token, index);
        }
      });

      console.log(`[SimpleEmbedding] Loaded ${this.vocab.size} tokens`);
    } catch (error) {
      console.error('[SimpleEmbedding] Failed to load vocab:', error);
    }
  }

  /**
   * 简单的分词器
   */
  private tokenize(text: string): number[] {
    // 如果没有词汇表，使用字符级别的简单编码
    if (this.vocab.size === 0) {
      return this.simpleTokenize(text);
    }

    // 简单的空格分词
    const tokens = text.toLowerCase().split(/\s+/);
    const ids: number[] = [101]; // [CLS] token

    for (const token of tokens) {
      const id = this.vocab.get(token) || this.vocab.get('[UNK]') || 100;
      ids.push(id);
    }

    ids.push(102); // [SEP] token

    // 填充或截断到固定长度
    const maxLength = 128;
    while (ids.length < maxLength) {
      ids.push(0); // [PAD] token
    }

    return ids.slice(0, maxLength);
  }

  /**
   * 简单的字符级别分词
   */
  private simpleTokenize(text: string): number[] {
    const maxLength = 128;
    const ids: number[] = [];

    for (let i = 0; i < Math.min(text.length, maxLength); i++) {
      ids.push(text.charCodeAt(i) % 30000);
    }

    while (ids.length < maxLength) {
      ids.push(0);
    }

    return ids;
  }

  /**
   * 检查模型是否已加载
   */
  isModelLoaded(): boolean {
    return this.isInitialized && this.session !== null;
  }

  /**
   * 生成文本向量
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isModelLoaded()) {
      await this.initialize();
    }

    // 如果模型仍未加载，使用模拟向量
    if (!this.isModelLoaded()) {
      return this.generateMockEmbedding(text);
    }

    try {
      const inputIds = this.tokenize(text);
      const attentionMask = inputIds.map(id => id === 0 ? 0 : 1);

      // 创建输入张量
      const inputIdsTensor = new ort.Tensor(
        'int64',
        BigInt64Array.from(inputIds.map(x => BigInt(x))),
        [1, inputIds.length]
      );

      const attentionMaskTensor = new ort.Tensor(
        'int64',
        BigInt64Array.from(attentionMask.map(x => BigInt(x))),
        [1, attentionMask.length]
      );

      // 运行模型
      const feeds = {
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
      };

      const results = await this.session!.run(feeds);
      
      // 获取输出并进行 mean pooling
      const output = results.last_hidden_state || results.logits;
      const data = output.data as Float32Array;
      const dims = output.dims as number[];

      // 简单的 mean pooling
      const hiddenSize = dims[dims.length - 1];
      const embedding = new Array(hiddenSize).fill(0);

      let count = 0;
      for (let i = 0; i < attentionMask.length; i++) {
        if (attentionMask[i] === 1) {
          count++;
          for (let j = 0; j < hiddenSize; j++) {
            embedding[j] += data[i * hiddenSize + j];
          }
        }
      }

      // 平均并归一化
      if (count > 0) {
        for (let i = 0; i < hiddenSize; i++) {
          embedding[i] /= count;
        }
      }

      // L2 归一化
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / (norm || 1));
    } catch (error) {
      console.error('[SimpleEmbedding] Embedding failed:', error);
      return this.generateMockEmbedding(text);
    }
  }

  /**
   * 生成模拟向量（降级方案）
   */
  private generateMockEmbedding(text: string): number[] {
    const dim = 384;
    const embedding: number[] = [];
    
    // 基于文本内容生成确定性的向量
    for (let i = 0; i < dim; i++) {
      let value = 0;
      for (let j = 0; j < text.length; j++) {
        value += Math.sin((text.charCodeAt(j) + i) * 0.1) * Math.cos(j * 0.1);
      }
      embedding.push(value);
    }

    // 归一化
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (norm || 1));
  }

  /**
   * 批量生成向量
   */
  async batchEmbed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * 卸载模型
   */
  async unload(): Promise<void> {
    this.session = null;
    this.vocab.clear();
    this.isInitialized = false;
    console.log('[SimpleEmbedding] Model unloaded');
  }
}

// 单例
let instance: SimpleEmbeddingService | null = null;

export function getSimpleEmbeddingService(): SimpleEmbeddingService {
  if (!instance) {
    instance = new SimpleEmbeddingService();
  }
  return instance;
}
