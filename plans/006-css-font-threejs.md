# Plan 006: Fix CSS/font bugs + dynamic-load Three.js

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- app/globals.css app/layout.tsx app/visuals/page.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness / perf
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

Three small but real problems:

1. **`--tracking-normal: var(--tracking-normal)` is self-referential.**
   In `app/globals.css` line 56 (inside `@theme inline`) and line 129 (inside
   `:root`), the variable is defined as itself. A self-referential custom
   property is invalid and resolves to its initial value (the guaranteed
   `initial` value), so `letter-spacing: var(--tracking-normal)` (line 193)
   gets nothing meaningful. It should be a concrete value (`0em`).
2. **Font mismatch.** `app/layout.tsx` loads Geist/Geist_Mono via
   `next/font/google` and sets `--font-geist-sans`/`--font-geist-mono`, but
   `app/globals.css` declares `--font-sans: Plus Jakarta Sans, sans-serif` and
   `--font-mono: IBM Plex Mono, monospace` (lines 110–112) — fonts that are
   **never loaded**. The app renders in a fallback font, and the Geist fonts
   loaded in `layout.tsx` are unused. The two must agree.
3. **Three.js is statically imported** in `app/visuals/page.tsx` (line 1),
   adding ~600KB to the main client bundle. `ARCHITECTURE.md` §8 explicitly
   plans "dynamic imports for heavy charts/3D". The solar system should be
   lazy-loaded.

## Current state

- `app/globals.css`:
  - Line 56 (in `@theme inline`): `--tracking-normal: var(--tracking-normal);`
  - Line 129 (in `:root`): `--tracking-normal: 0em;` — this one is fine.
  - Line 110: `--font-sans: Plus Jakarta Sans, sans-serif;`
  - Line 111: `--font-serif: Lora, serif;`
  - Line 112: `--font-mono: IBM Plex Mono, monospace;`
  - Line 193: `letter-spacing: var(--tracking-normal);` in `body`.
- `app/layout.tsx`:
  - Lines 10–18: `Geist` → `--font-geist-sans`, `Geist_Mono` → `--font-geist-mono`.
  - Line 33: `<html className={`${geistSans.variable} ${geistMono.variable} ...`}>`.
- `app/visuals/page.tsx`:
  - Line 1: `import { SolarSystem } from "@/components/threejs/solar-system";`
  - Line 19: `<SolarSystem />` inside a `<CardContent className="h-[400px]">`.
- `components/threejs/solar-system.tsx` — a `"use client"` component that
  initializes Three.js in a `useEffect`.

**Repo conventions to match**:
- Fonts are loaded via `next/font/google` in `app/layout.tsx` (the Geist
  pattern is already there).
- Tailwind v4 uses `@theme inline` in `app/globals.css` for design tokens.
- Heavy client components are marked `"use client"` and should be dynamically
  imported (per `ARCHITECTURE.md` §8).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `app/globals.css`
- `app/layout.tsx`
- `app/visuals/page.tsx`

**Out of scope** (do NOT touch):
- `components/threejs/solar-system.tsx` — the component itself is fine; only
  how it's loaded changes.
- `app/page.tsx` or any other page.
- The `--font-serif`/`--font-mono` values beyond making them consistent with
  what's actually loaded.

## Git workflow

- Branch: `advisor/006-css-font-threejs`
- Commit message style: conventional commits, e.g.
  `fix: correct tracking var, align fonts, lazy-load three.js`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix the self-referential `--tracking-normal`

In `app/globals.css`, line 56 inside `@theme inline`:

```css
--tracking-normal: var(--tracking-normal);
```

Change it to a concrete value:

```css
--tracking-normal: 0em;
```

This matches the `:root` definition (line 129) and gives `body`'s
`letter-spacing: var(--tracking-normal)` (line 193) a real value.

**Verify**: `grep -n "tracking-normal" app/globals.css` shows no
self-referential `var(--tracking-normal)` definition (the `:root` one at line
129 is `0em`, which is fine).

### Step 2: Align the fonts

Decide which font family to use. The simplest, lowest-risk fix: **use the Geist
fonts already loaded in `layout.tsx`** and point the CSS variables at them.

In `app/globals.css`, change lines 110–112 from:

```css
--font-sans: Plus Jakarta Sans, sans-serif;
--font-serif: Lora, serif;
--font-mono: IBM Plex Mono, monospace;
```

to:

```css
--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
--font-serif: var(--font-geist-sans), ui-serif, Georgia, serif;
--font-mono: var(--font-geist-mono), ui-monospace, monospace;
```

This wires the CSS variables to the Geist fonts that `layout.tsx` actually
loads, with sensible fallbacks. The `--font-geist-sans`/`--font-geist-mono`
variables are set on `<html>` by `next/font` (via the `className` in
`layout.tsx` line 33).

**Verify**: `grep -n "font-sans\|font-mono\|font-serif" app/globals.css` shows
the new `var(--font-geist-...)` references.

### Step 3: Lazy-load the SolarSystem component

In `app/visuals/page.tsx`, replace the static import with a dynamic import.
The page is a server component (no `"use client"`), so use Next.js's
`next/dynamic` with `ssr: false` (Three.js needs the browser):

```tsx
import dynamic from "next/dynamic";

const SolarSystem = dynamic(
  () => import("@/components/threejs/solar-system"),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading 3D…</div> }
);
```

Remove the static import line 1:
`import { SolarSystem } from "@/components/threejs/solar-system";`

Keep the rest of the page unchanged (the `<SolarSystem />` usage at line 19
stays the same).

**Verify**: `grep -n "import.*solar-system" app/visuals/page.tsx` shows only
the `dynamic(() => import(...))` form, not a static import.

### Step 4: Verify the full build

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
```

**Verify**: all three exit 0. The build confirms the dynamic import resolves
and the page still compiles.

### Step 5: Manual smoke test (optional but recommended)

If a dev server is available, load `/visuals` and confirm:
1. The page renders (the loading placeholder shows briefly, then the solar
   system).
2. The solar system animates and resizes correctly.

**Verify**: the solar system renders and animates.

## Test plan

- No new tests. This is a CSS/font/bundle change; the verification is the
  build + typecheck + lint passing, plus the manual smoke test.
- If plan 001 has landed, run `pnpm test` → all pass (no existing tests touch
  these files).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "tracking-normal: var(--tracking-normal)" app/globals.css` returns no matches
- [ ] `grep -n "font-sans: var(--font-geist-sans)" app/globals.css` matches
- [ ] `grep -n "font-mono: var(--font-geist-mono)" app/globals.css` matches
- [ ] `grep -n "import.*solar-system" app/visuals/page.tsx` shows only the `dynamic(() => import(...))` form
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 006 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The build fails because `next/dynamic` with `ssr: false` conflicts with the
  page's server-component nature — stop and report rather than removing the
  `ssr: false` (that would break SSR of a Three.js component).

## Maintenance notes

- If the team later wants Plus Jakarta Sans / IBM Plex Mono / Lora, they must
  be loaded via `next/font/google` in `layout.tsx` and the CSS variables
  updated to match — the current fix just makes the loaded fonts and the CSS
  agree.
- The `--tracking-normal` fix means `letter-spacing` now has a real value
  (`0em`). If a design later wants non-zero tracking, update both the
  `@theme inline` and `:root` definitions together.
- The dynamic import means the solar system is only fetched when `/visuals` is
  visited, shrinking the initial bundle. If the solar system is ever shown on
  the dashboard home page too, reuse the same dynamic import there.