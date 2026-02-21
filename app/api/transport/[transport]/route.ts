// app/api/transport/[transport]/route.ts

// 🚨 CRITICAL FIXES FOR NEXT.JS SSE BUFFERING 🚨
// Tell Next.js to never cache this route and allow immediate streaming
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
    basePath: '/api/transport', 
    redisUrl: process.env.REDIS_URL, 
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
