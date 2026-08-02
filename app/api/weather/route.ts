// GET /api/weather — current conditions + short forecast for Farmingdale, NY 11735
// Server-side fetch to Open-Meteo (no API key required).
import { NextRequest, NextResponse } from "next/server";
import { serverLog } from "@/lib/error-handling";

const SOURCE = "api/weather";

// Farmingdale, NY 11735
const LAT = 40.7301;
const LON = -73.4453;
const LOCATION_LABEL = "Farmingdale, NY 11735";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface WeatherResponse {
  location: string;
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    weatherLabel: string;
    isDay: boolean;
    time: string;
  };
  daily: Array<{
    date: string;
    temperatureMax: number;
    temperatureMin: number;
    weatherCode: number;
    weatherLabel: string;
  }>;
}

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

function labelFor(code: number): string {
  return WEATHER_CODES[code] ?? "Unknown";
}

export async function GET(_req: NextRequest) {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=5`;

    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Weather provider unavailable" },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        weather_code: number;
        is_day: number;
        time: string;
      };
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
      };
    };

    const daily = data.daily.time.map((date, i) => ({
      date,
      temperatureMax: data.daily.temperature_2m_max[i],
      temperatureMin: data.daily.temperature_2m_min[i],
      weatherCode: data.daily.weather_code[i],
      weatherLabel: labelFor(data.daily.weather_code[i]),
    }));

    const payload: WeatherResponse = {
      location: LOCATION_LABEL,
      current: {
        temperature: data.current.temperature_2m,
        apparentTemperature: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        weatherCode: data.current.weather_code,
        weatherLabel: labelFor(data.current.weather_code),
        isDay: data.current.is_day === 1,
        time: data.current.time,
      },
      daily,
    };

    return NextResponse.json(payload);
  } catch (error) {
    serverLog("error", SOURCE, "weather fetch failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch weather" },
      { status: 500 },
    );
  }
}
