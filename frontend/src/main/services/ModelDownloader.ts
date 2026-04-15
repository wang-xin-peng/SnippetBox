import axios, { AxiosInstance, CancelTokenSource } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';
import { DownloadProgress, DownloadState, MirrorInfo } from '../../shared/types/model';
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
  private lastDownloaded: number = 0;
  private speedSamples: number[] = [];

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
      // 选择镜像源
      const baseUrl = mirrorUrl || this.selectMirror();
      this.currentMirrorUrl = baseUrl;
      
      // 创建临时目录
      if (!fs.existsSync(this.tempPath)) {
        fs.mkdirSync(this.tempPath, { recursive: true });
      }

      this.progress.status = 'downloading';
      this.progress.downloaded = 0;
      this.progress.total = MODEL_INFO.size;

      // 下载所有文件
      for (let i = 0; i < MODEL_FILES.length; i++) {
        const file = MODEL_FILES[i];
        const fileUrl = baseUrl + file.url;
        const filePath = path.join(this.tempPath, file.name);

        console.log(`[ModelDownloader] Downloading ${file.name} from ${fileUrl}`);

        // 创建取消令牌
        this.cancelTokenSource = axios.CancelToken.source();

        // 下载文件
        const response = await this.axiosInstance.get(fileUrl, {
          responseType: 'stream',
          cancelToken: this.cancelTokenSource.token,
          onDownloadProgress: (progressEvent) => {
            // 简单的进度更新
            const fileProgress = (i / MODEL_FILES.length) * 100;
            const currentFileProgress = progressEvent.loaded / (progressEvent.total || 1) * (100 / MODEL_FILES.length);
            this.progress.percentage = Math.round(fileProgress + currentFileProgress);
          }
        });

        // 写入文件
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
          response.data.on('error', reject);
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
        this.progress.status = 'cancelled';
        this.progress.error = '下载已取消';
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

    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('用户暂停下载');
    }

    this.progress.status = 'paused';
    this.saveDownloadState();
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
    // 取消正在进行的请求
    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('用户取消下载');
      this.cancelTokenSource = null;
    }

    // 删除临时文件
    if (fs.existsSync(this.tempPath)) {
      try {
        fs.unlinkSync(this.tempPath);
      } catch (error) {
        console.error('删除临时文件失败:', error);
      }
    }

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
    this.clearDownloadState();
    this.progress.status = 'idle';
    this.progress.downloaded = 0;
    this.progress.percentage = 0;
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
    this.downloadState = null;
    this.currentMirrorUrl = null;
  }
}
