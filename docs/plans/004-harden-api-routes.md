# Plan 004: Harden API routes (validation, limits, redaction)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- app/api lib/agents.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

The API routes accept unvalidated, unbounded input and leak internal details:

1. **`/api/logs` is an unauthenticated DB-fill DoS vector.** Any client can
   POST unlimited log entries, growing the `audit_logs` table without bound.
   It also does `JSON.stringify(body.details)` (line 29) which **throws** on
   circular references, turning a client request into a 500.
2. **`/api/preferences` accepts arbitrary keys** with no allowlist, so any
   client can write any key/value pair into `user_preferences`.
3. **`/api/themes` POST does `Boolean(body.isActive)`** (line 45) — the string
   `"false"` coerces to `true`, so a client sending `isActive: "false"` sets it
   active. It also does no schema validation of `themeData`.
4. **`/api/themes/[id]` does `Number(id)`** (lines 21, 37) — a non-numeric id
   yields `NaN`, which Drizzle turns into a 500 instead of a clean 400.
5. **`/api/agents` leaks `baseUrl`, `configPath`, `sessionsDir`** from
   `lib/agents.ts` (lines 236–244). `baseUrl` may embed credentials
   (e.g. `https://user:key@host`), and the paths expose local filesystem
   layout.

The fix: add zod validation at the API boundary, validate ids, cap log size,
and redact sensitive agent fields. `zod` is already a dependency (moved to
`dependencies` in plan 002 — if 002 hasn't landed, it's still available in
devDependencies for dev; the route code will work either way).

## Current state

- `app/api/logs/route.ts`:
  ```ts
  const body = await req.json();
  if (!body.message) { return 400; }
  const severity = ["info","warn","error","critical"].includes(body.severity) ? body.severity : "info";
  await db.insert(auditLogs).values({
    severity,
    source: body.source ?? "unknown",
    message: String(body.message),
    details: body.details ? JSON.stringify(body.details) : null,  // line 29 — throws on circular
  });
  ```
- `app/api/preferences/route.ts` — POST accepts any `body.key`/`body.value`.
- `app/api/themes/route.ts` — POST: `isActive: Boolean(body.isActive)` (line 45);
  no validation of `themeData`.
- `app/api/themes/[id]/route.ts` — `Number(id)` in GET (line 21) and DELETE
  (line 37).
- `lib/agents.ts` — `ProfileAgent` includes `baseUrl`, `configPath`,
  `sessionsDir` (lines 236–244), returned verbatim by `/api/agents`.
- `lib/db/schema.ts` — `auditLogs` table: `severity`, `source`, `message`,
  `details` (JSON string), `createdAt`.

**Repo conventions to match**:
- API routes use `NextRequest`/`NextResponse` from `next/server`, `getDb()`
  from `@/lib/db/client`, and `dbError`/`serverLog` from `@/lib/error-handling`.
- Validation uses `zod` (already used in `lib/theme-service.ts`).
- The `SOURCE` constant pattern at the top of each route file.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |
| Test      | `pnpm test`              | all pass (if plan 001 landed) |

## Scope

**In scope** (the only files you should modify):
- `app/api/logs/route.ts`
- `app/api/preferences/route.ts`
- `app/api/themes/route.ts`
- `app/api/themes/[id]/route.ts`
- `lib/agents.ts` (redact `baseUrl`/`configPath`/`sessionsDir` from the payload)

**Out of scope** (do NOT touch):
- `app/api/system/route.ts` — read-only, no input to validate.
- `lib/db/schema.ts` — no schema change; the redaction happens at the API layer.
- `components/agents/agents-list.tsx` — it renders `baseUrl`/`configPath`/
  `sessionsDir`; see Step 5 for how to handle the client.
- Any auth implementation — this plan hardens input, it does not add
  authentication (that's a separate, larger decision).

## Git workflow

- Branch: `advisor/004-harden-api-routes`
- Commit message style: conventional commits, e.g.
  `security: validate API input, cap log size, redact agent fields`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Harden `/api/logs`

In `app/api/logs/route.ts`, add a zod schema at the top (after the `SOURCE`
const):

```ts
import { z } from "zod";

const logSchema = z.object({
  message: z.string().min(1).max(2000),
  severity: z.enum(["info", "warn", "error", "critical"]).default("info"),
  source: z.string().max(100).default("unknown"),
  details: z.record(z.string(), z.unknown()).max(50).optional(),
});
```

Then in POST, replace the manual checks with:

```ts
const parsed = logSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid log payload" }, { status: 400 });
}
const { message, severity, source, details } = parsed.data;

await db.insert(auditLogs).values({
  severity,
  source,
  message,
  details: details ? JSON.stringify(details) : null,
});
```

This fixes the circular-ref crash (zod rejects non-plain-object `details`
before `JSON.stringify` runs) and caps message/source/detail sizes.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 2: Harden `/api/preferences`

In `app/api/preferences/route.ts`, add an allowlist of known preference keys.
The store persists `currentTheme`, `themeLibrary`, `activeThemeId`,
`sidebarCollapsed` (see `store/use-theme-store.ts` partialize). Add:

```ts
import { z } from "zod";

const ALLOWED_KEYS = new Set([
  "currentTheme",
  "themeLibrary",
  "activeThemeId",
  "sidebarCollapsed",
]);

const prefSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});
```

In POST, after parsing, reject keys not in the allowlist:

```ts
const parsed = prefSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid preference payload" }, { status: 400 });
}
const { key, value } = parsed.data;
if (!ALLOWED_KEYS.has(key)) {
  return NextResponse.json({ error: "Unknown preference key" }, { status: 400 });
}
```

Then use `key`/`value` in the existing upsert logic (replacing `body.key`/
`body.value`). Keep the `JSON.stringify(value)` for storage.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 3: Harden `/api/themes` POST

In `app/api/themes/route.ts`, add a zod schema:

```ts
import { z } from "zod";

const themeSchema = z.object({
  name: z.string().min(1).max(200),
  sourceType: z.enum(["tweakcn_url", "json_file", "manual"]).default("manual"),
  sourceUrl: z.string().url().max(500).optional().nullable(),
  themeData: z.unknown(), // validated structurally by theme-service on import
  isActive: z.boolean().default(false),
});
```

In POST, replace the manual `if (!body.name || !body.themeData)` check and the
`Boolean(body.isActive)` coercion with:

```ts
const parsed = themeSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid theme payload" }, { status: 400 });
}
const { name, sourceType, sourceUrl, themeData, isActive } = parsed.data;

const result = await db.insert(themes).values({
  name,
  sourceType,
  sourceUrl: sourceUrl ?? null,
  themeData: JSON.stringify(themeData),
  isActive,
}).returning();
```

This fixes the `"false"` → `true` coercion (zod's `z.boolean()` rejects the
string `"false"` with a 400 instead of coercing it).

**Verify**: `npx tsc --noEmit` exits 0.

### Step 4: Validate the id in `/api/themes/[id]`

In `app/api/themes/[id]/route.ts`, add a helper that validates the id is a
positive integer before querying. Add near the top:

```ts
function parseThemeId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
```

In both GET and DELETE, replace `Number(id)` with:

```ts
const { id } = await params;
const themeId = parseThemeId(id);
if (themeId === null) {
  return NextResponse.json({ error: "Invalid theme id" }, { status: 400 });
}
```

Then use `themeId` in the `eq(themes.id, themeId)` calls.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 5: Redact sensitive agent fields

In `lib/agents.ts`, the `ProfileAgent` interface (lines 31–42) and the object
built in `getAgents()` (lines 236–244) include `baseUrl`, `configPath`,
`sessionsDir`. These are returned verbatim by `/api/agents`.

Redact at the API boundary so the internal interface stays intact for any
server-side use. In `app/api/agents/route.ts`, map the payload to strip
sensitive fields before returning:

```ts
const agents = await getAgents();
const sanitized = {
  timestamp: agents.timestamp,
  profiles: agents.profiles.map((p) => ({
    kind: p.kind,
    name: p.name,
    model: p.model,
    provider: p.provider,
    sessionCount: p.sessionCount,
    running: p.running,
    lastSession: p.lastSession,
  })),
};
return NextResponse.json(sanitized);
```

This removes `baseUrl`, `configPath`, `sessionsDir` from the response.

**Client impact**: `components/agents/agents-list.tsx` renders `agent.baseUrl`
(lines 84–89) and uses `configPath`/`sessionsDir` nowhere in the UI (they're
only in the type). After this change, `baseUrl` will be `undefined` and the
`{agent.baseUrl && (...)}` block (line 84) will simply not render — no crash.
The `ProfileAgent` interface in `agents-list.tsx` (lines 32–43) still declares
`baseUrl`/`configPath`/`sessionsDir` as optional-ish; leave the client type as
is (it's harmless) OR remove the now-unused fields from the client interface.
Prefer removing `baseUrl`, `configPath`, `sessionsDir` from the client
`ProfileAgent` interface and the `{agent.baseUrl && ...}` render block, since
they're no longer sent. This is a small, safe client cleanup.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 6: Verify the full build

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
```

**Verify**: all three exit 0.

### Step 7: Manual smoke tests (optional but recommended)

If a dev server is available:

```bash
# Invalid theme id → 400, not 500
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/themes/abc
# Expect 400

# Log with circular-ish / oversized details → 400
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/logs \
  -H 'Content-Type: application/json' \
  -d '{"message":"x","details":{"a":1,"b":2,"c":3,"d":4,"e":5,"f":6,"g":7,"h":8,"i":9,"j":10,"k":11,"l":12,"m":13,"n":14,"o":15,"p":16,"q":17,"r":18,"s":19,"t":20,"u":21,"v":22,"w":23,"x":24,"y":25,"z":26,"aa":27,"ab":28,"ac":29,"ad":30,"ae":31,"af":32,"ag":33,"ah":34,"ai":35,"aj":36,"ak":37,"al":38,"am":39,"an":40,"ao":41,"ap":42,"aq":43,"ar":44,"as":45,"at":46,"au":47,"av":48,"aw":49,"ax":50,"ay":51}}'
# Expect 400 (details has >50 keys)

# Agents response has no baseUrl/configPath/sessionsDir
curl -s http://localhost:3000/api/agents | jq '.profiles[0] | has("baseUrl")'
# Expect false
```

**Verify**: the HTTP codes and jq output match the expectations above.

## Test plan

- No new unit tests required for this plan (the routes are thin wrappers over
  the DB; testing them well needs an integration harness that's out of scope).
  If plan 001 has landed, ensure `pnpm test` still passes.
- The verification is the build + typecheck + lint passing, plus the manual
  smoke tests confirming the new 400s and the redacted response.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "Boolean(body.isActive)" app/api/themes/route.ts` returns no matches
- [ ] `grep -n "Number(id)" app/api/themes/[id]/route.ts` returns no matches
- [ ] `grep -n "safeParse" app/api/logs/route.ts app/api/preferences/route.ts app/api/themes/route.ts` matches in all three
- [ ] `grep -n "baseUrl" app/api/agents/route.ts` returns no matches (redacted)
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 004 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- You find a client component other than `agents-list.tsx` that reads
  `baseUrl`/`configPath`/`sessionsDir` from the agents response — stop and
  report it rather than breaking it.
- `zod` is not resolvable from the route files (e.g. plan 002 hasn't landed and
  the build prunes devDependencies) — stop and report rather than vendoring.

## Maintenance notes

- The `ALLOWED_KEYS` allowlist in `/api/preferences` must be updated whenever a
  new persisted preference key is added to the store. Add a comment in
  `store/use-theme-store.ts`'s `partialize` pointing at this allowlist.
- The log `details` cap (50 keys) and message cap (2000 chars) are arbitrary;
  tune them if real logs legitimately exceed them.
- Redaction happens at the API layer, so `lib/agents.ts` still returns the full
  `ProfileAgent` internally. If a future server-side consumer needs those
  fields, they're still available — only the HTTP response is sanitized.
- This plan does NOT add authentication. If the dashboard is ever exposed
  beyond localhost, auth is a prerequisite — the input hardening here is
  necessary but not sufficient.