/* eslint-disable @typescript-eslint/no-explicit-any */
// app/tools/weather.tool.ts
import { WeatherService } from '@/app/services/weather.service';
import { z } from "zod";

export function registerWeatherTools(server: any) {
  console.log("Registering Weather Tools...");

  server.tool(
    "getWeatherData",
    "Get live weather by city or region. Retrieve the live weather data of a city from external API",
    {
      city: z.string(),
      country: z.string().optional(),
    },
    async ({ city, country }: { city: string, country?: string }) => {
      const query = country ? `${city}, ${country}` : city;
      
      const data = await WeatherService.fetchWeatherData(query);
      console.log('Weather report: ', data);

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
