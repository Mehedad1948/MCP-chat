import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCustomerTools } from './tools/customer.tool';
import { registerOrderTools } from './tools/order.tool';
import { registerWeatherTools } from './tools/weather.tool';
import { registerRagTool } from './tools/rag.tool';

export function createMcpServer() {
  console.log('Creating MCp Server');

  const server = new McpServer({
    name: 'demo-server',
    version: '1.0.0',
  });

  registerCustomerTools(server);
  registerOrderTools(server);
  registerWeatherTools(server);

  registerRagTool(server)

  return server;
}
