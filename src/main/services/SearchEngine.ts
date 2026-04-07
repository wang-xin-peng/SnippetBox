import { DatabaseManager } from '../database';

const dbInstance = DatabaseManager.getInstance();

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  language: string;
  category?: string;
  tags?: string[];
  relevance: number;
  createdAt?: Date;
}

export interface SearchQuery {
  query: string;
  filters?: {
    language?: string[];
    category?: string[];
    tags?: string[];
  };
  sortBy?: 'relevance' | 'date' | 'title';
  limit?: number;
}

export class SearchEngine {
  private db: any;

  constructor(db?: any) {
    if (db) {
      this.db = db;
    } else {
      dbInstance.connect();
      this.db = dbInstance.getDB();
    }
  }

  async search(query: string, options?: Partial<SearchQuery>): Promise<SearchResult[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const searchQuery = query.trim();
    const limit = options?.limit || 50;

    const results = await this.db.all(`
      SELECT 
        s.id, 
        s.title, 
        s.content, 
        s.language, 
        c.name as category,
        s.tags,
        s.created_at,
        (CASE 
          WHEN s.title LIKE ? THEN 1.0
          WHEN s.content LIKE ? THEN 0.8
          WHEN s.tags LIKE ? THEN 0.6
          ELSE 0.4
        END) as relevance
      FROM snippets s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.title LIKE ? OR s.content LIKE ? OR s.tags LIKE ?
      ORDER BY relevance DESC, s.created_at DESC
      LIMIT ?
    `, [
      `%${searchQuery}%`,
      `%${searchQuery}%`,
      `%${searchQuery}%`,
      `%${searchQuery}%`,
      `%${searchQuery}%`,
      `%${searchQuery}%`,
      limit
    ]);

    return results.map((result: any) => ({
      id: result.id,
      title: result.title,
      content: result.content,
      language: result.language,
      category: result.category || undefined,
      tags: result.tags ? result.tags.split(',').map((tag: string) => tag.trim()) : undefined,
      relevance: result.relevance,
      createdAt: new Date(result.created_at),
    }));
  }

  async searchMultipleKeywords(keywords: string[]): Promise<SearchResult[]> {
    if (!keywords || keywords.length === 0) {
      return [];
    }

    const searchQueries = keywords.map(keyword => keyword.trim()).filter(Boolean);
    if (searchQueries.length === 0) {
      return [];
    }

    const placeholders = searchQueries.map(() => '?').join(', ');
    const params = searchQueries.flatMap(q => [`%${q}%`, `%${q}%`, `%${q}%`]);
    params.push('50');

    const results = await this.db.all(`
      SELECT 
        s.id, 
        s.title, 
        s.content, 
        s.language, 
        c.name as category,
        s.tags,
        s.created_at,
        (CASE 
          WHEN s.title LIKE ? THEN 1.0
          WHEN s.content LIKE ? THEN 0.8
          WHEN s.tags LIKE ? THEN 0.6
          ELSE 0.4
        END) as relevance
      FROM snippets s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.title LIKE ? OR s.content LIKE ? OR s.tags LIKE ?
      ORDER BY relevance DESC, s.created_at DESC
      LIMIT ?
    `, params);

    return results.map((result: any) => ({
      id: result.id,
      title: result.title,
      content: result.content,
      language: result.language,
      category: result.category || undefined,
      tags: result.tags ? result.tags.split(',').map((tag: string) => tag.trim()) : undefined,
      relevance: result.relevance,
      createdAt: new Date(result.created_at),
    }));
  }

  sortByRelevance(results: SearchResult[]): SearchResult[] {
    return [...results].sort((a, b) => b.relevance - a.relevance);
  }

  sortByDate(results: SearchResult[]): SearchResult[] {
    return [...results].sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt ? b.createdAt.getTime() : 0;
      return dateB - dateA;
    });
  }

  sortByTitle(results: SearchResult[]): SearchResult[] {
    return [...results].sort((a, b) => a.title.localeCompare(b.title));
  }

  highlightMatches(text: string, query: string): string {
    if (!query || !query.trim()) {
      return text;
    }

    const searchQuery = query.trim();
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="highlight">$1</mark>');
  }

  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const searchQuery = query.trim();

    const results = await this.db.all(
      'SELECT DISTINCT title FROM snippets WHERE title LIKE ? ORDER BY LENGTH(title) ASC LIMIT ?',
      [`%${searchQuery}%`, limit]
    );

    return results.map((result: any) => result.title);
  }

  async searchWithFilters(query: string, filters: {
    language?: string[];
    category?: string[];
    tags?: string[];
  }): Promise<SearchResult[]> {
    let baseQuery = `
      SELECT 
        s.id, 
        s.title, 
        s.content, 
        s.language, 
        c.name as category,
        s.tags,
        s.created_at,
        (CASE 
          WHEN s.title LIKE ? THEN 1.0
          WHEN s.content LIKE ? THEN 0.8
          WHEN s.tags LIKE ? THEN 0.6
          ELSE 0.4
        END) as relevance
      FROM snippets s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE (s.title LIKE ? OR s.content LIKE ? OR s.tags LIKE ?)
    `;

    const params: any[] = [
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
    ];

    if (filters.language && filters.language.length > 0) {
      const languagePlaceholders = filters.language.map(() => '?').join(', ');
      baseQuery += ` AND s.language IN (${languagePlaceholders})`;
      params.push(...filters.language);
    }

    if (filters.category && filters.category.length > 0) {
      const categoryPlaceholders = filters.category.map(() => '?').join(', ');
      baseQuery += ` AND c.name IN (${categoryPlaceholders})`;
      params.push(...filters.category);
    }

    baseQuery += ' ORDER BY relevance DESC, s.created_at DESC LIMIT 50';

    const results = await this.db.all(baseQuery, params);

    return results.map((result: any) => ({
      id: result.id,
      title: result.title,
      content: result.content,
      language: result.language,
      category: result.category || undefined,
      tags: result.tags ? result.tags.split(',').map((tag: string) => tag.trim()) : undefined,
      relevance: result.relevance,
      createdAt: new Date(result.created_at),
    }));
  }
}
