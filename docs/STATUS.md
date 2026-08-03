# d3lta Project Status

**Last Updated:** 2026-08-03
**Current Phase:** Implementation Complete + Major Theme Refactor + Web Shell Feature + Shortcuts Page
**Development Server:** Running on http://localhost:3000 (do not stop/restart)

## Core Features Completed

### 🛠 Tooling: ESLint + Prettier (auto-format via ESLint)
- Added `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier` (devDeps)
- `eslint.config.mjs` (flat config) registers `eslint-plugin-prettier` with `prettier/prettier: "error"`
- Config files: `.prettierrc.json` (semi, double quotes, `trailingComma: "all"`, 80 printWidth, 2-space) and `.prettierignore`
- Scripts: `pnpm run lint` (check), `pnpm run lint:fix` (eslint --fix → formats + fixes), `pnpm run format` (prettier --write .)
- Whole codebase reformatted with Prettier; `pnpm run lint` is clean (exit 0)

### ✅ Dashboard Layout
- Collapsible sidebar + top header + content area (responsive)
- Sidebar navigation with icons (Dashboard, Themes, Visuals, Analytics, Users, Settings, Reports, Reminders, Tasks, Weather, System, Agents, Shell)
- Header with search, theme toggle (light/dark/system), notifications, avatar
- Built with shadcn/ui components (Card, Button, Input, DropdownMenu, etc.)

### ✅ Cyberpunk Theme Refactor (2026-08-02)
- **Complete visual overhaul** to cyberpunk/HUD aesthetic inspired by reference files in `/home/deep/temp/cyberpunk_html`
- **Dark mode:** Full neon cyberpunk build — near-black backgrounds, glass panels, fuchsia/cyan/emerald/amber accent borders at 40% opacity, wide-tracked Orbitron display headings, mono data streams
- **Light mode:** Clean "day console" variant with same typography/border language
- **Display font:** Orbitron for wordmark + HUD section headers (via `font-display` utility)
- **Body/mono fonts:** Geist Sans / Geist Mono retained
- **Corner radius:** Sharpened from 1.4rem → 0.9rem for compact HUD feel
- **UI Primitives re-skinned:** Card (neon borders), Button (outlined fuchsia), Badge (neon outline pills), Input
- **Layout chrome:** Sidebar (neon badge logo, tracked D3LTA wordmark, per-module accent nav), Header (brand readout, search, status chip, theme toggle), MobileNav (matched)

### ✅ Web Shell / SSH Feature (2026-08-02)
- **Local browser terminal** into host via `/ssh` page
- **Architecture:** `node-pty` PTY ↔ `ws` WebSocket bridge on 127.0.0.1:4200, xterm.js frontend
- **Auth:** Per-session random token (or `D3LTA_SSH_TOKEN` env), Origin whitelist, loopback-only
- **Security:** Sanitizes `LD_PRELOAD`/`NODE_OPTIONS`/`DYLD_INSERT_LIBRARIES` from spawned shells (fixes VS Code Console Ninja crash: `napi_get_global` / exit 127)
- **Shell:** Default `/bin/bash -l` (override via `D3LTA_SSH_SHELL`/`D3LTA_SSH_CWD`)
- **UI:** Cyberpunk-themed panel, session ID display, reconnect button, slim neon scrollbar
- **Nav entry:** "Shell" (SquareTerminal icon) between System and Agents

### ✅ Theme System
- **State Management:** Zustand store (`useThemeStore`) with persistence (localStorage)
  - Stores: `currentTheme` ('light'|'dark'|'system'), `themeLibrary`, `activeThemeId`, `sidebarCollapsed`
  - `isDarkMode` is a **derived** flag kept in sync with `currentTheme` + OS preference
  - `getThemeVariables()` returns CSS vars for light/dark based on active theme and system preference
- **Theme Sources:** Import via URL (tweakcn theme page or direct JSON endpoint), Import via JSON file upload/drag-and-drop
- **Theme Application:** CSS variable injection (`--background`, `--primary`, `--secondary`, etc.) on `:root`
- **Persistence:** Theme library and settings survive page reloads via Zustand persist middleware

### ✅ Three.js Solar System Widget
- Central sun (emissive) + 5 orbiting planets with distinct colors/sizes/speeds
- Orbit rings for visual reference
- Ambient + point lighting for realistic shading
- Responsive container (ResizeObserver)
- Proper cleanup on unmount (cancel animation frame, dispose geometries/materials, remove canvas)
- Lazy-loaded via `next/dynamic` with `ssr:false` wrapper

### ✅ Drag-and-Drop Theme Import
- Uses `@dnd-kit/core` + `@dnd-kit/sortable`
- Drop zone accepts: Tweakcn theme URLs, Direct JSON URLs, `.json` file drops, File upload button
- Validation via `zod` against tweakcn JSON schema
- Immediate feedback (loading/success/error states)
- Automatic addition to theme library and optional auto-apply

### ✅ Error Handling & Logging
- Centralized `logger` class with severity levels (info, warn, error, critical)
- Buffered in-memory logs with periodic flush to `/api/logs` (for critical errors in prod)
- React `ErrorBoundary` component with fallback UI
- `withErrorHandling` async wrapper for promises with fallback values
- Server-side logging helper for API routes
- Database error helper for Drizzle operations

### ✅ Data Layer (Drizzle ORM + libsql)
- **SQLite database** (file: `./d3lta.db` in dev, configurable via `DATABASE_URL`)
- **Tables:** `themes`, `user_preferences`, `audit_logs`, `reminders`, `tasks`
- **API Endpoints:** Full CRUD for themes, preferences, logs, reminders, tasks
- **Migration system:** Drizzle migrations with async migration promise (`getDb()` awaits)

### ✅ Pages & Features
- **Dashboard** (`/`): HUD stat tiles, tracked headers, mono activity streams
- **Reminders** (`/reminders`): Full CRUD with datetime picker (react-datepicker: Year/Month/Day dropdowns, Sunday-start calendar, integrated time select, cyberpunk theme)
- **Tasks** (`/tasks`): Full CRUD with status (pending/in_progress/done)
- **Weather** (`/weather`): Open-Meteo fetch for Farmingdale NY, current + 5-day forecast
- **System** (`/system`): Live computer stats (CPU, memory, disk, process, host)
- **Agents** (`/agents`): Hermes profile list with session history
- **Shell** (`/ssh`): Local browser terminal (see Web Shell feature above)
- **Themes** (`/themes`): Library + dropzone
- **Visuals** (`/visuals`): Solar system widget
- **Analytics** (`/analytics`): Placeholder
- **Shortcuts** (`/shortcuts`): Analytics tools quick-access cards with drag-and-drop reordering, category badges, external link buttons (opens in new tab)
- **Users** (`/users`): Placeholder
- **Reports** (`/reports`): Placeholder
- **Settings** (`/settings`): Placeholder

### ✅ Drag-and-Drop Reordering (Tasks & Reminders) — 2026-08-03
- **New `sortOrder` column** added to `tasks` and `reminders` tables with migration
- **GET endpoints** order by `sortOrder ASC, createdAt DESC`
- **POST endpoints** insert new items at the top (`minSort - 1`)
- **New `/reorder` endpoints** accept `{ ids: number[] }` and persist the full order
- **Frontend:** `@dnd-kit/core` + `@dnd-kit/sortable` wired into both pages
  - Grip handle per row (drag only from handle, 5px threshold)
  - Optimistic UI reorder on drag end → persist via `/reorder` API
  - Keyboard-accessible (ARIA) per WCAG
  - Existing status/complete/delete controls remain fully interactive

### ✅ Security & Quality
- **CSP:** Strict headers in `next.config.ts` (connect-src loopback WS, self only)
- **Middleware:** Local/loopback pass; `D3LTA_API_TOKEN` enforces `x-d3lta-token` on non-loopback
- **Rate limiting:** `/api/logs` sliding window (60 writes/60s)
- **SSRF guard:** `/api/themes/name` redirect:manual + tweakcn.com whitelist
- **Reduced motion:** Respects `prefers-reduced-motion` (neutralizes animations)
- **Overflow:** `html,body { overflow-x: clip }` (Hallmark gate 34)
- **A11y:** Icon-only controls named, form fields labeled, responsive grids, focus-visible rings
- **Middleware deprecation:** Using `proxy` instead of deprecated `middleware` file

### ✅ Dev Experience
- **Linting:** ESLint 9 with `eslint-config-next` (core-web-vitals + typescript) — 0 errors
- **Build:** Next.js 16.2.12 (Turbopack) — successful production build
- **TypeScript:** Strict mode — no type errors in build
- **Testing:** Vitest + RTL + jsdom — 27 passing tests
- **HMR:** Fast refresh works with Zustand store
- **Styling:** Tailwind CSS v4 with `@theme` and CSS variables for dynamic theming
- **Components:** shadcn/ui (radix-nova base) with cyberpunk theme integration

## 🚧 Pending / Future Work
- User authentication (NextAuth.js + database)
- Real-time updates (WebSocket or SSE)
- Advanced charting (Recharts, ApexCharts) in analytics/dashboard
- Dashboard layout builder (drag-and-drop widget positioning)
- Theme editor (visual tweakcn property editor)
- Comprehensive test suite (Playwright e2e)
- PWA manifest and offline support
- i18n (next-i18next or similar)

## 📁 Project Structure (abridged)
```
/app
  /(routes) -> page.tsx, layout.tsx
  /api -> theme routes, logs, preferences, reminders, tasks, weather, system, agents, ssh/token
/components
  /layout -> sidebar, header, mobile-nav, error-boundary
  /theme -> toggle, dropzone, library
  /terminal -> ssh-terminal.tsx
  /threejs -> solar-system-lazy.tsx
  /system -> system-status.tsx
  /agents -> agents-list.tsx
  /ui -> shadcn primitives (re-skinned)
/context -> ThemeContext (provider-only, DOM application)
/store -> use-theme-store.ts (Zustand)
/lib -> error-handling, theme-service, db (schema, client, migrations), ssh (config, token, terminal-server, terminal-server.ts), rate-limit, system-stats, agents
/hooks -> use-polling.ts
/types -> theme.ts (zod & TS schemas)
/docs -> HANDOFF.md, STATUS.md, SUMMARY.md, REVIEW_2026-08-02.md
```

## 🔧 How to Run
```bash
# Development (do NOT stop the user's dev server on port 3000)
# The user already has `pnpm run dev` running on :3000
# To verify build:
pnpm run build        # production build
pnpm run lint         # ESLint check
pnpm run dev          # if you need to start a dev server (on another port)

# Web Shell environment overrides:
D3LTA_SSH_PORT=4200   # WS bridge port (default 4200)
D3LTA_SSH_HOST=127.0.0.1
D3LTA_SSH_SHELL=/bin/bash
D3LTA_SSH_TOKEN=...   # explicit session token (else auto-generated)
D3LTA_SSH_CWD=/path   # working directory for spawned shells
```

## 🎨 Theme Switching
The theme toggle in the header switches between:
- **Light:** uses light CSS variables from active theme (clean "day console")
- **Dark:** uses dark CSS variables from active theme (full cyberpunk neon)
- **System:** follows `prefers-color-scheme` media query

- **Quick theme switching:** The header dropdown also lists every saved theme in the library (under a "Themes" section below Light/Dark/System). Click any theme to apply it instantly — each row shows the theme **name**, a bg/primary color swatch, and a check mark on the active one.
Themes are added via the `/themes` page (tweakcn URL or JSON upload).

### Theme name + URL pattern (2026-08-02)
tweakcn exposes two URLs per theme sharing the same `:id`:
- `https://tweakcn.com/themes/<id>` → human page; theme NAME lives in its `<title>`
- `https://tweakcn.com/r/themes/<id>` → raw registry JSON with `cssVars.light`/`cssVars.dark` (unprefixed keys) and a **top-level `name`** field.

**Name resolution** (`lib/theme-service.ts`):
- *URL import*: resolves the id, fetches the JSON endpoint, uses the JSON's `name`. If no `name`, calls server-side `/api/themes/name?url=…` route.
- *JSON file upload*: if file has `name`, that wins. Else if filename is a tweakcn id, calls `/api/themes/name`; falls back to humanized filename.

## 🖥️ System Status Page (2026-08-02)
New **`/system`** page shows live computer stats. Implementation:
- `lib/system-stats.ts` — server-only stats gathering using Node built-ins (`node:os`, `node:fs`, `node:process`). Provides `getSystemStats()` returning hostname, platform, arch, system uptime, CPU (model, cores, load avg, **sampled usage %** over 250 ms), memory (total/free/used + %), disk (via `fs.statfsSync` on cwd mount), and Node process (pid, uptime, RSS, version).
- `app/api/system/route.ts` — `GET /api/system`, `runtime = "nodejs"`, `dynamic = "force-dynamic"`, guarded with `serverLog` + 500 on error.
- `components/system/system-status.tsx` — client component: fetches `/api/system` every **3 s** (auto-refresh toggle), manual Refresh, progress bars (green/amber/red by threshold), format helpers for bytes/uptime, loading + error states.
- `app/system/page.tsx` — server page wrapping `<SystemStatus />`.

## 🤖 Agents Page (2026-08-02)
New **`/agents`** page lists Hermes profiles on this system (each profile = independent agent identity):
- `lib/agents.ts` — server-only discovery using Node built-ins. Reads `~/.hermes/profiles/<name>/config.yaml` (model/provider/base_url via indentation-aware YAML reader) and per-profile `state.db` **read-only** to surface the **last session**. DB read via `node -e` child with `node:sqlite` built-in (bypasses Turbopack ESM bundler issue). All failures log descriptive, unique messages via `serverLog` with full context.
- `app/api/agents/route.ts` — `GET /api/agents`, `runtime="nodejs"`, `dynamic="force-dynamic"`.
- `components/agents/agents-list.tsx` — client component: Profiles card grid, auto-refresh every 5s (toggle), manual Refresh, status badges, Last Session block (title, relative time, source, message count).
- `app/agents/page.tsx` — server page wrapping `<AgentsList />`.

## 🐛 Bug Fix Log

### Dark theme toggle was a no-op (FIXED 2026-08-02)
**Root cause:** `useThemeStore` initialized `isDarkMode: false` and never updated it. `ThemeContext` gated `.dark` class on stale flag.
**Fix:** `setTheme`/`toggleTheme` now derive `isDarkMode` via `resolveIsDark()` from `currentTheme` + OS preference. Added `syncDarkMode()` + `_systemDark`. `ThemeContext` subscribes to store and toggles `html.dark` from `state.isDarkMode`. Theme service applies using store's live `isDarkMode`.

### Console Ninja crash in Web Shell (FIXED 2026-08-02)
**Symptom:** Spawned zsh died at startup with `undefined symbol: napi_get_global` / exit 127.
**Root cause:** VS Code "Console Ninja" extension injects `LD_PRELOAD` of its native `console-ninja-fs-hooks` module; the module only resolves symbols under Node, so a plain `zsh` fails at load.
**Fix:** `lib/ssh/terminal-server.ts::shellEnv()` strips `LD_PRELOAD`/`NODE_OPTIONS`/`DYLD_INSERT_LIBRARIES` from every spawned shell. Verified: preloaded → exact error; stripped → shell runs clean.

### Merge conflict markers in build (FIXED 2026-08-02)
**Symptom:** `pnpm build` failed with "Merge conflict marker encountered" in `components/ui/button.tsx`, `components/ui/badge.tsx`, `app/weather/page.tsx`.
**Root cause:** Concurrent theme-refinement sub-agent left git-style `<<<<<<< HEAD`/`=======`/`>>>>>>>` markers in code.
**Fix:** Resolved all 6 hunks to the refined side (light-mode-safe readable foreground, vertical stack on narrow), formatted with Prettier. Confirmed zero markers remain.

### `next build` while dev runs corrupts `.next` (DOCUMENTED 2026-08-02)
**Issue:** Running `next build` while `next dev` runs collides on Turbopack's `.next/lock` — build hangs, dev server may crash.
**Mitigation:** Added `distDir: process.env.D3LTA_BUILD_DIST || ".next"` in `next.config.ts`. Run isolated builds via `D3LTA_BUILD_DIST=.next-verify pnpm build`. After build, revert `tsconfig.json` includes and remove `.next-verify`.

## Verification Status
- **Lint:** 0 errors, 7 warnings (pre-existing in polling pages) — `pnpm run lint` exit 0
- **Build:** 22 routes compiled successfully (`pnpm run build` exit 0)
- **TypeScript:** 0 errors (`tsc --noEmit` exit 0)
- **Tests:** 27/27 pass (`pnpm run test`)
- **Dev Server:** Running on http://localhost:3000
- **All APIs:** Responding correctly (themes, preferences, logs, reminders, tasks, weather, system, agents, ssh/token)
- **UI Components:** All rendering correctly (sidebar, header, terminal, stats cards, etc.)