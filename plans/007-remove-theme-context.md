# Plan 007: Remove redundant ThemeContext state layer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- context/ThemeContext.tsx app/layout.tsx components store lib`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-test-baseline.md
- **Category**: tech-debt / architecture
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

`context/ThemeContext.tsx` provides a React Context (`ThemeProvider`,
`useTheme`, `withTheme`) that **duplicates** the Zustand store
(`store/use-theme-store.ts`). The store is already the single source of truth
for theme state, and every component in the app reads from `useThemeStore`
directly — none of them use `useTheme()` or `withTheme()`. The context layer is
dead weight:

- `useTheme()` and `withTheme()` are never imported anywhere (verified in
  recon — components use `useThemeStore` directly).
- `withTheme` relies on `@ts-expect-error` (line 90) to inject a prop, which is
  a type-unsafety smell.
- `ThemeProvider` is the only part that does real work (applying CSS vars +
  toggling `dark`), but that logic belongs with the store or a dedicated hook,
  not a context that also exposes unused `useTheme`/`withTheme`.

The fix: keep the DOM-application logic (it's needed — see plan 005), but
remove the unused `useTheme`/`withTheme` exports and the `ThemeContext` object.
Rename `ThemeProvider` to a clearer name (e.g. `ThemeApplier`) or keep it as
`ThemeProvider` but strip the context. The goal is one source of truth (the
store) and no dead API surface.

## Current state

- `context/ThemeContext.tsx` (93 lines) exports:
  - `ThemeProvider` (line 18) — the provider component; its `useEffect`
    subscribes to the store, applies CSS vars, toggles `dark`.
  - `useTheme` (line 74) — hook that reads the context; throws if used outside
    provider.
  - `withTheme` (line 83) — HOC that injects `theme` prop via `@ts-expect-error`.
- `app/layout.tsx` (line 4, 37) — imports and wraps with `<ThemeProvider>`.
- All components (`header.tsx`, `sidebar.tsx`, `theme-toggle.tsx`,
  `theme-library.tsx`) use `useThemeStore` directly, not `useTheme`.
- `store/use-theme-store.ts` — the Zustand store with all theme state + actions.

**Repo conventions to match**:
- Components read theme state via `useThemeStore` selectors (see
  `theme-toggle.tsx:19-23`).
- The store is the single source of truth (per `ARCHITECTURE.md` §7).
- `"use client"` directive on client components.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |
| Test      | `pnpm test`              | all pass (requires plan 001) |

## Scope

**In scope** (the only files you should modify):
- `context/ThemeContext.tsx` (remove `useTheme`, `withTheme`, the context
  object; keep the DOM-application provider)
- `app/layout.tsx` (update import if the provider is renamed)
- `context/ThemeContext.test.tsx` (create, if plan 005 added one — update it)

**Out of scope** (do NOT touch):
- `store/use-theme-store.ts` — unchanged.
- `components/theme/*` — they already use the store directly; no changes.
- The DOM-application logic in the provider — that's plan 005's territory and
  must be preserved.

## Git workflow

- Branch: `advisor/007-remove-theme-context`
- Commit message style: conventional commits, e.g.
  `refactor: remove unused useTheme/withTheme context layer`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm nothing uses `useTheme`/`withTheme`

Before deleting, verify:

```bash
grep -rn "useTheme\b\|withTheme\b" --include="*.tsx" --include="*.ts" app/ components/ context/ store/ lib/
```

**Verify**: the only matches are inside `context/ThemeContext.tsx` itself (the
definitions). If any other file imports `useTheme` or `withTheme`, STOP and
report — the "unused" assumption is wrong.

### Step 2: Strip the context, keep the provider

In `context/ThemeContext.tsx`, remove:
- The `ThemeContextType` interface (lines 7–12)
- The `createContext`/`useContext` imports and the `ThemeContext` object
  (lines 3, 15)
- The `useTheme` hook (lines 74–80)
- The `withTheme` HOC (lines 83–93)
- The `value` object and `<ThemeContext.Provider>` wrapper in the return
  (lines 68–70)

Keep:
- The `"use client"` directive
- The `useEffect` that subscribes to the store, applies CSS vars, and toggles
  `dark` (this is the real work; plan 005 may have added var-clearing here —
  preserve it)
- The `ThemeProvider` component, but change its return to just render children:

```tsx
export function ThemeProvider({ children }: { children: ReactNode }) {
  // ... the useEffect stays exactly as-is ...

  return <>{children}</>;
}
```

If plan 005 renamed or restructured this, match the current state. The key
change is: no context, no `useTheme`, no `withTheme` — just a provider that
applies theme to the DOM and renders children.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 3: Update `app/layout.tsx` if needed

`app/layout.tsx` imports `ThemeProvider` from `@/context/ThemeContext` (line 4)
and wraps the app (line 37). If you kept the name `ThemeProvider`, no change
needed. If you renamed it (e.g. `ThemeApplier`), update the import and usage.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 4: Update or add tests

If plan 005 created `context/ThemeContext.test.tsx`, update it to match the new
provider (it should still render children and apply vars). If no test exists,
add a minimal one:

```tsx
// context/ThemeContext.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ThemeProvider } from "@/context/ThemeContext";

describe("ThemeProvider", () => {
  it("renders children", () => {
    render(<ThemeProvider><div>child</div></ThemeProvider>);
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
```

This requires `@testing-library/react` and `@testing-library/jest-dom`
(installed in plan 001). Model it on the store test from plan 001.

**Verify**: `pnpm test` runs and the new test passes.

### Step 5: Verify the full build and tests

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
pnpm test
```

**Verify**: all four exit 0.

## Test plan

- New test: `context/ThemeContext.test.tsx` (renders children; optionally
  asserts the DOM-application behavior if plan 005 added it).
- The store tests from plan 001 already cover the theme state; the context
  removal doesn't change store behavior.
- Verification: `pnpm test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "useTheme\b\|withTheme\b" --include="*.tsx" --include="*.ts" app/ components/ context/ store/ lib/` returns no matches
- [ ] `grep -n "createContext\|useContext" context/ThemeContext.tsx` returns no matches
- [ ] `grep -n "ThemeProvider" app/layout.tsx` still matches (provider still wraps the app)
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0 (requires plan 001)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 007 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- Step 1 finds a real consumer of `useTheme`/`withTheme` outside
  `ThemeContext.tsx` — stop and report rather than deleting a used API.
- Plan 001 has NOT landed (no `pnpm test` script) — the `pnpm test`
  verification will fail; note it and proceed with the other verifications.

## Maintenance notes

- After this plan, `context/ThemeContext.tsx` is a thin provider that only
  applies theme to the DOM. If the team prefers, it could be renamed to
  `components/theme/theme-applier.tsx` and moved out of `context/` — but that's
  a cosmetic move, out of scope here.
- The `ThemeProvider` still must wrap the app in `layout.tsx` for the
  DOM-application effect to run. Don't remove it.
- If a future feature genuinely needs React Context (e.g. a non-global theme
  scope), reintroduce it deliberately — this plan only removed the unused
  duplicate of the store.