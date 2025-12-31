import { GoogleGenAI } from "@google/genai";

class GeminiProvider {
  constructor(apiKey, modelName) {
    this.apiKey = apiKey;
    this.modelName = modelName;

    if (!this.apiKey) {
      throw new Error("API key is required for GeminiProvider");
    }

    if (!this.modelName) {
      throw new Error("Model name is required for GeminiProvider");
    }

    this.genAI = new GoogleGenAI({apiKey: this.apiKey});
  }

  async generateResponse(prompt) {
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
    } catch (error) {
      console.error("Error generating response from GeminiProvider:", error);
      throw new Error(`Error generating response: ${error.message}`);
    }
  }

  async generateEmbeddings(data, taskType = "RETRIEVAL_QUERY") {
    try {
      const response = await this.genAI.models.embedContent({
        model: "gemini-embedding-001",
        contents: data,
        taskType,
      });

      const embeddings = response.embeddings.map((e) => e.values);
      return embeddings;
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw new Error(`Error generating embeddings: ${error.message}`);
    }
  }
}

export default GeminiProvider;
