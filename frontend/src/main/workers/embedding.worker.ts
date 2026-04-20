import { parentPort, workerData } from 'worker_threads';
import * as ort from 'onnxruntime-node';
import * as path from 'path';

/**
 * Embedding Worker 消息类型
 */
interface WorkerMessage {
  type: 'initialize' | 'embed' | 'batchEmbed' | 'unload';
  id: string;
  data?: any;
}

interface WorkerResponse {
  type: 'success' | 'error';
  id: string;
  data?: any;
  error?: string;
}

/**
 * Worker 状态
 */
class EmbeddingWorker {
  private session: ort.InferenceSession | null = null;
  private tokenizer: any = null;
  private modelPath: string;
  private isInitialized = false;

  constructor(modelPath: string) {
    this.modelPath = modelPath;
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
      const modelsDir = path.dirname(this.modelPath);
      const modelName = path.basename(this.modelPath);

      // 加载 tokenizer（设置 cacheDir 避免路径拼接问题）
      console.log('[Worker] Loading tokenizer...');
      // 用 new Function 绕过 tsc 把 import() 编译成 require() 的问题
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const transformers = await dynamicImport('@xenova/transformers');
      transformers.env.cacheDir = modelsDir;
      transformers.env.localModelPath = modelsDir;
      transformers.env.allowRemoteModels = false;

      this.tokenizer = await transformers.AutoTokenizer.from_pretrained(modelName, {
        local_files_only: true,
      });

      // 加载 ONNX 模型
      console.log('[Worker] Loading ONNX model...');
      this.session = await ort.InferenceSession.create(modelFile, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      });

      this.isInitialized = true;
      console.log('[Worker] Initialized successfully');
    } catch (error) {
      console.error('[Worker] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 生成单个文本的向量
   */
  async embed(text: string): Promise<number[]> {
    const embeddings = await this.batchEmbed([text]);
    return embeddings[0];
  }

  /**
   * 批量生成向量
   */
  async batchEmbed(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized || !this.session || !this.tokenizer) {
      throw new Error('Worker not initialized');
    }

    if (texts.length === 0) {
      return [];
    }

    try {
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

      // token_type_ids: 全零（BERT 系模型需要）
      const tokenTypeIds = new ort.Tensor(
        'int64',
        new BigInt64Array(encoded.input_ids.data.length).fill(0n),
        encoded.input_ids.dims
      );

      // 模型推理
      const feeds = {
        input_ids: inputIds,
        attention_mask: attentionMask,
        token_type_ids: tokenTypeIds,
      };

      const results = await this.session.run(feeds);
      const lastHiddenState = results.last_hidden_state;

      // Mean pooling
      const embeddings = this.meanPooling(
        lastHiddenState.data as Float32Array,
        lastHiddenState.dims as number[],
        encoded.attention_mask.data
      );

      // 归一化
      return this.normalize(embeddings);
    } catch (error) {
      console.error('[Worker] Batch embedding failed:', error);
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
   * 卸载模型
   */
  async unload(): Promise<void> {
    this.session = null;
    this.tokenizer = null;
    this.isInitialized = false;

    if (global.gc) {
      global.gc();
    }

    console.log('[Worker] Unloaded successfully');
  }
}

// Worker 主逻辑
if (parentPort) {
  const worker = new EmbeddingWorker(workerData.modelPath);

  parentPort.on('message', async (message: WorkerMessage) => {
    const { type, id, data } = message;

    try {
      let result: any;

      switch (type) {
        case 'initialize':
          await worker.initialize();
          result = { success: true };
          break;

        case 'embed':
          result = await worker.embed(data.text);
          break;

        case 'batchEmbed':
          result = await worker.batchEmbed(data.texts);
          break;

        case 'unload':
          await worker.unload();
          result = { success: true };
          break;

        default:
          throw new Error(`Unknown message type: ${type}`);
      }

      const response: WorkerResponse = {
        type: 'success',
        id,
        data: result,
      };

      parentPort!.postMessage(response);
    } catch (error: any) {
      const response: WorkerResponse = {
        type: 'error',
        id,
        error: error.message || String(error),
      };

      parentPort!.postMessage(response);
    }
  });

  // 错误处理
  parentPort.on('error', (error) => {
    console.error('[Worker] Error:', error);
  });

  console.log('[Worker] Started and ready');
}
