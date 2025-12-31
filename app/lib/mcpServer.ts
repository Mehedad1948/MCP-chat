/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/mcpServer.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WeatherService } from '../services/weather.service';
import { OrderService } from '../services/order.service';
import { CustomerService } from '../services/customer.service';

export function createMcpServer() {
  // Initialize the MCP Server instance
  const server = new McpServer({
    name: "NextJS-Ecommerce-Agent",
    version: "1.0.0",
  });

  // --- Register Tools (Functions the AI can call) ---

  // 1. Tool: Get Weather
  server.tool(
    "get_weather",
    "Get current weather for a specific location",
    { location: z.string().describe("City name or location") },
    async ({ location }) => {
      try {
        const data = await WeatherService.fetchWeatherData(location);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error fetching weather: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // 2. Tool: Get Recent Orders
  server.tool(
    "get_recent_orders",
    "Get the latest orders placed in the system",
    { limit: z.number().optional().describe("Number of orders to fetch (default 5)") },
    async ({ limit }) => {
      const orders = await OrderService.getLatestOrders(limit || 5);
      return {
        content: [{ type: "text", text: JSON.stringify(orders, null, 2) }],
      };
    }
  );

  // 3. Tool: Get Order by ID
  server.tool(
    "get_order_by_id",
    "Get details of a specific order by its ID",
    { orderId: z.string() },
    async ({ orderId }) => {
      const order = await OrderService.getOrderById(orderId);
      if (!order) {
        return {
          content: [{ type: "text", text: "Order not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(order, null, 2) }],
      };
    }
  );

  // 4. Tool: Get Customers
  server.tool(
    "get_customers",
    "Get a list of customers",
    { limit: z.number().optional() },
    async ({ limit }) => {
      const customers = await CustomerService.getLatestCustomers(limit);
      return {
        content: [{ type: "text", text: JSON.stringify(customers, null, 2) }],
      };
    }
  );

  return server;
}
