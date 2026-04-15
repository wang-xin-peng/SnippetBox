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
  
  // 在 Windows 上，文件可能被锁定，需要重试
  if (fs.existsSync(dbPath)) {
    let retries = 3;
    while (retries > 0) {
      try {
        fs.unlinkSync(dbPath);
        break;
      } catch (error: any) {
        if (error.code === 'EBUSY' || error.code === 'EPERM') {
          retries--;
          if (retries === 0) {
            console.warn(`无法删除测试数据库文件: ${dbPath}`, error.message);
          } else {
            // 等待一小段时间后重试
            const start = Date.now();
            while (Date.now() - start < 100) {
              // 忙等待
            }
          }
        } else {
          throw error;
        }
      }
    }
  }
}

global.testDb = null;

