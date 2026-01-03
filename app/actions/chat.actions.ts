'use server';

import { sendMessageToLLM } from '@/app/services/chat.service';

export async function chatAction(message: string, model: string = "gemini") {
  if (!message) {
    return { error: "Message is required" };
  }

  try {
    if (model === "gemini") {
      // This calls your service, which calls the API route, which calls MCP
      const response = await sendMessageToLLM(message);
      
      // If the service returned an error string in the catch block
      if (typeof response === 'string' && response.startsWith('Error')) {
         return { error: response };
      }

      return { reply: response };
    }

    if (model === "gpt") {
      return { reply: "GPT model is not yet configured in this project." };
    }

    return { error: "Invalid model selected" };

  } catch (error) {
    console.error("Chat Action Error:", error);
    return { error: "Failed to get a response from the AI." };
  }
}
