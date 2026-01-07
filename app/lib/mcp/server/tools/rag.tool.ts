/* eslint-disable @typescript-eslint/no-explicit-any */
import { RagEngine } from '@/app/rag/rag.engine';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';

export function registerRagTool(mcpServer: McpServer) {
  mcpServer.registerTool(
    'ragSearch',
    {
      title: 'RAG Search Tool',
      description:
        'A tool to perform RAG search and build prompts based on the query.',
      inputSchema: {
        query: z.string(),
        topK: z.number().optional(),
      },
      outputSchema: z.object({
        prompt: z.string(),
        source: z.any(),
      }),
    },
    async ({ query, topK }) => {
      try {
        const result = await RagEngine.buildPrompt(query, topK);

        return {
          content: [{ type: 'text', text: result.prompt }],
          structuredContent: { ...result },
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          structuredContent: { prompt: '', source: [] },
        };
      }
    }
  );
}
