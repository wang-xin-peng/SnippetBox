import axios, { AxiosInstance, CancelTokenSource } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app, WebContents } from 'electron';
import { DownloadProgress, DownloadState } from '../../shared/types/model';
import { MODEL_INFO, getSortedMirrors, MODEL_FILES } from '../config/mirrors';

export class ModelDownloader {
  private axiosInstance: AxiosInstance;
  private cancelTokenSource: CancelTokenSource | null = null;
  private progress: DownloadProgress;
  private downloadState: DownloadState | null = null;
  private modelDir: string;
  private modelPath: string;
  private tempPath: string;
  private stateFilePath: string;
  private currentMirrorUrl: string | null = null;
  private startTime: number = 0;
  private lastProgressTime: number = 0;
  private lastDownloaded: number = 0;
  private speedSamples: number[] = [];
  private webContents: WebContents | null = null;
  private isPausing: boolean = false;
  private currentWriter: fs.WriteStream | null = null;
  private readonly legacyModelDirs: string[];

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      maxRedirects: 5
    });

    // 初始化路径 - 使用目录而不是单个文件
    this.modelDir = path.join(app.getPath('userData'), 'models', MODEL_INFO.name);
    this.modelPath = this.modelDir; // 模型目录
    this.tempPath = `${this.modelDir}.tmp`;
    this.stateFilePath = path.join(app.getPath('userData'), 'models', `${MODEL_INFO.name}.state`);
    this.legacyModelDirs = [
      path.join(app.getPath('userData'), 'models', 'paraphrase-multilingual-MiniLM-L12-v2'),
      path.join(app.getPath('userData'), 'models', 'all-MiniLM-L6-v2'),
    ];

    // 确保目录存在
    const modelsRoot = path.join(app.getPath('userData'), 'models');
    if (!fs.existsSync(modelsRoot)) {
      fs.mkdirSync(modelsRoot, { recursive: true });
    }

    // 初始化进度
    this.progress = {
      downloaded: 0,
      total: 0,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
      status: 'idle'
    };

    // 尝试恢复下载状态
    this.loadDownloadState();
  }

  /**
   * 设置用于推送进度的 WebContents
   */
  setWebContents(wc: WebContents | null) {
    this.webContents = wc;
  }

  /**
   * 开始下载模型
   */
  async startDownload(mirrorUrl?: string): Promise<void> {
    if (this.progress.status === 'downloading') {
      throw new Error('下载已在进行中');
    }

    // 检查模型是否已存在
    if (await this.isModelDownloaded()) {
      this.progress.status = 'completed';
      this.progress.percentage = 100;
      return;
    }

    try {
      this.cleanupLegacyModels();

      // 选择镜像源
      const baseUrl = mirrorUrl || this.selectMirror();
      this.currentMirrorUrl = baseUrl;
      
      // 创建临时目录
      if (!fs.existsSync(this.tempPath)) {
        fs.mkdirSync(this.tempPath, { recursive: true });
      }

      this.progress.status = 'downloading';
      this.progress.total = MODEL_INFO.size;
      this.startTime = Date.now();
      this.lastProgressTime = Date.now();
      this.speedSamples = [];

      // 计算已存在文件的大小（断点续传）
      let alreadyDownloaded = 0;
      for (const file of MODEL_FILES) {
        const filePath = path.join(this.tempPath, file.name);
        if (fs.existsSync(filePath)) {
          alreadyDownloaded += fs.statSync(filePath).size;
        }
      }
      this.progress.downloaded = alreadyDownloaded;
      this.lastDownloaded = alreadyDownloaded;

      // 下载所有文件
      for (let i = 0; i < MODEL_FILES.length; i++) {
        const file = MODEL_FILES[i];
        const fileUrl = baseUrl + file.url;
        const filePath = path.join(this.tempPath, file.name);

        // 跳过已完整下载的文件
        if (fs.existsSync(filePath)) {
          const existingSize = fs.statSync(filePath).size;
          if (existingSize > 0) {
            console.log(`[ModelDownloader] Skipping already downloaded file: ${file.name} (${existingSize} bytes)`);
            continue;
          }
        }

        console.log(`[ModelDownloader] Downloading ${file.name} from ${fileUrl}`);

        // 创建取消令牌
        this.cancelTokenSource = axios.CancelToken.source();

        // 下载文件
        const response = await this.axiosInstance.get(fileUrl, {
          responseType: 'stream',
          cancelToken: this.cancelTokenSource.token,
        });

        // 写入文件，通过 stream data 事件手动累计字节数
        const writer = fs.createWriteStream(filePath);
        const dataStream: NodeJS.ReadableStream = response.data;

        // 保存 writer 引用，供取消时主动关闭
        this.currentWriter = writer;

        dataStream.on('data', (chunk: Buffer) => {
          const chunkSize = chunk.length;
          this.progress.downloaded += chunkSize;

          // 如果实际下载超过了预估总大小，动态更新 total
          if (this.progress.downloaded > this.progress.total) {
            this.progress.total = this.progress.downloaded + 1024; // 留一点余量
          }

          // 进度百分比：已下载字节 / 总大小，限制在 0-99 之间（100 留给真正完成）
          this.progress.percentage = Math.min(
            99,
            Math.round((this.progress.downloaded / this.progress.total) * 100)
          );

          // 计算速度（滑动窗口）
          const now = Date.now();
          const elapsed = (now - this.lastProgressTime) / 1000;
          if (elapsed >= 0.2) {
            // 每 200ms 更新一次速度
            const bytesSinceLast = this.progress.downloaded - this.lastDownloaded;
            const instantSpeed = bytesSinceLast / elapsed;
            this.speedSamples.push(instantSpeed);
            if (this.speedSamples.length > 8) this.speedSamples.shift();
            const avgSpeed = this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length;
            this.progress.speed = Math.round(avgSpeed);
            this.lastDownloaded = this.progress.downloaded;
            this.lastProgressTime = now;

            // 剩余时间（remaining 可能因 total 估算偏小而为负，取 0）
            const remaining = Math.max(0, this.progress.total - this.progress.downloaded);
            this.progress.remainingTime = avgSpeed > 0 ? Math.round(remaining / avgSpeed) : 0;

            // 直接推送进度到渲染进程（不依赖 interval）
            if (this.webContents && !this.webContents.isDestroyed()) {
              this.webContents.send('model:progress', { ...this.progress });
            }
          }
        });

        dataStream.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
          dataStream.on('error', reject);
        });

        console.log(`[ModelDownloader] Downloaded ${file.name}`);
      }

      // 移动到最终位置
      if (fs.existsSync(this.modelPath)) {
        fs.rmSync(this.modelPath, { recursive: true, force: true });
      }
      fs.renameSync(this.tempPath, this.modelPath);

      // 清理状态
      this.clearDownloadState();

      this.progress.status = 'completed';
      this.progress.percentage = 100;
      
      console.log(`[ModelDownloader] Model downloaded successfully to ${this.modelPath}`);
    } catch (error: any) {
      if (axios.isCancel(error)) {
        // 如果是暂停触发的取消，保持 paused 状态（由 pauseDownload 设置）
        if (!this.isPausing) {
          this.progress.status = 'cancelled';
          this.progress.error = '下载已取消';
        }
      } else {
        this.progress.status = 'error';
        this.progress.error = error.message || '下载失败';
      }
      
      // 保存下载状态以便恢复
      this.saveDownloadState();
      throw error;
    }
  }

  /**
   * 暂停下载
   */
  async pauseDownload(): Promise<void> {
    if (this.progress.status !== 'downloading') {
      throw new Error('没有正在进行的下载');
    }

    this.isPausing = true;
    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('用户暂停下载');
    }

    this.progress.status = 'paused';
    this.saveDownloadState();
    // 短暂延迟后重置标志，确保 catch 块已执行
    setTimeout(() => { this.isPausing = false; }, 200);
  }

  /**
   * 恢复下载
   */
  async resumeDownload(): Promise<void> {
    if (this.progress.status !== 'paused') {
      throw new Error('下载未暂停');
    }

    await this.startDownload(this.currentMirrorUrl || undefined);
  }

  /**
   * 取消下载
   */
  async cancelDownload(): Promise<void> {
    // 先主动关闭当前 writer，释放文件句柄
    if (this.currentWriter) {
      try { this.currentWriter.destroy(); } catch (e) {}
      this.currentWriter = null;
    }

    // 取消正在进行的请求
    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('用户取消下载');
      this.cancelTokenSource = null;
    }

    // 等待 stream 关闭后再删除（Windows 上文件可能被占用）
    await new Promise(resolve => setTimeout(resolve, 500));

    // 删除临时目录（先逐个删文件，再删目录，避免 Windows ENOTEMPTY）
    const deleteTempDir = () => {
      if (!fs.existsSync(this.tempPath)) return;
      try {
        // 先删目录内所有文件
        const files = fs.readdirSync(this.tempPath);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(this.tempPath, file));
          } catch (e) {
            // 忽略单个文件删除失败
          }
        }
        // 再删空目录
        fs.rmdirSync(this.tempPath);
        console.log('[ModelDownloader] Temp dir deleted:', this.tempPath);
      } catch (error) {
        console.error('[ModelDownloader] Failed to delete temp dir:', error);
        // 1 秒后重试
        setTimeout(() => {
          try {
            fs.rmSync(this.tempPath, { recursive: true, force: true });
          } catch (e) {
            console.error('[ModelDownloader] Retry delete failed:', e);
          }
        }, 1000);
      }
    };
    deleteTempDir();

    // 清理下载状态
    this.clearDownloadState();

    // 重置进度
    this.progress = {
      downloaded: 0,
      total: 0,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
      status: 'idle',
      error: undefined
    };
  }

  /**
   * 获取下载进度
   */
  getProgress(): DownloadProgress {
    return { ...this.progress };
  }

  /**
   * 验证模型文件
   */
  async verifyModel(filePath: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // 如果配置为跳过验证，直接返回 true
    if (MODEL_INFO.expectedHash === 'skip-verification') {
      console.log('[ModelDownloader] Skipping hash verification');
      return true;
    }

    return new Promise((resolve) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const fileHash = hash.digest('hex');
        const isValid = fileHash === MODEL_INFO.expectedHash;
        console.log('[ModelDownloader] Hash verification:', isValid ? 'PASS' : 'FAIL');
        resolve(isValid);
      });
      stream.on('error', () => resolve(false));
    });
  }

  /**
   * 删除模型
   */
  async deleteModel(): Promise<void> {
    if (fs.existsSync(this.modelPath)) {
      fs.rmSync(this.modelPath, { recursive: true, force: true });
    }
    if (fs.existsSync(this.tempPath)) {
      fs.rmSync(this.tempPath, { recursive: true, force: true });
    }
    this.cleanupLegacyModels();
    this.clearDownloadState();
    this.progress.status = 'idle';
    this.progress.downloaded = 0;
    this.progress.percentage = 0;
  }

  private cleanupLegacyModels(): void {
    for (const legacyDir of this.legacyModelDirs) {
      if (legacyDir !== this.modelPath && fs.existsSync(legacyDir)) {
        try {
          fs.rmSync(legacyDir, { recursive: true, force: true });
          console.log('[ModelDownloader] Removed legacy model directory:', legacyDir);
        } catch (error) {
          console.warn('[ModelDownloader] Failed to remove legacy model directory:', legacyDir, error);
        }
      }
    }
  }

  /**
   * 清理所有遗留的 state 文件（兼容旧版本路径）
   */
  private cleanLegacyStateFiles(): void {
    const modelsRoot = path.join(app.getPath('userData'), 'models');
    const legacyPath = path.join(modelsRoot, `${MODEL_INFO.fileName}.state`);
    if (fs.existsSync(legacyPath)) {
      try {
        fs.unlinkSync(legacyPath);
        console.log('[ModelDownloader] Cleaned legacy state file:', legacyPath);
      } catch (e) {
        console.error('[ModelDownloader] Failed to clean legacy state file:', e);
      }
    }
  }

  /**
   * 检查模型是否已下载
   */
  async isModelDownloaded(): Promise<boolean> {
    if (!fs.existsSync(this.modelPath)) {
      return false;
    }
    
    // 检查所有必需文件是否存在
    for (const file of MODEL_FILES) {
      const filePath = path.join(this.modelPath, file.name);
      if (!fs.existsSync(filePath)) {
        console.log(`[ModelDownloader] Missing file: ${file.name}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取模型路径
   */
  getModelPath(): string {
    return this.modelPath;
  }

  /**
   * 选择镜像源
   */
  private selectMirror(): string {
    const mirrors = getSortedMirrors();
    if (mirrors.length === 0) {
      throw new Error('没有可用的镜像源');
    }
    return mirrors[0].url;
  }

  /**
   * 更新下载进度
   */
  private updateProgress(progressEvent: any, startByte: number): void {
    const currentDownloaded = startByte + (progressEvent.loaded || 0);
    this.progress.downloaded = currentDownloaded;

    if (progressEvent.total) {
      const totalSize = startByte + progressEvent.total;
      this.progress.total = totalSize;
      this.progress.percentage = Math.round((currentDownloaded / totalSize) * 100);
    }

    // 计算下载速度
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000; // 秒
    
    if (elapsed > 0) {
      const bytesDownloaded = currentDownloaded - this.lastDownloaded;
      const currentSpeed = bytesDownloaded / elapsed;
      
      // 使用滑动窗口平滑速度
      this.speedSamples.push(currentSpeed);
      if (this.speedSamples.length > 10) {
        this.speedSamples.shift();
      }
      
      const avgSpeed = this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length;
      this.progress.speed = Math.round(avgSpeed);

      // 计算剩余时间
      const remaining = this.progress.total - currentDownloaded;
      this.progress.remainingTime = avgSpeed > 0 ? Math.round(remaining / avgSpeed) : 0;
    }
  }

  /**
   * 保存下载状态
   */
  private saveDownloadState(): void {
    if (!this.currentMirrorUrl) return;

    const state: DownloadState = {
      filePath: this.tempPath,
      downloaded: this.progress.downloaded,
      total: this.progress.total,
      mirrorUrl: this.currentMirrorUrl,
      timestamp: Date.now()
    };

    fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
  }

  /**
   * 加载下载状态
   */
  private loadDownloadState(): void {
    if (!fs.existsSync(this.stateFilePath)) {
      return;
    }

    try {
      const data = fs.readFileSync(this.stateFilePath, 'utf-8');
      this.downloadState = JSON.parse(data);

      // 检查临时文件是否存在
      if (this.downloadState && fs.existsSync(this.tempPath)) {
        this.currentMirrorUrl = this.downloadState.mirrorUrl;
        this.progress.downloaded = this.downloadState.downloaded;
        this.progress.total = this.downloadState.total;
        this.progress.percentage = Math.round(
          (this.downloadState.downloaded / this.downloadState.total) * 100
        );
        this.progress.status = 'paused';
      } else {
        this.clearDownloadState();
      }
    } catch (error) {
      console.error('加载下载状态失败:', error);
      this.clearDownloadState();
    }
  }

  /**
   * 清理下载状态
   */
  private clearDownloadState(): void {
    if (fs.existsSync(this.stateFilePath)) {
      fs.unlinkSync(this.stateFilePath);
    }
    // 清理旧版本遗留的 state 文件
    this.cleanLegacyStateFiles();
    this.downloadState = null;
    this.currentMirrorUrl = null;
  }
}
