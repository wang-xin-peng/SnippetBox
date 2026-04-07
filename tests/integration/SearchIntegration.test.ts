// Mock database
const mockDatabase = {
  run: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  all: jest.fn(),
  exec: jest.fn().mockResolvedValue(undefined),
} as any;

jest.mock('../../src/main/database', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      connect: jest.fn(),
      getDB: jest.fn().mockReturnValue(mockDatabase),
    }),
  },
}));

import { SearchEngine } from '../../src/main/services/SearchEngine';
import { CategoryManager } from '../../src/main/services/CategoryManager';
import { TagManager } from '../../src/main/services/TagManager';

describe('Search Integration', () => {
  let searchEngine: SearchEngine;
  let categoryManager: CategoryManager;
  let tagManager: TagManager;

  beforeEach(() => {
    jest.clearAllMocks();
    searchEngine = new SearchEngine();
    categoryManager = new CategoryManager();
    tagManager = new TagManager();
  });

  describe('Search with Categories and Tags', () => {
    test('should search snippets with categories and tags', async () => {
      // Mock database responses
      mockDatabase.all.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT') && sql.includes('FROM snippets s')) {
          return [
            {
              id: '1',
              title: 'JavaScript Function',
              content: 'function hello() { return "world"; }',
              language: 'javascript',
              category: 'Code',
              tags: 'javascript',
              created_at: '2024-01-01T00:00:00.000Z',
              relevance: 1.0,
            },
            {
              id: '2',
              title: 'TypeScript Interface',
              content: 'interface User { name: string; }',
              language: 'typescript',
              category: 'Code',
              tags: 'typescript',
              created_at: '2024-01-02T00:00:00.000Z',
              relevance: 0.8,
            },
          ];
        }
        return [];
      });

      // Search for JavaScript
      const results = await searchEngine.search('javascript');

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('JavaScript Function');
      expect(results[1].title).toBe('TypeScript Interface');
    });

    test('should search with category filter', async () => {
      // Mock database responses
      mockDatabase.all.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT') && sql.includes('FROM snippets s')) {
          return [
            {
              id: '1',
              title: 'React Component',
              content: 'const Component = () => <div>Hello</div>;',
              language: 'typescript',
              category: 'React',
              tags: 'react',
              created_at: '2024-01-01T00:00:00.000Z',
              relevance: 1.0,
            },
          ];
        }
        return [];
      });

      // Search with category filter
      const results = await searchEngine.search('react', { 
        filters: { category: ['2'] } 
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('React Component');
      expect(results[0].category).toBe('React');
    });

    test('should search with tag filter', async () => {
      // Mock database responses
      mockDatabase.all.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT') && sql.includes('FROM snippets s')) {
          return [
            {
              id: '1',
              title: 'Node.js Server',
              content: 'const http = require("http");',
              language: 'javascript',
              category: 'Node.js',
              tags: 'nodejs',
              created_at: '2024-01-01T00:00:00.000Z',
              relevance: 1.0,
            },
          ];
        }
        return [];
      });

      // Search with tag filter
      const results = await searchEngine.search('node', { 
        filters: { tags: ['3'] } 
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Node.js Server');
      expect(results[0].tags).toContain('nodejs');
    });

    test('should get search suggestions', async () => {
      // Mock database responses
      mockDatabase.all.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT DISTINCT')) {
          return [
            { title: 'JavaScript Function' },
            { title: 'JavaScript Class' },
            { title: 'JavaScript Promise' },
          ];
        }
        return [];
      });

      // Get search suggestions
      const suggestions = await searchEngine.getSearchSuggestions('java');

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toBe('JavaScript Function');
      expect(suggestions[1]).toBe('JavaScript Class');
      expect(suggestions[2]).toBe('JavaScript Promise');
    });
  });
});
