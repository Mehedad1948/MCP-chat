import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCustomerTools } from './tools/customer.tool';
import { registerOrderTools } from './tools/order.tool';
import { registerWeatherTools } from './tools/weather.tool';
import { registerRagTool } from './tools/rag.tool';
import { registerEngineeringTools } from '@/app/services/tools/engineering.tool';

export function createMcpServer() {
  console.log('Creating MCP Server');

  const server = new McpServer({
    name: 'demo-server',
    version: '1.0.0',
  });

  registerCustomerTools(server);
  registerOrderTools(server);
  registerWeatherTools(server);
  registerRagTool(server);
  
  // <-- Register your new specialized tools
  registerEngineeringTools(server); 

  return server;
}
