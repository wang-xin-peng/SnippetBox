jest.mock('better-sqlite3');

import { ExportService } from '../../src/main/services/ExportService';

jest.mock('fs');

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('pdf content')),
      close: jest.fn().mockResolvedValue(undefined)
    }),
    close: jest.fn().mockResolvedValue(undefined)
  })
}));

describe('ExportService', () => {
  let exportService: ExportService;

  beforeEach(() => {
    exportService = new ExportService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePreview', () => {
    it('should generate markdown preview with title', () => {
      const snippet = {
        id: 'snip-1',
        title: '测试片段',
        code: 'console.log("hello");',
        language: 'javascript',
        category: '测试分类',
        tags: ['test'],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      };

      const preview = exportService.generatePreview(snippet, { includeMetadata: true });

      expect(preview).toContain('# 测试片段');
      expect(preview).toContain('```javascript');
      expect(preview).toContain('console.log("hello");');
    });

    it('should generate preview with default metadata', () => {
      const snippet = {
        id: 'snip-1',
        title: '测试片段',
        code: 'console.log("hello");',
        language: 'javascript',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const preview = exportService.generatePreview(snippet, {});

      expect(preview).toContain('# 测试片段');
      expect(preview).toContain('```javascript');
      expect(preview).toContain('## 元数据');
    });

    it('should include description when provided', () => {
      const snippet = {
        id: 'snip-1',
        title: '测试片段',
        description: '这是一个描述',
        code: 'console.log("hello");',
        language: 'javascript',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const preview = exportService.generatePreview(snippet, { includeMetadata: true });

      expect(preview).toContain('这是一个描述');
    });

    it('should handle empty tags', () => {
      const snippet = {
        id: 'snip-1',
        title: '测试片段',
        code: 'console.log("hello");',
        language: 'javascript',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const preview = exportService.generatePreview(snippet, { includeMetadata: true });

      expect(preview).toContain('# 测试片段');
    });
  });

  describe('constructor', () => {
    it('should create instance without database', () => {
      const service = new ExportService();
      expect(service).toBeInstanceOf(ExportService);
    });
  });
});