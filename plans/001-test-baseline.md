# Plan 001: Establish a test baseline (Vitest + React Testing Library)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- package.json tsconfig.json lib/theme-service.ts store/use-theme-store.ts lib/error-handling.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

The repo has **zero tests** and no test command. Every other refactor plan in
this set (005, 007, 009, 011) touches the theme store, the theme service, and
the error-handling module — the exact code that has no coverage. Without a
baseline, those refactors are unverifiable and risky. This plan installs Vitest
+ React Testing Library, wires a `test` script, and writes characterization
tests for the three highest-risk modules so later plans can prove they didn't
break behavior.

## Current state

- `package.json` — scripts: `dev`, `build`, `start`, `lint`. No `test` script.
  No test framework installed. `zod` is in `devDependencies` (line 44) and is
  imported by `lib/theme-service.ts` (line 2) — this plan's tests will import
  `theme-service`, so `zod` must be available to the test runner. It already is
  (devDependencies are installed in dev), so no change needed here for tests to
  run; the packaging fix is plan 002.
- `tsconfig.json` — `"strict": true`, `"jsx": "react-jsx"`, `"moduleResolution":
  "bundler"`, path alias `"@/*": ["./*"]`. Vitest must be configured to resolve
  the `@/` alias the same way.
- `lib/theme-service.ts` — pure-ish functions: `validateThemeJson`,
  `extractThemeId`, `normalizeVars` (not exported), `toThemeSchema` (not
  exported), `fetchThemeFromUrl` (network), `validateThemeFile` (File input),
  `applyThemeVars` (DOM), `importThemeFromUrl`/`importThemeFromJsonFile`
  (call the Zustand store). The testable pure functions are `validateThemeJson`
  and `extractThemeId`.
- `store/use-theme-store.ts` — Zustand store with `persist` + `devtools`
  middleware. `persist` writes to `localStorage` under key `theme-storage`.
  In a Node test environment there is no `localStorage`, so tests must either
  mock it or use `createJSONStorage(() => localStorage)` guard. The store's
  `prefersDark()` reads `window.matchMedia` — must be stubbed in tests.
- `lib/error-handling.ts` — `Logger` singleton with a private buffer; `logger`
  is the exported instance. `push()` calls `console.log` in non-production.
  Tests can assert on `logger.getBuffer()`.

**Repo conventions to match** (from recon):
- Path alias `@/*` → `./*` (root-level dirs: `lib/`, `store/`, `components/`,
  `types/`, `context/`). Use `@/lib/...` in imports.
- TypeScript strict mode; no `any` unless unavoidable.
- ESLint flat config (`eslint.config.mjs`) with `eslint-config-next` presets.
  New test files must not break `pnpm run lint` — the Next ESLint preset may
  flag test globals; configure ESLint to ignore test files or add globals as
  needed (see Step 3).
- Package manager is **pnpm** (there is a `pnpm-lock.yaml`). Use `pnpm add -D`
  and `pnpm dlx` for installs.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event` | exit 0 |
| Test      | `pnpm test`              | all pass            |
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0, no errors   |

## Suggested executor toolkit

- Use `tdd` skill if available when writing the tests in Step 4.

## Scope

**In scope** (the only files you should modify/create):
- `package.json` (add `test` script + devDependencies)
- `vitest.config.ts` (create)
- `vitest.setup.ts` (create)
- `eslint.config.mjs` (add test-file ignores/globals if lint fails)
- `lib/theme-service.test.ts` (create)
- `store/use-theme-store.test.ts` (create)
- `lib/error-handling.test.ts` (create)

**Out of scope** (do NOT touch, even though they look related):
- `lib/theme-service.ts`, `store/use-theme-store.ts`, `lib/error-handling.ts`
  source files — this plan only *tests* them. Refactors are plans 005/007/011.
- `package.json` dependency *moves* (zod → dependencies) — that's plan 002.
- Any `app/` or `components/` file.

## Git workflow

- Branch: `advisor/001-test-baseline`
- Commit per logical unit (config, then each test file). Message style:
  conventional commits, e.g. `test: add vitest baseline and theme-service tests`.
  (Repo has one commit "first commit"; use conventional style going forward.)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install test tooling

Run:
```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Verify**: exit 0; `pnpm list -D vitest` shows vitest installed.

### Step 2: Create `vitest.config.ts`

Create `vitest.config.ts` at repo root:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Note: `__dirname` is available because this is a `.ts` config compiled by
Vitest's esbuild (CommonJS output). If `__dirname` errors under the repo's
`"type": "module"`, use `import { fileURLToPath } from "node:url"` and
`path.dirname(fileURLToPath(import.meta.url))` instead.

**Verify**: `npx vitest run --passWithNoTests` exits 0 (no tests yet, but
config loads).

### Step 3: Create `vitest.setup.ts` and fix lint

Create `vitest.setup.ts` at repo root:

```ts
import "@testing-library/jest-dom/vitest";
```

Then run `pnpm run lint`. The Next ESLint preset may flag `describe`/`it`/
`expect` globals in test files. If so, add to `eslint.config.mjs` a block that
ignores test files or declares the globals. The current file is:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

Add `"**/*.test.{ts,tsx}"` to the `globalIgnores` array (test files are not
shipped and don't need the Next app lint rules). Do not change anything else.

**Verify**: `pnpm run lint` exits 0.

### Step 4: Add the `test` script

In `package.json` `scripts`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Verify**: `pnpm test` exits 0 (no tests yet, `--passWithNoTests` not needed
once a test file exists; if it exits non-zero with "no test files found", add
`--passWithNoTests` to the `test` script).

### Step 5: Write `lib/theme-service.test.ts`

Test the pure functions. Model the file structure on a standard Vitest test:

```ts
import { describe, it, expect } from "vitest";
import { validateThemeJson, extractThemeId } from "@/lib/theme-service";
```

Note: `extractThemeId` is **not exported** from `theme-service.ts` (it's a
module-private function). To test it you must export it. This is the one
allowed source change in this plan: add `export` to `extractThemeId` in
`lib/theme-service.ts` (line 16: `function extractThemeId` → `export function
extractThemeId`). Do not change its body.

Cases to cover:
- `extractThemeId`:
  - full page URL `https://tweakcn.com/themes/cmcup07dt000104l4hj4eferh` → `cmcup07dt000104l4hj4eferh`
  - raw JSON URL `https://tweakcn.com/r/themes/cmcup07dt000104l4hj4eferh` → `cmcup07dt000104l4hj4eferh`
  - bare id `cmcup07dt000104l4hj4eferh` → same id
  - filename `cmcup07dt000104l4hj4eferh.json` → same id
  - non-tweakcn URL `https://example.com/foo` → `null`
  - short string `abc` → `null`
- `validateThemeJson`:
  - a raw tweakcn response with unprefixed `cssVars.light`/`cssVars.dark`
    normalizes keys to `--`-prefixed and returns a `ThemeSchema`
  - a normalized `ThemeSchema` (already `--`-prefixed) passes through unchanged
  - invalid input (missing `cssVars`) throws a ZodError

**Verify**: `pnpm test` runs and the new tests pass.

### Step 6: Write `store/use-theme-store.test.ts`

The store uses `persist` (localStorage) and `prefersDark()` (matchMedia). In
jsdom, stub both before importing the store. Because the store is a module
singleton, reset state between tests via `useThemeStore.setState(initialState)`.

```ts
import { beforeEach, describe, it, expect, vi } from "vitest";

// Stub matchMedia before importing the store
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Stub localStorage (jsdom provides it, but persist may warn; provide a clean one)
const store = await import("@/store/use-theme-store");
const { useThemeStore } = store;
```

Cases to cover:
- initial state: `currentTheme === "system"`, `isDarkMode === false`,
  `themeLibrary === {}`, `activeThemeId === null`, `sidebarCollapsed === false`
- `setTheme("dark")` → `isDarkMode === true`
- `setTheme("light")` → `isDarkMode === false`
- `toggleTheme()` from `light` → `dark` and `isDarkMode === true`
- `addThemeToLibrary("t1", theme)` then `getThemeVariables()` with
  `activeThemeId = "t1"` and `currentTheme = "light"` returns the light vars
- `removeThemeFromLibrary("t1")` removes the key
- `setActiveTheme(null)` sets `activeThemeId` to null
- `toggleSidebar()` flips `sidebarCollapsed`

Use `beforeEach(() => useThemeStore.setState({ currentTheme: "system",
isDarkMode: false, themeLibrary: {}, activeThemeId: null, sidebarCollapsed:
false, _systemDark: false }))` to reset.

**Verify**: `pnpm test` runs and the new tests pass.

### Step 7: Write `lib/error-handling.test.ts`

The `Logger` is a singleton with a private buffer. Test the public surface:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { logger } from "@/lib/error-handling";
```

Cases:
- `logger.info("src", "msg")` appends an entry to `logger.getBuffer()` with
  severity `"info"`, source `"src"`, message `"msg"`, and a timestamp
- `logger.warn`/`logger.error` set the correct severity
- the buffer caps at `MAX_BUFFER` (100): push 105 entries, assert
  `getBuffer().length === 100` and the oldest entry was dropped
- `logger.critical` in non-production does NOT call `fetch` (assert via
  `vi.spyOn(globalThis, "fetch")` not called)

Note: `push()` calls `console.log` in non-production. To keep test output
clean, stub `console.log` with `vi.spyOn(console, "log").mockImplementation(() => {})`
in a `beforeEach` and restore after.

**Verify**: `pnpm test` runs and the new tests pass.

## Test plan

- New test files: `lib/theme-service.test.ts`, `store/use-theme-store.test.ts`,
  `lib/error-handling.test.ts`.
- These are characterization tests: they lock in current behavior so plans
  005/007/009/011 can refactor safely.
- Verification: `pnpm test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm test` exits 0 with at least 3 test files and all tests passing
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `grep -n '"test"' package.json` shows the `test` script
- [ ] `vitest.config.ts` and `vitest.setup.ts` exist at repo root
- [ ] The only source change is the `export` added to `extractThemeId` in
      `lib/theme-service.ts`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 001 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file (e.g. you find you
  must modify `lib/theme-service.ts` beyond adding `export` to
  `extractThemeId`).
- `pnpm add -D` fails due to a network/registry issue.

## Maintenance notes

- When plan 005/007/011 refactor the store/service/error-handling, these tests
  are the safety net — update them in the same commit as the refactor.
- If the store's `persist` middleware changes its storage key or partialize
  shape, the store tests may need updating.
- If a future plan adds a `test:coverage` script, the `vitest.config.ts` can
  gain a `coverage` block; not needed now.