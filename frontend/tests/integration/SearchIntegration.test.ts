import Database from 'better-sqlite3';
import { SearchEngine } from '../../src/main/services/SearchEngine';
import { SnippetManager } from '../../src/main/services/SnippetManager';
import { CategoryManager } from '../../src/main/services/CategoryManager';
import { TagManager } from '../../src/main/services/TagManager';
import { createTestDatabase, cleanupTestDatabase } from '../setup';

describe('Search Integration', () => {
  let db: Database.Database;
  let searchEngine: SearchEngine;
  let snippetManager: SnippetManager;
  let categoryManager: CategoryManager;
  let tagManager: TagManager;

  beforeEach(async () => {
    db = createTestDatabase();
    searchEngine = new SearchEngine(db);
    snippetManager = new SnippetManager(db);
    categoryManager = new CategoryManager(db);
    tagManager = new TagManager(db);

    // 创建测试数据
    const jsCategory = await categoryManager.createCategory({
      name: 'JavaScript',
      color: '#f7df1e',
      icon: '🟨',
    });

    const pyCategory = await categoryManager.createCategory({
      name: 'Python',
      color: '#3776ab',
      icon: '🐍',
    });

    await snippetManager.createSnippet({
      title: 'Array Map Function',
      code: 'const doubled = numbers.map(n => n * 2);',
      language: 'javascript',
      category: jsCategory.id,
      tags: ['array', 'map', 'functional'],
    });

    await snippetManager.createSnippet({
      title: 'Array Filter Function',
      code: 'const evens = numbers.filter(n => n % 2 === 0);',
      language: 'javascript',
      category: jsCategory.id,
      tags: ['array', 'filter', 'functional'],
    });

    await snippetManager.createSnippet({
      title: 'List Comprehension',
      code: 'doubled = [n * 2 for n in numbers]',
      language: 'python',
      category: pyCategory.id,
      tags: ['list', 'comprehension'],
    });

    await snippetManager.createSnippet({
      title: 'Dictionary Comprehension',
      code: 'squares = {n: n**2 for n in range(10)}',
      language: 'python',
      category: pyCategory.id,
      tags: ['dict', 'comprehension'],
    });
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  describe('Basic Search', () => {
    test('should search by title', async () => {
      const results = await searchEngine.search('Array');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.title.includes('Array'))).toBe(true);
    });

    test('should search by code content', async () => {
      const results = await searchEngine.search('map');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.code.includes('map'))).toBe(true);
    });

    test('should search across multiple fields', async () => {
      const results = await searchEngine.search('numbers');

      expect(results.length).toBeGreaterThan(0);
    });

    test('should return results sorted by relevance', async () => {
      const results = await searchEngine.search('Array');

      // 标题匹配应该排在前面
      expect(results[0].title).toContain('Array');
    });
  });

  describe('Search with Filters', () => {
    test('should filter by language', async () => {
      const results = await searchEngine.searchWithFilters('a', {
        language: ['javascript'],
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.language === 'javascript')).toBe(true);
    });

    test('should filter by category', async () => {
      const results = await searchEngine.searchWithFilters('a', {
        category: ['Python'],
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.category === 'Python')).toBe(true);
    });

    test('should filter by multiple languages', async () => {
      const results = await searchEngine.searchWithFilters('a', {
        language: ['javascript', 'python'],
      });

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every((r) => r.language === 'javascript' || r.language === 'python')
      ).toBe(true);
    });
  });

  describe('Search Suggestions', () => {
    test('should provide search suggestions', async () => {
      const suggestions = await searchEngine.getSearchSuggestions('Array');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.includes('Array'))).toBe(true);
    });

    test('should limit suggestions', async () => {
      const suggestions = await searchEngine.getSearchSuggestions('a', 2);

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Search with Multiple Keywords', () => {
    test('should search with multiple keywords', async () => {
      const results = await searchEngine.searchMultipleKeywords(['Array', 'map']);

      expect(results.length).toBeGreaterThan(0);
    });

    test('should return results matching any keyword', async () => {
      const results = await searchEngine.searchMultipleKeywords(['Array', 'List']);

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r) => r.title.includes('Array') || r.title.includes('List'))
      ).toBe(true);
    });
  });

  describe('Search Result Highlighting', () => {
    test('should highlight search matches', () => {
      const text = 'This is a test string with test word';
      const highlighted = searchEngine.highlightMatches(text, 'test');

      expect(highlighted).toContain('<mark class="highlight">test</mark>');
    });

    test('should handle case-insensitive highlighting', () => {
      const text = 'This is a Test string';
      const highlighted = searchEngine.highlightMatches(text, 'test');

      expect(highlighted).toContain('<mark class="highlight">Test</mark>');
    });
  });

  describe('Search Integration with Categories and Tags', () => {
    test('should include category in search results', async () => {
      const results = await searchEngine.search('Array');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].category).toBeDefined();
      expect(results[0].category).toBe('JavaScript');
    });

    test('should include tags in search results', async () => {
      const results = await searchEngine.search('Array');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tags).toBeDefined();
      expect(results[0].tags?.length).toBeGreaterThan(0);
    });

    test('should search by tag', async () => {
      const results = await searchEngine.search('functional');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Search Performance', () => {
    test('should handle large result sets', async () => {
      // 创建更多测试数据
      for (let i = 0; i < 20; i++) {
        await snippetManager.createSnippet({
          title: `Test Snippet ${i}`,
          code: `console.log(${i});`,
          language: 'javascript',
        });
      }

      const results = await searchEngine.search('Test', { limit: 10 });

      expect(results.length).toBeLessThanOrEqual(10);
    });

    test('should handle empty search results', async () => {
      const results = await searchEngine.search('nonexistent-keyword-xyz');

      expect(results).toEqual([]);
    });
  });

  describe('Search Sorting', () => {
    test('should sort results by relevance', async () => {
      const results = await searchEngine.search('Array');
      const sorted = searchEngine.sortByRelevance(results);

      expect(sorted[0].relevance).toBeGreaterThanOrEqual(sorted[sorted.length - 1].relevance);
    });

    test('should sort results by date', async () => {
      const results = await searchEngine.search('a');
      const sorted = searchEngine.sortByDate(results);

      if (sorted.length > 1) {
        expect(sorted[0].createdAt!.getTime()).toBeGreaterThanOrEqual(
          sorted[sorted.length - 1].createdAt!.getTime()
        );
      }
    });

    test('should sort results by title', async () => {
      const results = await searchEngine.search('a');
      const sorted = searchEngine.sortByTitle(results);

      if (sorted.length > 1) {
        expect(sorted[0].title.localeCompare(sorted[1].title)).toBeLessThanOrEqual(0);
      }
    });
  });
});
