import { Worker } from 'worker_threads';
import * as path from 'path';
import { app } from 'electron';

/**
 * Worker 消息类型
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
 * Embedding Worker 管理器
 * 管理 Worker 线程的生命周期和通信
 */
export class EmbeddingWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private requestIdCounter = 0;
  private modelPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.modelPath = path.join(userDataPath, 'models', 'all-MiniLM-L6-v2');
  }

  /**
   * 启动 Worker
   */
  async startWorker(): Promise<void> {
    if (this.worker) {
      return;
    }

    const workerPath = path.join(__dirname, '../workers/embedding.worker.js');

    this.worker = new Worker(workerPath, {
      workerData: {
        modelPath: this.modelPath,
      },
    });

    // 监听 Worker 消息
    this.worker.on('message', (response: WorkerResponse) => {
      this.handleWorkerResponse(response);
    });

    // 监听 Worker 错误
    this.worker.on('error', (error) => {
      console.error('[WorkerManager] Worker error:', error);
      this.rejectAllPending(error);
    });

    // 监听 Worker 退出
    this.worker.on('exit', (code) => {
      console.log(`[WorkerManager] Worker exited with code ${code}`);
      this.worker = null;
      this.rejectAllPending(new Error(`Worker exited with code ${code}`));
    });

    console.log('[WorkerManager] Worker started');
  }

  /**
   * 停止 Worker
   */
  async stopWorker(): Promise<void> {
    if (!this.worker) {
      return;
    }

    try {
      await this.sendMessage('unload', {});
      await this.worker.terminate();
      this.worker = null;
      console.log('[WorkerManager] Worker stopped');
    } catch (error) {
      console.error('[WorkerManager] Failed to stop worker:', error);
      throw error;
    }
  }

  /**
   * 初始化模型
   */
  async initialize(): Promise<void> {
    await this.startWorker();
    await this.sendMessage('initialize', {});
  }

  /**
   * 生成单个文本的向量
   */
  async embed(text: string): Promise<number[]> {
    if (!this.worker) {
      await this.startWorker();
    }

    return await this.sendMessage('embed', { text });
  }

  /**
   * 批量生成向量
   */
  async batchEmbed(texts: string[]): Promise<number[][]> {
    if (!this.worker) {
      await this.startWorker();
    }

    return await this.sendMessage('batchEmbed', { texts });
  }

  /**
   * 发送消息到 Worker
   */
  private sendMessage(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not started'));
        return;
      }

      const id = `req_${this.requestIdCounter++}`;
      this.pendingRequests.set(id, { resolve, reject });

      const message: WorkerMessage = {
        type: type as any,
        id,
        data,
      };

      this.worker.postMessage(message);

      // 设置超时
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 秒超时
    });
  }

  /**
   * 处理 Worker 响应
   */
  private handleWorkerResponse(response: WorkerResponse): void {
    const { id, type, data, error } = response;
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      console.warn(`[WorkerManager] No pending request for id: ${id}`);
      return;
    }

    this.pendingRequests.delete(id);

    if (type === 'success') {
      pending.resolve(data);
    } else {
      pending.reject(new Error(error || 'Unknown error'));
    }
  }

  /**
   * 拒绝所有待处理的请求
   */
  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  /**
   * 检查 Worker 是否运行
   */
  isWorkerRunning(): boolean {
    return this.worker !== null;
  }
}

// 单例实例
let instance: EmbeddingWorkerManager | null = null;

/**
 * 获取 EmbeddingWorkerManager 单例
 */
export function getEmbeddingWorkerManager(): EmbeddingWorkerManager {
  if (!instance) {
    instance = new EmbeddingWorkerManager();
  }
  return instance;
}
