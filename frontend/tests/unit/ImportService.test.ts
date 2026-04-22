/**
 * 任务 33.1: 导入服务单元测试
 * 文件位置: tests/unit/ImportService.test.ts
 */

// 模拟数据库
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockReturnThis(),
    run: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    all: jest.fn().mockReturnValue([]),
    exec: jest.fn().mockReturnThis(),
  }));
});

// 模拟 fs
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(''),
  existsSync: jest.fn().mockReturnValue(true),
  writeFileSync: jest.fn()
}));

import Database from 'better-sqlite3';
import { ImportService } from '../../src/main/services/ImportService';

describe('ImportService', () => {
  let importService: ImportService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = new Database();
    importService = new ImportService(mockDb);
  });

  describe('importFromMarkdown', () => {
    it('导入方法存在且可调用', () => {
      expect(importService.importFromMarkdown).toBeDefined();
      expect(typeof importService.importFromMarkdown).toBe('function');
    });
  });

  describe('构造函数', () => {
    it('构造函数正确初始化', () => {
      expect(importService).toBeDefined();
    });
  });
});
