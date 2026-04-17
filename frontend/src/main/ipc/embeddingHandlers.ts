import { ipcMain } from 'electron';
import { getLocalEmbeddingService } from '../services/LocalEmbeddingService';
import { getEmbeddingWorkerManager } from '../services/EmbeddingWorkerManager';

/**
 * 嵌入服务 IPC 处理器
 */
export function registerEmbeddingHandlers(): void {
  const embeddingService = getLocalEmbeddingService();
  const workerManager = getEmbeddingWorkerManager();

  /**
   * 初始化嵌入模型
   */
  ipcMain.handle('embedding:initialize', async (event, useWorker = false) => {
    try {
      if (useWorker) {
        await workerManager.initialize();
      } else {
        await embeddingService.initialize();
      }
      return { success: true };
    } catch (error: any) {
      console.error('Failed to initialize embedding service:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 检查模型是否已加载
   */
  ipcMain.handle('embedding:isLoaded', async (event, useWorker = false) => {
    try {
      if (useWorker) {
        return { loaded: workerManager.isWorkerRunning() };
      } else {
        return { loaded: embeddingService.isModelLoaded() };
      }
    } catch (error: any) {
      console.error('Failed to check embedding model status:', error);
      return { loaded: false, error: error.message };
    }
  });

  /**
   * 生成单个文本的向量
   */
  ipcMain.handle('embedding:embed', async (event, text: string, useWorker = false) => {
    try {
      let embedding: number[];
      
      if (useWorker) {
        embedding = await workerManager.embed(text);
      } else {
        embedding = await embeddingService.embed(text);
      }
      
      return { success: true, embedding };
    } catch (error: any) {
      console.error('Failed to generate embedding:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 批量生成向量
   */
  ipcMain.handle('embedding:batchEmbed', async (event, texts: string[], useWorker = false) => {
    try {
      let embeddings: number[][];
      
      if (useWorker) {
        embeddings = await workerManager.batchEmbed(texts);
      } else {
        embeddings = await embeddingService.batchEmbed(texts);
      }
      
      return { success: true, embeddings };
    } catch (error: any) {
      console.error('Failed to generate batch embeddings:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 卸载模型
   */
  ipcMain.handle('embedding:unload', async (event, useWorker = false) => {
    try {
      if (useWorker) {
        await workerManager.stopWorker();
      } else {
        await embeddingService.unload();
      }
      return { success: true };
    } catch (error: any) {
      console.error('Failed to unload embedding service:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取模型信息
   */
  ipcMain.handle('embedding:getInfo', async () => {
    try {
      const info = embeddingService.getModelInfo();
      return { success: true, info };
    } catch (error: any) {
      console.error('Failed to get embedding model info:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 为所有片段生成向量（异步执行，立即返回，通过事件通知进度）
   */
  ipcMain.handle('embedding:generateVectors', async (event) => {
    try {
      console.log('[EmbeddingHandlers] Starting vector generation (async)...');

      // 立即返回，在后台异步执行，避免阻塞主进程 IPC 队列
      setImmediate(async () => {
        try {
          const { BrowserWindow } = await import('electron');
          const win = BrowserWindow.fromWebContents(event.sender);

          const { clearAllVectors } = await import('../scripts/clearVectors');
          clearAllVectors();

          const { generateVectorsForExistingSnippets } = await import('../scripts/generateVectors');
          await generateVectorsForExistingSnippets();

          console.log('[EmbeddingHandlers] Vector generation completed');
          win?.webContents.send('embedding:generateVectorsComplete', { success: true });
        } catch (err: any) {
          console.error('[EmbeddingHandlers] Vector generation failed:', err);
          const { BrowserWindow } = await import('electron');
          BrowserWindow.getAllWindows()[0]?.webContents.send('embedding:generateVectorsComplete', {
            success: false,
            error: err.message,
          });
        }
      });

      return { success: true, async: true };
    } catch (error: any) {
      console.error('[EmbeddingHandlers] Failed to start vector generation:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Embedding IPC handlers registered');
}
