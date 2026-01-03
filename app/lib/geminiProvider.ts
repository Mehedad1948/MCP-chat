/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI, mcpToTool } from "@google/genai";
import type { Client } from "@modelcontextprotocol/sdk/client";

class GeminiService {
  private static instance: GeminiService;
  private readonly modelName: string;
  private readonly genAI: GoogleGenAI;

  constructor(modelName: string = process.env.GEMINI_MODEL!) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!modelName) {
      throw new Error("Model name is required");
    }

    this.modelName = modelName;
    this.genAI = new GoogleGenAI({ apiKey });
  }

  static getInstance(modelName?: string): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService(modelName);
    }
    return GeminiService.instance;
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
        // config: {
        //   systemInstruction: "You are a cat. Your name is Neko.",
        //   thinkingConfig: {
        //     thinkingBudget: 0, // Disables thinking
        //   },
        // },
      });
      return response.text || "No response generated.";
    } catch (error: any) {
      console.error("Error generating response from GeminiProvider:", error);
      throw new Error(`Error generating response: ${error.message}`);
    }
  }

  async generateResponseWithTools(
    prompt: string,
    mcpClient: Client
  ): Promise<string> {
    try {
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          systemInstruction: {
            role: "model",
            parts: [
              {
                text: "You are an AI assistant specialized in E-commerce data (orders and customers) and weather data too. When the user asks a question about orders or customers or weather information, use the provided tools. **If the question is unrelated to your tools, answer using your intrinsic knowledge.** Be concise and do not mention the tools were used unless asked.",
              },
            ],
          },
          tools: [mcpToTool(mcpClient)],
          // temperature: 0.2
        },
      });

      return this.extractResponseText(response);
    } catch (error: any) {
      console.error("Error generating response from GeminiProvider:", error);
      throw new Error(`Error generating response: ${error.message}`);
    }
  }

  extractResponseText(response: any): string {
    const candidate = response?.candidates?.[0];

    if (!candidate) return "";

    // step 1: Find the primary text part in the model's final response
    const textPart = candidate.content?.parts.find((p: any) => p.text);

    if (textPart && textPart.text) {
      return textPart.text.trim();
    }

    // step 2: Fallback for debugging (rarely happen with auto-tooling)
    const structuredPart = candidate.content?.parts.find(
      (p: any) => p.functionResponse?.response?.structuredContent
    );

    if (structuredPart) {
      // If the model gave NO text, but tool data exists, you can fall back to the data
      return (
        "Tool executed successfully, but no natural language summary was provided. Raw data:\n" +
        JSON.stringify(
          structuredPart.functionResponse.response.structuredContent,
          null,
          2
        )
      );
    }

    return "No valid response was generated.";
  }

  async generateEmbeddings(
    data: string | string[],
    taskType = "RETRIEVAL_QUERY"
  ) {
    try {
      const response = await this.genAI.models.embedContent({
        model: "gemini-embedding-001",
        contents: data,
        config: {
          taskType,
        },
      });

      const embeddings = response.embeddings!.map((e) => e.values);
      return embeddings;
    } catch (error: any) {
      console.error("Error generating embeddings:", error);
      throw new Error(`Error generating embeddings: ${error.message}`);
    }
  }
}

export const GEMINI = GeminiService.getInstance();
