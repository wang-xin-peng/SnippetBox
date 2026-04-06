// Mock 数据库
const mockDatabase = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  transaction: jest.fn((callback) => callback()),
};

// Mock DatabaseManager
jest.mock('../../src/main/database', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      connect: jest.fn(),
      getDB: jest.fn(() => mockDatabase),
    }),
  },
}));

import { CategoryManager } from '../../src/main/services/CategoryManager';

describe('CategoryManager', () => {
  let categoryManager: CategoryManager;

  beforeEach(() => {
    categoryManager = new CategoryManager();
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    test('should create a new category', async () => {
      mockDatabase.get.mockResolvedValue(null);
      mockDatabase.run.mockResolvedValue(undefined);

      const category = await categoryManager.createCategory({ 
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁'
      });

      expect(category).toHaveProperty('id');
      expect(category.name).toBe('Test Category');
      expect(category.color).toBe('#ff0000');
      expect(category.icon).toBe('📁');
      expect(mockDatabase.run).toHaveBeenCalled();
    });

    test('should throw error if category name is empty', async () => {
      await expect(categoryManager.createCategory({ name: '' })).rejects.toThrow('Category name cannot be empty');
    });

    test('should throw error if category already exists', async () => {
      mockDatabase.get.mockResolvedValue({ id: '1', name: 'Test Category' });

      await expect(categoryManager.createCategory({ name: 'Test Category' })).rejects.toThrow('Category with name "Test Category" already exists');
    });

    test('should use default values if color or icon not provided', async () => {
      mockDatabase.get.mockResolvedValue(null);
      mockDatabase.run.mockResolvedValue(undefined);

      const category = await categoryManager.createCategory({ name: 'Test Category' });

      expect(category.color).toBe('#6c757d');
      expect(category.icon).toBe('📁');
    });
  });

  describe('getCategories', () => {
    test('should return all categories with count', async () => {
      const mockCategories = [
        { 
          id: '1', 
          name: 'Category 1', 
          color: '#ff0000', 
          icon: '📁', 
          created_at: '2024-01-01T00:00:00.000Z',
          snippet_count: 5
        },
        { 
          id: '2', 
          name: 'Category 2', 
          color: '#00ff00', 
          icon: '📂', 
          created_at: '2024-01-02T00:00:00.000Z',
          snippet_count: 3
        },
      ];
      mockDatabase.all.mockResolvedValue(mockCategories);

      const categories = await categoryManager.getCategories();

      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('Category 1');
      expect(categories[0].color).toBe('#ff0000');
      expect(categories[0].count).toBe(5);
      expect(mockDatabase.all).toHaveBeenCalled();
    });
  });

  describe('getCategoryById', () => {
    test('should return category by id', async () => {
      const mockCategory = { 
        id: '1', 
        name: 'Test Category', 
        color: '#ff0000', 
        icon: '📁', 
        created_at: '2024-01-01T00:00:00.000Z'
      };
      mockDatabase.get.mockResolvedValue(mockCategory);

      const category = await categoryManager.getCategoryById('1');

      expect(category).toEqual({
        id: '1',
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });
    });

    test('should return undefined if category not found', async () => {
      mockDatabase.get.mockResolvedValue(undefined);

      const category = await categoryManager.getCategoryById('999');

      expect(category).toBeUndefined();
    });
  });

  describe('updateCategory', () => {
    test('should update category', async () => {
      const mockCategory = { 
        id: '1', 
        name: 'Old Name', 
        color: '#ff0000', 
        icon: '📁', 
        created_at: '2024-01-01T00:00:00.000Z'
      };
      const updatedMockCategory = { 
        id: '1', 
        name: 'New Name', 
        color: '#0000ff', 
        icon: '📁', 
        created_at: '2024-01-01T00:00:00.000Z'
      };
      
      let callCount = 0;
      mockDatabase.get.mockImplementation((sql, params) => {
        callCount++;
        if (params && params[0] === '1') {
          return callCount > 2 ? updatedMockCategory : mockCategory;
        }
        if (params && params[0] === 'New Name') return null;
        return null;
      });
      mockDatabase.run.mockResolvedValue(undefined);

      const updatedCategory = await categoryManager.updateCategory('1', {
        name: 'New Name',
        color: '#0000ff'
      });

      expect(updatedCategory.name).toBe('New Name');
      expect(updatedCategory.color).toBe('#0000ff');
      expect(mockDatabase.run).toHaveBeenCalled();
    });

    test('should throw error if category not found', async () => {
      mockDatabase.get.mockResolvedValue(undefined);

      await expect(categoryManager.updateCategory('999', { name: 'New Name' })).rejects.toThrow('Category with id "999" not found');
    });

    test('should throw error if new name already exists', async () => {
      const mockCategory = { 
        id: '1', 
        name: 'Old Name', 
        color: '#ff0000', 
        icon: '📁', 
        created_at: '2024-01-01T00:00:00.000Z'
      };
      const existingCategory = { 
        id: '2', 
        name: 'New Name', 
        color: '#0000ff', 
        icon: '📂', 
        created_at: '2024-01-02T00:00:00.000Z'
      };

      mockDatabase.get.mockImplementation((sql, params) => {
        if (params && params[0] === '1') return mockCategory;
        if (params && params[0] === 'New Name') return existingCategory;
        return null;
      });

      await expect(categoryManager.updateCategory('1', { name: 'New Name' })).rejects.toThrow('Category "New Name" already exists');
    });
  });

  describe('deleteCategory', () => {
    test('should delete category', async () => {
      const mockCategory = { 
        id: '1', 
        name: 'Test Category', 
        color: '#ff0000', 
        icon: '📁', 
        created_at: '2024-01-01T00:00:00.000Z'
      };
      mockDatabase.get.mockResolvedValue(mockCategory);
      mockDatabase.run.mockResolvedValue(undefined);

      await categoryManager.deleteCategory('1');

      expect(mockDatabase.run).toHaveBeenCalledWith('UPDATE snippets SET category_id = NULL WHERE category_id = ?', ['1']);
      expect(mockDatabase.run).toHaveBeenCalledWith('DELETE FROM categories WHERE id = ?', ['1']);
    });

    test('should throw error if category not found', async () => {
      mockDatabase.get.mockResolvedValue(undefined);

      await expect(categoryManager.deleteCategory('999')).rejects.toThrow('Category with id "999" not found');
    });
  });

  describe('setCategoryColor', () => {
    test('should set category color', async () => {
      const mockCategory = { 
        id: '1', 
        name: 'Test Category', 
        color: '#ff0000', 
        icon: '📁', 
        created_at: '2024-01-01T00:00:00.000Z'
      };
      mockDatabase.get.mockResolvedValue(mockCategory);
      mockDatabase.run.mockResolvedValue(undefined);

      await categoryManager.setCategoryColor('1', '#0000ff');

      expect(mockDatabase.run).toHaveBeenCalledWith('UPDATE categories SET color = ? WHERE id = ?', ['#0000ff', '1']);
    });

    test('should throw error if category not found', async () => {
      mockDatabase.get.mockResolvedValue(undefined);

      await expect(categoryManager.setCategoryColor('999', '#0000ff')).rejects.toThrow('Category with id "999" not found');
    });
  });

  describe('setCategoryIcon', () => {
    test('should set category icon', async () => {
      const mockCategory = { 
        id: '1', 
        name: 'Test Category', 
        color: '#ff0000', 
        icon: '📁', 
        created_at: '2024-01-01T00:00:00.000Z'
      };
      mockDatabase.get.mockResolvedValue(mockCategory);
      mockDatabase.run.mockResolvedValue(undefined);

      await categoryManager.setCategoryIcon('1', '📂');

      expect(mockDatabase.run).toHaveBeenCalledWith('UPDATE categories SET icon = ? WHERE id = ?', ['📂', '1']);
    });

    test('should throw error if category not found', async () => {
      mockDatabase.get.mockResolvedValue(undefined);

      await expect(categoryManager.setCategoryIcon('999', '📂')).rejects.toThrow('Category with id "999" not found');
    });
  });
});
