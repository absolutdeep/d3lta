# d3lta — Handoff Document

**Created:** 2026-08-02
**Project root:** `/home/deep/dev_site/d3lta`
**Purpose of next session:** Continue building the d3lta dashboard (cyberpunk theme, web shell, dashboard features) and verify.

---

## 1. Project Summary

d3lta is a dashboard website built with:

- **Next.js 16.2.12** (App Router, Turbopack, TypeScript strict)
- **Tailwind CSS v4** (via `@tailwindcss/postcss`, CSS-first config in `app/globals.css`)
- **shadcn/ui** (radix-nova style, `components.json` present, button component already generated)
- **Zustand v5** (state management, with `persist` middleware)
- **zod** (schema validation — for theme JSON validation)
- **@dnd-kit/core** (drag & drop)
- **three.js + @types/three** (3D solar system widget)
- **drizzle-orm + libsql** (SQLite database layer)
- **node-pty + ws** (Web Shell PTY ↔ WebSocket bridge)
- **xterm.js** (terminal frontend for web shell)

**Key external references:**
- Tweakcn theme being used as reference: `https://tweakcn.com/themes/cmmjjm0lw000004jm1a6b39hw`
- Tweakcn theme JSON endpoint: `https://tweakcn.com/r/themes/cmmjjm0lw000004jm1a6b39hw`
- Cyberpunk reference pack: `/home/deep/temp/cyberpunk_html` (11 HTML files)
- Dev server: user has one running on port 3000 — do NOT start/stop it. Make changes and query `http://localhost:3000`.

---

## 2. Decisions Locked In (from user)

1. **Layout:** Classic dashboard — collapsible sidebar + top header + content area, expandable later with dummy data and suggested dashboard components.
2. **DnD kit:** Both immediate-apply AND library-save. Drop zone accepts tweakcn theme URLs and JSON URLs; upload accepts **JSON files only**, validated against the tweakcn schema (zod).
3. **Three.js:** Solar system particle layout — a center planet surrounded by 5 orbiting smaller planets.
4. **Database:** Store everything — user preferences, themes library, dashboard data, audit logs (schema drafted).
5. **State:** Zustand for state memory (theme mode, theme library, active theme, sidebar state).
6. **Error handling:** Rigorous, multi-layer (logger with severity levels, React Error Boundary, `withErrorHandling` wrapper, server log helper, DB error helper).
7. **Workflow rules:** Task lists, small sub-agent batches, updates ≤3 sentences every ≤2 min, ask questions with options when unsure.
8. **Write ONLY into `/home/deep/dev_site/d3lta`.**

---

## 3. Current State of the Codebase

**Verified working (as of this handoff):**

- `pnpm run lint` → **passes** (0 errors; 7 pre-existing warnings in polling pages)
- `pnpm run build` → **passes** (compiles + TypeScript + static generation, all 22 routes)
- `pnpm run test` → **27/27 pass** (Vitest + RTL)
- `tsc --noEmit` → **exit 0**
- `package.json` has `"type": "module"` and all deps
- **Dev server running on :3000** — do NOT stop/restart it

### Major Features Implemented (2026-08-02)

**Cyberpunk Theme Refactor:**
- Dark mode = full neon cyberpunk build (near-black, glass panels, fuchsia/cyan/emerald/amber accents at 40% opacity, wide-tracked Orbitron headings, mono data streams)
- Light mode = clean "day console" variant with same typography/border language
- Display font: Orbitron (`font-display` utility) for wordmark + HUD headers
- Body/mono: Geist Sans / Geist Mono
- Corner radius: 0.9rem (sharpened from 1.4rem)
- UI primitives re-skinned: Card (neon borders), Button (outlined fuchsia), Badge (neon outline), Input
- Layout chrome: Sidebar (neon badge, tracked D3LTA wordmark, per-module accent nav), Header (brand readout, search, status chip, theme toggle), MobileNav matched

**Web Shell / SSH Feature (`/ssh` page):**
- Local browser terminal into host via node-pty PTY ↔ ws WebSocket bridge on 127.0.0.1:4200
- xterm.js frontend with cyberpunk theme, session ID display, reconnect button
- Token auth (per-session random or `D3LTA_SSH_TOKEN`), Origin whitelist, loopback-only
- Sanitizes `LD_PRELOAD`/`NODE_OPTIONS`/`DYLD_INSERT_LIBRARIES` from spawned shells (fixes VS Code Console Ninja `napi_get_global` crash)
- Default shell: `/bin/bash -l` (override via `D3LTA_SSH_SHELL`/`D3LTA_SSH_CWD`)
- Nav entry: "Shell" (SquareTerminal icon) between System and Agents

**New Pages (all verified at runtime):**
- `/ssh` — Web Shell terminal
- `/system` — Live computer stats (CPU, memory, disk, process, host)
- `/agents` — Hermes profile list with session history
- `/reminders` — Full CRUD with datetime picker
- `/tasks` — Full CRUD with status workflow
- `/weather` — Open-Meteo current + 5-day forecast (Farmingdale NY)

**Bug Fixes:**
- Dark theme toggle no-op → fixed (isDarkMode derivation)
- Web shell Console Ninja crash → fixed (shellEnv strips LD_PRELOAD/NODE_OPTIONS)
- Merge conflict markers in build → fixed (resolved all 6 hunks)
- next build collision with dev server → documented mitigation (`D3LTA_BUILD_DIST`)

---

### Files already created / modified (key ones)

| Path | Status | Notes |
|---|---|---|
| `types/theme.ts` | ✅ done | `ThemeCssVars`, `ThemeSchema`, `TweakcnThemeResponse` |
| `store/use-theme-store.ts` | ✅ done | Zustand store: theme mode, themeLibrary, activeThemeId, sidebarCollapsed, persist |
| `context/ThemeContext.tsx` | ✅ done | `ThemeProvider` (provider-only, DOM application) |
| `lib/utils.ts` | ✅ existing | shadcn `cn()` helper |
| `app/globals.css` | ✅ done | Cyberpunk theme, reduced-motion, overflow-x: clip |
| `next.config.ts` | ✅ done | CSP, serverExternalPackages, distDir knob, security headers |
| `middleware.ts` | ✅ done | Local/loopback pass, D3LTA_API_TOKEN enforcement |
| `components/layout/sidebar.tsx` | ✅ done | Neon badge, Orbitron wordmark, accent nav rails |
| `components/layout/header.tsx` | ✅ done | Search, status chip, theme toggle, fuchsia avatar |
| `components/layout/mobile-nav.tsx` | ✅ done | Radix Sheet drawer matching sidebar |
| `components/terminal/ssh-terminal.tsx` | ✅ done | xterm.js + FitAddon, cyberpunk theme, session ID |
| `components/system/system-status.tsx` | ✅ done | Live stats cards, 3s polling, progress bars |
| `components/agents/agents-list.tsx` | ✅ done | Profile cards, session history, 5s polling |
| `components/reminders/datetime-picker.tsx` | ✅ done | react-datepicker picker (Y/M/D dropdowns, time select, cyberpunk theme) |
| `components/reminders/datetime-picker.css` | ✅ done | Time picker dark theme overrides |
| `app/ssh/page.tsx` | ✅ done | Shell page with terminal |
| `app/system/page.tsx` | ✅ done | System stats page |
| `app/agents/page.tsx` | ✅ done | Agents list page |
| `app/reminders/page.tsx` | ✅ done | CRUD page + drag-reorder |
| `app/tasks/page.tsx` | ✅ done | CRUD page + drag-reorder |
| `app/weather/page.tsx` | ✅ done | Weather widget (vertical stack narrow) |
| `app/api/ssh/token/route.ts` | ✅ done | Token endpoint (loopback-only) |
| `app/api/system/route.ts` | ✅ done | System stats API |
| `app/api/agents/route.ts` | ✅ done | Agents API |
| `app/api/reminders/*` | ✅ done | CRUD + reorder API |
| `app/api/tasks/*` | ✅ done | CRUD + reorder API |
| `app/api/weather/route.ts` | ✅ done | Open-Meteo fetch |
| `lib/ssh/config.ts` | ✅ done | Shell config (bash default) |
| `lib/ssh/token.ts` | ✅ done | Token management (globalThis) |
| `lib/ssh/terminal-server.ts` | ✅ done | PTY↔WS bridge, env sanitizer |
| `lib/ssh/token.ts` | ✅ done | Token management |
| `lib/error-handling.ts` | ✅ done | Logger, serverLog, dbError |
| `lib/theme-service.ts` | ✅ done | Theme import/apply logic |
| `lib/system-stats.ts` | ✅ done | Node built-in stats gathering |
| `lib/agents.ts` | ✅ done | Profile discovery + session DB read |
| `lib/rate-limit.ts` | ✅ done | Sliding window limiter |
| `hooks/use-polling.ts` | ✅ done | Shared polling hook |
| `lib/db/schema.ts` | ✅ done | Added `sortOrder` to tasks & reminders |
| `lib/db/migrations/0002_*.sql` | ✅ done | sortOrder column migration |
| `app/api/tasks/reorder/route.ts` | ✅ done | Reorder endpoint |
| `app/api/reminders/reorder/route.ts` | ✅ done | Reorder endpoint |

---

## 4. Tweakcn Theme JSON Schema

The JSON endpoint returns:

```json
{
  "cssVars": {
    "light": { "--background": "oklch(...)", "--primary": "oklch(...)", ... },
    "dark": { "--background": "oklch(...)", ... },
    "radius": "...", "font": "...", "shadow": "...", "spacing": "...", "letter-spacing": "..."
  }
}
```

Token names map 1:1 to CSS variables in `app/globals.css` (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--sidebar-*`). Values are `oklch()` strings. **Theme switching = set these CSS custom properties on `:root` / `.dark`.**

**Theme application flow:**
1. Validate input with zod (`ThemeSchema` shape)
2. If tweakcn URL → extract ID, fetch JSON endpoint, re-validate
3. If JSON URL/file → parse + validate directly
4. Apply: set CSS vars for current mode (light/dark/system) on `document.documentElement`
5. Persist: save to Zustand `themeLibrary` (+ localStorage via persist), optionally to DB
6. Log every step via `logger`

---

## 5. Three.js Solar System

- **Objects:** `Scene`, `PerspectiveCamera` (z≈5-15), `WebGLRenderer` (`antialias:true`, `alpha:true`, `setPixelRatio(min(devicePixelRatio,2))`), `SphereGeometry` + `MeshStandardMaterial`
- **Structure:** Sun at origin (emissive + `PointLight`), 5 planets in a `Group`; orbit via group rotation or parametric position
- **Lighting:** `AmbientLight` + `PointLight`
- **Lifecycle:** React component with `useEffect` init + **full cleanup** (cancel RAF, dispose geometries/materials/renderer, remove canvas)
- **Responsive:** ResizeObserver → update camera aspect + renderer size
- **Lazy-loaded:** `next/dynamic` wrapper with `ssr:false` (server page imports wrapper)

---

## 6. What's Next (build order for the resuming agent)

Follow this order; each item should end with a passing `pnpm run lint` + (optionally) build:

1. **Dashboard demo page** with dummy data widgets (cards, charts placeholder, solar system, theme controls)
2. **Advanced charting** (Recharts, ApexCharts) in analytics/dashboard
3. **Dashboard layout builder** (drag-and-drop widget positioning)
3. **Theme editor** (visual tweakcn property editor)
4. **User authentication** (NextAuth.js + database)
5. **Real-time updates** (WebSocket or SSE)
6. **Comprehensive test suite** (Playwright e2e)
7. **PWA manifest and offline support**
8. **i18n** (next-i18next or similar)

---

## 7. Suggested Skills for the Next Agent

- `frontend-design` — distinctive dashboard visual direction
- `design-taste-frontend` — anti-slop guardrails for the UI
- `web-design-guidelines` — accessibility/guideline review of the UI
- `code-review` / `code-review-and-quality` — 5-axis review before merge
- `dev-practices` — debugging, TDD while building
- `refactor-safely` / `review-changes` — when restructuring
- `handoff` — to produce the next handoff
- `autonomous-agents` — sub-agent delegation patterns (user prefers small batches)

---

## 8. Environment & Commands

```bash
cd /home/deep/dev_site/d3lta
pnpm run dev        # do NOT run — user's dev server is already on :3000
pnpm run lint       # verification
pnpm run build      # verification (use D3LTA_BUILD_DIST=.next-verify for isolated build)
pnpm dlx shadcn add button card input ...   # add shadcn components as needed

# Web Shell environment overrides:
D3LTA_SSH_PORT=4200   # WS bridge port (default 4200)
D3LTA_SSH_HOST=127.0.0.1
D3LTA_SSH_SHELL=/bin/bash
D3LTA_SSH_TOKEN=...   # explicit session token (else auto-generated)
D3LTA_SSH_CWD=/path   # working directory for spawned shells
```

- Node/pnpm available; shell is zsh.
- User communicates via Hermes desktop app (markdown rendered).

---

## 9. Sensitive Info

None in this repo. No API keys or credentials were used. Tweakcn endpoints are public. Web shell is loopback-only with token auth.