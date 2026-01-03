/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

class MCPClientService {
    private static instance: MCPClientService
    client: Client
    private tools: any[] = []
    private initialised = false;

    constructor(){
        this.client = new Client({
            name: 'node-mcp-client',
            version: '1.0.0'
        })
    }

    static getInstance(): MCPClientService {
        if (!MCPClientService.instance) {
            MCPClientService.instance = new MCPClientService()
        }
        return MCPClientService.instance
    }

    async init(){
        if (this.initialised) return this

        // FIX: Ensure we use 127.0.0.1 for local dev to avoid IPv6 issues
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
        const url = `${baseUrl}/api/mcp`
        
        console.log(`Connecting MCP Client to: ${url}`); // Debug log

        const transport = new StreamableHTTPClientTransport(new URL(url))

        try {
            await this.client.connect(transport)
            this.initialised = true
        } catch (error) {
            console.error("Failed to connect MCP Client:", error);
            throw error;
        }
        
        return this
    }

    async getTools(){
        await this.init()

        if (this.tools.length === 0) {
            const list = await this.client.listTools()
            this.tools = list.tools
        }
        return this.tools
    }

   async callTool(name: string, args: Record<string, any>){
        if (!this.initialised) await this.init()

            return await this.client.callTool({
                name,
                arguments: args
            })
    }
}

export const MCPClient = MCPClientService.getInstance()
