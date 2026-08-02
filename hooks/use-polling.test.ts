import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePolling } from "@/hooks/use-polling";

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with idle state", () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      usePolling({ fetcher, intervalMs: 1000, source: "test" }),
    );
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.autoRefresh).toBe(true);
  });

  it("fetches on mount and stores data", async () => {
    const payload = { ok: true, value: 42 };
    const fetcher = vi.fn().mockResolvedValue(payload);
    const { result } = renderHook(() =>
      usePolling({ fetcher, intervalMs: 1000, source: "test" }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toEqual(payload);
    expect(fetcher).toHaveBeenCalled();
  });

  it("records error string on failed fetch", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() =>
      usePolling({ fetcher, intervalMs: 1000, source: "test" }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe("boom");
    expect(result.current.data).toBeNull();
  });

  it("stops the interval when autoRefresh is toggled off", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      usePolling({ fetcher, intervalMs: 1000, source: "test" }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setAutoRefresh(false);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // No further fetches after disabling auto-refresh.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
