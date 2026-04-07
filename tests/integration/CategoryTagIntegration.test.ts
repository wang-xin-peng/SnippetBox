import Database from 'better-sqlite3';
import { CategoryManager } from '../../src/main/services/CategoryManager';
import { TagManager } from '../../src/main/services/TagManager';
import { SnippetManager } from '../../src/main/services/SnippetManager';
import { createTestDatabase, cleanupTestDatabase } from '../setup';

describe('Category and Tag Integration', () => {
  let db: Database.Database;
  let categoryManager: CategoryManager;
  let tagManager: TagManager;
  let snippetManager: SnippetManager;

  beforeEach(() => {
    db = createTestDatabase();
    categoryManager = new CategoryManager(db);
    tagManager = new TagManager(db);
    snippetManager = new SnippetManager(db);
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  describe('Category and Tag Management Integration', () => {
    test('should create category and tags successfully', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      const tag1 = await tagManager.createTag({ name: 'Tag 1' });
      const tag2 = await tagManager.createTag({ name: 'Tag 2' });

      expect(category).toBeDefined();
      expect(tag1).toBeDefined();
      expect(tag2).toBeDefined();
    });

    test('should create snippet with category and tags', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      const snippet = await snippetManager.createSnippet({
        title: 'Test Snippet',
        code: 'console.log("test");',
        language: 'javascript',
        category: category.id,
        tags: ['tag1', 'tag2'],
      });

      expect(snippet).toBeDefined();
      expect(snippet.category).toBe('Test Category');
      expect(snippet.tags).toContain('tag1');
      expect(snippet.tags).toContain('tag2');
    });

    test('should filter snippets by category', async () => {
      const category1 = await categoryManager.createCategory({
        name: 'Category 1',
        color: '#ff0000',
        icon: '📁',
      });

      const category2 = await categoryManager.createCategory({
        name: 'Category 2',
        color: '#00ff00',
        icon: '📂',
      });

      await snippetManager.createSnippet({
        title: 'Snippet 1',
        code: 'code 1',
        language: 'javascript',
        category: category1.id,
      });

      await snippetManager.createSnippet({
        title: 'Snippet 2',
        code: 'code 2',
        language: 'python',
        category: category2.id,
      });

      const snippets = await snippetManager.filterByCategory(category1.id);

      expect(snippets.length).toBeGreaterThan(0);
      expect(snippets.every((s) => s.category === 'Category 1')).toBe(true);
    });

    test('should filter snippets by tags', async () => {
      const tag1 = await tagManager.createTag({ name: 'tag1' });
      const tag2 = await tagManager.createTag({ name: 'tag2' });

      await snippetManager.createSnippet({
        title: 'Snippet 1',
        code: 'code 1',
        language: 'javascript',
        tags: ['tag1'],
      });

      await snippetManager.createSnippet({
        title: 'Snippet 2',
        code: 'code 2',
        language: 'python',
        tags: ['tag2'],
      });

      const snippets = await snippetManager.filterByTags([tag1.id]);

      expect(snippets.length).toBeGreaterThan(0);
      expect(snippets.every((s) => s.tags.includes('tag1'))).toBe(true);
    });

    test('should update snippet category and tags', async () => {
      const category1 = await categoryManager.createCategory({
        name: 'Category 1',
        color: '#ff0000',
        icon: '📁',
      });

      const category2 = await categoryManager.createCategory({
        name: 'Category 2',
        color: '#00ff00',
        icon: '📂',
      });

      const snippet = await snippetManager.createSnippet({
        title: 'Test Snippet',
        code: 'code',
        language: 'javascript',
        category: category1.id,
        tags: ['tag1'],
      });

      const updated = await snippetManager.updateSnippet(snippet.id, {
        category: category2.id,
        tags: ['tag2', 'tag3'],
      });

      expect(updated.category).toBe('Category 2');
      expect(updated.tags).toContain('tag2');
      expect(updated.tags).toContain('tag3');
      expect(updated.tags).not.toContain('tag1');
    });

    test('should delete category and set snippets category to null', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      const snippet = await snippetManager.createSnippet({
        title: 'Test Snippet',
        code: 'code',
        language: 'javascript',
        category: category.id,
      });

      await categoryManager.deleteCategory(category.id);

      const updatedSnippet = await snippetManager.getSnippet(snippet.id);
      expect(updatedSnippet.category).toBe('');
    });

    test('should delete tag and remove from snippets', async () => {
      const tag = await tagManager.createTag({ name: 'test-tag' });

      const snippet = await snippetManager.createSnippet({
        title: 'Test Snippet',
        code: 'code',
        language: 'javascript',
        tags: ['test-tag'],
      });

      await tagManager.deleteTag(tag.id);

      const updatedSnippet = await snippetManager.getSnippet(snippet.id);
      expect(updatedSnippet.tags).not.toContain('test-tag');
    });
  });

  describe('Category Statistics', () => {
    test('should get categories with snippet count', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      await snippetManager.createSnippet({
        title: 'Snippet 1',
        code: 'code 1',
        language: 'javascript',
        category: category.id,
      });

      await snippetManager.createSnippet({
        title: 'Snippet 2',
        code: 'code 2',
        language: 'python',
        category: category.id,
      });

      const categories = await categoryManager.getCategoriesWithSnippetCount();
      const testCategory = categories.find((c) => c.name === 'Test Category');

      expect(testCategory).toBeDefined();
      expect(testCategory?.count).toBe(2);
    });
  });

  describe('Tag Usage', () => {
    test('should track tag usage count', async () => {
      await snippetManager.createSnippet({
        title: 'Snippet 1',
        code: 'code 1',
        language: 'javascript',
        tags: ['common-tag'],
      });

      await snippetManager.createSnippet({
        title: 'Snippet 2',
        code: 'code 2',
        language: 'python',
        tags: ['common-tag'],
      });

      const tag = await tagManager.getTagByName('common-tag');
      expect(tag).toBeDefined();
      expect(tag?.usageCount).toBeGreaterThan(0);
    });
  });
});
