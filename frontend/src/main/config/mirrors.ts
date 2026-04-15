import { MirrorInfo, ModelInfo } from '../../shared/types/model';

// 模型信息
export const MODEL_INFO: ModelInfo = {
  name: 'test-model',
  fileName: 'test-model.bin',
  // 注意：这是一个示例 hash，实际使用时需要计算真实文件的 SHA256
  expectedHash: 'skip-verification', // 使用特殊值跳过验证
  size: 1000000 // 约 1MB
};

// 镜像源配置
// 使用公开的测试文件进行演示
export const MODEL_MIRRORS: MirrorInfo[] = [
  {
    // 使用 httpbin.org 的测试端点（返回 1MB 数据）
    url: 'https://httpbin.org/bytes/1048576',
    name: '测试源 1MB',
    location: '全球',
    priority: 1
  },
  {
    // 备用测试源
    url: 'https://speed.hetzner.de/1MB.bin',
    name: 'Hetzner 测试 1MB',
    location: '欧洲',
    priority: 2
  },
  {
    // 示例 URL（不可用）
    url: 'https://cdn.example.com/models/test-model.bin',
    name: '官方 CDN（示例）',
    location: '全球',
    priority: 3
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
