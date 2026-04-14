import { ipcMain, BrowserWindow } from 'electron';
import { ModelDownloader } from '../services/ModelDownloader';
import { MODEL_MIRRORS, getSortedMirrors } from '../config/mirrors';
import { DownloadProgress } from '../../shared/types/model';

let modelDownloader: ModelDownloader | null = null;
let progressInterval: NodeJS.Timeout | null = null;

/**
 * 获取或创建 ModelDownloader 实例
 */
function getModelDownloader(): ModelDownloader {
  if (!modelDownloader) {
    modelDownloader = new ModelDownloader();
  }
  return modelDownloader;
}

/**
 * 开始发送进度更新
 */
function startProgressUpdates(window: BrowserWindow) {
  if (progressInterval) {
    clearInterval(progressInterval);
  }

  progressInterval = setInterval(() => {
    const downloader = getModelDownloader();
    const progress = downloader.getProgress();
    window.webContents.send('model:progress', progress);
  }, 500); // 每 500ms 更新一次
}

/**
 * 停止发送进度更新
 */
function stopProgressUpdates() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

/**
 * 注册模型下载相关的 IPC 处理器
 */
export function registerModelHandlers() {
  console.log('[ModelHandlers] Registering model IPC handlers...');
  
  // 获取镜像源列表
  ipcMain.handle('model:getMirrors', async () => {
    console.log('[ModelHandlers] getMirrors called');
    return getSortedMirrors();
  });

  // 开始下载
  ipcMain.handle('model:startDownload', async (event, mirrorUrl?: string) => {
    console.log('[ModelHandlers] startDownload called with mirrorUrl:', mirrorUrl);
    try {
      const downloader = getModelDownloader();
      const window = BrowserWindow.fromWebContents(event.sender);
      
      if (window) {
        startProgressUpdates(window);
      }

      await downloader.startDownload(mirrorUrl);
      
      stopProgressUpdates();
      
      // 发送最终进度
      if (window) {
        window.webContents.send('model:progress', downloader.getProgress());
      }

      return { success: true };
    } catch (error: any) {
      stopProgressUpdates();
      return { success: false, error: error.message };
    }
  });

  // 暂停下载
  ipcMain.handle('model:pauseDownload', async () => {
    try {
      const downloader = getModelDownloader();
      await downloader.pauseDownload();
      stopProgressUpdates();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 恢复下载
  ipcMain.handle('model:resumeDownload', async (event) => {
    try {
      const downloader = getModelDownloader();
      const window = BrowserWindow.fromWebContents(event.sender);
      
      if (window) {
        startProgressUpdates(window);
      }

      await downloader.resumeDownload();
      
      stopProgressUpdates();
      
      // 发送最终进度
      if (window) {
        window.webContents.send('model:progress', downloader.getProgress());
      }

      return { success: true };
    } catch (error: any) {
      stopProgressUpdates();
      return { success: false, error: error.message };
    }
  });

  // 取消下载
  ipcMain.handle('model:cancelDownload', async () => {
    try {
      const downloader = getModelDownloader();
      await downloader.cancelDownload();
      stopProgressUpdates();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 获取下载进度
  ipcMain.handle('model:getProgress', async () => {
    const downloader = getModelDownloader();
    return downloader.getProgress();
  });

  // 验证模型
  ipcMain.handle('model:verifyModel', async (event, filePath: string) => {
    const downloader = getModelDownloader();
    return await downloader.verifyModel(filePath);
  });

  // 删除模型
  ipcMain.handle('model:deleteModel', async () => {
    try {
      const downloader = getModelDownloader();
      await downloader.deleteModel();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 检查模型是否已下载
  ipcMain.handle('model:isDownloaded', async () => {
    const downloader = getModelDownloader();
    return await downloader.isModelDownloaded();
  });

  // 获取模型路径
  ipcMain.handle('model:getPath', async () => {
    const downloader = getModelDownloader();
    return downloader.getModelPath();
  });
}
