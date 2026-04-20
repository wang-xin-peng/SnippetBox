import Database from 'better-sqlite3';

interface VectorData {
  id: string;
  snippetId: string;
  embedding: Buffer;
  createdAt: Date;
}

export class VectorDatabase {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snippet_vectors (
        rowid INTEGER PRIMARY KEY,
        embedding BLOB
      );

      CREATE TABLE IF NOT EXISTS snippet_vector_mapping (
        id TEXT PRIMARY KEY,
        snippetId TEXT UNIQUE,
        vectorId INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_snippet_vector_mapping_snippetId ON snippet_vector_mapping(snippetId);
      CREATE INDEX IF NOT EXISTS idx_snippet_vector_mapping_vectorId ON snippet_vector_mapping(vectorId);
    `);
  }

  insertVector(data: { id: string; snippetId: string; embedding: Buffer }): void {
    const insertVector = this.db.prepare(`INSERT INTO snippet_vectors (embedding) VALUES (?)`);
    const result = insertVector.run(data.embedding);
    const vectorId = result.lastInsertRowid;

    const insertMapping = this.db.prepare(`INSERT OR REPLACE INTO snippet_vector_mapping (id, snippetId, vectorId) VALUES (?, ?, ?)`);
    insertMapping.run(data.id, data.snippetId, vectorId);
  }

  getVectorBySnippetId(snippetId: string): VectorData | null {
    const stmt = this.db.prepare(`
      SELECT m.id, m.snippetId, v.embedding, m.createdAt
      FROM snippet_vector_mapping m
      JOIN snippet_vectors v ON m.vectorId = v.rowid
      WHERE m.snippetId = ?
    `);
    return stmt.get(snippetId) as VectorData | null;
  }

  deleteVector(snippetId: string): void {
    const getMapping = this.db.prepare(`SELECT vectorId FROM snippet_vector_mapping WHERE snippetId = ?`);
    const mapping = getMapping.get(snippetId) as { vectorId: number } | null;

    if (mapping) {
      const deleteMapping = this.db.prepare(`DELETE FROM snippet_vector_mapping WHERE snippetId = ?`);
      deleteMapping.run(snippetId);

      const deleteVector = this.db.prepare(`DELETE FROM snippet_vectors WHERE rowid = ?`);
      deleteVector.run(mapping.vectorId);
    }
  }

  getAllVectors(): VectorData[] {
    const stmt = this.db.prepare(`
      SELECT m.id, m.snippetId, v.embedding, m.createdAt
      FROM snippet_vector_mapping m
      JOIN snippet_vectors v ON m.vectorId = v.rowid
    `);
    return stmt.all() as VectorData[];
  }

  getVectorCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM snippet_vector_mapping`);
    const result = stmt.get() as { count: number };
    return result.count;
  }
}
