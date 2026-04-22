import { ipcMain, BrowserWindow } from 'electron';
import { ModelDownloader } from '../services/ModelDownloader';
import { getSortedMirrors } from '../config/mirrors';

let modelDownloader: ModelDownloader | null = null;

function getModelDownloader(): ModelDownloader {
  if (!modelDownloader) {
    modelDownloader = new ModelDownloader();
  }
  return modelDownloader;
}

/** 在后台异步执行下载，立即返回不阻塞 IPC 队列 */
function runDownloadAsync(downloader: ModelDownloader, mirrorUrl: string | undefined, sender: Electron.WebContents) {
  const win = BrowserWindow.fromWebContents(sender);
  downloader.setWebContents(win ? sender : null);

  setImmediate(async () => {
    try {
      await downloader.startDownload(mirrorUrl);
      downloader.setWebContents(null);
      if (win && !win.isDestroyed()) {
        win.webContents.send('model:progress', downloader.getProgress());
      }
    } catch (error: any) {
      downloader.setWebContents(null);
      // 进度已经在 data 事件里推送了，这里只需确保最终状态被推送
      if (win && !win.isDestroyed()) {
        win.webContents.send('model:progress', downloader.getProgress());
      }
    }
  });
}

export function registerModelHandlers() {
  console.log('[ModelHandlers] Registering model IPC handlers...');

  ipcMain.handle('model:getMirrors', async () => {
    return getSortedMirrors();
  });

  // 立即返回，下载在后台异步执行
  ipcMain.handle('model:startDownload', async (event, mirrorUrl?: string) => {
    try {
      const downloader = getModelDownloader();
      runDownloadAsync(downloader, mirrorUrl, event.sender);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('model:pauseDownload', async () => {
    try {
      const downloader = getModelDownloader();
      await downloader.pauseDownload();
      downloader.setWebContents(null);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 恢复下载也异步执行
  ipcMain.handle('model:resumeDownload', async (event) => {
    try {
      const downloader = getModelDownloader();
      runDownloadAsync(downloader, undefined, event.sender);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('model:cancelDownload', async () => {
    try {
      const downloader = getModelDownloader();
      downloader.setWebContents(null);
      await downloader.cancelDownload();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('model:getProgress', async () => {
    return getModelDownloader().getProgress();
  });

  ipcMain.handle('model:verifyModel', async (event, filePath: string) => {
    return await getModelDownloader().verifyModel(filePath);
  });

  ipcMain.handle('model:deleteModel', async () => {
    try {
      await getModelDownloader().deleteModel();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('model:isDownloaded', async () => {
    return await getModelDownloader().isModelDownloaded();
  });

  ipcMain.handle('model:getPath', async () => {
    return getModelDownloader().getModelPath();
  });
}
