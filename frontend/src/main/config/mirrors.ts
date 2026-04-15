import { MirrorInfo, ModelInfo } from '../../shared/types/model';

// 模型信息
export const MODEL_INFO: ModelInfo = {
  name: 'all-MiniLM-L6-v2',
  fileName: 'all-MiniLM-L6-v2.onnx',
  // SHA256 hash of the model file
  expectedHash: 'skip-verification', // 跳过验证以简化开发
  size: 90000000 // 约 90MB
};

// 模型文件列表（需要下载的所有文件）
export const MODEL_FILES = [
  { name: 'model.onnx', url: 'onnx/model.onnx' },
  { name: 'tokenizer.json', url: 'tokenizer.json' },
  { name: 'tokenizer_config.json', url: 'tokenizer_config.json' },
  { name: 'config.json', url: 'config.json' },
  { name: 'special_tokens_map.json', url: 'special_tokens_map.json' },
  { name: 'vocab.txt', url: 'vocab.txt' }
];

// 镜像源配置
export const MODEL_MIRRORS: MirrorInfo[] = [
  {
    // Hugging Face 官方（国内可能较慢）
    url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/',
    name: 'Hugging Face 官方',
    location: '全球',
    priority: 3
  },
  {
    // Hugging Face 国内镜像
    url: 'https://hf-mirror.com/sentence-transformers/all-MiniLM-L6-v2/resolve/main/',
    name: 'Hugging Face 镜像（国内）',
    location: '中国',
    priority: 1
  }
];

// 获取按优先级排序的镜像源
export function getSortedMirrors(): MirrorInfo[] {
  return [...MODEL_MIRRORS].sort((a, b) => a.priority - b.priority);
}

// 根据 URL 查找镜像源
export function findMirrorByUrl(url: string): MirrorInfo | undefined {
  return MODEL_MIRRORS.find(mirror => mirror.url === url);
}
