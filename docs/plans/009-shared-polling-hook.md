# Plan 009: Extract shared polling hook

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- components/system/system-status.tsx components/agents/agents-list.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-test-baseline.md
- **Category**: tech-debt
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

`components/system/system-status.tsx` and `components/agents/agents-list.tsx`
contain **near-identical polling logic**: a `fetch` callback, a `loading`/
`error`/`data` state trio, an auto-refresh `setInterval` with a toggle, a
manual refresh button, and a `queueMicrotask` workaround to satisfy the
`react-hooks/set-state-in-effect` lint rule. This is copy-pasted twice and will
drift. Extracting a `usePolling` hook removes the duplication and centralizes
the (subtle) interval-cleanup and lint-workaround logic.

## Current state

- `components/system/system-status.tsx` (lines 110–145):
  ```ts
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as SystemStats;
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "fetch failed", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void fetchStats());
  }, [fetchStats]);

  useEffect(() => {
    if (autoRefresh) {
      timer.current = setInterval(() => void fetchStats(), 3000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [autoRefresh, fetchStats]);
  ```
- `components/agents/agents-list.tsx` (lines 127–162): the same pattern with
  `fetchAgents`, `/api/agents`, interval `5000`, and `AgentsPayload`.
- Both use `logger.error(SOURCE, "fetch failed", { message })` on error.

**Repo conventions to match**:
- Hooks live in a `hooks/` directory. The repo has no `hooks/` dir yet
  (`components.json` aliases `"hooks": "@/hooks"` but it doesn't exist) —
  create `hooks/use-polling.ts`.
- Components use `useCallback`/`useEffect`/`useRef`/`useState` from React.
- Error logging uses `logger` from `@/lib/error-handling`.
- The `SOURCE` constant pattern in each component.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |
| Test      | `pnpm test`              | all pass (requires plan 001) |

## Scope

**In scope** (the only files you should modify/create):
- `hooks/use-polling.ts` (create)
- `components/system/system-status.tsx` (use the hook)
- `components/agents/agents-list.tsx` (use the hook)
- `hooks/use-polling.test.ts` (create, optional but recommended)

**Out of scope** (do NOT touch):
- The API routes (`/api/system`, `/api/agents`) — unchanged.
- The `SystemStats`/`AgentsPayload` types — unchanged.
- The rendering/JSX of either component — only the data-fetching logic moves
  into the hook.

## Git workflow

- Branch: `advisor/009-shared-polling-hook`
- Commit message style: conventional commits, e.g.
  `refactor: extract shared usePolling hook`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `hooks/use-polling.ts`

Create the hook. It should encapsulate: the fetch callback, the
`data`/`loading`/`error` state, the auto-refresh interval with toggle, and the
manual refresh. Signature:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>;
  intervalMs: number;
  source: string; // for logger.error
  autoStart?: boolean; // default true
}

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
      // Import logger lazily to avoid a hard dependency in the hook? No —
      // the repo already imports logger in both callers; import it here.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { logger } = await import("@/lib/error-handling");
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
```

**Important**: The lazy `await import("@/lib/error-handling")` inside `refresh`
is awkward. Prefer a **static import** at the top of the hook file instead:

```ts
import { logger } from "@/lib/error-handling";
```

and use `logger.error(source, "fetch failed", { message })` directly. The lazy
import above is shown only to illustrate the intent — use the static import,
which matches the repo convention (both callers import `logger` statically).

**Verify**: `npx tsc --noEmit` exits 0.

### Step 2: Refactor `system-status.tsx` to use the hook

In `components/system/system-status.tsx`, replace the state + fetch + effects
(lines 110–145) with:

```ts
import { usePolling } from "@/hooks/use-polling";

const { data: stats, loading, error, autoRefresh, setAutoRefresh, refresh } =
  usePolling<SystemStats>({
    fetcher: async () => {
      const res = await fetch("/api/system", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return (await res.json()) as SystemStats;
    },
    intervalMs: 3000,
    source: SOURCE,
  });
```

Remove the now-unused imports (`useCallback`, `useEffect`, `useRef`, `useState`
if no longer used elsewhere in the file; `logger` if no longer used). Keep the
`SOURCE` constant. The JSX that references `stats`, `loading`, `error`,
`autoRefresh`, `setAutoRefresh`, and `refresh` stays the same — the hook returns
the same names.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 3: Refactor `agents-list.tsx` to use the hook

In `components/agents/agents-list.tsx`, replace the state + fetch + effects
(lines 127–162) with:

```ts
import { usePolling } from "@/hooks/use-polling";

const { data, loading, error, autoRefresh, setAutoRefresh, refresh } =
  usePolling<AgentsPayload>({
    fetcher: async () => {
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return (await res.json()) as AgentsPayload;
    },
    intervalMs: 5000,
    source: SOURCE,
  });
```

Remove the now-unused imports (`useCallback`, `useEffect`, `useRef`, `useState`
if no longer used; `logger` if no longer used). Keep the `SOURCE` constant and
the `ProfileCard` component. The JSX referencing `data`, `loading`, `error`,
`autoRefresh`, `setAutoRefresh`, `refresh` stays the same.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 4: Add a test for the hook (recommended)

Create `hooks/use-polling.test.ts` using `@testing-library/react`'s `renderHook`
and `act` (installed in plan 001). Test:

- initial state: `data === null`, `loading === false`, `error === null`,
  `autoRefresh === true`
- `refresh()` fetches and sets `data`
- a failed fetch sets `error`
- `setAutoRefresh(false)` stops the interval (use fake timers via
  `vi.useFakeTimers()`)

Model it on the store test from plan 001. Example skeleton:

```ts
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePolling } from "@/hooks/use-polling";

describe("usePolling", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("fetches on mount and sets data", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      usePolling({ fetcher, intervalMs: 1000, source: "test" })
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetcher).toHaveBeenCalled();
    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));
  });
});
```

Note: the hook's `queueMicrotask` initial fetch and the interval both need fake
timers advanced. If the test is flaky, simplify to test only the `refresh`
behavior by calling `result.current.refresh()` inside `act`.

**Verify**: `pnpm test` runs and the new test passes.

### Step 5: Verify the full build and tests

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
pnpm test
```

**Verify**: all four exit 0.

## Test plan

- New test: `hooks/use-polling.test.ts` (initial state, successful fetch,
  failed fetch, auto-refresh toggle).
- The existing component behavior is preserved (the hook returns the same
  names the JSX already uses).
- Verification: `pnpm test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `hooks/use-polling.ts` exists
- [ ] `grep -n "usePolling" components/system/system-status.tsx components/agents/agents-list.tsx` matches in both
- [ ] `grep -n "setInterval" components/system/system-status.tsx components/agents/agents-list.tsx` returns no matches (interval logic moved to hook)
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0 (requires plan 001)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 009 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- Plan 001 has NOT landed (no `pnpm test` script) — the `pnpm test`
  verification will fail; note it and proceed with the other verifications.
- A component uses `loading`/`error`/`data` in a way the hook's return shape
  doesn't cover (e.g. it reads `stats` directly in JSX in a way that breaks) —
  stop and report rather than contorting the hook.

## Maintenance notes

- The hook's `fetcher` is recreated on every render in the callers (it's an
  inline async arrow). This is fine because `refresh` depends on `fetcher`, and
  the interval effect depends on `refresh` — so the interval resets when the
  fetcher identity changes. If a caller ever passes a stable memoized fetcher,
  the interval won't reset unnecessarily. Keep the inline arrow for now; it
  matches the current behavior.
- If a third polling component appears, reuse `usePolling` rather than
  copy-pasting again.
- The `queueMicrotask` initial-fetch workaround is now centralized in the hook,
  so future components won't need to remember the lint rule.