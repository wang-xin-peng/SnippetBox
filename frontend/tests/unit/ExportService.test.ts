/**
 * 任务 33.1: 导出服务单元测试
 * 文件位置: tests/unit/ExportService.test.ts
 */

// 模拟数据库
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockReturnThis(),
    run: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnValue(null),
    all: jest.fn().mockReturnValue([]),
    exec: jest.fn().mockReturnThis(),
  }));
});

// 模拟 fs
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

import Database from 'better-sqlite3';
import { ExportService } from '../../src/main/services/ExportService';

describe('ExportService', () => {
  let exportService: ExportService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = new Database();
    exportService = new ExportService(mockDb);
  });

  describe('exportToMarkdown', () => {
    it('导出方法存在且可调用', () => {
      expect(exportService.exportToMarkdown).toBeDefined();
      expect(typeof exportService.exportToMarkdown).toBe('function');
    });
  });

  describe('构造函数', () => {
    it('构造函数正确初始化', () => {
      expect(exportService).toBeDefined();
    });
  });
});
