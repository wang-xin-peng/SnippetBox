import * as ort from 'onnxruntime-node';
import * as path from 'path';
import * as fs from 'fs';
import { getEmbeddingModelDir } from './embeddingModel';

/**
 * 本地嵌入服务
 * 使用 ONNX Runtime 和多语言检索模型生成文本向量
 */
export class LocalEmbeddingService {
  private session: ort.InferenceSession | null = null;
  private tokenizer: any = null;
  private modelPath: string;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private transformers: any = null;

  constructor() {
    this.modelPath = getEmbeddingModelDir();
  }

  /**
   * 初始化模型（懒加载）
   */
  async initialize(): Promise<void> {
    // 如果已经初始化，直接返回
    if (this.isInitialized) {
      return;
    }

    // 如果正在初始化，等待初始化完成
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // 开始初始化
    this.initializationPromise = this._doInitialize();
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * 执行实际的初始化操作
   */
  private async _doInitialize(): Promise<void> {
    try {
      // 使用 eval 来绕过 TypeScript 编译器的静态分析
      // 这样可以在运行时使用动态 import() 而不会被编译成 require()
      const importTransformers = new Function('specifier', 'return import(specifier)');
      
      // 动态导入 @xenova/transformers (ES Module)
      if (!this.transformers) {
        console.log('[LocalEmbedding] Loading transformers library...');
        
        // 设置环境变量禁用图像处理功能
        process.env.TRANSFORMERS_DISABLE_SHARP = '1';
        
        this.transformers = await importTransformers('@xenova/transformers');
        console.log('[LocalEmbedding] Transformers library loaded successfully');
      }

      // 关键：设置 cacheDir 为模型父目录，避免运行时拼出错误路径
      const modelsDir = path.dirname(this.modelPath);
      const modelName = path.basename(this.modelPath);
      this.transformers.env.cacheDir = modelsDir;
      this.transformers.env.localModelPath = modelsDir;
      this.transformers.env.allowRemoteModels = false;
      console.log(`[LocalEmbedding] Cache dir set to: ${modelsDir}, model name: ${modelName}`);

      // 检查模型文件是否存在
      const modelFile = path.join(this.modelPath, 'model.onnx');
      if (!fs.existsSync(modelFile)) {
        throw new Error(`Model file not found at ${modelFile}. Please download the model first.`);
      }

      // 加载 tokenizer（用 modelName 而非绝对路径，配合 cacheDir 使用）
      console.log('[LocalEmbedding] Loading tokenizer...');
      this.tokenizer = await this.transformers.AutoTokenizer.from_pretrained(modelName, {
        local_files_only: true,
      });
      console.log('[LocalEmbedding] Tokenizer loaded successfully');

      // 加载 ONNX 模型
      console.log('[LocalEmbedding] Loading ONNX model...');
      this.session = await ort.InferenceSession.create(modelFile, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      });
      console.log('[LocalEmbedding] ONNX model loaded successfully');

      console.log('[LocalEmbedding] LocalEmbeddingService initialized successfully');
    } catch (error) {
      console.error('[LocalEmbedding] Failed to initialize LocalEmbeddingService:', error);
      throw error;
    }
  }

  /**
   * 检查模型是否已加载
   */
  isModelLoaded(): boolean {
    return this.isInitialized && this.session !== null && this.tokenizer !== null;
  }

  /**
   * 生成单个文本的向量
   * @param text 输入文本
   * @returns 384 维向量
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isModelLoaded()) {
      await this.initialize();
    }

    const embeddings = await this.batchEmbed([text]);
    return embeddings[0];
  }

  /**
   * 批量生成向量
   * @param texts 输入文本数组
   * @returns 向量数组
   */
  async batchEmbed(texts: string[]): Promise<number[][]> {
    if (!this.isModelLoaded()) {
      await this.initialize();
    }

    if (texts.length === 0) {
      return [];
    }

    try {
      const startTime = Date.now();

      // Tokenization
      const encoded = await this.tokenizer(texts, {
        padding: true,
        truncation: true,
        max_length: 512,
        return_tensors: 'pt',
      });

      // 准备输入张量
      const inputIds = new ort.Tensor(
        'int64',
        BigInt64Array.from(encoded.input_ids.data.map((x: number) => BigInt(x))),
        encoded.input_ids.dims
      );

      const attentionMask = new ort.Tensor(
        'int64',
        BigInt64Array.from(encoded.attention_mask.data.map((x: number) => BigInt(x))),
        encoded.attention_mask.dims
      );

      // 模型推理
      const feeds: Record<string, ort.Tensor> = {
        input_ids: inputIds,
        attention_mask: attentionMask,
      };

      if (this.session!.inputNames.includes('token_type_ids')) {
        feeds.token_type_ids = new ort.Tensor(
          'int64',
          new BigInt64Array(encoded.input_ids.data.length).fill(0n),
          encoded.input_ids.dims
        );
      }

      const results = await this.session!.run(feeds);
      
      // 获取输出（last_hidden_state）
      const lastHiddenState = results.last_hidden_state;
      
      // Mean pooling
      const embeddings = this.meanPooling(
        lastHiddenState.data as Float32Array,
        lastHiddenState.dims as number[],
        encoded.attention_mask.data
      );

      // 归一化
      const normalizedEmbeddings = this.normalize(embeddings);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Batch embedding completed: ${texts.length} texts in ${duration}ms (${(duration / texts.length).toFixed(2)}ms per text)`);

      return normalizedEmbeddings;
    } catch (error) {
      console.error('Batch embedding failed:', error);
      throw error;
    }
  }

  /**
   * Mean pooling 操作
   */
  private meanPooling(
    hiddenState: Float32Array,
    dims: number[],
    attentionMask: any
  ): number[][] {
    const [batchSize, seqLength, hiddenSize] = dims;
    const embeddings: number[][] = [];

    for (let b = 0; b < batchSize; b++) {
      const embedding = new Array(hiddenSize).fill(0);
      let tokenCount = 0;

      for (let s = 0; s < seqLength; s++) {
        const mask = attentionMask[b * seqLength + s];
        if (mask > 0) {
          tokenCount++;
          for (let h = 0; h < hiddenSize; h++) {
            const idx = b * seqLength * hiddenSize + s * hiddenSize + h;
            embedding[h] += hiddenState[idx];
          }
        }
      }

      // 平均
      if (tokenCount > 0) {
        for (let h = 0; h < hiddenSize; h++) {
          embedding[h] /= tokenCount;
        }
      }

      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * L2 归一化
   */
  private normalize(embeddings: number[][]): number[][] {
    return embeddings.map(embedding => {
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / (norm || 1));
    });
  }

  /**
   * 卸载模型释放内存
   */
  async unload(): Promise<void> {
    try {
      if (this.session) {
        // ONNX Runtime 会自动清理资源
        this.session = null;
      }

      this.tokenizer = null;
      this.isInitialized = false;
      this.initializationPromise = null;

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      console.log('LocalEmbeddingService unloaded successfully');
    } catch (error) {
      console.error('Failed to unload LocalEmbeddingService:', error);
      throw error;
    }
  }

  /**
   * 获取模型信息
   */
  getModelInfo(): { name: string; path: string; loaded: boolean } {
    return {
      name: 'multilingual-e5-small',
      path: this.modelPath,
      loaded: this.isModelLoaded(),
    };
  }
}

// 单例实例
let instance: LocalEmbeddingService | null = null;

/**
 * 获取 LocalEmbeddingService 单例
 */
export function getLocalEmbeddingService(): LocalEmbeddingService {
  if (!instance) {
    instance = new LocalEmbeddingService();
  }
  return instance;
}
