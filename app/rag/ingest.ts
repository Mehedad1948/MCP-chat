import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { VectorStore } from './vectorStore/vectore.store';
import { GEMINI } from '../lib/geminiProvider';

const CHUNK_SIZE = Number(process.env.RAG_CHUNK_SIZE) || 800;
const CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP) || 100;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let i = 0;

  while (i < text.length) {
    const end = Math.min(text.length, i + CHUNK_SIZE);
    chunks.push(text.slice(i, end));
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

export async function ingestFolder(folderPath: string) {
  const Store = VectorStore.get();

  await Store?.init();

  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    if (!file.endsWith(".md") && !file.endsWith(".txt")) continue;

    const filePath = path.join(folderPath, file);
    const rawData = fs.readFileSync(filePath, "utf-8");

    // convert string to chunks
    const chunks = chunkText(rawData);

    // fetch embedding values for each chunk
    const embeddings = await GEMINI.generateEmbeddings(chunks);

    for (let i = 0; i < chunks.length; i++) {
      await Store?.upsert({
        id: randomUUID(),
        docId: file,
        chunkIndex: i,
        text: chunks[i],
        embedding: embeddings[i]!,
        metadata: { source: filePath },
      });
    }

    console.log(`Ingested: ${file}`);
  }
}

if(import.meta.url.includes('ingest')) {
  const folder = process.argv[2];

  if(!folder) {
    console.log('usage: node src/rag/ingest.ts src/data/rag_docs');
    process.exit(1);
  }

  ingestFolder(folder);
}




/*
If CHUNK_SIZE = 800 and OVERLAP = 100:
First chunk: 0 → 800
Next start index: 800 - 100 = 700
Second chunk: 700 → 1500
Next start: 1500 - 100 = 1400
… and so on.
*/
