"use client";

import { useState, useEffect, useRef } from "react";
import { CloudSun, Cloud, Sun, CloudRain, Snowflake, Wind } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/error-handling";

const SOURCE = "weather-page";

interface Daily {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  weatherLabel: string;
}

interface WeatherData {
  location: string;
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    weatherLabel: string;
    isDay: boolean;
  };
  daily: Daily[];
}

function weatherIcon(code: number, isDay: boolean) {
  if (code === 0) return isDay ? <Sun /> : <CloudSun />;
  if (code <= 3) return <CloudSun />;
  if (code >= 71 && code <= 77) return <Snowflake />;
  if (code >= 51 && code <= 67) return <CloudRain />;
  if (code >= 80 && code <= 82) return <CloudRain />;
  return <Cloud />;
}

export default function WeatherPage() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setData((await res.json()) as WeatherData);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "load failed", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    queueMicrotask(() => void load());
  }, [load]);

  const now = data?.current;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Weather
        </h1>
        <p className="text-sm text-muted-foreground">
          Current conditions and 7-day forecast for Farmingdale, NY 11735.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-sm text-red-400">
          Failed to load weather: {error}
        </div>
      )}

      {!data && loading && (
        <p className="font-mono text-sm text-muted-foreground">
          LOADING WEATHER…
        </p>
      )}

      {data && (
        <>
          <Card className="border-cyan-500/40 bg-cyan-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                <span className="text-cyan-400">●</span> {data.location}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 text-cyan-400">
                    {now && weatherIcon(0, now.isDay)}
                  </div>
                  <div>
                    <p className="font-display text-4xl font-bold tabular-nums text-cyan-300">
                      {Math.round(now!.temperature)}°F
                    </p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {now!.weatherLabel}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-right font-mono text-sm text-muted-foreground">
                  <p>
                    Feels like{" "}
                    <span className="tabular-nums text-amber-300">
                      {Math.round(now!.apparentTemperature)}°F
                    </span>
                  </p>
                  <p>
                    Humidity{" "}
                    <span className="tabular-nums text-fuchsia-300">
                      {now!.humidity}%
                    </span>
                  </p>
                  <p className="flex items-center justify-end gap-1">
                    <Wind className="h-3 w-3 text-emerald-400" />{" "}
                    <span className="tabular-nums text-emerald-300">
                      {Math.round(now!.windSpeed)}
                    </span>{" "}
                    mph
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {data.daily.map((d, i) => {
              const label =
                i === 0
                  ? "Today"
                  : new Date(d.date).toLocaleDateString("en-US", {
                      weekday: "short",
                    });
              return (
                <Card
                  key={d.date}
                  className={
                    i === 0
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-cyan-500/40 bg-cyan-500/5"
                  }
                >
                  <CardContent className="space-y-1 p-4 text-center">
                    <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground">
                      {label}
                    </p>
                    <div className="mx-auto flex h-8 w-8 justify-center text-cyan-400">
                      {weatherIcon(d.weatherCode, true)}
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {d.weatherLabel}
                    </p>
                    <p className="font-mono text-sm tabular-nums">
                      <span className="text-amber-300">
                        {Math.round(d.temperatureMax)}°
                      </span>{" "}
                      /{" "}
                      <span className="text-cyan-300">
                        {Math.round(d.temperatureMin)}°
                      </span>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Button
        variant="outline"
        onClick={() => void load()}
        disabled={loading}
        className="border-cyan-500/40 text-cyan-300"
      >
        Refresh
      </Button>
    </div>
  );
}
