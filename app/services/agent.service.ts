import { GEMINI } from '@/app/lib/geminiProvider';
import { MCPClient } from '@/app/lib/mcp/client/mcp-client.service';

/**
 * Shared logic to handle Agent generation.
 * Can be called by API Routes (external) or Server Actions (internal).
 */
export async function generateAgentResponse(message: string, model: string = 'gemini') {
  
  if (!message) {
    throw new Error('Message is required');
  }

  if (model === 'gemini') {
    // Initialize MCP Client
    const mcp = await MCPClient.init();
    
    // Generate response using Gemini + MCP Tools
    const response = await GEMINI.generateResponseWithTools(message, mcp.client);
    
    return response;
  }

  if (model === 'gpt') {
    return 'GPT model not implemented yet';
  }

  throw new Error('Invalid model specified');
}
