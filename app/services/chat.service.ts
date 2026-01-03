'use server';

import { GEMINI } from '../lib/geminiProvider';
import RagProvider from '../lib/rag';

export async function sendMessageToLLM(message: string) {
  try {
    // 1. Initialize Gemini wrapper for Embeddings
    
    // 2. Perform RAG Logic (Embeddings & Vector Search) to build context
    // We keep this logic here so we send a "smart" prompt to the API agent
    const rag = new RagProvider();
    
    // Generate embedding for the user's message
    const queryEmbedding = await GEMINI.generateEmbeddings(message);
    const queryVector = queryEmbedding[0];

    // Fetch FAQ vectors from faqs.json
    const faqData: { question: string; answer: string }[] =
      rag.fetchDocumentData('faqs.json');
      
    const faqEmbeddings = await GEMINI.generateEmbeddings(
      faqData.map((item) => item.answer),
      'RETRIEVAL_DOCUMENT'
    );

    const faqVectors = faqData.map((faq, index) => ({
      ...faq,
      vector: faqEmbeddings[index],
    }));

    // 3. Create the enriched prompt (Original Message + RAG Context)
    const enrichedPrompt = rag.prepareRagPrompt(message, queryVector, faqVectors);

    // 4. Send to the API Route
    // IMPORTANT: Server Actions require an absolute URL to fetch internal API routes.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/agent`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: enrichedPrompt, // Send the RAG-prepared prompt
        model: 'gemini'
      }),
      cache: 'no-store' // Ensure we don't cache the AI response
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API call failed with status: ${response.status}`);
    }

    // 5. Return the result
    const data = await response.json();
    return data.reply;

  } catch (error) {
    console.error('Error in sendMessageToLLM:', error);
    // Return a graceful error message string to the UI
    return `Error processing request: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
  }
}
