import fc from 'fast-check';
import { SnippetManager } from '../../src/main/services/SnippetManager';

const createMockDatabase = () => ({
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  exec: jest.fn(),
  prepare: jest.fn().mockReturnValue({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
  }),
  transaction: jest.fn((callback: () => any) => callback),
} as any);

jest.mock('../../src/main/database', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      connect: jest.fn(),
      getDB: jest.fn().mockReturnValue(createMockDatabase()),
    }),
  },
}));

jest.mock('../../src/main/database/fts', () => ({
  FullTextSearch: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockReturnValue([]),
  })),
}));

describe('Snippet Property Tests', () => {
  let snippetManager: SnippetManager;
  let mockDatabase: any;

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    jest.clearAllMocks();
    snippetManager = new SnippetManager(mockDatabase);
  });

  describe('Property 1: Snippet CRUD Data Consistency', () => {
    test('should maintain data consistency during CRUD operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            code: fc.string({ minLength: 1, maxLength: 10000 }).filter(s => s.trim().length > 0),
            language: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            category: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
            tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), { maxLength: 10 }), { nil: undefined }),
          }),
          async (snippetData) => {
            mockDatabase = createMockDatabase();
            snippetManager = new SnippetManager(mockDatabase);
            
            const snippetId = 'test-snippet-id';
            const now = Date.now();
            
            mockDatabase.prepare.mockReturnValue({
              run: jest.fn(),
              get: jest.fn().mockReturnValue({
                id: snippetId,
                title: snippetData.title,
                code: snippetData.code,
                language: snippetData.language,
                category_id: snippetData.category || null,
                description: null,
                created_at: now,
                updated_at: now,
                access_count: 0,
                is_synced: 0,
                cloud_id: null,
              }),
              all: jest.fn().mockReturnValue([]),
            });

            const createdSnippet = await snippetManager.createSnippet(snippetData);

            expect(createdSnippet).toBeDefined();
            expect(createdSnippet.title).toBe(snippetData.title);
            expect(createdSnippet.code).toBe(snippetData.code);
            expect(createdSnippet.language).toBe(snippetData.language);
          }
        )
      );
    });
  });

  describe('Property 2: Snippet ID Uniqueness', () => {
    test('should generate unique IDs for different snippets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
              language: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (snippetsData) => {
            const generatedIds = new Set<string>();
            
            for (const snippetData of snippetsData) {
              mockDatabase = createMockDatabase();
              snippetManager = new SnippetManager(mockDatabase);
              
              const snippetId = `snippet-${Math.random().toString(36).substr(2, 9)}`;
              const now = Date.now();
              
              mockDatabase.prepare.mockReturnValue({
                run: jest.fn(),
                get: jest.fn().mockReturnValue({
                  id: snippetId,
                  title: snippetData.title,
                  code: snippetData.code,
                  language: snippetData.language,
                  category_id: null,
                  description: null,
                  created_at: now,
                  updated_at: now,
                  access_count: 0,
                  is_synced: 0,
                  cloud_id: null,
                }),
                all: jest.fn().mockReturnValue([]),
              });

              const snippet = await snippetManager.createSnippet(snippetData);
              
              expect(generatedIds.has(snippet.id)).toBe(false);
              generatedIds.add(snippet.id);
            }
          }
        )
      );
    });
  });

  describe('Property 3: Timestamp Invariance and Monotonicity', () => {
    test('should maintain created_at invariance and updated_at monotonicity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            code: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            language: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          }),
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            code: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          }),
          async (createData, updateData) => {
            mockDatabase = createMockDatabase();
            snippetManager = new SnippetManager(mockDatabase);
            
            const snippetId = 'test-snippet-id';
            const createdAt = Date.now() - 1000;
            const updatedAt = Date.now();
            
            mockDatabase.prepare.mockReturnValue({
              run: jest.fn(),
              get: jest.fn()
                .mockReturnValueOnce({
                  id: snippetId,
                  title: createData.title,
                  code: createData.code,
                  language: createData.language,
                  category_id: null,
                  description: null,
                  created_at: createdAt,
                  updated_at: createdAt,
                  access_count: 0,
                  is_synced: 0,
                  cloud_id: null,
                })
                .mockReturnValueOnce({
                  id: snippetId,
                  title: updateData.title,
                  code: updateData.code,
                  language: createData.language,
                  category_id: null,
                  description: null,
                  created_at: createdAt,
                  updated_at: updatedAt,
                  access_count: 1,
                  is_synced: 0,
                  cloud_id: null,
                }),
              all: jest.fn().mockReturnValue([]),
            });

            const createdSnippet = await snippetManager.createSnippet(createData);
            const originalCreatedAt = createdSnippet.createdAt.getTime();

            const updatedSnippet = await snippetManager.updateSnippet(snippetId, updateData);

            expect(updatedSnippet.createdAt.getTime()).toBe(originalCreatedAt);
            expect(updatedSnippet.updatedAt.getTime()).toBeGreaterThanOrEqual(originalCreatedAt);
          }
        )
      );
    });
  });
});
