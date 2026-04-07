// Mock 数据库
const mockDatabase = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
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

import { SearchEngine } from '../../src/main/services/SearchEngine';

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;

  beforeEach(() => {
    searchEngine = new SearchEngine();
    jest.clearAllMocks();
  });

  describe('search', () => {
    test('should search snippets', async () => {
      const mockResults = [
        {
          id: '1',
          title: 'JavaScript function',
          content: 'function test() { return true; }',
          language: 'javascript',
          category: 'Code',
          tags: 'javascript,test',
          relevance: 0.95
        },
        {
          id: '2',
          title: 'TypeScript interface',
          content: 'interface Test { id: string; }',
          language: 'typescript',
          category: 'Code',
          tags: 'typescript,interface',
          relevance: 0.85
        }
      ];

      mockDatabase.all.mockResolvedValue(mockResults);

      const results = await searchEngine.search('javascript');

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('JavaScript function');
      expect(results[0].relevance).toBe(0.95);
      expect(mockDatabase.all).toHaveBeenCalled();
    });

    test('should return empty array if no results', async () => {
      mockDatabase.all.mockResolvedValue([]);

      const results = await searchEngine.search('nonexistent');

      expect(results).toEqual([]);
    });

    test('should handle special characters in query', async () => {
      const mockResults: any[] = [];
      mockDatabase.all.mockResolvedValue(mockResults);

      await searchEngine.search('test+query');

      expect(mockDatabase.all).toHaveBeenCalled();
    });
  });

  describe('searchMultipleKeywords', () => {
    test('should search with multiple keywords', async () => {
      const mockResults = [
        {
          id: '1',
          title: 'JavaScript function',
          content: 'function test() { return true; }',
          language: 'javascript',
          category: 'Code',
          tags: 'javascript,test',
          relevance: 0.9
        }
      ];

      mockDatabase.all.mockResolvedValue(mockResults);

      const results = await searchEngine.searchMultipleKeywords(['javascript', 'function']);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript function');
      expect(mockDatabase.all).toHaveBeenCalled();
    });

    test('should return empty array if no keywords provided', async () => {
      const results = await searchEngine.searchMultipleKeywords([]);

      expect(results).toEqual([]);
    });
  });

  describe('sortByRelevance', () => {
    test('should sort results by relevance', () => {
      const results = [
        { id: '1', title: 'Low relevance', content: 'content', language: 'javascript', relevance: 0.5 },
        { id: '2', title: 'High relevance', content: 'content', language: 'javascript', relevance: 0.9 },
        { id: '3', title: 'Medium relevance', content: 'content', language: 'javascript', relevance: 0.7 }
      ];

      const sortedResults = searchEngine.sortByRelevance(results);

      expect(sortedResults[0].relevance).toBe(0.9);
      expect(sortedResults[1].relevance).toBe(0.7);
      expect(sortedResults[2].relevance).toBe(0.5);
    });

    test('should handle empty array', () => {
      const sortedResults = searchEngine.sortByRelevance([]);

      expect(sortedResults).toEqual([]);
    });
  });

  describe('highlightMatches', () => {
    test('should highlight matched text', () => {
      const text = 'This is a test string';
      const query = 'test';

      const highlighted = searchEngine.highlightMatches(text, query);

      expect(highlighted).toContain('highlight');
      expect(highlighted).toContain('test');
    });

    test('should return original text if no match', () => {
      const text = 'This is a test string';
      const query = 'nonexistent';

      const highlighted = searchEngine.highlightMatches(text, query);

      expect(highlighted).toBe(text);
    });

    test('should handle empty query', () => {
      const text = 'This is a test string';
      const query = '';

      const highlighted = searchEngine.highlightMatches(text, query);

      expect(highlighted).toBe(text);
    });

    test('should handle case insensitive matches', () => {
      const text = 'This is a TEST string';
      const query = 'test';

      const highlighted = searchEngine.highlightMatches(text, query);

      expect(highlighted).toContain('highlight');
      expect(highlighted).toContain('TEST');
    });
  });

  describe('getSearchSuggestions', () => {
    test('should return search suggestions', async () => {
      const mockSuggestions = [
        { title: 'JavaScript function' },
        { title: 'JavaScript object' },
        { title: 'JavaScript array' }
      ];

      mockDatabase.all.mockResolvedValue(mockSuggestions);

      const suggestions = await searchEngine.getSearchSuggestions('java');

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toBe('JavaScript function');
      expect(mockDatabase.all).toHaveBeenCalled();
    });

    test('should return empty array if no suggestions', async () => {
      mockDatabase.all.mockResolvedValue([]);

      const suggestions = await searchEngine.getSearchSuggestions('nonexistent');

      expect(suggestions).toEqual([]);
    });
  });
});
