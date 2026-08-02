# d3lta Project Status

**Last Updated:** 2026-08-02
**Current Phase:** Implementation Complete
**Development Server:** Running on http://localhost:3000 (do not stop/restart)
**Core Features Completed:**

## 🛠 Tooling: ESLint + Prettier (auto-format via ESLint)
- Added `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier` (devDeps).
- `eslint.config.mjs` (flat config) now registers `eslint-plugin-prettier` with
  the `prettier/prettier: "error"` rule and appends `eslint-config-prettier`
  **last** (so conflicting next/TS rules are disabled). Result: `eslint --fix`
  formats code automatically — Prettier runs *through* ESLint, no separate
  prettier plugin/extension required.
- Config files: `.prettierrc.json` (semi, double quotes, `trailingComma: "all"`,
  80 printWidth, 2-space) and `.prettierignore` (node_modules, .next, out, build,
  lockfiles, graphify-out, .env*, *.md).
- Scripts: `pnpm run lint` (check), `pnpm run lint:fix` (`eslint --fix` →
  formats + fixes), `pnpm run format` (`prettier --write .`).
- Whole codebase reformatted with Prettier; `pnpm run lint` is clean (exit 0).

## ✅ Dashboard Layout
- Collapsible sidebar + top header + content area (responsive)
- Sidebar navigation with icons (Dashboard, Themes, Visuals, Analytics, Users, Settings, Reports)
- Header with search, theme toggle (light/dark/system), notifications, avatar
- Built with shadcn/ui components (Card, Button, Input, DropdownMenu, etc.)

## ✅ Theme System
- **State Management:** Zustand store (`useThemeStore`) with persistence (localStorage)
  - Stores: `currentTheme` ('light'|'dark'|'system'), `themeLibrary`, `activeThemeId`, `sidebarCollapsed`
  - `isDarkMode` is now a **derived** flag kept in sync with `currentTheme` + OS preference (see fix below)
  - `getThemeVariables()` returns CSS vars for light/dark based on active theme and system preference
- **Theme Sources:**
  - Import via URL (tweakcn theme page or direct JSON endpoint)
  - Import via JSON file upload/drag-and-drop
  - Manual theme creation (future)
- **Theme Application:**
  - CSS variable injection (`--background`, `--primary`, `--secondary`, etc.) on `:root`
  - Immediate UI update without page reload
  - Theme preview in library
- **Persistence:** Theme library and settings survive page reloads via Zustand persist middleware

## ✅ Three.js Solar System Widget
- Central sun (emissive) + 5 orbiting planets with distinct colors/sizes/speeds
- Orbit rings for visual reference
- Ambient + point lighting for realistic shading
- Responsive container (ResizeObserver)
- Proper cleanup on unmount (cancel animation frame, dispose geometries/materials, remove canvas)
- Particle-like aesthetic (small spheres)

## ✅ Drag-and-Drop Theme Import
- Uses `@dnd-kit/core` + `@dnd-kit/sortable`
- Drop zone accepts:
  - Tweakcn theme URLs (e.g., `https://tweakcn.com/themes/abc123`)
  - Direct JSON URLs
  - `.json` file drops
  - File upload button
- Validation via `zod` against tweakcn JSON schema
- Immediate feedback (loading/success/error states)
- Automatic addition to theme library and optional auto-apply

## ✅ Error Handling & Logging
- Centralized `logger` class with severity levels (info, warn, error, critical)
- Buffered in-memory logs with periodic flush to `/api/logs` (for critical errors in prod)
- React `ErrorBoundary` component with fallback UI
- `withErrorHandling` async wrapper for promises with fallback values
- Server-side logging helper for API routes
- Database error helper for Drizzle operations

## ✅ Data Layer (Drizzle ORM + libsql)
- **SQLite database** (file: `./d3lta.db` in dev, configurable via `DATABASE_URL`)
- **Tables:**
  - `themes`: stores imported themes (name, source, JSON data, active flag)
  - `user_preferences`: key-value store for user settings (theme mode, sidebar state, etc.)
  - `audit_logs`: structured log storage (severity, source, message, details, timestamp)
- **API Endpoints:**
  - `GET /api/themes` - list themes
  - `POST /api/themes` - save new theme
  - `GET /api/themes/[id]` - get single theme
  - `DELETE /api/themes/[id]` - delete theme
  - `POST /api/logs` - receive client-side error logs
  - `GET /api/preferences` - get all preferences
  - `POST /api/preferences` - upsert a preference (key/value)

## ✅ Dev Experience
- **Linting:** ESLint 9 with `eslint-config-next` (core-web-vitals + typescript) - 0 errors
- **Build:** Next.js 16.2.12 (Turbopack) - successful production build
- **TypeScript:** Strict mode - no type errors in build
- **HMR:** Fast refresh works with Zustand store (persisted state preserved)
- **Styling:** Tailwind CSS v4 with `@theme` and CSS variables for dynamic theming
- **Components:** shadcn/ui (radix-nova base) with custom theme integration

## 🚧 Pending / Future Work
- User authentication (NextAuth.js + database)
- Real-time updates (WebSocket or SSE)
- Advanced charting (Recharts, ApexCharts) in analytics/dashboard
- Dashboard layout builder (drag-and-drop widget positioning)
- Theme editor (visual tweakcn property editor)
- Comprehensive test suite (Vitest + React Testing Library + Playwright)
- PWA manifest and offline support
- i18n (next-i18next or similar)

## 📁 Project Structure (abridged)
```
/app
  /(routes) -> page.tsx, layout.tsx
  /api -> theme routes, logs, preferences
/components
  /layout -> sidebar, header, error-boundary
  /theme -> toggle, dropzone, library
  /threejs -> solar-system
/context -> ThemeContext (optional wrapper)
/store -> use-theme-store.ts (Zustand)
/lib -> error-handling, theme-service, db (schema, client)
/types -> theme.ts (zod & TS schemas)
/docs -> HANDOFF.md, STATUS.md
```

## 🔧 How to Run
```bash
# Development (do NOT stop the user's dev server on port 3000)
# The user already has `pnpm run dev` running on :3000
# To verify build:
pnpm run build        # production build
pnpm run lint         # ESLint check
pnpm run dev          # if you need to start a dev server (on another port)
```

## 🎨 Theme Switching
The theme toggle in the header switches between:
- **Light:** uses light CSS variables from active theme
- **Dark:** uses dark CSS variables from active theme
- **System:** follows `prefers-color-scheme` media query

- **Quick theme switching:** The header dropdown also lists every saved theme in the
library (under a "Themes" section below Light/Dark/System). Click any theme to apply it
instantly — each row shows the theme **name** (extracted from the tweakcn page `<title>`),
a bg/primary color swatch, and a check mark on the active one.
Themes are added via the `/themes` page (tweakcn URL or JSON upload).

### Theme name + URL pattern (2026-08-02)
tweakcn exposes two URLs per theme sharing the same `:id`:
- `https://tweakcn.com/themes/<id>` → human page; theme NAME lives in its `<title>` (e.g. "designbyte - tweakcn").
- `https://tweakcn.com/r/themes/<id>` → raw registry JSON with `cssVars.light`/`cssVars.dark` (unprefixed keys) and a **top-level `name`** field.

**Name resolution** (`lib/theme-service.ts`):
- *URL import*: resolves the id, fetches the JSON endpoint, and uses the JSON's `name`. If the JSON has no `name`, it calls the server-side `/api/themes/name?url=…` route, which fetches the tweakcn **page** `<title>` server-side (the browser can't fetch tweakcn cross-origin due to CORS, so name resolution runs on the server — see plan 012). The page `<title>` is only fetched server-side now, never from the browser.
- *JSON file upload*: if the file content has `name`, that wins. Else if the filename is a tweakcn id (e.g. `cmcup07dt…json`), it calls `/api/themes/name` server-side; if that also yields nothing, it falls back to a humanized filename. Real tweakcn downloads always include `name` in the JSON, so uploads show the proper name.

`ThemeSchema.name` is shown in the dropdown + library. Verified: uploading a real tweakcn JSON shows **"designbyte"**; importing the page URL `/themes/cmcup07dt000104l4hj4eferh` also yields **"designbyte"** and applies 53 `--` vars.

Changing the theme updates CSS custom properties on the `<html>` element, which immediately propagates to all Tailwind classes using `bg-background`, `text-foreground`, etc.

## 🖥️ System Status Page (2026-08-02)
New **`/system`** page (nav item between Reports and Settings) shows live computer
stats. Implementation:

- `lib/system-stats.ts` — server-only stats gathering using Node built-ins
  (`node:os`, `node:fs`, `node:process`). No external dependencies. Provides
  `getSystemStats()` returning hostname, platform, arch, system uptime, CPU
  (model, cores, load avg, **sampled usage %** over 250 ms), memory (total/free/
  used + %), disk (via `fs.statfsSync` on the cwd mount, total/free/used + %),
  and the Node process (pid, uptime, RSS, version).
- `app/api/system/route.ts` — `GET /api/system`, `runtime = "nodejs"`,
  `dynamic = "force-dynamic"` (never cached), guarded with `serverLog` + 500 on error.
- `components/system/system-status.tsx` — client component: fetches `/api/system`
  every **3 s** (auto-refresh toggle), manual Refresh, progress bars
  (green/amber/red by threshold), format helpers for bytes/uptime, loading + error states.
- `app/system/page.tsx` — server page wrapping `<SystemStatus />`.

Verified at runtime: API returns real values (e.g. i7-7700K, 8 cores, mem 94%,
disk 92%, Node v24.18.0) and the `/system` page renders all cards live.

Lint note: initial fetch is deferred via `queueMicrotask` to avoid the
`react-hooks/set-state-in-effect` error.

## 🤖 Agents Page (2026-08-02)
New **`/agents`** page (nav item between System and Settings) lists the Hermes
agents on this system. Per the Hermes docs, an "agent on the system" = a
**configured profile** (each profile is an independent agent identity with its
own model/provider/config). The Running Processes subsection was removed at the
user's request — the page now shows profiles only.

- `lib/agents.ts` — server-only discovery using Node built-ins (`node:fs`,
  `node:os`, `node:path`, `node:child_process`) + `serverLog` from
  `lib/error-handling`. `getAgents()` returns `profiles` only. For each profile
  it reads `~/.hermes/profiles/<name>/config.yaml` (model/provider/base_url via
  a small indentation-aware YAML reader, quoted-empty normalized to null) and the
  per-profile `state.db` **read-only** to surface the **last session** (most
  recent `sessions` row: id, title, source, started_at, message_count). The DB is
  read by spawning a short-lived `node -e` child that uses the `node:sqlite`
  built-in (the Next/Turbopack ESM bundle cannot resolve `node:sqlite` directly,
  so the child-process approach sidesteps the bundler). The DB path is passed via
  env var (no shell-injection surface), opened with `{ readOnly: true }`. All
  failure paths now log a **descriptive, unique** message via `serverLog`
  (e.g. `failed to read last session for profile db`, `could not read config for
  profile`, `failed to list profiles directory`) with `profile`/`dbPath`/`configPath`
  context so each error is traceable — no silent `catch {}`.
  `running` is true when `pgrep -f 'hermes_cli.main (serve|gateway)'` finds a
  live backend (exit code 1 = "none found" is not logged as an error).
- `app/api/agents/route.ts` — `GET /api/agents`, `runtime="nodejs"`,
  `dynamic="force-dynamic"`, `serverLog` + 500 on error.
- `components/agents/agents-list.tsx` — client component: a Profiles card grid,
  auto-refresh every 5 s (toggle), manual Refresh, status badges, loading +
  error states. Each profile card now shows a **Last Session** block (title,
  relative time via `formatRelativeTime`, source, message count) or "No sessions
  yet".
- `app/agents/page.tsx` — server page wrapping `<AgentsList />`.
- Sidebar: "Agents" entry (Bot icon) after System, before Settings.

Verified at runtime: API returns only `timestamp` + `profiles` (7 profiles with
correct model/provider/session counts); the page renders the 7 profile cards
and no process section.

Note: a one-off `next build` verification run was killed because it starved the
always-on dev server under high system load (92% disk). The dev server is the
source of truth and is back to HTTP 200; `pnpm run lint` passed exit 0.

## 🐛 Bug Fix Log

### Dark theme toggle was a no-op (FIXED 2026-08-02)
**Symptom:** Clicking the theme toggle (Light/Dark/System) did nothing — the UI stayed light.

**Root cause:** `useThemeStore` initialized `isDarkMode: false` and never updated it in
`setTheme`/`toggleTheme` (only `currentTheme` changed). `ThemeContext` gated the `.dark` class
on that stale `isDarkMode`, so the class was never added. With no imported theme active,
`getThemeVariables()` also returned `{}`, so nothing visually changed. Secondary issue:
`theme-service.ts` and `theme-library.tsx` applied themes with a hardcoded `false` (always light).

**Fix:**
- `use-theme-store.ts`: `setTheme`/`toggleTheme` now derive `isDarkMode` via `resolveIsDark()`
  from `currentTheme` + OS `prefers-color-scheme` (`system` mode). Added `syncDarkMode()` +
  `_systemDark` (unpersisted) to react to OS changes.
- `ThemeContext.tsx`: subscribe to the store and toggle `html.dark` from `state.isDarkMode`;
  listen for OS `prefers-color-scheme` changes when in `system` mode.
- `theme-service.ts` + `theme-library.tsx`: apply imported/activated themes using the store's
  live `isDarkMode` instead of a hardcoded `false`.

**Verification:** Browser test on `:3000` confirmed `<html>` gains the `dark` class on Dark and
loses it on Light. `pnpm run lint` clean, `pnpm run build` passes.

---

## 🧹 `improve` Plan Execution Log (2026-08-02)

The `improve` skill generated 13 prioritized plans (`plans/*.md`, indexed in
`plans/README.md`). Execution started from the top. Each plan was verified with
`pnpm run lint`, `npx tsc --noEmit`, `pnpm test`, and `pnpm run build` (all green)
plus runtime smoke checks against the dev server on `:3000`.

### 001 — Test baseline (DONE)
- Installed Vitest + RTL + jsdom (`vitest`, `@vitejs/plugin-react`, `@testing-library/*`, `jsdom`).
- Added `vitest.config.ts` (jsdom env, `@`→root alias) + `vitest.setup.ts`
  (localStorage polyfill so `persist` works under test).
- `package.json` scripts: `test` (`vitest run`), `test:watch` (`vitest`).
- `eslint.config.mjs` ignores `**/*.test.{ts,tsx}` + the vitest configs.
- 3 characterization tests (21 cases): `theme-service` URL extraction +
  `validateThemeJson`, `use-theme-store` actions, `error-handling` logger
  buffer cap + severity. **All passing.** `Logger` class exported for typing.

### 002 — Packaging & repo hygiene (DONE, with one correction)
- Moved `zod` → `dependencies` (used at runtime by `theme-service.ts`).
- Removed genuinely-unused deps: `axios`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- **Correction to the plan's finding:** `shadcn` must remain a **runtime
  dependency**, not dev — `app/globals.css` does `@import "shadcn/tailwind.css"`
  at build time. Removing it broke the dev server (HTTP 500); re-added and
  documented the correction in `plans/README.md`.
- `.gitignore`: added `*.db`, `*.db-journal`, `graphify-out/`. Untracked the
  cached `d3lta.db` + `graphify-out/` artifacts (`git rm --cached`, kept on disk).

### 003 — Non-blocking /api/agents (DONE)
- `getAgents()` and `getLastSession()` are now `async`. Per-profile config reads
  and session-DB reads run **concurrently** via `Promise.allSettled` (one slow
  `state.db` can't block the others). `pgrep` backend probe kept sync (cheap
  best-effort). Route `await`s `getAgents()`.
- `getLastSession` uses `execFile` (callback) instead of `execFileSync`.

### 004 — Harden API routes (DONE)
- `zod` validation at the boundary for `/api/logs` (message 1–2000, severity
  enum, details ≤50 keys via `.refine`), `/api/preferences` (key allowlist:
  `currentTheme`/`themeLibrary`/`activeThemeId`/`sidebarCollapsed`),
  `/api/themes` (name, `sourceType` enum, `isActive` boolean — no more
  `Boolean("false")→true` coercion).
- `/api/themes/[id]`: positive-integer id parser → 400 (not 500) on `abc`.
- `/api/agents`: redacts `baseUrl`/`configPath`/`sessionsDir` from the response
  (no credential/path leakage). Client `ProfileAgent` interface + render block
  cleaned up.
- Smoke tests: bad id → 400, oversized log → 400, unknown pref key → 400, no
  internal fields leaked.

### 005 — Unify theme application & clear vars on removal (DONE)
- `ThemeContext` is now the **single** DOM-application point. Added an
  `injectedVars` set so removing/switching a theme **clears** the previously
  injected `--vars` (previously they lingered on `:root`, leaving the UI themed
  after deletion).
- Removed the duplicate `applyThemeVars()` calls from `theme-library.tsx`,
  `theme-toggle.tsx`, and the two `importThemeFrom*` functions in
  `lib/theme-service.ts`. Deleted `applyThemeVars` + `isApplyingDark` and the
  orphan `ThemeApplyResult` interface in `types/theme.ts`.

### 006 — Fix CSS/font bugs + dynamic-load Three.js (DONE)
- Fixed self-referential `--tracking-normal: var(--tracking-normal)` in
  `globals.css` (resolved to `0em`).
- Unified fonts across `:root`, `.dark`, and `@theme inline` → all point at the
  Geist `next/font` CSS vars. `html` uses `font-sans` so light/dark agree.
- Three.js (`solar-system.tsx`) is now **lazy-loaded** via a thin `"use client"`
  wrapper (`components/threejs/solar-system-lazy.tsx`) hosting `next/dynamic`
  with `ssr:false`. The server page imports the wrapper — Next 16 forbids
  `ssr:false` + `next/dynamic` in a Server Component, so the wrapper keeps the
  WebGL canvas browser-only while the page stays a Server Component.

### 007 — Remove redundant ThemeContext state layer (DONE)
- Deleted the `useTheme`/`withTheme` context API (`context/ThemeContext.tsx`).
- `ThemeProvider` is now a **provider-only** component: it runs the single
  DOM-application `useEffect` (was already the real bridge to `useThemeStore`)
  and renders children. All state lives in the Zustand `useThemeStore`.
- Added `context/ThemeContext.test.tsx` (mounts with/without children).
- No other file imported `useTheme`/`withTheme` (verified by grep) — no
  callers broke.

### 008 — Fix dnd-kit dropzone highlight (DONE)
- Removed the dead `useDroppable({ id: "theme-dropzone" })` (the native
  `onDragOver`/`onDrop` already handle drops, so `isOver` never triggered).
- Highlight is now driven by native `dragenter`/`dragover`/`dragleave`/`drop`
  handlers toggling a local `dragOver` state → `.border-primary` ring.

### 009 — Extract shared polling hook (DONE)
- New `hooks/use-polling.ts`: encapsulates data/loading/error state, auto-refresh
  interval with toggle, manual refresh, and the `queueMicrotask` initial-fetch
  workaround (centralized so future components don't re-learn the lint rule).
- `components/system/system-status.tsx` (`/api/system`, 3s) and
  `components/agents/agents-list.tsx` (`/api/agents`, 5s) now use it — removed
  ~25 lines of duplicated polling logic from each.
- Added `hooks/use-polling.test.ts` (4 cases: idle state, fetch+store, error,
  auto-refresh toggle via fake timers). Test total: **26 → 27** passing.

### 010 — Add security headers / CSP (DONE)
- `next.config.ts` now exports a `headers()` function applying to `/(.*)`:
  `Content-Security-Policy` (self + inline styles/scripts + fonts.gstatic),
  `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (camera/mic/geo disabled), `X-DNS-Prefetch-Control`.
- Verified live on the dev server: all headers present, `/` + `/visuals` + `/api/system` → 200.
- **Follow-up (2026-08-02)**: `connect-src` no longer lists `https://tweakcn.com`
  (plan 012 moved theme-name resolution to the same-origin `/api/themes/name`
  route, so the client never calls tweakcn directly). `connect-src` is now `'self'`.

### 011 — Fix error-handling system (flush + dead code) (DONE)
- **Removed dead `withErrorHandling`** (genuinely unused; only its definition
  matched grep). **Kept `dbError`** — the plan's drift check assumed it was dead,
  but it IS used by 4 routes (`/api/logs`, `/api/preferences`, `/api/themes`,
  `/api/themes/[id]`); removing it would have broken those (STOP condition caught).
- Added `startFlushTimer` + `flushBuffer` to `Logger`: in production the buffer
  flushes to `/api/logs` every 10s (POST per entry, matching plan 004's
  single-entry route — option b, since the route was already hardened). Failed
  flushes re-queue (capped). `critical()` still flushes immediately.
- Added a `flushBuffer` test (27 total tests).

### 012 — Move theme-name resolution server-side (DONE)
- New `app/api/themes/name/route.ts`: server-side fetch of a tweakcn page
  `<title>` to resolve a friendly name. **SSRF-guarded** to `https://tweakcn.com/`
  only (returns 400 otherwise). `runtime="nodejs"`, `dynamic="force-dynamic"`.
- `fetchThemeName(id)` in `lib/theme-service.ts` now calls the same-origin route
  instead of fetching tweakcn cross-origin (was CORS-blocked in the browser, so
  it always returned `null`). Live smoke test: real id → `{"name":"designbyte"}`;
  `example.com` → 400.

### 013 — Generate DB migrations (DONE)
- `drizzle-kit generate` (using the **locally-pinned** `drizzle-kit@0.31.10`, not
  `pnpm dlx` which pulled an incompatible latest and warned) created
  `lib/db/migrations/0000_steep_pestilence.sql` (CREATE TABLE for `themes`,
  `user_preferences`, `audit_logs`) + `meta/`.
- `package.json`: added `db:generate` + `db:migrate` scripts.
- `lib/db/client.ts`: fire-and-forget `migrate()` on `createDb()` so a fresh
  checkout gets deterministic tables; wrapped in try/catch so the existing
  `d3lta.db` (auto-created tables) doesn't error at startup. **Did not run
  migrate against the real `d3lta.db`** (STOP condition: don't break the
  existing DB) — verified apply on a throwaway temp DB (exit 0).

### 014 — Plan follow-ups (2026-08-02)
Small cleanups the plans themselves flagged as follow-ups, done after the 13
plans landed:

- **Async `getDb()`** (plan 011 follow-up): the fire-and-forget migration in
  plan 013 had a startup race (a query could run before the migration
  finished). `getDb()` is now `async` and all 4 API routes
  (`/api/logs`, `/api/preferences`, `/api/themes`, `/api/themes/[id]`) `await`
  it, so the migration completes before the first query. The `client.ts`
  comment was updated to reflect this.
- **CSP tightened** (plan 010 → 012): `connect-src` dropped
  `https://tweakcn.com` since theme-name resolution now hits the same-origin
  `/api/themes/name` route (plan 012). `connect-src` is `'self'`.

---

**All 13 plans complete + follow-ups.** Final verification: `pnpm run lint`
exit 0, `npx tsc --noEmit` exit 0, `pnpm test` **27 passing**, `pnpm run build`
exit 0, dev server on `:3000` serving `/`, `/agents`, `/system`, `/visuals`,
`/themes`, `/api/*` at 200.

---

*This document is auto-generated. For implementation details, see the codebase and ARCHITECTURE.md.*