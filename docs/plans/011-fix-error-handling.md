# Plan 011: Fix error-handling system (flush + dead code)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- lib/error-handling.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-test-baseline.md
- **Category**: tech-debt
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

`lib/error-handling.ts` has two problems:

1. **The `Logger` buffer is never flushed for `info`/`warn`/`error` entries.**
   Only `critical` entries are flushed to `/api/logs` in production (line 61).
   All other severities accumulate in the in-memory buffer (capped at 100) and
   are silently dropped when the buffer overflows. The `ARCHITECTURE.md` §6
   describes "buffered logging with periodic flush" — that flush never
   happened. So in production, non-critical errors are lost.
2. **Dead code.** `withErrorHandling` (lines 86–98) and `dbError` (lines
   113–121) are exported but never imported anywhere (verified in recon).
   `serverLog` is used by the API routes and `lib/agents.ts`. The dead exports
   are confusing and untested.

The fix: add a periodic flush of the buffer to `/api/logs` (batching entries),
and remove the dead `withErrorHandling`/`dbError` exports (or keep them if a
plan depends on them — check first).

## Current state

- `lib/error-handling.ts`:
  - `Logger` class (lines 15–81): `push()` appends to `buffer`, caps at
    `MAX_BUFFER = 100`, logs to console in non-production. `critical()` calls
    `flushCritical(entry)` in production (line 61–64).
  - `flushCritical` (lines 70–80): POSTs a single entry to `/api/logs`.
  - `withErrorHandling` (lines 86–98): async wrapper, exported, unused.
  - `serverLog` (lines 101–110): console logger, used by API routes.
  - `dbError` (lines 113–121): DB error helper, exported, unused.
- `app/api/logs/route.ts` — accepts a single log entry (POST). Plan 004 hardens
  it with zod validation. This plan's flush must send entries that pass that
  validation (message ≤ 2000 chars, details ≤ 50 keys, etc.).

**Repo conventions to match**:
- The `Logger` is a singleton (`Logger.getInstance()`), exported as `logger`.
- `serverLog` is the server-side console logger.
- The `SOURCE` constant pattern.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |
| Test      | `pnpm test`              | all pass (requires plan 001) |

## Scope

**In scope** (the only files you should modify):
- `lib/error-handling.ts`

**Out of scope** (do NOT touch):
- `app/api/logs/route.ts` — plan 004 hardens it; this plan only changes the
  client-side flush. If plan 004 hasn't landed, the flush still works against
  the current route (it accepts `message`/`severity`/`source`/`details`).
- Any component or route that imports `logger`/`serverLog` — their usage is
  unchanged.
- `withErrorHandling`/`dbError` — only remove them if nothing imports them
  (verify in Step 1).

## Git workflow

- Branch: `advisor/011-fix-error-handling`
- Commit message style: conventional commits, e.g.
  `fix: flush logger buffer periodically; remove dead error helpers`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm `withErrorHandling`/`dbError` are unused

```bash
grep -rn "withErrorHandling\|dbError" --include="*.ts" --include="*.tsx" app/ components/ lib/ store/ context/ types/ hooks/
```

**Verify**: the only matches are the definitions in `lib/error-handling.ts`
itself. If any other file imports them, STOP and report — the "dead code"
assumption is wrong.

### Step 2: Add a periodic flush to the `Logger`

In `lib/error-handling.ts`, add a method that flushes the buffered entries to
`/api/logs` in a batch, and a timer that calls it periodically in production.

Add to the `Logger` class:

```ts
private flushTimer: ReturnType<typeof setInterval> | null = null;

private startFlushTimer() {
  if (this.flushTimer || typeof window === "undefined") return;
  // Flush every 10 seconds in production; in dev, console logging is enough.
  if (process.env.NODE_ENV === "production") {
    this.flushTimer = setInterval(() => void this.flushBuffer(), 10000);
  }
}

private async flushBuffer() {
  if (this.buffer.length === 0) return;
  const batch = this.buffer.splice(0, this.buffer.length);
  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: batch }),
    });
  } catch {
    // Re-queue on failure so logs aren't lost; cap to avoid unbounded growth.
    this.buffer.unshift(...batch.slice(-this.MAX_BUFFER));
  }
}
```

**Important**: The current `/api/logs` route accepts a **single** entry, not a
batch. This plan's flush sends `{ entries: batch }`. To make this work, the
route must accept a batch. That's a change to `app/api/logs/route.ts` — which
is plan 004's file. **Coordinate**: either
- (a) this plan also updates `app/api/logs/route.ts` to accept `{ entries: [...] }`
  (a batch), OR
- (b) the flush sends entries one at a time (loop over the batch, POST each).

Prefer **(a)** — a single batched POST is more efficient. If you choose (a),
add `app/api/logs/route.ts` to the in-scope list and update it to accept either
a single entry (backward compat) or a batch:

```ts
// In app/api/logs/route.ts, after zod validation (plan 004) or the current manual checks:
const body = await req.json();
const entries = Array.isArray(body.entries) ? body.entries : [body];
// validate + insert each entry
```

If plan 004 has already landed, extend its `logSchema` to also accept a batch
shape. If plan 004 hasn't landed, add minimal batch handling to the current
route.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 3: Wire the flush timer into the singleton

In the `Logger` constructor, call `this.startFlushTimer()`. Also call it from
`push()` as a safety net (in case the constructor runs before `window` is
available in some edge case):

```ts
private constructor() {
  this.startFlushTimer();
}
```

And in `push()`, after appending, ensure the timer is started:

```ts
private push(entry: LogEntry) {
  this.buffer.push(entry);
  if (this.buffer.length > this.MAX_BUFFER) {
    this.buffer.shift();
  }
  this.startFlushTimer();
  // ... existing console logging ...
}
```

**Verify**: `npx tsc --noEmit` exits 0.

### Step 4: Remove the dead exports

Remove `withErrorHandling` (lines 86–98) and `dbError` (lines 113–121) from
`lib/error-handling.ts`. Keep `serverLog` (it's used) and the `Logger`/`logger`.

If any test from plan 001 references `withErrorHandling`/`dbError`, update it
(plan 001's `lib/error-handling.test.ts` only tests `logger`, so it should be
fine — verify).

**Verify**: `grep -rn "withErrorHandling\|dbError" --include="*.ts" --include="*.tsx" app/ components/ lib/ store/ context/ types/ hooks/` returns no matches.

### Step 5: Verify the full build and tests

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
pnpm test
```

**Verify**: all four exit 0.

### Step 6: Manual smoke test (optional but recommended)

If a dev server is available, trigger a non-critical log (e.g. import a bad
theme URL) and confirm:
1. In dev, the console shows the log (existing behavior).
2. In production (if you can run `pnpm start`), the buffer flushes to
   `/api/logs` every 10 seconds and the `audit_logs` table grows.

**Verify**: logs are persisted in production (not silently dropped).

## Test plan

- Update `lib/error-handling.test.ts` (from plan 001) if needed:
  - The buffer-cap test still passes (the flush timer doesn't run in tests
    because `process.env.NODE_ENV` is `test`, not `production`, and
    `startFlushTimer` guards on production).
  - Add a test that `logger.critical` in non-production does NOT call `fetch`
    (already in plan 001) — still valid.
  - Optionally add a test that `flushBuffer` sends a batch and clears the
    buffer, using `vi.spyOn(globalThis, "fetch")` and setting
    `process.env.NODE_ENV = "production"` temporarily (restore after).
- Verification: `pnpm test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "flushBuffer\|startFlushTimer" lib/error-handling.ts` matches
- [ ] `grep -rn "withErrorHandling\|dbError" --include="*.ts" --include="*.tsx" app/ components/ lib/ store/ context/ types/ hooks/` returns no matches
- [ ] `grep -n "serverLog" lib/error-handling.ts` still matches (kept)
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0 (requires plan 001)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 011 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- Step 1 finds a real consumer of `withErrorHandling`/`dbError` — stop and
  report rather than deleting a used API.
- Plan 001 has NOT landed (no `pnpm test` script) — the `pnpm test`
  verification will fail; note it and proceed with the other verifications.
- You choose option (a) (batch route) and plan 004 has already landed with a
  different zod schema — the batch handling must be reconciled; stop and
  report if the schemas conflict.

## Maintenance notes

- The flush interval (10s) and the re-queue cap are arbitrary; tune them if
  real log volume warrants.
- The re-queue on failure (`this.buffer.unshift(...batch.slice(-this.MAX_BUFFER))`)
  prevents loss but can grow the buffer if `/api/logs` is persistently down;
  the `MAX_BUFFER` cap bounds it.
- If plan 004 lands first, the batch route must satisfy its zod validation
  (message ≤ 2000 chars, details ≤ 50 keys). The flush should truncate entries
  to fit, or the route should reject oversized ones — coordinate.
- `serverLog` remains the server-side logger; the client `logger` now flushes
  to `/api/logs` periodically, matching `ARCHITECTURE.md` §6's "buffered
  logging with periodic flush" intent.