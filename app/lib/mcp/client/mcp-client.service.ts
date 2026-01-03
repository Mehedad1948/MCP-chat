/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';


class MCPClientService {
    private static instance: MCPClientService;
    client: Client;
    private tools: any[] = [];
    private initialised = false;
    private transport: SSEClientTransport | null = null;

    constructor() {
        this.client = new Client({
            name: 'nextjs-mcp-client',
            version: '1.0.0'
        }, {
            capabilities: {
            }
        });
    }

    static getInstance(): MCPClientService {
        if (!MCPClientService.instance) {
            MCPClientService.instance = new MCPClientService();
        }
        return MCPClientService.instance;
    }

    async init() {
        if (this.initialised) return this;

        // CRITICAL FIX: URL Construction
        // We need to point to the SSE endpoint specifically.
        // Based on app/api/transport/[transport]/route.ts, the URL is:
        const sseUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/transport/sse`;
        
        console.log('🐞🐞🐞 MCP client calling MCP server (SSE)', sseUrl);

        // Use SSEClientTransport for HTTP/Next.js routes
        this.transport = new SSEClientTransport(new URL(sseUrl));
        
        console.log('✅✅✅ Transport Created');

        try {
            await this.client.connect(this.transport);
            this.initialised = true;
            console.log('🚀 MCP Client Connected successfully');
        } catch (error) {
            console.error('❌ Failed to connect MCP Client:', error);
            // Reset init state on failure so we can retry
            this.initialised = false; 
            throw error;
        }

        return this;
    }

    async getTools() {
        // Ensure connection
        await this.init();

        // Only fetch if we haven't cached them, or force refresh logic here
        if (this.tools.length === 0) {
            try {
                const list = await this.client.listTools();
                this.tools = list.tools;
            } catch (error) {
                console.error("Failed to list tools:", error);
                throw error;
            }
        }
        return this.tools;
    }

    async callTool(name: string, args: Record<string, any>) {
        await this.init();

        try {
            return await this.client.callTool({
                name,
                arguments: args
            });
        } catch (error) {
            console.error(`Failed to call tool ${name}:`, error);
            throw error;
        }
    }
}

export const MCPClient = MCPClientService.getInstance();
