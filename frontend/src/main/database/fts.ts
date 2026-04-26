import * as sqlite3 from 'better-sqlite3';

export class FullTextSearch {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  //全文搜索
  search(query: string): Array<{ id: string; score: number }> {
    try {
      if (!query || query.trim() === '') {
        return [];
      }

      const escapedQuery = query.replace(/['"]/g, '');
      
      const stmt = this.db.prepare(`
        SELECT s.id, bm25(snippets_fts) as score
        FROM snippets_fts
        JOIN snippets s ON s.rowid = snippets_fts.rowid
        WHERE snippets_fts MATCH ?
        ORDER BY score
        LIMIT 20
      `);

      return stmt.all(escapedQuery) as Array<{ id: string; score: number }>;
    } catch (error) {
      console.error('Full text search failed:', error);
      return [];
    }
  }

  //重建 FTS 索引
  rebuildIndex(): void {
    try {
      this.db.exec('INSERT INTO snippets_fts(snippets_fts) VALUES(rebuild)');
    } catch (error) {
      console.error('Failed to rebuild FTS index:', error);
    }
  }

  //优化 FTS 索引
  optimizeIndex(): void {
    try {
      this.db.exec('INSERT INTO snippets_fts(snippets_fts) VALUES(optimize)');
    } catch (error) {
      console.error('Failed to optimize FTS index:', error);
    }
  }

  // 获取搜索建议
  getSuggestions(prefix: string): string[] {
    try {
      const stmt = this.db.prepare(`
        SELECT DISTINCT title
        FROM snippets_fts
        WHERE title MATCH ?
        LIMIT 10
      `);

      const results = stmt.all(`${prefix}*`) as Array<{ title: string }>;
      return results.map(result => result.title);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }
}
