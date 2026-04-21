import Database from 'better-sqlite3';
import { createTestDatabase, cleanupTestDatabase } from '../setup';

// Mock getDatabaseManager to use a dynamic db reference
const mockGetDb = jest.fn();
jest.mock('../../src/main/database', () => ({
  getDatabaseManager: () => ({ getDb: mockGetDb, connect: jest.fn() }),
}));

describe('OfflineQueue', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDatabase();
    // Add offline_queue table (not in base schema)
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
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  function makeQueue() {
    // Re-require to get fresh instance with current db
    jest.resetModules();
    const { OfflineQueue } = require('../../src/main/services/OfflineQueue');
    return new OfflineQueue();
  }

  test('should return empty status initially', () => {
    const queue = makeQueue();
    const status = queue.getQueueStatus();
    expect(status.pending).toBe(0);
    expect(status.failed).toBe(0);
    expect(status.operations).toHaveLength(0);
  });

  test('should add operation to queue', async () => {
    const queue = makeQueue();
    await queue.enqueue({
      type: 'create',
      snippetId: 's1',
      data: { title: 'Test' },
      timestamp: Date.now(),
    });
    const status = queue.getQueueStatus();
    expect(status.pending).toBe(1);
  });

  test('should support multiple operations', async () => {
    const queue = makeQueue();
    await queue.enqueue({ type: 'create', snippetId: 's1', data: {}, timestamp: Date.now() });
    await queue.enqueue({ type: 'update', snippetId: 's2', data: {}, timestamp: Date.now() });
    await queue.enqueue({ type: 'delete', snippetId: 's3', data: {}, timestamp: Date.now() });
    const status = queue.getQueueStatus();
    expect(status.pending).toBe(3);
  });

  test('should return pending operations', async () => {
    const queue = makeQueue();
    await queue.enqueue({ type: 'create', snippetId: 's1', data: { title: 'T' }, timestamp: 1000 });
    const ops = queue.getPendingOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('create');
    expect(ops[0].snippetId).toBe('s1');
  });

  test('should remove operation after markProcessed', async () => {
    const queue = makeQueue();
    await queue.enqueue({ type: 'create', snippetId: 's1', data: {}, timestamp: Date.now() });
    const ops = queue.getPendingOperations();
    expect(ops).toHaveLength(1);
    await queue.markProcessed(ops[0].id);
    expect(queue.getPendingOperations()).toHaveLength(0);
  });

  test('should clear failed operations', () => {
    const queue = makeQueue();
    db.prepare(
      `INSERT INTO offline_queue (id, type, snippet_id, data, timestamp, retry_count)
       VALUES ('failed-1', 'create', 's1', '{}', ${Date.now()}, 3)`
    ).run();
    expect(queue.getQueueStatus().failed).toBe(1);
    queue.clearFailed();
    expect(queue.getQueueStatus().failed).toBe(0);
  });
});
