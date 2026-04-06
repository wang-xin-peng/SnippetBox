import fc from 'fast-check';

// Mock database
const mockDatabase = {
  run: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  all: jest.fn(),
  exec: jest.fn().mockResolvedValue(undefined),
  transaction: jest.fn((callback) => callback()),
} as any;

jest.mock('../../src/main/database', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      connect: jest.fn(),
      getDB: jest.fn().mockReturnValue(mockDatabase),
    }),
  },
}));

import { CategoryManager } from '../../src/main/services/CategoryManager';
import { TagManager } from '../../src/main/services/TagManager';

describe('Category and Tag Property Tests', () => {
  let categoryManager: CategoryManager;
  let tagManager: TagManager;

  beforeEach(() => {
    jest.clearAllMocks();
    categoryManager = new CategoryManager();
    tagManager = new TagManager();
  });

  describe('CategoryManager Properties', () => {
    test('should create category with valid name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string().filter(s => /^#[0-9A-Fa-f]{6}$/.test(s)),
          fc.string({ maxLength: 10 }),
          async (name, color, icon) => {
            // Mock database response
            mockDatabase.get.mockResolvedValue(null);
            mockDatabase.run.mockResolvedValue(undefined);
            mockDatabase.get.mockImplementation((sql: string, params: any[]) => {
              if (params && params[0] === name) return null;
              if (params && params.length === 4) {
                return {
                  id: '1',
                  name,
                  color,
                  icon,
                  created_at: new Date().toISOString(),
                };
              }
              return null;
            });

            const category = await categoryManager.createCategory({
              name,
              color,
              icon,
            });

            expect(category).toBeDefined();
            expect(category.name).toBe(name.trim());
            expect(category.color).toBe(color);
            expect(category.icon).toBe(icon || '📁');
          }
        )
      );
    });

    test('should not create category with duplicate name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (name) => {
            // Mock database response - category already exists
            mockDatabase.get.mockResolvedValue({
              id: '1',
              name,
              color: '#ff0000',
              icon: '📁',
              created_at: new Date().toISOString(),
            });

            await expect(
              categoryManager.createCategory({
                name,
                color: '#ff0000',
                icon: '📁',
              })
            ).rejects.toThrow('Category with name "' + name + '" already exists');
          }
        )
      );
    });
  });

  describe('TagManager Properties', () => {
    test('should create tag with valid name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          async (name) => {
            // Clear mocks before each test iteration
            jest.clearAllMocks();
            
            // Mock database response - tag doesn't exist
            mockDatabase.get.mockImplementation((sql: string, params: any[]) => {
              if (params && params[0] === name.trim().toLowerCase()) return null;
              if (params && params.length === 1 && typeof params[0] === 'string' && params[0].match(/^[0-9a-f-]{36}$/)) {
                return {
                  id: params[0],
                  name: name.trim(),
                  usage_count: 0,
                  created_at: new Date().toISOString(),
                };
              }
              return null;
            });
            
            mockDatabase.run.mockResolvedValue(undefined);

            const tag = await tagManager.createTag({ name });

            expect(tag).toBeDefined();
            expect(tag.name).toBe(name.trim());
            expect(tag.usageCount).toBe(0);
          }
        )
      );
    });

    test('should not create tag with duplicate name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          async (name) => {
            // Mock database response - tag already exists
            mockDatabase.get.mockResolvedValue({
              id: '1',
              name,
              usage_count: 5,
              created_at: new Date().toISOString(),
            });

            await expect(
              tagManager.createTag({ name })
            ).rejects.toThrow('Tag with name "' + name + '" already exists');
          }
        )
      );
    });

    test('should merge tags correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 30 }),
          async (sourceName, targetName) => {
            if (sourceName === targetName) return; // Skip same names

            // Mock database responses
            mockDatabase.get.mockImplementation((sql: string, params: any[]) => {
              if (params && params[0] === sourceName) {
                return {
                  id: 'source',
                  name: sourceName,
                  usage_count: 5,
                  created_at: new Date().toISOString(),
                };
              }
              if (params && params[0] === targetName) {
                return {
                  id: 'target',
                  name: targetName,
                  usage_count: 10,
                  created_at: new Date().toISOString(),
                };
              }
              return null;
            });

            mockDatabase.run.mockResolvedValue(undefined);

            await tagManager.mergeTags(sourceName, targetName);

            expect(mockDatabase.run).toHaveBeenCalledWith(
              expect.stringContaining('UPDATE snippet_tags SET tag_id = ? WHERE tag_id = ?'),
              expect.any(Array)
            );

            expect(mockDatabase.run).toHaveBeenCalledWith(
              expect.stringContaining('DELETE FROM tags WHERE id = ?'),
              expect.any(Array)
            );
          }
        )
      );
    });
  });
});
