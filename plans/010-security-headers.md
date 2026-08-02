# Plan 010: Add security headers (CSP) to next.config

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- next.config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

`next.config.ts` is empty (just `const nextConfig: NextConfig = {}`), so the
app ships with **no security headers**. `ARCHITECTURE.md` §Security explicitly
lists "CSP headers in next.config.js" as a plan, but it was never implemented.
Without a Content-Security-Policy, the app is more exposed to XSS, and without
`X-Content-Type-Options`/`Referrer-Policy`/`X-Frame-Options` it's missing
cheap, standard hardening.

The fix: add a `headers()` function to `next.config.ts` that sets a reasonable
CSP and other security headers. The CSP must allow the app's actual resources:
Next.js inline scripts/styles (needs `'unsafe-inline'` for styles or a nonce),
Google Fonts (loaded via `next/font/google`), and the Three.js WebGL canvas
(no special CSP directive needed, but `img-src`/`connect-src` should be
considered).

## Current state

- `next.config.ts` (7 lines):
  ```ts
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    /* config options here */
  };

  export default nextConfig;
  ```
- The app loads:
  - Google Fonts via `next/font/google` in `app/layout.tsx` (Geist/Geist_Mono).
  - Three.js WebGL in `components/threejs/solar-system.tsx` (client-side,
    dynamically imported per plan 006).
  - `fetch` calls to `/api/*` (same-origin) and to `https://tweakcn.com/...`
    in `lib/theme-service.ts` (client-side theme import).
  - Inline styles set via `document.documentElement.style.setProperty` in
    `context/ThemeContext.tsx` (theme CSS vars).

**Repo conventions to match**:
- `next.config.ts` is TypeScript, `import type { NextConfig } from "next"`.
- The app is a Next.js App Router app; headers are configured via the
  `headers()` async function in `next.config.ts`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `next.config.ts`

**Out of scope** (do NOT touch):
- Any source file under `app/`, `components/`, `lib/`, `store/`, `context/`,
  `types/`.
- The theme-service's `fetch` to tweakcn — if the CSP blocks it, that's a
  separate concern (see Step 2 note and STOP conditions).

## Git workflow

- Branch: `advisor/010-security-headers`
- Commit message style: conventional commits, e.g.
  `security: add CSP and security headers to next.config`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the `headers()` function

In `next.config.ts`, add a `headers()` async function that returns security
headers for all routes. A reasonable starting CSP for this app:

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://tweakcn.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

**Important notes on the CSP choices**:
- `script-src 'unsafe-inline' 'unsafe-eval'`: Next.js injects inline scripts
  and, in dev, uses eval. `'unsafe-eval'` is needed for Turbopack dev; in a
  production build you may be able to drop it, but keeping it avoids breaking
  dev. This is a pragmatic starting point, not a maximally-strict CSP.
- `style-src 'unsafe-inline'`: required because the theme system sets inline
  styles via `document.documentElement.style.setProperty` and Tailwind injects
  inline styles.
- `connect-src 'self' https://tweakcn.com`: allows the theme-service's
  client-side fetch to tweakcn. If you prefer to block it (the fetch is
  CORS-blocked anyway per `docs/STATUS.md`), you can remove
  `https://tweakcn.com` — but keep it for now to avoid breaking the theme
  import feature.
- `img-src data: blob:`: allows the Three.js canvas and any data-URI images.

**Verify**: `npx tsc --noEmit` exits 0.

### Step 2: Verify the build

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
```

**Verify**: all three exit 0.

### Step 3: Manual smoke test (optional but recommended)

If a dev server is available, check the headers on a response:

```bash
curl -sI http://localhost:3000/ | grep -i "content-security-policy"
```

**Verify**: the `Content-Security-Policy` header is present. Also load the app
in a browser and confirm:
1. The page renders without console CSP violations.
2. The theme toggle still works (inline styles allowed).
3. The solar system on `/visuals` still renders (WebGL not blocked).

**Verify**: no CSP violations in the browser console; the app functions.

## Test plan

- No new tests. This is a config change; the verification is the build +
  typecheck + lint passing, plus the manual header check and browser smoke
  test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "Content-Security-Policy" next.config.ts` matches
- [ ] `grep -n "async headers" next.config.ts` matches
- [ ] `grep -n "X-Content-Type-Options" next.config.ts` matches
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 010 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The build fails because the CSP breaks a Next.js feature (e.g. the dev server
  needs a directive not included) — stop and report the specific violation
  rather than loosening the CSP blindly.
- The browser smoke test shows the theme import to tweakcn is blocked by the
  CSP in a way that breaks the feature — stop and report; the fix may be to
  remove `https://tweakcn.com` from `connect-src` (it's CORS-blocked anyway).

## Maintenance notes

- This is a **starting** CSP, deliberately permissive (`'unsafe-inline'` for
  scripts/styles) to avoid breaking the app. Tightening it (e.g. using a nonce
  for scripts, dropping `'unsafe-eval'` in production) is a follow-up that
  requires Next.js nonce support — out of scope here.
- If the app adds new external origins (analytics, CDNs), add them to the
  relevant CSP directive (`connect-src`, `img-src`, `script-src`).
- The `Permissions-Policy` disables camera/mic/geolocation; if a future feature
  needs them, remove the corresponding entry.
- `ARCHITECTURE.md` §Security lists CSP as a plan — after this lands, that
  item is done; consider updating the doc.