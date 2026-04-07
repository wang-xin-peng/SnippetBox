import Database from 'better-sqlite3';

export interface SearchResult {
  id: string;
  title: string;
  code: string;
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
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async search(query: string, options?: Partial<SearchQuery>): Promise<SearchResult[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const searchQuery = query.trim();
    const limit = options?.limit || 50;

    const results = this.db
      .prepare(
        `
      SELECT DISTINCT
        s.id, 
        s.title, 
        s.code, 
        s.language, 
        c.name as category,
        s.created_at,
        (CASE 
          WHEN s.title LIKE ? THEN 1.0
          WHEN s.code LIKE ? THEN 0.8
          WHEN s.description LIKE ? THEN 0.6
          WHEN t.name LIKE ? THEN 0.5
          ELSE 0.4
        END) as relevance
      FROM snippets s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN snippet_tags st ON s.id = st.snippet_id
      LEFT JOIN tags t ON st.tag_id = t.id
      WHERE s.title LIKE ? OR s.code LIKE ? OR s.description LIKE ? OR t.name LIKE ?
      ORDER BY relevance DESC, s.created_at DESC
      LIMIT ?
    `
      )
      .all(
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        limit
      ) as any[];

    return results.map((result: any) => ({
      id: result.id,
      title: result.title,
      code: result.code,
      language: result.language,
      category: result.category || undefined,
      tags: this.getSnippetTags(result.id),
      relevance: result.relevance,
      createdAt: new Date(result.created_at),
    }));
  }

  async searchMultipleKeywords(keywords: string[]): Promise<SearchResult[]> {
    if (!keywords || keywords.length === 0) {
      return [];
    }

    const searchQueries = keywords.map((keyword) => keyword.trim()).filter(Boolean);
    if (searchQueries.length === 0) {
      return [];
    }

    const conditions = searchQueries
      .map(() => '(s.title LIKE ? OR s.code LIKE ? OR s.description LIKE ? OR t.name LIKE ?)')
      .join(' OR ');
    const params = searchQueries.flatMap((q) => [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);
    params.push('50');

    const results = this.db
      .prepare(
        `
      SELECT DISTINCT
        s.id, 
        s.title, 
        s.code, 
        s.language, 
        c.name as category,
        s.created_at,
        1.0 as relevance
      FROM snippets s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN snippet_tags st ON s.id = st.snippet_id
      LEFT JOIN tags t ON st.tag_id = t.id
      WHERE ${conditions}
      ORDER BY s.created_at DESC
      LIMIT ?
    `
      )
      .all(...params) as any[];

    return results.map((result: any) => ({
      id: result.id,
      title: result.title,
      code: result.code,
      language: result.language,
      category: result.category || undefined,
      tags: this.getSnippetTags(result.id),
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
    const regex = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    return text.replace(regex, '<mark class="highlight">$1</mark>');
  }

  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const searchQuery = query.trim();

    const results = this.db
      .prepare(
        'SELECT DISTINCT title FROM snippets WHERE title LIKE ? ORDER BY LENGTH(title) ASC LIMIT ?'
      )
      .all(`%${searchQuery}%`, limit) as { title: string }[];

    return results.map((result: any) => result.title);
  }

  async searchWithFilters(
    query: string,
    filters: {
      language?: string[];
      category?: string[];
      tags?: string[];
    }
  ): Promise<SearchResult[]> {
    let baseQuery = `
      SELECT DISTINCT
        s.id, 
        s.title, 
        s.code, 
        s.language, 
        c.name as category,
        s.created_at,
        (CASE 
          WHEN s.title LIKE ? THEN 1.0
          WHEN s.code LIKE ? THEN 0.8
          WHEN s.description LIKE ? THEN 0.6
          WHEN t.name LIKE ? THEN 0.5
          ELSE 0.4
        END) as relevance
      FROM snippets s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN snippet_tags st ON s.id = st.snippet_id
      LEFT JOIN tags t ON st.tag_id = t.id
      WHERE (s.title LIKE ? OR s.code LIKE ? OR s.description LIKE ? OR t.name LIKE ?)
    `;

    const params: any[] = [
      `%${query}%`,
      `%${query}%`,
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

    const results = this.db.prepare(baseQuery).all(...params) as any[];

    return results.map((result: any) => ({
      id: result.id,
      title: result.title,
      code: result.code,
      language: result.language,
      category: result.category || undefined,
      tags: this.getSnippetTags(result.id),
      relevance: result.relevance,
      createdAt: new Date(result.created_at),
    }));
  }

  private getSnippetTags(snippetId: string): string[] {
    const tags = this.db
      .prepare(
        `
      SELECT t.name
      FROM tags t
      JOIN snippet_tags st ON t.id = st.tag_id
      WHERE st.snippet_id = ?
    `
      )
      .all(snippetId) as { name: string }[];

    return tags.map((t) => t.name);
  }
}
