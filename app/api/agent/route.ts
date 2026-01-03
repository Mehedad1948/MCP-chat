import { NextResponse } from 'next/server';
import { GEMINI } from '@/app/lib/geminiProvider';
import { MCPClient } from '@/app/lib/mcp/client/mcp-client.service';

export async function POST(request: Request) {
  try {
    // Parse the JSON body from the request
    const body = await request.json();
    const { message, model } = body;

    // Validate input
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const selectedModel = model || 'gemini';

    if (selectedModel === 'gemini') {
      // Initialize MCP Client
      const mcp = await MCPClient.init();
      
      // Generate response
      const response = await GEMINI.generateResponseWithTools(message, mcp.client);
      
      return NextResponse.json({ reply: response });
    }

    if (selectedModel === 'gpt') {
      // Model calling logic for GPT would go here
      // For now, return a placeholder or implement logic
      return NextResponse.json({ reply: 'GPT model not implemented yet' });
    }

    // Fallback if model string is valid but not handled above
    return NextResponse.json(
      { error: 'Invalid model specified' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error generating response:', error);
    
    // Return 500 error
    return NextResponse.json(
      { error: 'Failed to get a response from the AI.' },
      { status: 500 }
    );
  }
}
