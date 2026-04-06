/**
 * Full-Text Search Implementation using FTS5
 * Provides search functionality for snippets
 */

import Database from 'better-sqlite3';

export interface SearchResult {
  id: string;
  title: string;
  code: string;
  language: string;
  description: string;
  rank: number;
}

export class FullTextSearch {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 搜索片段
   * @param query 搜索查询
   * @param limit 结果数量限制
   * @returns 搜索结果列表
   */
  search(query: string, limit: number = 50): SearchResult[] {
    if (!query || query.trim() === '') {
      return [];
    }

    // 使用 FTS5 MATCH 查询
    const sql = `
      SELECT 
        s.id,
        s.title,
        s.code,
        s.language,
        s.description,
        fts.rank
      FROM snippets_fts fts
      JOIN snippets s ON s.rowid = fts.rowid
      WHERE snippets_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `;

    try {
      const results = this.db.prepare(sql).all(this.formatQuery(query), limit) as SearchResult[];
      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * 高级搜索 - 支持字段特定搜索
   * @param options 搜索选项
   */
  advancedSearch(options: {
    query: string;
    field?: 'title' | 'code' | 'description';
    limit?: number;
  }): SearchResult[] {
    const { query, field, limit = 50 } = options;

    if (!query || query.trim() === '') {
      return [];
    }

    let matchQuery = this.formatQuery(query);

    // 如果指定了字段，只在该字段中搜索
    if (field) {
      matchQuery = `${field}:${matchQuery}`;
    }

    const sql = `
      SELECT 
        s.id,
        s.title,
        s.code,
        s.language,
        s.description,
        fts.rank
      FROM snippets_fts fts
      JOIN snippets s ON s.rowid = fts.rowid
      WHERE snippets_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `;

    try {
      const results = this.db.prepare(sql).all(matchQuery, limit) as SearchResult[];
      return results;
    } catch (error) {
      console.error('Advanced search error:', error);
      return [];
    }
  }

  /**
   * 搜索建议 - 用于自动完成
   * @param prefix 前缀
   * @param limit 结果数量
   */
  searchSuggestions(prefix: string, limit: number = 10): string[] {
    if (!prefix || prefix.trim() === '') {
      return [];
    }

    const sql = `
      SELECT DISTINCT s.title
      FROM snippets s
      WHERE s.title LIKE ?
      LIMIT ?
    `;

    try {
      const results = this.db.prepare(sql).all(`${prefix}%`, limit) as { title: string }[];
      return results.map((r) => r.title);
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }

  /**
   * 重建 FTS 索引
   */
  rebuildIndex(): void {
    try {
      // 删除现有索引
      this.db.exec('DELETE FROM snippets_fts;');

      // 重新插入所有数据
      this.db.exec(`
        INSERT INTO snippets_fts(rowid, title, code, description)
        SELECT rowid, title, code, description FROM snippets;
      `);

      console.log('FTS index rebuilt successfully');
    } catch (error) {
      console.error('Failed to rebuild FTS index:', error);
      throw error;
    }
  }

  /**
   * 优化 FTS 索引
   */
  optimizeIndex(): void {
    try {
      this.db.exec("INSERT INTO snippets_fts(snippets_fts) VALUES('optimize');");
      console.log('FTS index optimized');
    } catch (error) {
      console.error('Failed to optimize FTS index:', error);
      throw error;
    }
  }

  /**
   * 格式化查询字符串
   * 处理特殊字符和添加前缀匹配
   */
  private formatQuery(query: string): string {
    // 移除特殊字符
    let formatted = query.trim().replace(/[^\w\s-]/g, ' ');

    // 分词
    const terms = formatted.split(/\s+/).filter((term) => term.length > 0);

    if (terms.length === 0) {
      return query;
    }

    // 为每个词添加前缀匹配支持
    // 使用 OR 连接多个词
    return terms.map((term) => `${term}*`).join(' OR ');
  }

  /**
   * 高亮搜索结果
   * @param text 原始文本
   * @param query 搜索查询
   * @returns 带有高亮标记的文本
   */
  highlightMatches(text: string, query: string): string {
    if (!text || !query) {
      return text;
    }

    const terms = query.split(/\s+/).filter((term) => term.length > 0);
    let highlighted = text;

    terms.forEach((term) => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
