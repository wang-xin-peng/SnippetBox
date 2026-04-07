import '@testing-library/jest-dom';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { INIT_SCRIPTS } from '../src/main/database/schema';

// Extend global type to include electronAPI
declare global {
  var electronAPI: {
    send: jest.Mock<any, any>;
    on: jest.Mock<any, any>;
  };
  var testDb: Database.Database | null;
}

// Mock Electron APIs
global.electronAPI = {
  send: jest.fn(),
  on: jest.fn(),
};

// 创建测试数据库
export function createTestDatabase(): Database.Database {
  const dbPath = path.join(__dirname, `test-${Date.now()}.db`);
  const db = new Database(dbPath);

  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 初始化数据库
  for (const script of INIT_SCRIPTS) {
    db.exec(script);
  }

  return db;
}

// 清理测试数据库
export function cleanupTestDatabase(db: Database.Database): void {
  const dbPath = db.name;
  db.close();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
}

global.testDb = null;

