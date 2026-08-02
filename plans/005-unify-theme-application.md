# Plan 005: Unify theme application & clear vars on removal

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- lib/theme-service.ts store/use-theme-store.ts context/ThemeContext.tsx components/theme`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-test-baseline.md
- **Category**: correctness / tech-debt
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

Theme CSS variables are applied from **two competing places**, which causes a
real bug and a maintenance hazard:

1. `lib/theme-service.ts` exports `applyThemeVars(theme, isDark)` (line 254)
   which writes CSS vars directly to `document.documentElement`. It's called
   from `components/theme/theme-library.tsx` (line 24) and
   `components/theme/theme-toggle.tsx` (line 31).
2. `context/ThemeContext.tsx` (line 25) subscribes to the store and applies
   vars from `getThemeVariables()` on **every** store change, and toggles the
   `dark` class.

The bug: **removing the active theme never clears the injected CSS vars.**
`removeThemeFromLibrary` (in `store/use-theme-store.ts`) deletes the theme from
`themeLibrary` and `setActiveTheme(null)` clears `activeThemeId`, but nothing
removes the `--background`, `--primary`, etc. that were set on `:root`. The UI
stays themed even though no theme is active.

The fix: make `ThemeContext` the **single** place that applies CSS vars and
toggles the `dark` class, driven entirely by store state. Remove the direct
`applyThemeVars` calls from the components. When no theme is active, clear the
injected vars so the default `globals.css` values take over.

## Current state

- `lib/theme-service.ts:254` — `applyThemeVars(theme, isDark)` sets vars on
  `document.documentElement`:
  ```ts
  export function applyThemeVars(theme: ThemeSchema, isDark: boolean): void {
    if (typeof document === "undefined") return;
    const vars = isDark ? theme.cssVars.dark : theme.cssVars.light;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    if (theme.cssVars.radius) {
      root.style.setProperty("--radius", theme.cssVars.radius);
    }
  }
  ```
- `context/ThemeContext.tsx:25-62` — the `useEffect` subscribes to the store
  and applies vars + toggles `dark`:
  ```ts
  const apply = () => {
    const state = useThemeStore.getState();
    const variables = state.getThemeVariables();
    const root = document.documentElement;
    for (const [key, value] of Object.entries(variables)) {
      root.style.setProperty(key, value);
    }
    if (state.isDarkMode) { root.classList.add('dark'); }
    else { root.classList.remove('dark'); }
  };
  ```
- `store/use-theme-store.ts:112-132` — `getThemeVariables()` returns `{}` when
  no active theme, else the light/dark vars of the active theme.
- `components/theme/theme-library.tsx:24` — `applyThemeVars(theme, useThemeStore.getState().isDarkMode)` in `handleActivate`.
- `components/theme/theme-toggle.tsx:31` — `applyThemeVars(theme, useThemeStore.getState().isDarkMode)` in `handleActivate`.
- `lib/theme-service.ts:314,348` — `importThemeFromUrl`/`importThemeFromJsonFile`
  call `applyThemeVars(theme, isApplyingDark())` after adding to the store.

**Repo conventions to match**:
- The store is the single source of truth for theme state; components read via
  `useThemeStore` selectors (see `theme-toggle.tsx:19-23`).
- `ThemeContext` is the provider that bridges store → DOM (see
  `context/ThemeContext.tsx`).
- `getThemeVariables()` already returns `{}` for "no active theme" — the
  clearing logic should build on that.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |
| Test      | `pnpm test`              | all pass (requires plan 001) |

## Scope

**In scope** (the only files you should modify):
- `context/ThemeContext.tsx` (add var-clearing logic)
- `components/theme/theme-library.tsx` (remove `applyThemeVars` call)
- `components/theme/theme-toggle.tsx` (remove `applyThemeVars` call)
- `lib/theme-service.ts` (remove `applyThemeVars` calls in import functions;
  keep or remove the export per Step 4)
- `store/use-theme-store.test.ts` (update if plan 001's tests assert on
  `applyThemeVars` — they don't, but verify)

**Out of scope** (do NOT touch):
- `store/use-theme-store.ts` — the store logic is correct; only the DOM
  application is being unified.
- `app/globals.css` — the default vars stay as the fallback when no theme is
  active.
- `context/ThemeContext.tsx`'s `useTheme`/`withTheme` exports — removing the
  redundant context layer is plan 007.

## Git workflow

- Branch: `advisor/005-unify-theme-application`
- Commit message style: conventional commits, e.g.
  `fix: clear theme vars on removal; unify application in ThemeContext`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add var-clearing to `ThemeContext`

In `context/ThemeContext.tsx`, modify the `apply` function inside the
`useEffect` so that when `getThemeVariables()` returns `{}` (no active theme),
it **removes** the previously-injected vars instead of leaving them.

The cleanest approach: track which keys were injected, and clear them when the
active theme changes or is removed. Add a module-level or ref-based set of
injected keys:

```ts
// Track the CSS vars we've injected so we can clear them when the theme changes
const injectedVars = new Set<string>();
```

Then in `apply`:

```ts
const apply = () => {
  const state = useThemeStore.getState();
  const variables = state.getThemeVariables();
  const root = document.documentElement;

  // Clear previously-injected vars that are no longer present
  for (const key of injectedVars) {
    if (!(key in variables)) {
      root.style.removeProperty(key);
      injectedVars.delete(key);
    }
  }

  // Apply current vars
  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
    injectedVars.add(key);
  }

  // Toggle the `dark` class based on the store's resolved isDarkMode
  if (state.isDarkMode) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};
```

This handles three cases:
- **Theme removed** (`getThemeVariables()` returns `{}`): all previously
  injected keys are cleared, so `globals.css` defaults take over.
- **Theme switched**: keys present in the old theme but not the new one are
  cleared; shared keys are overwritten.
- **Light↔dark toggle**: the same keys are re-set with the new variant's
  values (they're present in `variables`, so they're overwritten, not cleared).

**Verify**: `npx tsc --noEmit` exits 0.

### Step 2: Remove `applyThemeVars` calls from components

In `components/theme/theme-library.tsx`, `handleActivate` currently does:

```ts
const handleActivate = (id: string) => {
  const theme = themeLibrary[id];
  if (!theme) return;
  setActiveTheme(id);
  applyThemeVars(theme, useThemeStore.getState().isDarkMode);  // remove this
  logger.info(SOURCE, `Theme activated: ${id}`);
};
```

Remove the `applyThemeVars(...)` line and the now-unused import
`import { applyThemeVars } from "@/lib/theme-service";` (line 8). Keep
`setActiveTheme(id)` — the `ThemeContext` subscription will apply the vars.

In `components/theme/theme-toggle.tsx`, `handleActivate` currently does:

```ts
const handleActivate = (id: string) => {
  const theme = themeLibrary[id];
  if (!theme) return;
  setActiveTheme(id);
  applyThemeVars(theme, useThemeStore.getState().isDarkMode);  // remove this
};
```

Remove the `applyThemeVars(...)` line and the import (line 7).

**Verify**: `grep -rn "applyThemeVars" components/` returns no matches.

### Step 3: Remove `applyThemeVars` calls from the import functions

In `lib/theme-service.ts`, `importThemeFromUrl` (line 314) and
`importThemeFromJsonFile` (line 348) both call
`applyThemeVars(theme, isApplyingDark())` after `addThemeToLibrary` +
`setActiveTheme`. Remove those calls — the `ThemeContext` subscription will
apply the vars when the store updates.

Also remove the now-unused `isApplyingDark()` helper (lines 281–284) if it's
no longer referenced.

**Verify**: `grep -n "applyThemeVars\|isApplyingDark" lib/theme-service.ts`
returns no matches.

### Step 4: Decide the fate of the `applyThemeVars` export

After Steps 2–3, `applyThemeVars` is no longer called anywhere. Two options:

- **Remove it** (preferred): delete the `applyThemeVars` function (lines
  254–275) and its `ThemeApplyResult`-related usage. This makes
  `ThemeContext` the single application point, which is the goal.
- **Keep it** as a documented utility: if you prefer to keep it for future
  use, leave it exported but add a comment noting it's not wired to the store
  and `ThemeContext` is the canonical path.

Prefer **removing** it. If you remove it, also check `types/theme.ts` — the
`ThemeApplyResult` interface (lines 38–41) is only used by `applyThemeVars`'s
return type; if nothing else uses it, remove it too. Verify with a grep.

**Verify**: `grep -rn "applyThemeVars\|ThemeApplyResult" lib/ components/ types/`
returns no matches (if you removed both).

### Step 5: Verify the full build and tests

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
pnpm test
```

**Verify**: all four exit 0. The tests (from plan 001) confirm the store
behavior is unchanged.

### Step 6: Manual smoke test (optional but recommended)

If a dev server is available, verify the fix in a browser:
1. Import a theme (URL or JSON) → the UI takes on the theme's colors.
2. Delete the active theme from the library → the UI returns to the default
   `globals.css` colors (previously it stayed themed).
3. Toggle light/dark with a theme active → colors switch correctly.

**Verify**: the UI returns to defaults after deleting the active theme.

## Test plan

- Plan 001's `store/use-theme-store.test.ts` covers `getThemeVariables()`
  returning `{}` for no active theme — that's the behavior this fix relies on.
  No new tests are strictly required, but if you want to lock the clearing
  behavior, add a test in `context/ThemeContext.test.tsx` (create) that:
  - renders `ThemeProvider` with a child, sets an active theme in the store,
    asserts `document.documentElement` has the injected var,
  - then removes the theme and asserts the var is cleared.
  This requires `@testing-library/react` (installed in plan 001). Model it on
  a standard RTL render test.
- Verification: `pnpm test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "applyThemeVars" components/ lib/` returns no matches
- [ ] `grep -n "removeProperty" context/ThemeContext.tsx` matches (clearing logic present)
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0 (requires plan 001)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 005 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- Plan 001 has NOT landed (no `pnpm test` script exists) — the `pnpm test`
  verification will fail; that's expected, note it and proceed with the other
  verifications, but flag it in your report.
- You find another caller of `applyThemeVars` not listed in "Current state" —
  stop and report it rather than leaving it broken.

## Maintenance notes

- `ThemeContext` is now the single place that touches `document.documentElement`
  for theming. Any future theme-application logic (e.g. per-component theming)
  should go through the store + `ThemeContext`, not direct DOM writes.
- The `injectedVars` set lives at module scope in `ThemeContext.tsx`. If the
  app ever needs multiple independent theme scopes, this needs to become a ref
  or per-provider state — out of scope now.
- Plan 007 removes the redundant `ThemeContext` layer entirely. If 007 lands
  after this, the var-clearing logic must move into the store or a dedicated
  hook — coordinate the two plans.