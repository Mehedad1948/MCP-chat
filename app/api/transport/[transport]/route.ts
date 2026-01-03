// app/api/[transport]/route.ts
import { registerCustomerTools } from '@/app/lib/mcp/server/tools/customer.tool';
import { registerOrderTools } from '@/app/lib/mcp/server/tools/order.tool';
import { registerWeatherTools } from '@/app/lib/mcp/server/tools/weather.tool';
import { createMcpHandler } from 'mcp-handler';

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
    // capabilities: {
    //   tools: {
    //   },
    // },
  },
  {
    // Transport configuration
    redisUrl: process.env.REDIS_URL,
    basePath: '/api/mcp/transport',
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
