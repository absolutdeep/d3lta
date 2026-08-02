# d3lta — Handoff Document

**Created:** 2026-08-02
**Project root:** `/home/deep/dev_site/d3lta`
**Purpose of next session:** Continue building the d3lta dashboard (layout, theme system, DnD, Three.js solar system, DB layer) and verify.

---

## 1. Project Summary

d3lta is a dashboard website built with:

- **Next.js 16.2.12** (App Router, Turbopack, TypeScript strict)
- **Tailwind CSS v4** (via `@tailwindcss/postcss`, CSS-first config in `app/globals.css`)
- **shadcn/ui** (radix-nova style, `components.json` present, button component already generated)
- **Zustand v5** (state management, with `persist` middleware)
- **axios** (HTTP client)
- **zod** (schema validation — for theme JSON validation)
- **@dnd-kit/core + sortable + utilities** (drag & drop)
- **three.js + @types/three** (3D solar system widget)
- **drizzle-orm + libsql** (planned DB layer — installed but not wired yet)

**Key external references:**
- Tweakcn theme being used as reference: `https://tweakcn.com/themes/cmmjjm0lw000004jm1a6b39hw`
- Tweakcn theme JSON endpoint: `https://tweakcn.com/r/themes/cmmjjm0lw000004jm1a6b39hw`
- Admin template (inspiration only): `/home/deep/temp/tailwind-admin/free-tailwind-admin-dashboard-template/tailwind-admin-nextjs-free/package`
- Dev server: user has one running on port 3000 — do NOT start/stop it. Make changes and query `http://localhost:3000`.

---

## 2. Decisions Locked In (from user)

1. **Layout:** Classic dashboard — collapsible sidebar + top header + content area (like the Tailwind Admin template), expandable later with dummy data and suggested dashboard components.
2. **DnD kit:** Both immediate-apply AND library-save. Drop zone accepts tweakcn theme URLs and JSON URLs; upload accepts **JSON files only**, validated against the tweakcn schema (zod).
3. **Three.js:** Solar system particle layout — a center planet surrounded by 5 orbiting smaller planets (design confirmed by sub-agent research, full summary at `/home/deep/.hermes/cache/delegation/subagent-summary-1-20260802_024330_437369.txt`).
4. **Database:** Store everything — user preferences, themes library, dashboard data, audit logs (schema drafted).
5. **State:** Zustand for state memory (theme mode, theme library, active theme, sidebar state).
6. **Error handling:** Rigorous, multi-layer (logger with severity levels, React Error Boundary, `withErrorHandling` wrapper, server log helper, DB error helper).
7. **Workflow rules:** Task lists, small sub-agent batches, updates ≤3 sentences every ≤2 min, ask questions with options when unsure.
8. **Write ONLY into `/home/deep/dev_site/d3lta`.**

---

## 3. Current State of the Codebase

Verified working (as of this handoff):

- `pnpm run lint` → **passes** (0 errors; `eslint.config.mjs` restored to original Next 16 flat-config shape using `eslint-config-next/core-web-vitals` + `typescript`)
- `pnpm run build` → **passes** (compiles + TypeScript + static generation)
- `package.json` has `"type": "module"` and all deps above

### Files already created

| Path | Status | Notes |
|---|---|---|
| `types/theme.ts` | ✅ done | `ThemeCssVars`, `ThemeSchema`, `TweakcnThemeResponse`, `ThemeApplyResult` |
| `store/use-theme-store.ts` | ✅ done | Zustand store: theme mode, themeLibrary, activeThemeId, sidebarCollapsed, persist middleware (localStorage key `theme-storage`) |
| `context/ThemeContext.tsx` | ✅ done | `ThemeProvider`, `useTheme()`, `withTheme()` HOC |
| `lib/utils.ts` | ✅ existing | shadcn `cn()` helper |
| `ARCHITECTURE.md` | ✅ done | Full architecture doc (see it — don't duplicate here) |
| `PROJECT_STRUCTURE.md` | ✅ done | Intended directory map (note: some paths differ from what's built — see §6) |
| `docs/HANDOFF.md` | ✅ this file | |

### Important gotchas learned (read before editing)

1. **No `src/` dir.** The project uses root-level `app/`, `components/`, `lib/`, `store/`, `context/`, `types/`. tsconfig maps `@/*` → `./*`. Earlier files were accidentally written into `src/` and had to be moved.
2. **ESLint config** is `eslint.config.mjs` (flat config). Do NOT replace with `.eslintrc.js` — ESLint 9.39.5 requires flat config and the Next 16 preset. If lint breaks, restore the file from git or this exact shape:
   ```js
   import { defineConfig, globalIgnores } from "eslint/config";
   import nextVitals from "eslint-config-next/core-web-vitals";
   import nextTs from "eslint-config-next/typescript";
   const eslintConfig = defineConfig([...nextVitals, ...nextTs, globalIgnores([".next/**","out/**","build/**","next-env.d.ts"])]);
   export default eslintConfig;
   ```
3. **Do NOT downgrade package.json.** A previous mistake downgraded Next 16.2.12 → 14.2.4 (security vulnerability, breaks flat config). Current file is correct — only add deps via `pnpm add`.
4. **JSX in `.ts` files fails typecheck.** Error-boundary JSX belongs in `.tsx` (currently planned for `components/error-boundary.tsx`, NOT written yet).
5. Next.js inferred workspace root warning: harmless; multiple lockfiles exist under `/home/deep`. Optionally set `turbopack.root` in `next.config.ts` to silence.

---

## 4. Tweakcn Theme JSON Schema (verified by sub-agent)

The JSON endpoint returns a structure like:

```json
{
  "cssVars": {
    "light": { "--background": "oklch(...)", "--primary": "oklch(...)", ... },
    "dark": { "--background": "oklch(...)", ... },
    "radius": "...",
    "font": "...",
    "shadow": "...",
    "spacing": "...",
    "letter-spacing": "..."
  }
}
```

Token names map 1:1 to the CSS variables in `app/globals.css` (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--sidebar-*`). Values are `oklch()` strings. **Theme switching = set these CSS custom properties on `:root` / `.dark`.**

**Theme application flow (recommended):**
1. Validate input with zod (`ThemeSchema` shape).
2. If input is a tweakcn theme URL → extract ID, fetch JSON endpoint, re-validate.
3. If input is a JSON URL/file → parse + validate directly.
4. Apply: set CSS vars for current mode (light/dark/system) on `document.documentElement`.
5. Persist: save to Zustand `themeLibrary` (+ localStorage via persist), optionally to DB.
6. Log every step via `logger`.

---

## 5. Three.js Solar System — Design Summary (from sub-agent)

Full summary: `/home/deep/.hermes/cache/delegation/subagent-summary-1-20260802_024330_437369.txt`

- **Objects:** `Scene`, `PerspectiveCamera` (z≈5-15), `WebGLRenderer` (`antialias:true`, `alpha:true` for transparent dashboard background, `setPixelRatio(min(devicePixelRatio,2))`), `SphereGeometry` + `MeshStandardMaterial` per body.
- **Structure:** Sun at origin (emissive material + `PointLight` at center), 5 planets in a `Group`; orbit via updating group rotation or per-planet parametric position each frame.
- **Lighting:** `AmbientLight` + `PointLight`.
- **Lifecycle:** React component with `useEffect` init + **full cleanup** (cancel RAF, dispose geometries/materials/renderer, remove canvas) — memory leaks are the #1 pitfall.
- **Responsive:** ResizeObserver → update camera aspect + renderer size.
- **Particle layout:** user wants particle-style aesthetics for planets (points/sprites acceptable).

---

## 6. What's Next (build order for the resuming agent)

Follow this order; each item should end with a passing `pnpm run lint` + (optionally) build:

1. **Dashboard shell** (`app/layout.tsx` + `components/layout/`):
   - Sidebar (collapsible via Zustand `sidebarCollapsed`), header, content area.
   - Use shadcn primitives already installed (`components/ui/button.tsx` exists; add more via `pnpm dlx shadcn add <comp>` as needed — e.g. sheet, tooltip, dropdown-menu).
2. **Theme application service** (`lib/theme-service.ts`): zod-validated fetch + apply CSS vars + Zustand update + logging.
3. **Drop zone** (`components/theme/theme-dropzone.tsx`): dnd-kit `useDroppable`, accept URL string drops + file upload; wire to theme service.
4. **Theme library panel** (`components/theme/theme-library.tsx`): list saved themes, activate/delete, preview swatches.
5. **Error boundary + global logging UI** (`components/error-boundary.tsx` from the design in `ARCHITECTURE.md`; wrap app).
6. **Solar system widget** (`components/threejs/solar-system.tsx`, `"use client"`).
7. **DB wiring** (`lib/db/` schema already drafted in `ARCHITECTURE.md`; create `lib/db/client.ts`, drizzle config, `app/api/themes/route.ts`, `app/api/logs/route.ts`, `app/api/preferences/route.ts`).
8. **Dashboard demo page** with dummy data widgets (cards, charts placeholder, solar system, theme controls).
9. **Verify:** lint, build, query `http://localhost:3000`.

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
pnpm run build      # verification
pnpm dlx shadcn add button card input ...   # add shadcn components as needed
```

- Node/pnpm available; shell is zsh.
- User communicates via Hermes desktop app (markdown rendered).

---

## 9. Sensitive Info

None in this repo. No API keys or credentials were used. Tweakcn endpoints are public.
