/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pool } from "pg";
import pgvector from "pgvector/pg";

// 1. NEON requires SSL. We must detect if we are in production/remote.
const isProduction = process.env.NODE_ENV === 'production' || process.env.POSTGRES_URL?.includes('neon.tech');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  // Neon requires SSL connections
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// Register pgvector types immediately on connection
pool.on("connect", async (client) => {
  await pgvector.registerTypes(client);
});

export class VectorStorePg {
  private static initialized = false;
  private static table = process.env.PGVECTOR_TABLE || "rag_vectors";
  
  // Gemini Embedding-004 is 768, text-embedding-004 is 768. 
  // If you use text-embedding-3-large or similar, it might be 3072.
  private static dims = Number(process.env.EMBEDDING_DIMS) || 3072;

  static async init() {
    if (this.initialized) return;
    
    console.log("RAG (pgvector): Connecting to database...");
    
    // Ensure the extension exists (Doing this once globally is better practice)
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

    this.initialized = true;

    console.log(`RAG (pgvector): Initializing table '${this.table}' with ${this.dims} dimensions...`);

    // Create Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id TEXT PRIMARY KEY,
        doc_id TEXT,
        chunk_index INT,
        content TEXT,
        metadata JSONB,
        embedding vector(${this.dims})
      )
    `);

    // 2. CREATE INDEX (HNSW)
    // Modern pgvector on Neon supports up to 16,000 dims. 
    // HNSW is faster and more accurate than IVFFlat for RAG.
    try {
        console.log("Checking/Creating HNSW Index for fast retrieval...");
        await pool.query(`
          CREATE INDEX IF NOT EXISTS ${this.table}_hnsw_idx 
          ON ${this.table} 
          USING hnsw (embedding vector_cosine_ops)
        `);
        console.log("Index verified.");
    } catch (error) {
        console.warn("Index creation warning (might already exist or memory constrained):", error);
    }
  }

  static async upsert(params: {
    id: string;
    docId: string;
    chunkIndex: number;
    text: string;
    embedding: number[];
    metadata?: any;
  }) {
    const { id, docId, chunkIndex, text, embedding, metadata = {} } = params;

    if (embedding.length !== this.dims) {
      throw new Error(
        `Embedding dimension mismatch. Expected ${this.dims}, got ${embedding.length}.`
      );
    }

    await pool.query(
      `
      INSERT INTO ${this.table} (id, doc_id, chunk_index, content, metadata, embedding)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id)
      DO UPDATE SET
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        embedding = EXCLUDED.embedding
        `,
      [
        id,
        docId,
        chunkIndex,
        text,
        JSON.stringify(metadata),
        pgvector.toSql(embedding),
      ]
    );
  }

  static async search(embedding: number[], topK: number = 4) {
    // Ensure we are initialized before searching
    if (!this.initialized) await this.init();

    const result = await pool.query(
      `
      SELECT id, doc_id, chunk_index, content, metadata, embedding <=> $1 AS distance
      FROM ${this.table}
      ORDER BY embedding <=> $1
      LIMIT $2
      `,
      [pgvector.toSql(embedding), topK]
    );

    return result.rows.map((row) => ({
      id: row.id,
      text: row.content,
      metadata: {
        docId: row.doc_id,
        chunkIndex: row.chunk_index,
        ...row.metadata,
      },
      // Convert cosine distance to cosine similarity (optional but usually preferred in UI)
      // distance = 1 - similarity, so similarity = 1 - distance
      score: 1 - row.distance 
    }));
  }
}
