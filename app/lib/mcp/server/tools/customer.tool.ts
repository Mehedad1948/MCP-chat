/* eslint-disable @typescript-eslint/no-explicit-any */
// app/tools/customer.tool.ts
import { CustomerService } from '@/app/services/customer.service';
import { z } from 'zod';

// We accept 'any' here because mcp-handler types are inferred inside the createMcpHandler callback,
// or you can define a minimal interface if you want strict typing.
export function registerCustomerTools(server: any) {
  console.log('Registering Customer Tools...');

  server.tool(
    'getCustomers',
    'Fetch All customers. Retrieve all customers from the json data by limit',
    { 
      limit: z.number().optional() 
    },
    async ({ limit }: { limit?: number }) => {
      console.log('Fetching Customers', limit);
      const customers = await CustomerService.getLatestCustomers(limit);
      
      return {
        content: [{ type: 'text', text: JSON.stringify(customers, null, 2) }],
      };
    }
  );

  server.tool(
    "getCustomerById",
    "Fetch customer by id. Retrieve customer from the json data based on id",
    {
      id: z.string(),
    },
    async ({ id }: { id: string }) => {
      console.log("Fetching customer by id...", id);
      const customer = await CustomerService.getCustomerById(id);

      return {
        content: [{ type: "text", text: JSON.stringify(customer, null, 2) }],
      };
    }
  );
}
