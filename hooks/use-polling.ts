"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/error-handling";

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>;
  intervalMs: number;
  source: string; // for logger.error attribution
  autoStart?: boolean; // default true
}

/**
 * Shared polling hook: encapsulates the fetch callback, the
 * data/loading/error state trio, an auto-refresh interval with a toggle, and a
 * manual refresh. The initial fetch is deferred via queueMicrotask to satisfy
 * the react-hooks/set-state-in-effect lint rule.
 */
export function usePolling<T>({
  fetcher,
  intervalMs,
  source,
  autoStart = true,
}: UsePollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(autoStart);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(source, "fetch failed", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetcher, source]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  useEffect(() => {
    if (autoRefresh) {
      timer.current = setInterval(() => void refresh(), intervalMs);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [autoRefresh, refresh, intervalMs]);

  return { data, loading, error, autoRefresh, setAutoRefresh, refresh };
}
