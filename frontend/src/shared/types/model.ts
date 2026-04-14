// 模型下载相关类型定义

export interface MirrorInfo {
  url: string;
  name: string;
  location: string;
  priority: number;
}

export interface DownloadProgress {
  downloaded: number; // 已下载字节数
  total: number; // 总字节数
  percentage: number; // 下载百分比
  speed: number; // 下载速度 (bytes/s)
  remainingTime: number; // 剩余时间 (秒)
  status: 'idle' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

export interface DownloadState {
  filePath: string;
  downloaded: number;
  total: number;
  mirrorUrl: string;
  timestamp: number;
}

export interface ModelInfo {
  name: string;
  fileName: string;
  expectedHash: string;
  size: number;
}
