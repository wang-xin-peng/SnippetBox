import Database from 'better-sqlite3';
import { SearchEngine } from '../../src/main/services/SearchEngine';
import { SnippetManager } from '../../src/main/services/SnippetManager';
import { CategoryManager } from '../../src/main/services/CategoryManager';
import { createTestDatabase, cleanupTestDatabase } from '../setup';

describe('SearchEngine', () => {
  let db: Database.Database;
  let searchEngine: SearchEngine;
  let snippetManager: SnippetManager;
  let categoryManager: CategoryManager;

  beforeEach(async () => {
    db = createTestDatabase();
    searchEngine = new SearchEngine(db);
    snippetManager = new SnippetManager(db);
    categoryManager = new CategoryManager(db);

    // 创建测试数据
    const category = await categoryManager.createCategory({ name: 'Test Category' });

    await snippetManager.createSnippet({
      title: 'JavaScript Array Map',
      code: 'const result = array.map(x => x * 2);',
      language: 'javascript',
      category: category.id,
      tags: ['javascript', 'array'],
    });

    await snippetManager.createSnippet({
      title: 'Python List Comprehension',
      code: 'result = [x * 2 for x in array]',
      language: 'python',
      category: category.id,
      tags: ['python', 'list'],
    });

    await snippetManager.createSnippet({
      title: 'TypeScript Interface',
      code: 'interface User { name: string; age: number; }',
      language: 'typescript',
      category: category.id,
      tags: ['typescript', 'interface'],
    });
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  describe('search', () => {
    test('should search by title', async () => {
      const results = await searchEngine.search('JavaScript');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('JavaScript');
    });

    test('should search by code', async () => {
      const results = await searchEngine.search('map');

      expect(results.length).toBeGreaterThan(0);
      const found = results.some((r) => r.code.includes('map'));
      expect(found).toBe(true);
    });

    test('should return empty array for empty query', async () => {
      const results = await searchEngine.search('');

      expect(results).toEqual([]);
    });

    test('should return empty array for no matches', async () => {
      const results = await searchEngine.search('nonexistent');

      expect(results).toEqual([]);
    });

    test('should limit results', async () => {
      const results = await searchEngine.search('a', { limit: 1 });

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('searchMultipleKeywords', () => {
    test('should search with multiple keywords', async () => {
      const results = await searchEngine.searchMultipleKeywords(['JavaScript', 'Python']);

      expect(results.length).toBeGreaterThan(0);
    });

    test('should return empty array for empty keywords', async () => {
      const results = await searchEngine.searchMultipleKeywords([]);

      expect(results).toEqual([]);
    });
  });

  describe('sorting', () => {
    test('should sort by relevance', () => {
      const results = [
        {
          id: '1',
          title: 'Test 1',
          code: 'code 1',
          language: 'javascript',
          relevance: 0.5,
        },
        {
          id: '2',
          title: 'Test 2',
          code: 'code 2',
          language: 'python',
          relevance: 0.9,
        },
        {
          id: '3',
          title: 'Test 3',
          code: 'code 3',
          language: 'typescript',
          relevance: 0.7,
        },
      ];

      const sortedResults = searchEngine.sortByRelevance(results);

      expect(sortedResults[0].relevance).toBe(0.9);
      expect(sortedResults[1].relevance).toBe(0.7);
      expect(sortedResults[2].relevance).toBe(0.5);
    });

    test('should sort by date', () => {
      const results = [
        {
          id: '1',
          title: 'Test 1',
          code: 'code 1',
          language: 'javascript',
          relevance: 0.5,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          title: 'Test 2',
          code: 'code 2',
          language: 'python',
          relevance: 0.9,
          createdAt: new Date('2024-01-03'),
        },
        {
          id: '3',
          title: 'Test 3',
          code: 'code 3',
          language: 'typescript',
          relevance: 0.7,
          createdAt: new Date('2024-01-02'),
        },
      ];

      const sortedResults = searchEngine.sortByDate(results);

      expect(sortedResults[0].createdAt?.getTime()).toBe(new Date('2024-01-03').getTime());
      expect(sortedResults[1].createdAt?.getTime()).toBe(new Date('2024-01-02').getTime());
      expect(sortedResults[2].createdAt?.getTime()).toBe(new Date('2024-01-01').getTime());
    });

    test('should sort by title', () => {
      const results = [
        {
          id: '1',
          title: 'C Test',
          code: 'code 1',
          language: 'javascript',
          relevance: 0.5,
        },
        {
          id: '2',
          title: 'A Test',
          code: 'code 2',
          language: 'python',
          relevance: 0.9,
        },
        {
          id: '3',
          title: 'B Test',
          code: 'code 3',
          language: 'typescript',
          relevance: 0.7,
        },
      ];

      const sortedResults = searchEngine.sortByTitle(results);

      expect(sortedResults[0].title).toBe('A Test');
      expect(sortedResults[1].title).toBe('B Test');
      expect(sortedResults[2].title).toBe('C Test');
    });
  });

  describe('highlightMatches', () => {
    test('should highlight matches', () => {
      const text = 'This is a test string';
      const highlighted = searchEngine.highlightMatches(text, 'test');

      expect(highlighted).toContain('<mark class="highlight">test</mark>');
    });

    test('should return original text for empty query', () => {
      const text = 'This is a test string';
      const highlighted = searchEngine.highlightMatches(text, '');

      expect(highlighted).toBe(text);
    });
  });

  describe('getSearchSuggestions', () => {
    test('should return search suggestions', async () => {
      const suggestions = await searchEngine.getSearchSuggestions('Java');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('Java');
    });

    test('should return empty array for empty query', async () => {
      const suggestions = await searchEngine.getSearchSuggestions('');

      expect(suggestions).toEqual([]);
    });

    test('should limit suggestions', async () => {
      const suggestions = await searchEngine.getSearchSuggestions('a', 1);

      expect(suggestions.length).toBeLessThanOrEqual(1);
    });
  });

  describe('searchWithFilters', () => {
    test('should filter by language', async () => {
      const results = await searchEngine.searchWithFilters('a', {
        language: ['javascript'],
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.language === 'javascript')).toBe(true);
    });

    test('should filter by category', async () => {
      const results = await searchEngine.searchWithFilters('a', {
        category: ['Test Category'],
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.category === 'Test Category')).toBe(true);
    });
  });
});
