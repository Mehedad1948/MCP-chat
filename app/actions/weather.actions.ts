// actions/weather.actions.ts
'use server';

import { WeatherService } from '../services/weather.service';

export async function getWeatherAction(location: string) {
  if (!location) {
    return { success: false, message: "Location is required" };
  }

  try {
    const data = await WeatherService.fetchWeatherData(location);
    return { success: true, data };
  } catch (error) {
    console.error("Weather Action Error:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unable to fetch weather data" 
    };
  }
}
