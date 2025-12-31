// app/actions.ts
'use server';


import RagProvider from '../lib/rag';
import GeminiProvider from '../lib/geminiProvider';

export async function sendMessageToLLM(message: string) {
  // 1. Retrieve Environment Variables
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'; // Default or from env

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  try {
    const gemini = new GeminiProvider(
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_MODEL
    );

    // const response = await gemini.generateResponse(message);

    // Incorporate RAG to prepare the prompt
    const rag = new RagProvider();
    // const prompt = rag.prepareSimpleRagPrompt(message);

    // For RAG with embeddings, we would first need to generate the query embedding
    const queryEmbedding = await gemini.generateEmbeddings(message);
    const queryVector = queryEmbedding[0];

    // Fetch FAQ vectors from faqs.json
    const faqData: {question: string, answer: string}[] = rag.fetchDocumentData("faqs.json");
    const faqEmbeddings = await gemini.generateEmbeddings(
      faqData.map((item) => item.answer),
      "RETRIEVAL_DOCUMENT"
    );
    
    const faqVectors = faqData.map((faq, index) => ({
      ...faq,
      vector: faqEmbeddings[index],
    }));

    console.log('🍎🍎🍎 faqVectors', faqVectors);

    const prompt = rag.prepareRagPrompt(message, queryVector, faqVectors);

    const response = await gemini.generateResponse(prompt);
    // console.log(`Generated response: ${response}`);

    return response
  } catch (error) {
    console.error("Error generating response from Gemini:", error);
  return `Error generating response from Gemini ➡️:${JSON.stringify(error)}`
  }
}
