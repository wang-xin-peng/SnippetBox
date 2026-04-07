// Mock database
const mockDatabase = {
  run: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  all: jest.fn(),
  exec: jest.fn().mockResolvedValue(undefined),
  transaction: jest.fn(async (callback) => {
    await callback();
  }),
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

describe('Category and Tag Integration', () => {
  let categoryManager: CategoryManager;
  let tagManager: TagManager;

  beforeEach(() => {
    jest.clearAllMocks();
    categoryManager = new CategoryManager();
    tagManager = new TagManager();
  });

  describe('Category and Tag Management Integration', () => {
    test('should create category and tags successfully', async () => {
      // Mock database responses
      mockDatabase.get.mockImplementation((sql: string, params: any[]) => {
        if (params && params[0] === 'Test Category') return null;
        if (params && params[0] === '1') {
          return {
            id: '1',
            name: 'Test Category',
            color: '#ff0000',
            icon: '📁',
            created_at: '2024-01-01T00:00:00.000Z',
          };
        }
        return null;
      });

      mockDatabase.all.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM tags')) {
          return [];
        }
        return [];
      });

      // Create category
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      expect(category).toBeDefined();
      expect(category.name).toBe('Test Category');

      // Create tags
      const tag1 = await tagManager.createTag({ name: 'javascript' });
      const tag2 = await tagManager.createTag({ name: 'typescript' });

      expect(tag1).toBeDefined();
      expect(tag2).toBeDefined();
      expect(tag1.name).toBe('javascript');
      expect(tag2.name).toBe('typescript');
    });

    test('should handle category and tag operations together', async () => {
      // Mock database responses
      let updatedCategoryName: string | null = null;
      
      mockDatabase.get.mockImplementation((sql: string, params: any[]) => {
        if (params && params[0] === 'Work') return null;
        if (params && params[0] === '2') {
          return {
            id: '2',
            name: 'Work',
            color: '#0000ff',
            icon: '💼',
            created_at: '2024-01-01T00:00:00.000Z',
          };
        }
        if (params && params[0] === 'react') return null;
        // Return category by ID (UUID format)
        if (params && params.length === 1 && typeof params[0] === 'string' && params[0].match(/^[0-9a-f-]{36}$/)) {
          return {
            id: params[0],
            name: updatedCategoryName || 'Work',
            color: '#0000ff',
            icon: '💼',
            created_at: '2024-01-01T00:00:00.000Z',
          };
        }
        return null;
      });
      
      mockDatabase.run.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('UPDATE categories SET')) {
          updatedCategoryName = params[0];
        }
        return Promise.resolve(undefined);
      });

      mockDatabase.all.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM tags')) {
          return [];
        }
        return [];
      });

      // Create category
      const category = await categoryManager.createCategory({
        name: 'Work',
        color: '#0000ff',
        icon: '💼',
      });

      // Create tag
      const tag = await tagManager.createTag({ name: 'react' });

      // Update category
      const updatedCategory = await categoryManager.updateCategory(category.id, {
        name: 'Work Projects',
      });

      expect(updatedCategory.name).toBe('Work Projects');
      expect(tag.name).toBe('react');
    });

    test('should handle tag merging and category deletion', async () => {
      // Mock database responses
      mockDatabase.get.mockImplementation((sql: string, params: any[]) => {
        if (params && params[0] === 'temp') return null;
        if (params && params[0] === '3') {
          return {
            id: '3',
            name: 'temp',
            color: '#ffff00',
            icon: '📝',
            created_at: '2024-01-01T00:00:00.000Z',
          };
        }
        if (params && params[0] === 'js') {
          return {
            id: 'tag1',
            name: 'js',
            usage_count: 5,
            created_at: '2024-01-01T00:00:00.000Z',
          };
        }
        if (params && params[0] === 'javascript') {
          return {
            id: 'tag2',
            name: 'javascript',
            usage_count: 10,
            created_at: '2024-01-01T00:00:00.000Z',
          };
        }
        // Return category by ID (UUID format)
        if (params && params.length === 1 && typeof params[0] === 'string' && params[0].match(/^[0-9a-f-]{36}$/)) {
          return {
            id: params[0],
            name: 'temp',
            color: '#ffff00',
            icon: '📝',
            created_at: '2024-01-01T00:00:00.000Z',
          };
        }
        return null;
      });
      
      mockDatabase.run.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('DELETE FROM categories')) {
          // Allow DELETE statement to execute
        }
        return Promise.resolve(undefined);
      });

      mockDatabase.all.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM tags')) {
          return [
            {
              id: 'tag1',
              name: 'js',
              usage_count: 5,
              created_at: '2024-01-01T00:00:00.000Z',
            },
            {
              id: 'tag2',
              name: 'javascript',
              usage_count: 10,
              created_at: '2024-01-01T00:00:00.000Z',
            },
          ];
        }
        return [];
      });

      // Create category
      const category = await categoryManager.createCategory({
        name: 'temp',
        color: '#ffff00',
        icon: '📝',
      });

      // Merge tags
      await tagManager.mergeTags('js', 'javascript');

      // Delete category
      await categoryManager.deleteCategory(category.id);

      // Check if DELETE FROM categories was called
      const deleteCalls = mockDatabase.run.mock.calls.filter((call: any[]) => 
        call[0].includes('DELETE FROM categories')
      );
      expect(deleteCalls.length).toBeGreaterThan(0);
    });
  });
});
