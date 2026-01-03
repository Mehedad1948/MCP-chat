import { OrderService } from '@/app/services/order.service';
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerOrderTools(mcpServer: McpServer) {
  console.log("Registering Order Tools...");

  // tool 1: Get Orders
  mcpServer.registerTool(
    "getOrders",
    {
      title: "Fetch all orders",
      description: "Retrieve all orders from the json data based on limit",
      inputSchema: {
        limit: z.number().optional(),
      },
      outputSchema: {
        orders: z.array(
          z.object({
            _id: z.string(),
            product: z.string(),
            price: z.number(),
            customer: z.string(),
            date: z.string().optional(),
          })
        ),
      },
    },
    async ({ limit }) => {
      console.log("Fetching orders...", limit);

      const orders = await OrderService.getLatestOrders(limit);

      return {
        content: [{ type: "text", text: JSON.stringify(orders, null, 2) }],
        structuredContent: { orders },
      };
    }
  );

  // tool 2: Get orders with Customer details
  mcpServer.registerTool(
    "getOrdersWithCustomerDetails",
    {
      title: "Fetch all orders with customer details",
      description:
        "Retrieve the latest orders along with customer details (name) with optional limit",
      inputSchema: {
        limit: z.number().optional(),
      },
      outputSchema: {
        orders: z.array(
          z.object({
            _id: z.string(),
            product: z.string(),
            price: z.number(),
            customer: z.string(),
            date: z.string().optional(),
          })
        ),
      },
    },
    async ({ limit }) => {
      console.log("Get Orders with Customer names");
      const orders = await OrderService.getLatestOrderswithCustomerDetails(
        limit
      );

      return {
        content: [{ type: "text", text: JSON.stringify(orders, null, 2) }],
        structuredContent: { orders },
      };
    }
  );

  // tool 3: Get Order by ID
  mcpServer.registerTool(
    "getOrderById",
    {
      title: "Fetch order by id",
      description: "Retrieve order from the json data based on id",
      inputSchema: {
        id: z.string(),
      },
      outputSchema: {
        order: z.object({
          _id: z.string(),
          product: z.string(),
            price: z.number(),
            customer: z.string(),
            date: z.string().optional(),
        }),
      },
    },
    async ({ id }) => {
      console.log("Fetching order by id...", id);

      const order = await OrderService.getOrderById(id);

      return {
        content: [{ type: "text", text: JSON.stringify(order, null, 2) }],
        structuredContent: { order },
      }
    }
  );
}
