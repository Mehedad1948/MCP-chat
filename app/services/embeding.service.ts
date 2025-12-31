import { GoogleGenAI } from "@google/genai";

// Define strict types for the TaskType to prevent invalid string arguments
type TaskType = 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';

/**
 * Generates embeddings for an array of text strings.
 * @param data - Array of strings to embed.
 * @param taskType - The purpose of the embedding (default: RETRIEVAL_QUERY).
 * @returns Promise<number[][]> - An array of vector arrays.
 */
export async function generateEmbeddings(
  data: string[], 
  taskType: TaskType = 'RETRIEVAL_QUERY'
): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
  }

  const genAI = new GoogleGenAI({ apiKey });

  try {
    // Convert simple strings to the content format expected by the SDK
    const formattedContents = data.map(text => ({
      role: 'user',
      parts: [{ text }]
    }));

    const response = await genAI.models.embedContent({
      model: 'text-embedding-004', // 'gemini-embedding-001' is older; 004 is recommended
      contents: formattedContents,
      config: {
        taskType: taskType,
      },
    });

    // Ensure embeddings exist before mapping
    if (!response.embeddings) {
      throw new Error("No embeddings returned from Gemini API.");
    }

    // Map the response to return just the array of numbers
    const embeddings: number[][] = response.embeddings.map((e) => e.values || []);
    
    return embeddings;
  } catch (error: unknown) {
    console.error('Error generating embeddings:', error);
    
    // Correctly typed error handling
    throw new Error(`Error generating embeddings: ${error instanceof Error ? error.message : String(error)}`);
  }
}
