# Plan 003: Make /api/agents non-blocking

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- lib/agents.ts app/api/agents/route.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf / stability
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

`getAgents()` in `lib/agents.ts` is **synchronous** and does blocking work on
the Node event loop:

- It calls `execFileSync(process.execPath, ["-e", LAST_SESSION_READER], ...)`
  once **per profile** (line 133), each with a `timeout: 5000`. With 7 profiles
  (the documented count in `docs/STATUS.md`), a slow or hung `node -e` child
  can stall the server for up to 35 seconds.
- It calls `execFileSync("pgrep", ...)` (line 186) with `timeout: 3000`.

Because `app/api/agents/route.ts` calls `getAgents()` synchronously (line 13),
every request to `/api/agents` can block **all** other requests on the server
(Next.js serves API routes on the same Node process). The `/agents` page
auto-refreshes every 5 seconds, so this is a recurring stall, not a one-off.

The fix: make the child-process reads **asynchronous** (`execFile` instead of
`execFileSync`), run the per-profile reads concurrently, and keep the route
handler `async`. This keeps the same response shape so the client
(`components/agents/agents-list.tsx`) is unaffected.

## Current state

- `lib/agents.ts` — the whole module is synchronous. Key blocking calls:
  - Line 133: `execFileSync(process.execPath, ["-e", LAST_SESSION_READER], { env, encoding: "utf8", timeout: 5000, stdio: [...] })` inside `getLastSession(profileDir)`.
  - Line 186: `execFileSync("pgrep", ["-f", "hermes_cli.main (serve|gateway)"], { stdio: "ignore", timeout: 3000 })` inside `getAgents()`.
  - Line 158: `export function getAgents(): AgentsPayload` — synchronous return.
- `app/api/agents/route.ts`:
  ```ts
  export async function GET() {
    try {
      const agents = getAgents();   // line 13 — synchronous call
      return NextResponse.json(agents);
    } catch (error) { ... }
  }
  ```
- `components/agents/agents-list.tsx` consumes `AgentsPayload`:
  `{ timestamp: string; profiles: ProfileAgent[] }`. The response shape must
  not change.

**Repo conventions to match**:
- Server-only modules use Node built-ins (`node:fs`, `node:os`, `node:path`,
  `node:child_process`) — see `lib/agents.ts` and `lib/system-stats.ts`.
- Error logging uses `serverLog(severity, source, message, details)` from
  `@/lib/error-handling` — see `lib/agents.ts:145,173,197`.
- The `SOURCE` constant pattern: `const SOURCE = "lib/agents";` at top of file.
- The route handler pattern in `app/api/agents/route.ts` uses `serverLog` +
  `NextResponse.json({ error }, { status: 500 })` on failure.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |
| Test      | `pnpm test`              | all pass (if plan 001 landed) |

## Scope

**In scope** (the only files you should modify):
- `lib/agents.ts`
- `app/api/agents/route.ts`

**Out of scope** (do NOT touch):
- `components/agents/agents-list.tsx` — the response shape is unchanged, so
  the client needs no changes.
- `lib/system-stats.ts` — different module, already async.
- Any other API route.

## Git workflow

- Branch: `advisor/003-agents-nonblocking`
- Commit message style: conventional commits, e.g.
  `perf: make agents discovery async to avoid blocking the event loop`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Convert `getLastSession` to async

In `lib/agents.ts`, change `getLastSession(profileDir: string): LastSession | null`
to `async function getLastSession(profileDir: string): Promise<LastSession | null>`.

Replace the `execFileSync` call (line 133) with `execFile` wrapped in a
Promise. Use `node:util`'s `promisify` or a manual Promise. The cleanest is:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
```

Then in `getLastSession`:

```ts
try {
  const { stdout } = await execFileAsync(process.execPath, ["-e", LAST_SESSION_READER], {
    env: { ...process.env, D3LTA_SESSION_DB: dbPath },
    encoding: "utf8",
    timeout: 5000,
  });
  const out = stdout.trim();
  if (out === "null" || out === "") return null;
  const parsed = JSON.parse(out) as LastSession;
  return parsed;
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  serverLog("error", SOURCE, `failed to read last session for profile db`, {
    dbPath,
    errorName: err.name,
    message: err.message,
  });
  return null;
}
```

Note: `promisify(execFile)` returns a promise that rejects on non-zero exit or
timeout — the existing `catch` already handles that and returns `null`, which
preserves current behavior (a failed read yields `lastSession: null`).

**Verify**: `npx tsc --noEmit` exits 0.

### Step 2: Convert the `pgrep` probe to async

In `getAgents()`, replace the `execFileSync("pgrep", ...)` block (lines 185–203)
with an async probe. Extract it into a helper:

```ts
async function isHermesBackendUp(): Promise<boolean> {
  try {
    await execFileAsync("pgrep", ["-f", "hermes_cli.main (serve|gateway)"], {
      timeout: 3000,
    });
    return true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const status = (err as { status?: number }).status;
    if (status !== 1) {
      serverLog("warn", SOURCE, `pgrep probe for Hermes backend failed`, {
        errorName: err.name,
        message: err.message,
      });
    }
    return false;
  }
}
```

**Verify**: `npx tsc --noEmit` exits 0.

### Step 3: Make `getAgents` async and run profile reads concurrently

Change `export function getAgents(): AgentsPayload` to
`export async function getAgents(): Promise<AgentsPayload>`.

Inside, after building the `profileAgents` array skeleton, replace the
synchronous per-profile loop with concurrent async reads. The current loop
(lines 205–248) reads config synchronously (`fs.readFileSync`) and calls
`getLastSession(profileDir)` synchronously. Convert it to:

```ts
const hermesBackendUp = await isHermesBackendUp();

const profileAgents = await Promise.all(
  entries.map(async (name) => {
    const profileDir = path.join(profilesRoot, name);
    const configPath = path.join(profileDir, "config.yaml");
    const sessionsDir = path.join(profileDir, "sessions");

    let model: string | null = null;
    let provider: string | null = null;
    let baseUrl: string | null = null;

    try {
      const cfg = fs.readFileSync(configPath, "utf8");
      model = readNestedYamlValue(cfg, "model", "default") || readYamlValue(cfg, "model");
      provider = readNestedYamlValue(cfg, "model", "provider") || readYamlValue(cfg, "provider");
      baseUrl = readNestedYamlValue(cfg, "model", "base_url") || readYamlValue(cfg, "base_url");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      serverLog("warn", SOURCE, `could not read config for profile`, {
        profile: name,
        configPath,
        errorName: err.name,
        message: err.message,
      });
    }

    return {
      kind: "profile" as const,
      name,
      model,
      provider,
      baseUrl,
      configPath,
      sessionsDir,
      sessionCount: countSessions(sessionsDir),
      running: hermesBackendUp,
      lastSession: await getLastSession(profileDir),
    };
  })
);
```

Notes:
- `fs.readFileSync` and `countSessions` (which uses `fs.readdirSync`/`fs.statSync`)
  are fast local reads — they can stay synchronous. Only the child-process
  spawns were the blocking hazard.
- `Promise.all` runs the per-profile `getLastSession` calls concurrently, so
  the total wall time is bounded by the slowest single profile, not the sum.
- Keep the `entries` listing (`fs.readdirSync` with `withFileTypes`) as-is —
  it's a single fast local read.
- The `running` flag is computed once via `await isHermesBackendUp()` before
  the `Promise.all`, matching the current single-probe behavior.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 4: Update the route handler to await

In `app/api/agents/route.ts`, change line 13 from:

```ts
const agents = getAgents();
```

to:

```ts
const agents = await getAgents();
```

**Verify**: `npx tsc --noEmit` exits 0.

### Step 5: Verify the full build

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
```

**Verify**: all three exit 0.

### Step 6: Manual smoke test (optional but recommended)

If a dev server is available, hit the endpoint and confirm it returns the same
shape and completes quickly:

```bash
curl -s http://localhost:3000/api/agents | jq '.profiles | length'
```

**Verify**: returns a number (the profile count) and the request completes in
well under a second (previously it could take many seconds with many profiles).

## Test plan

- No new unit tests required for this plan (the module is server-only and
  spawns real child processes, which is awkward to unit test). If plan 001 has
  landed, ensure `pnpm test` still passes (no existing tests touch this module).
- The verification is the build + typecheck + lint passing, plus the manual
  smoke test confirming the response shape is unchanged.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "execFileSync" lib/agents.ts` returns no matches
- [ ] `grep -n "async function getAgents" lib/agents.ts` matches
- [ ] `grep -n "await getAgents" app/api/agents/route.ts` matches
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] The `AgentsPayload` response shape is unchanged (still
      `{ timestamp, profiles }`)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 003 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- You find that `getLastSession` or `getAgents` is called from somewhere other
  than `app/api/agents/route.ts` (a synchronous caller would break with the
  async conversion) — stop and report the caller.
- `promisify(execFile)` doesn't behave as expected (e.g. the timeout rejection
  shape differs) — stop and report rather than working around it.

## Maintenance notes

- If a future plan adds more per-profile work (e.g. reading more session data),
  keep it inside the `Promise.all` map so it stays concurrent.
- The `timeout: 5000` per child is still a hard cap; if profiles grow, consider
  lowering it or adding a global deadline. Out of scope here.
- If the Hermes backend probe (`pgrep`) ever needs to distinguish multiple
  running profiles, that's a separate feature — the current single boolean
  `running` flag is unchanged by this plan.