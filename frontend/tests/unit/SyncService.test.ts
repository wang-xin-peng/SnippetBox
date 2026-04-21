import Database from 'better-sqlite3';
import { createTestDatabase, cleanupTestDatabase } from '../setup';

// Mock electron
jest.mock('electron', () => ({
  BrowserWindow: { getAllWindows: () => [] },
}));

// Mock axios at module level
jest.mock('axios', () => {
  const mockInstance: any = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  const axios: any = {
    create: jest.fn(() => mockInstance),
    get: jest.fn(),
    __mockInstance: mockInstance,
  };
  return { default: axios, ...axios };
});

const mockGetDb = jest.fn();
jest.mock('../../src/main/database', () => ({
  getDatabaseManager: () => ({ getDb: mockGetDb, connect: jest.fn() }),
}));

jest.mock('../../src/main/services/AuthService', () => ({
  getAuthService: () => ({
    getAccessToken: () => 'mock-token',
    isLoggedIn: () => true,
  }),
}));

jest.mock('../../src/main/services/OfflineQueue', () => ({
  getOfflineQueue: () => ({
    getPendingOperations: () => [],
    getQueueStatus: () => ({ pending: 0, failed: 0, operations: [] }),
    enqueue: jest.fn(),
    markProcessed: jest.fn(),
    clearFailed: jest.fn(),
  }),
}));

jest.mock('../../src/main/services/ConflictResolver', () => ({
  getConflictResolver: () => ({
    detectConflicts: () => [],
    resolveConflict: jest.fn(),
    autoResolve: jest.fn(),
    getHistory: () => [],
  }),
}));

describe('SyncService', () => {
  let db: Database.Database;
  let service: any;

  beforeEach(() => {
    db = createTestDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        snippet_id TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0
      )
    `);
    mockGetDb.mockReturnValue(db);

    jest.resetModules();
    const { SyncService } = require('../../src/main/services/SyncService');
    service = new SyncService();
  });

  afterEach(() => {
    if (service) service.disableAutoSync();
    cleanupTestDatabase(db);
  });

  describe('getSyncStatus', () => {
    test('should return initial idle status', () => {
      const status = service.getSyncStatus();
      expect(status.status).toBe('idle');
      expect(status.lastSyncAt).toBeNull();
      expect(status.error).toBeNull();
    });

    test('should report pending count from unsynced snippets', () => {
      db.prepare(
        `INSERT INTO snippets (id, title, code, language, is_synced, created_at, updated_at, access_count)
         VALUES ('s1', 'Test', 'code', 'js', 0, ${Date.now()}, ${Date.now()}, 0)`
      ).run();
      const status = service.getSyncStatus();
      expect(status.pendingCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('pushChanges', () => {
    test('should return empty result when no unsynced snippets', async () => {
      const axios = require('axios');
      axios.__mockInstance.post.mockResolvedValue({ data: { id: 'cloud-1' } });
      const result = await service.pushChanges();
      expect(result.pushed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should push unsynced snippets', async () => {
      db.prepare(
        `INSERT INTO snippets (id, title, code, language, is_synced, created_at, updated_at, access_count)
         VALUES ('s1', 'Test', 'code', 'js', 0, ${Date.now()}, ${Date.now()}, 0)`
      ).run();
      const axios = require('axios');
      axios.__mockInstance.post.mockResolvedValue({ data: { id: 'cloud-1' } });
      const result = await service.pushChanges();
      expect(result.pushed).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    test('should record error when push fails', async () => {
      db.prepare(
        `INSERT INTO snippets (id, title, code, language, is_synced, created_at, updated_at, access_count)
         VALUES ('s2', 'Test2', 'code2', 'ts', 0, ${Date.now()}, ${Date.now()}, 0)`
      ).run();
      const axios = require('axios');
      axios.__mockInstance.post.mockRejectedValue(new Error('Network error'));
      const result = await service.pushChanges();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('pullChanges', () => {
    test('should return empty result when cloud has no snippets', async () => {
      const axios = require('axios');
      axios.__mockInstance.get.mockResolvedValue({ data: { snippets: [] } });
      const result = await service.pullChanges();
      expect(result.pulled).toBe(0);
      expect(result.conflicts).toHaveLength(0);
    });

    test('should insert new cloud snippets locally', async () => {
      const axios = require('axios');
      axios.__mockInstance.get.mockResolvedValue({
        data: {
          snippets: [{
            id: 'cloud-1',
            title: 'Cloud Snippet',
            code: 'console.log()',
            language: 'js',
            updated_at: new Date().toISOString(),
          }],
        },
      });
      const result = await service.pullChanges();
      expect(result.pulled).toBe(1);
      const row = db.prepare(`SELECT * FROM snippets WHERE cloud_id = 'cloud-1'`).get();
      expect(row).toBeTruthy();
    });
  });

  describe('enableAutoSync / disableAutoSync', () => {
    test('should enable and disable auto sync without error', () => {
      expect(() => service.enableAutoSync(15)).not.toThrow();
      expect(() => service.disableAutoSync()).not.toThrow();
    });
  });
});
