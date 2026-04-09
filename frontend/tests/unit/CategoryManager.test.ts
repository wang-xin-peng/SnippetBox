import Database from 'better-sqlite3';
import { CategoryManager } from '../../src/main/services/CategoryManager';
import { createTestDatabase, cleanupTestDatabase } from '../setup';

describe('CategoryManager', () => {
  let db: Database.Database;
  let categoryManager: CategoryManager;

  beforeEach(() => {
    db = createTestDatabase();
    categoryManager = new CategoryManager(db);
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  describe('createCategory', () => {
    test('should create a new category', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      expect(category).toHaveProperty('id');
      expect(category.name).toBe('Test Category');
      expect(category.color).toBe('#ff0000');
      expect(category.icon).toBe('📁');
    });

    test('should throw error if category name is empty', async () => {
      await expect(categoryManager.createCategory({ name: '' })).rejects.toThrow(
        'Category name cannot be empty'
      );
    });

    test('should throw error if category already exists', async () => {
      await categoryManager.createCategory({ name: 'Test Category' });

      await expect(categoryManager.createCategory({ name: 'Test Category' })).rejects.toThrow(
        'Category with name "Test Category" already exists'
      );
    });

    test('should use default values if color or icon not provided', async () => {
      const category = await categoryManager.createCategory({ name: 'Test Category' });

      expect(category.color).toBe('#6c757d');
      expect(category.icon).toBe('📁');
    });
  });

  describe('getCategories', () => {
    test('should return all categories with count', async () => {
      await categoryManager.createCategory({ name: 'Category 1', color: '#ff0000', icon: '📁' });
      await categoryManager.createCategory({ name: 'Category 2', color: '#00ff00', icon: '📂' });

      const categories = await categoryManager.getCategories();

      expect(categories.length).toBeGreaterThanOrEqual(2);
      const cat1 = categories.find((c) => c.name === 'Category 1');
      const cat2 = categories.find((c) => c.name === 'Category 2');
      expect(cat1).toBeDefined();
      expect(cat2).toBeDefined();
      expect(cat1?.color).toBe('#ff0000');
      expect(cat2?.color).toBe('#00ff00');
    });
  });

  describe('getCategoryById', () => {
    test('should return category by id', async () => {
      const created = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      const category = await categoryManager.getCategoryById(created.id);

      expect(category).toEqual({
        id: created.id,
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
        createdAt: expect.any(Date),
      });
    });

    test('should return undefined if category not found', async () => {
      const category = await categoryManager.getCategoryById('999');

      expect(category).toBeUndefined();
    });
  });

  describe('updateCategory', () => {
    test('should update category', async () => {
      const created = await categoryManager.createCategory({
        name: 'Old Name',
        color: '#ff0000',
        icon: '📁',
      });

      const updatedCategory = await categoryManager.updateCategory(created.id, {
        name: 'New Name',
        color: '#0000ff',
      });

      expect(updatedCategory.name).toBe('New Name');
      expect(updatedCategory.color).toBe('#0000ff');
    });

    test('should throw error if category not found', async () => {
      await expect(categoryManager.updateCategory('999', { name: 'New Name' })).rejects.toThrow(
        'Category with id "999" not found'
      );
    });

    test('should throw error if new name already exists', async () => {
      const cat1 = await categoryManager.createCategory({ name: 'Category 1' });
      await categoryManager.createCategory({ name: 'Category 2' });

      await expect(
        categoryManager.updateCategory(cat1.id, { name: 'Category 2' })
      ).rejects.toThrow('Category "Category 2" already exists');
    });
  });

  describe('deleteCategory', () => {
    test('should delete category', async () => {
      const created = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      await categoryManager.deleteCategory(created.id);

      const category = await categoryManager.getCategoryById(created.id);
      expect(category).toBeUndefined();
    });

    test('should throw error if category not found', async () => {
      await expect(categoryManager.deleteCategory('999')).rejects.toThrow(
        'Category with id "999" not found'
      );
    });
  });

  describe('setCategoryColor', () => {
    test('should set category color', async () => {
      const created = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      await categoryManager.setCategoryColor(created.id, '#0000ff');

      const category = await categoryManager.getCategoryById(created.id);
      expect(category?.color).toBe('#0000ff');
    });

    test('should throw error if category not found', async () => {
      await expect(categoryManager.setCategoryColor('999', '#0000ff')).rejects.toThrow(
        'Category with id "999" not found'
      );
    });
  });

  describe('setCategoryIcon', () => {
    test('should set category icon', async () => {
      const created = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      await categoryManager.setCategoryIcon(created.id, '📂');

      const category = await categoryManager.getCategoryById(created.id);
      expect(category?.icon).toBe('📂');
    });

    test('should throw error if category not found', async () => {
      await expect(categoryManager.setCategoryIcon('999', '📂')).rejects.toThrow(
        'Category with id "999" not found'
      );
    });
  });
});
