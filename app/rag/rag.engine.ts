export interface RagChunk {
  id: string;
  text: string;
  metadata: string;
  score: number | null;
}

import { GEMINI } from '../lib/geminiProvider';
import { VectorStore } from './vectorStore/vectore.store';

export class RagEngine {
  static async buildPrompt(query: string, topK: number = 4) {
    try {
      const Store = VectorStore.get();
      await Store.init();

      const [queryEmbedding] = await GEMINI.generateEmbeddings([query]);

      if (!queryEmbedding) {
        throw new Error('Failed to generate embedding for the query.');
      }

      if (queryEmbedding.length !== Number(process.env.EMBEDDING_DIMS)) {
        throw new Error('Mismatch in embeddings dims');
      }

      const results = await Store.search(queryEmbedding, topK);

      if (!results.length) {
        return {
            prompt: `No Matching documents found for the query: ${query}`,
            source: [],
        }
      }

      const context = results
        .map(
          (rag: RagChunk, i: number) =>
            `SOURCE ${i + 1}:\n${rag.text}\nMETA: ${JSON.stringify(
              rag.metadata
            )}`
        )
        .join('\n\n');

      const prompt = `You are an AI assistant providing answers based on the provided context from various sources. Use the context to answer the question accurately.
       If the context does not contain the answer,
        respond with "I don't know".
        CONTEXT:
        ${context}

        QUESTION:
        ${query}

        Answer:
        `;

      return { prompt, source: results };
    } catch (error) {
      throw error;
    }
  }
}
