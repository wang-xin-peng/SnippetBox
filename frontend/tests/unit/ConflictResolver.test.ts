import Database from 'better-sqlite3';
import { createTestDatabase, cleanupTestDatabase } from '../setup';

const mockGetDb = jest.fn();
jest.mock('../../src/main/database', () => ({
  getDatabaseManager: () => ({ getDb: mockGetDb, connect: jest.fn() }),
}));

// Mock SnippetManager used in resolveConflict
jest.mock('../../src/main/services/SnippetManager', () => ({
  SnippetManager: jest.fn().mockImplementation(() => ({
    createSnippet: jest.fn().mockResolvedValue({}),
    updateSnippet: jest.fn().mockResolvedValue({}),
  })),
}));

const makeSnippet = (id: string, updatedAt: Date, extra: any = {}) => ({
  id,
  cloudId: id,
  title: 'Test',
  code: 'code',
  language: 'js',
  updatedAt,
  ...extra,
});

const makeCloudSnippet = (id: string, updatedAt: Date, extra: any = {}) => ({
  id,
  title: 'Cloud Test',
  code: 'cloud code',
  language: 'js',
  updated_at: updatedAt.toISOString(),
  ...extra,
});

describe('ConflictResolver', () => {
  let db: Database.Database;

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
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  function makeResolver() {
    jest.resetModules();
    const { ConflictResolver } = require('../../src/main/services/ConflictResolver');
    return new ConflictResolver();
  }

  describe('detectConflicts', () => {
    test('should return empty array when no conflicts', () => {
      const resolver = makeResolver();
      const now = new Date();
      const conflicts = resolver.detectConflicts(
        [makeSnippet('s1', now)],
        [makeCloudSnippet('s1', now)]
      );
      expect(conflicts).toHaveLength(0);
    });

    test('should detect update conflict when timestamps differ significantly', () => {
      const resolver = makeResolver();
      const conflicts = resolver.detectConflicts(
        [makeSnippet('s1', new Date('2024-01-01T10:00:00Z'))],
        [makeCloudSnippet('s1', new Date('2024-01-01T12:00:00Z'))]
      );
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('update');
      expect(conflicts[0].snippetId).toBe('s1');
    });

    test('should not detect conflict for snippets not in cloud', () => {
      const resolver = makeResolver();
      const conflicts = resolver.detectConflicts([makeSnippet('s1', new Date())], []);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('resolveConflict', () => {
    test('should resolve use-local without error', async () => {
      const resolver = makeResolver();
      const conflict = {
        snippetId: 's1',
        localVersion: makeSnippet('s1', new Date()),
        cloudVersion: makeCloudSnippet('s1', new Date()),
        type: 'update' as const,
      };
      await expect(resolver.resolveConflict(conflict, 'use-local')).resolves.not.toThrow();
    });

    test('should resolve skip without error', async () => {
      const resolver = makeResolver();
      const conflict = {
        snippetId: 's1',
        localVersion: makeSnippet('s1', new Date()),
        cloudVersion: makeCloudSnippet('s1', new Date()),
        type: 'update' as const,
      };
      await expect(resolver.resolveConflict(conflict, 'skip')).resolves.not.toThrow();
    });
  });

  describe('autoResolve', () => {
    test('should auto resolve with local strategy', async () => {
      const resolver = makeResolver();
      const conflicts = [{
        snippetId: 's1',
        localVersion: makeSnippet('s1', new Date('2024-01-01T12:00:00Z')),
        cloudVersion: makeCloudSnippet('s1', new Date('2024-01-01T10:00:00Z')),
        type: 'update' as const,
      }];
      await expect(resolver.autoResolve(conflicts, 'local')).resolves.not.toThrow();
    });

    test('should auto resolve with latest strategy', async () => {
      const resolver = makeResolver();
      const conflicts = [{
        snippetId: 's1',
        localVersion: makeSnippet('s1', new Date('2024-01-01T10:00:00Z')),
        cloudVersion: makeCloudSnippet('s1', new Date('2024-01-01T12:00:00Z')),
        type: 'update' as const,
      }];
      await expect(resolver.autoResolve(conflicts, 'latest')).resolves.not.toThrow();
    });
  });

  describe('getHistory', () => {
    test('should return empty history initially', () => {
      const resolver = makeResolver();
      expect(Array.isArray(resolver.getHistory())).toBe(true);
      expect(resolver.getHistory()).toHaveLength(0);
    });

    test('should record history after resolving conflict', async () => {
      const resolver = makeResolver();
      const conflict = {
        snippetId: 's1',
        localVersion: makeSnippet('s1', new Date()),
        cloudVersion: makeCloudSnippet('s1', new Date()),
        type: 'update' as const,
      };
      await resolver.resolveConflict(conflict, 'use-local');
      const history = resolver.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].resolution).toBe('use-local');
    });
  });
});
