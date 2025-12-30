import fs from "node:fs";
import path from "node:path";
import cosineSimilarity from "compute-cosine-similarity";

class RagProvider {
  fetchDocumentData(fileName) {
    const filePath = path.join(process.cwd(),'app' ,"data", fileName);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data;
  }

  prepareSimpleRagPrompt(query) {
    // const filePath = path.join(process.cwd(), "data", "knowledgeBase.json");
    // const kbData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const kbData = this.fetchDocumentData("knowledgeBase.json");

    const context = kbData
      .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
      .join("\n\n");

    const prompt = `You are an AI assistant with access to the following knowledge base:
    ${context}
    Based on the above knowledge, answer the following user question:
    User: ${query}
    Answer in one short paragraph.
    `;

    return prompt;
  }

  prepareRagPrompt(query, queryVector, faqVectors) {
    // find best matches using cosine similarity
    const ranked = faqVectors
      .map((item) => ({
        ...item,
        score: cosineSimilarity(queryVector, item.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2); // top 2 matches

    // console.log("Query vector:", queryVector);
    // console.log("Top RAG matches:", ranked);

    const context = ranked.map((item) => item.answer).join("\n");

    const prompt = `
      Use the context below to answer. If the answer isn't there, say "It's not available in the documentation, but I will try to help you as best as I can." and try to help based on your general knowledge.

      Context:
      ${context}

      User: ${query}`.trim();

    return prompt;
  }
}

export default RagProvider;
