# d3lta — Handoff Document

**Created:** 2026-08-02  
**Project root:** `/home/deep/dev_site/d3lta`  
**Purpose of next session:** Continue building the d3lta dashboard (cyberpunk theme, web shell, dashboard features) and verify.

---

## 6. What's Next (build order for the resuming agent)

Follow this order; each item should end with a passing `pnpm run lint` + (optionally) build:

1. **Dashboard demo page** with dummy data widgets (cards, charts placeholder, solar system, theme controls)
2. **Advanced charting** (Recharts, ApexCharts) in analytics/dashboard
3. **Dashboard layout builder** (drag-and-drop widget positioning)
4. **Theme editor** (visual tweakcn property editor)
5. **User authentication** (NextAuth.js + database)
6. **Real-time updates** (WebSocket or SSE)
7. **Comprehensive test suite** (Playwright e2e)
8. **PWA manifest and offline support**
9. **i18n** (next-i18next or similar)

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