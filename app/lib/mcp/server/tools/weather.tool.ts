import { WeatherService } from '@/app/services/weather.service';
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerWeatherTools(mcpServer: McpServer) {
  console.log("Registering Weather Tools...");

  // tool 1: Get live weather by city or region
  mcpServer.registerTool(
    "getWeatherData",
    {
      title: "Get live weather by city or region",
      description: "Retrieve the live weather data of a city from external API",
      inputSchema: {
        city: z.string(),
        country: z.string().optional(),
      },
      outputSchema: {
        data: z.any(), // or define a structured schema later
      },
    },
    async ({ city, country }) => {
      const query = country ? `${city}, ${country}` : city;

      const data = await WeatherService.fetchWeatherData(query);
      console.log('Weather report: ', data);

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: { data },
      };
    }
  );
}
