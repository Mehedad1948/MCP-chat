/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pool } from "pg";
import pgvector from "pgvector/pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

pool.on("connect", async (client) => {
  console.log("Connected to PostgreSQL");
  await client.query("CREATE EXTENSION IF NOT EXISTS vector");
  await pgvector.registerTypes(client);
});

export class VectorStorePg {
  private static initialized = false;
  private static table = process.env.PGVECTOR_TABLE || "rag_vectors";
  private static dims = Number(process.env.EMBEDDING_DIMS) || 3072;

  static async init() {
    if (this.initialized) return;
    this.initialized = true;

    console.log("RAG (pgvector): Initializing vector store...");

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

    console.log(
      "pgvector: Skipping all indexes (3072 dims exceed index limits)"
    );

    // await pool.query(`
    //   CREATE INDEX IF NOT EXISTS ${this.table}_ivfflat
    //   ON ${this.table}
    //   USING ivfflat (embedding vector_cosine_ops)
    //   WITH (lists = 100)
    // `);
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

    // VALIDATE EMBEDDING DIMENSION

    if (embedding.length !== this.dims) {
      throw new Error(
        `Embedding dimension mismatch. Expected ${this.dims}, got ${embedding.length}. ` +
          `Check EMBEDDING_DIMS env and your Gemini embedding model.`
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
        pgvector.toSql(embedding), // converts the JS array into the PostgreSQL vector literal
      ]
    );
  }

  static async search(embedding: number[], topK: number = 4) {
    const result = await pool.query(
      `
      SELECT id, doc_id, chunk_index, content, metadata, embedding <=> $1 AS distance
      FROM ${this.table}
      ORDER BY embedding <=> $1
      LIMIT $2
      `,
      [pgvector.toSql(embedding), topK]
    );
    // embedding <=> $1 is the pgvector distance operator (L2 distance by default).

    return result.rows.map((row) => ({
      id: row.id,
      text: row.content,
      metadata: {
        docId: row.doc_id,
        chunkIndex: row.chunk_index,
        ...row.metadata,
      },
      score: row.distance
    }));
  }
}

// “cosine / distance logic” lives on the pgvector side
