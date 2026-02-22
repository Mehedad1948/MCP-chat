// app/api/transport/[transport]/route.ts

// 🚨 CRITICAL FIXES FOR NEXT.JS SSE BUFFERING 🚨
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest } from 'next/server';
import { registerCustomerTools } from '@/app/lib/mcp/server/tools/customer.tool';
import { registerOrderTools } from '@/app/lib/mcp/server/tools/order.tool';
import { registerWeatherTools } from '@/app/lib/mcp/server/tools/weather.tool';
import { createMcpHandler } from 'mcp-handler';

// --- DEBUG LOGGING: Environment Verification ---
console.log('🔄 [MCP Server] Initializing MCP Handler file...');
console.log('📡 [MCP Server] REDIS_URL configured:', !!process.env.REDIS_URL);
if (!process.env.REDIS_URL) {
  console.error('❌ [MCP Server] CRITICAL: REDIS_URL is completely missing from environment variables! SSE bridging will fail.');
}

// 1. Create the handler instance
const mcpHandler = createMcpHandler(
  (server) => {
    console.log('🛠️ [MCP Server] Starting tool registration phase...');
    try {
      registerCustomerTools(server);
      console.log('✅ [MCP Server] Customer tools registered');

      registerOrderTools(server);
      console.log('✅ [MCP Server] Order tools registered');

      registerWeatherTools(server);
      console.log('✅ [MCP Server] Weather tools registered');
      
      console.log('🚀 [MCP Server] All tools successfully registered to server instance');
    } catch (error) {
      console.error('❌ [MCP Server] ERROR during tool registration:', error);
      throw error;
    }
  },
  {
    // capabilities configurations if needed
  },
  {
    basePath: '/api/transport', 
    redisUrl: process.env.REDIS_URL, 
    maxDuration: 60,
    verboseLogs: true, // This should also output logs from the library itself
  }
);

// --- DEBUG LOGGING: Request Wrappers ---
// We wrap the library's handler so we can log the exact moment a request arrives and leaves.

export async function GET(req: NextRequest) {
  console.log(`\n📥 [MCP Server] HTTP GET Request received at: ${req.nextUrl.pathname}`);
  console.log(`🔍 [MCP Server] Query params:`, Object.fromEntries(req.nextUrl.searchParams));
  
  try {
    const response = await mcpHandler(req);
    console.log(`📤 [MCP Server] GET Response generated with status: ${response.status}`);
    return response;
  } catch (error) {
    console.error('💥 [MCP Server] FATAL ERROR during GET request handling:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log(`\n📥 [MCP Server] HTTP POST Request received at: ${req.nextUrl.pathname}`);
  
  try {
    const response = await mcpHandler(req);
    console.log(`📤 [MCP Server] POST Response generated with status: ${response.status}`);
    return response;
  } catch (error) {
    console.error('💥 [MCP Server] FATAL ERROR during POST request handling:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
