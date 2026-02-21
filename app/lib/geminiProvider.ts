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

      console.log('🎄🎄🎄🎄 Calling model ');
      
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
                text: `You are an Expert Industrial Engineering Assistant. Your purpose is to help users solve complex mechanical, structural, and fluid dynamics problems with 100% precision.
CRITICAL RULES FOR CALCULATIONS:
1. NEVER perform complex mathematical calculations, formula derivations, or unit conversions internally. You are a language model and prone to arithmetic hallucinations.
2. ALWAYS use the provided MCP tools for calculations (e.g., 'calculateBeamDeflection', 'calculatePipeFrictionLoss').
3. If a user asks a problem that requires material properties, use 'getMaterialProperties' FIRST to fetch the standardized values (like Young's Modulus or Density) before passing them into a calculation tool.
4. Ensure all units match the input requirements of the tools (e.g., convert mm to meters, or MPa to Pascals) BEFORE passing the arguments to the tool.
5. If you do not have a tool to calculate something exactly, explain the step-by-step formula to the user but warn them that you cannot verify the final mathematical arithmetic.

When answering, cite the tools and standards you used. Maintain a professional, highly technical engineering tone.
`
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

      console.log('⭕⭕⭕ embeddings', embeddings);
      
      return embeddings;
    } catch (error: any) {
      console.error("Error generating embeddings:", error);
      throw new Error(`Error generating embeddings: ${error.message}`);
    }
  }
}

export const GEMINI = GeminiService.getInstance();
