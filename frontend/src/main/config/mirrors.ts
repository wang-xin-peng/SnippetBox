import { MirrorInfo, ModelInfo } from '../../shared/types/model';

// 模型信息 - 使用多语言模型（支持中文）
export const MODEL_INFO: ModelInfo = {
  name: 'multilingual-e5-small',
  fileName: 'multilingual-e5-small.onnx',
  expectedHash: 'skip-verification',
  size: 140210000 // 量化 ONNX 约 133.71MB
};

// 模型文件列表
export const MODEL_FILES = [
  { name: 'model.onnx', url: 'onnx/model_uint8.onnx' },
  { name: 'sentencepiece.bpe.model', url: 'sentencepiece.bpe.model' },
  { name: 'tokenizer.json', url: 'tokenizer.json' },
  { name: 'tokenizer_config.json', url: 'tokenizer_config.json' },
  { name: 'config.json', url: 'config.json' },
  { name: 'special_tokens_map.json', url: 'special_tokens_map.json' }
];

// 镜像源配置
export const MODEL_MIRRORS: MirrorInfo[] = [
  {
    // Hugging Face 国内镜像（优先）
    url: 'https://hf-mirror.com/Xenova/multilingual-e5-small/resolve/main/',
    name: 'Hugging Face 镜像',
    location: '中国',
    priority: 1
  },
  {
    // Hugging Face 官方
    url: 'https://huggingface.co/Xenova/multilingual-e5-small/resolve/main/',
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
