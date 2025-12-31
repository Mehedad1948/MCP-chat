// actions/chat.actions.ts
'use server';

import { sendMessageToLLM } from '../services/chat.service';


// If you plan to implement the MCP Client later, you would import it here.
// import { MCPClient } from "@/lib/mcp/client"; 

/**
 * Main entry point for Chat UI.
 * Handles model selection and delegates to specific services (Gemini/RAG).
 */
export async function chatAction(message: string, model: string = "gemini") {
  if (!message) {
    return { error: "Message is required" };
  }

  try {
    if (model === "gemini") {
      // Uses your existing RAG + Gemini service
      const response = await sendMessageToLLM(message);
      return { reply: response };
    }

    if (model === "gpt") {
      // Placeholder for GPT logic if you add OpenAI provider later
      return { reply: "GPT model is not yet configured in this project." };
    }

    // Default fallback
    return { error: "Invalid model selected" };

  } catch (error) {
    console.error("Chat Action Error:", error);
    return { error: "Failed to get a response from the AI." };
  }
}
