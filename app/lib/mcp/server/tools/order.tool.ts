/* eslint-disable @typescript-eslint/no-explicit-any */
// app/tools/order.tool.ts
import { OrderService } from '@/app/services/order.service';
import { z } from "zod";

export function registerOrderTools(server: any) {
  console.log("Registering Order Tools...");

  // tool 1: Get Orders
  server.tool(
    "getOrders",
    "Fetch all orders. Retrieve all orders from the json data based on limit",
    {
      limit: z.number().optional(),
    },
    async ({ limit }: { limit?: number }) => {
      console.log("Fetching orders...", limit);
      const orders = await OrderService.getLatestOrders(limit);

      return {
        content: [{ type: "text", text: JSON.stringify(orders, null, 2) }],
      };
    }
  );

  // tool 2: Get orders with Customer details
  server.tool(
    "getOrdersWithCustomerDetails",
    "Fetch all orders with customer details. Retrieve the latest orders along with customer details (name) with optional limit",
    {
      limit: z.number().optional(),
    },
    async ({ limit }: { limit?: number }) => {
      console.log("Get Orders with Customer names");
      const orders = await OrderService.getLatestOrderswithCustomerDetails(limit);

      return {
        content: [{ type: "text", text: JSON.stringify(orders, null, 2) }],
      };
    }
  );

  // tool 3: Get Order by ID
  server.tool(
    "getOrderById",
    "Fetch order by id. Retrieve order from the json data based on id",
    {
      id: z.string(),
    },
    async ({ id }: { id: string }) => {
      console.log("Fetching order by id...", id);
      const order = await OrderService.getOrderById(id);

      return {
        content: [{ type: "text", text: JSON.stringify(order, null, 2) }],
      }
    }
  );
}
