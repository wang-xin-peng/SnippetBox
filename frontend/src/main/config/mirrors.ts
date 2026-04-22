import { MirrorInfo, ModelInfo } from '../../shared/types/model';

// 模型信息 - 使用多语言模型（支持中文）
export const MODEL_INFO: ModelInfo = {
  name: 'paraphrase-multilingual-MiniLM-L12-v2',
  fileName: 'paraphrase-multilingual-MiniLM-L12-v2.onnx',
  expectedHash: 'skip-verification',
  size: 120000000 // 约 120MB
};

// 模型文件列表（需要下载的所有文件）
// 注意：tokenizer.json 已包含词汇表，不需要额外的 vocab.txt
export const MODEL_FILES = [
  { name: 'model.onnx', url: 'onnx/model.onnx' },
  { name: 'tokenizer.json', url: 'tokenizer.json' },
  { name: 'tokenizer_config.json', url: 'tokenizer_config.json' },
  { name: 'config.json', url: 'config.json' },
  { name: 'special_tokens_map.json', url: 'special_tokens_map.json' }
];

// 镜像源配置
export const MODEL_MIRRORS: MirrorInfo[] = [
  {
    // Hugging Face 国内镜像（优先使用，国内速度快）
    url: 'https://hf-mirror.com/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/',
    name: 'Hugging Face 镜像',
    location: '中国',
    priority: 1
  },
  {
    // Hugging Face 官方
    url: 'https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/',
    name: 'Hugging Face 官方',
    location: '全球',
    priority: 2
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
