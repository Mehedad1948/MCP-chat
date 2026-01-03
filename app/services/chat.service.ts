'use server';

import { GEMINI } from '../lib/geminiProvider';
import RagProvider from '../lib/rag';
import { generateAgentResponse } from './agent.service'; // Import the new service

export async function sendMessageToLLM(message: string) {
  try {
    // 1. Initialize Gemini wrapper for Embeddings
    
    // 2. Perform RAG Logic
    const rag = new RagProvider();
    
    // Generate embedding for the user's message
    const queryEmbedding = await GEMINI.generateEmbeddings(message);
    const queryVector = queryEmbedding[0];

    // Fetch FAQ vectors
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

    // 3. Create the enriched prompt
    const enrichedPrompt = rag.prepareRagPrompt(message, queryVector, faqVectors);

    // 4. DIRECT CALL (Replaces the fetch call)
   
    console.log('🍎🍎 calling agent from UI');
    
    const response = await generateAgentResponse(enrichedPrompt, 'gemini');

    return response;

  } catch (error) {
    console.error('Error in sendMessageToLLM:', error);
    return `Error processing request: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
  }
}
