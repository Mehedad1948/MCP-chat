import { CustomerService } from '@/app/services/customer.service';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';

export function registerCustomerTools(mcpServer: McpServer) {
  console.log('Registering Customer Tools...');

  mcpServer.registerTool(
    'getCustomers',
    {
      title: 'Fetch All customers',
      description: 'Retrieve all customers from the json data by limit',
      inputSchema: { limit: z.number().optional() },
      outputSchema: {
        customers: z.array(
          z.object({
            _id: z.string(),
            name: z.string(),
            email: z.string(),
            joinedAt: z.string().optional(),
          })
        ),
      },
    },
    async ({ limit }) => {
      console.log('Fetching Customers', limit);

      const customers = await CustomerService.getLatestCustomers(limit);
      return {
        content: [{ type: 'text', text: JSON.stringify(customers, null, 2) }],
        structuredContent: {customers},
      };
    }
  );

    mcpServer.registerTool(
    "getCustomerById",
    {
      title: "Fetch customer by id",
      description: "Retrieve customer from the json data based on id",
      inputSchema: {
        id: z.string(),
      },
      outputSchema: {
        customer: z.object({
          _id: z.string(),
          name: z.string(),
          email: z.string(),
          joinedAt: z.string().optional(),
        }),
      },
    },
    async ({ id }) => {
      console.log("Fetching customer by id...", id);

      const customer = await CustomerService.getCustomerById(id);

      return {
        content: [{ type: "text", text: JSON.stringify(customer, null, 2) }],
        structuredContent: { customer },
      };
    }
  );
}
