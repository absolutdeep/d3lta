# Plan 012: Move theme-name resolution server-side

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- lib/theme-service.ts app/api`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

`lib/theme-service.ts` has a `fetchThemeName(id)` function (line 161) that
fetches the tweakcn theme page and extracts the name from its `<title>`. It's
called from `fetchThemeFromUrl` (line 207) and `validateThemeFile` (line 234)
to recover a friendly name when the JSON doesn't carry one. But **this runs
client-side** (the theme service is imported by client components), and a
cross-origin `fetch` to `https://tweakcn.com/themes/<id>` is **CORS-blocked**
from the browser. `../STATUS.md` §Theme name + URL pattern explicitly notes
this: "the page `<title>` is not fetchable cross-origin from the browser, so
the JSON `name` is the reliable source." So `fetchThemeName` always returns
`null` in the browser, and the fallback name logic never benefits from it.

The fix: move the page-title fetch to a **server-side** API route (e.g.
`/api/themes/name?url=...` or `/api/themes/resolve`), and have the client call
that instead of fetching tweakcn directly. This makes the name resolution
actually work and removes a dead client-side code path.

## Current state

- `lib/theme-service.ts`:
  - `fetchThemeName(id)` (lines 161–176): `fetch(buildPageUrl(id))`, parses
    `<title>` via `extractNameFromPage`, returns `string | null`. Runs
    client-side; CORS-blocked.
  - `fetchThemeFromUrl` (lines 182–214): calls `fetchThemeName(id)` at line 207
    when the JSON has no name.
  - `validateThemeFile` (lines 225–249): calls `fetchThemeName(id)` at line 234
    when the file content has no name.
- `app/api/themes/route.ts` — existing GET/POST for themes.
- `app/api/themes/[id]/route.ts` — existing GET/DELETE for a single theme.

**Repo conventions to match**:
- API routes use `NextRequest`/`NextResponse`, `getDb()`, `serverLog`/`dbError`.
- Server-only logic uses Node built-ins (see `lib/agents.ts`, `lib/system-stats.ts`).
- The `SOURCE` constant pattern.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |
| Test      | `pnpm test`              | all pass (if plan 001 landed) |

## Scope

**In scope** (the only files you should modify/create):
- `app/api/themes/name/route.ts` (create — a new server route that fetches the
  tweakcn page title)
- `lib/theme-service.ts` (change `fetchThemeName` to call the new route, or
  remove it and call the route directly from the callers)

**Out of scope** (do NOT touch):
- `extractNameFromPage` (lines 133–155) — it's a pure function that parses
  HTML; it can move to the server route or stay. Keep it working.
- `app/api/themes/route.ts` and `app/api/themes/[id]/route.ts` — unchanged.
- The theme import flow's other logic (`fetchThemeFromUrl`, `validateThemeFile`
  name fallbacks) — only the `fetchThemeName` call changes.

## Git workflow

- Branch: `advisor/012-theme-name-server-side`
- Commit message style: conventional commits, e.g.
  `fix: resolve theme names server-side to bypass CORS`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the server-side name-resolution route

Create `app/api/themes/name/route.ts`:

```ts
// GET /api/themes/name?url=<tweakcn theme page or id>
// Server-side fetch of the tweakcn page <title> to resolve a friendly theme
// name. The browser cannot fetch tweakcn cross-origin (CORS), so this runs
// server-side.
import { NextRequest, NextResponse } from "next/server";
import { serverLog } from "@/lib/error-handling";
import { extractNameFromPage } from "@/lib/theme-service";

const SOURCE = "api/themes/name";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Only allow tweakcn URLs to avoid SSRF to arbitrary hosts.
  if (!/^https:\/\/tweakcn\.com\//i.test(url)) {
    return NextResponse.json({ error: "Only tweakcn URLs are allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      return NextResponse.json({ name: null }, { status: 200 });
    }
    const html = await res.text();
    const name = extractNameFromPage(html);
    return NextResponse.json({ name });
  } catch (error) {
    serverLog("error", SOURCE, "failed to fetch theme name", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ name: null }, { status: 200 });
  }
}
```

**Security note**: The `url` is restricted to `https://tweakcn.com/` to prevent
SSRF (server-side request forgery) — the server would otherwise fetch any URL
a client passes. This is important because the route runs server-side.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 2: Update `fetchThemeName` to call the new route

In `lib/theme-service.ts`, change `fetchThemeName(id)` (lines 161–176) to call
the new server route instead of fetching tweakcn directly:

```ts
export async function fetchThemeName(id: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/themes/name?url=${encodeURIComponent(buildPageUrl(id))}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { name: string | null };
    return data.name;
  } catch (err) {
    logger.warn(
      SOURCE,
      `Could not fetch theme name from page: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}
```

This keeps the same signature and call sites (`fetchThemeFromUrl` line 207,
`validateThemeFile` line 234) unchanged — they now hit the server route, which
does the cross-origin fetch.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 3: Verify the full build

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
```

**Verify**: all three exit 0.

### Step 4: Manual smoke test (optional but recommended)

If a dev server is available:

```bash
# Resolve a real tweakcn theme id
curl -s "http://localhost:3000/api/themes/name?url=https://tweakcn.com/themes/cmcup07dt000104l4hj4eferh" | jq '.name'
# Expect a non-null name (e.g. "designbyte")

# Non-tweakcn URL is rejected
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/themes/name?url=https://example.com"
# Expect 400
```

**Verify**: the name resolves and non-tweakcn URLs are rejected.

## Test plan

- No new unit tests required (the route does a real network fetch; testing it
  needs an integration harness). If plan 001 has landed, ensure `pnpm test`
  still passes.
- The verification is the build + typecheck + lint passing, plus the manual
  smoke test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `app/api/themes/name/route.ts` exists
- [ ] `grep -n "api/themes/name" lib/theme-service.ts` matches (fetchThemeName calls the route)
- [ ] `grep -n "tweakcn.com" app/api/themes/name/route.ts` matches (SSRF guard present)
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 012 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- `extractNameFromPage` is not exported from `lib/theme-service.ts` (it is
  currently exported at line 133) — if it isn't, export it or move it to the
  route file; stop and report if the import fails.
- The route's SSRF guard rejects a legitimate tweakcn URL variant (e.g. a
  subdomain) — stop and report rather than loosening the guard blindly.

## Maintenance notes

- The new route is a thin server-side proxy for tweakcn page titles. If tweakcn
  changes its page structure, `extractNameFromPage` (in `lib/theme-service.ts`)
  is the single place to update.
- The SSRF guard only allows `https://tweakcn.com/`. If the app later needs to
  resolve names from other theme sources, extend the allowlist deliberately.
- `../STATUS.md` §Theme name + URL pattern documents the CORS limitation;
  after this lands, that note is outdated — consider updating it.
- If plan 010 (CSP) has landed, the `connect-src` directive no longer needs
  `https://tweakcn.com` for the client (the client now calls the same-origin
  `/api/themes/name` route). That's a follow-up for plan 010, not this plan.