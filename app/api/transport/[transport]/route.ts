// app/api/transport/[transport]/route.ts

import { registerCustomerTools } from '@/app/lib/mcp/server/tools/customer.tool';
import { registerOrderTools } from '@/app/lib/mcp/server/tools/order.tool';
import { registerWeatherTools } from '@/app/lib/mcp/server/tools/weather.tool';
import { createMcpHandler } from 'mcp-handler'; // Assuming this is your wrapper lib

const handler = createMcpHandler(
  (server) => {
    // 1. Register Customer Tools
    registerCustomerTools(server);

    // 2. Register Order Tools
    registerOrderTools(server);

    // 3. Register Weather Tools
    registerWeatherTools(server);
  },
  {
    // capabilities configurations if needed
  },
  {
    // Transport configuration
    // CRITICAL: The basePath needs to match exactly where the client points to, 
    // excluding the final transport method (like /sse or /messages) 
    // if the library handles routing automatically.
    
    // If your file is app/api/transport/[transport]/route.ts, 
    // Next.js serves this at /api/transport/*
    
    basePath: '/api/transport', // Updated to match folder structure
    redisUrl: process.env.REDIS_URL, // Ensure this env var is set!
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
