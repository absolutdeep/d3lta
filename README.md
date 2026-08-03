# d3lta

A cyberpunk-themed B2B fintech dashboard built with Next.js 16, Tailwind v4, shadcn/ui, Zustand, Drizzle ORM (libsql), and react-datepicker.

## 📚 Documentation

For complete documentation, see the [`docs/`](./docs/) directory:
- [`docs/STATUS.md`](./docs/STATUS.md) — current project status and completed features
- [`docs/HANDOFF.md`](./docs/HANDOFF.md) — handoff notes for resuming development
- [`docs/REVIEW_2026-08-02.md`](./docs/REVIEW_2026-08-02.md) — full-stack review audit
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system design details
- [`docs/PROJECT_STRUCTURE.md`](./docs/PROJECT_STRUCTURE.md) — codebase organization
- [`docs/plans/`](./docs/plans/) — detailed implementation plans (all completed)

## 🚀 Getting Started

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 🔧 Commands

```bash
pnpm run dev        # development server
pnpm run build      # production build
pnpm run lint       # ESLint check
pnpm run test       # Vitest unit tests
```

## 💻 Tech Stack

- Next.js 16.2 (App Router, Turbopack)
- Tailwind CSS v4
- shadcn/ui (Radix Nova)
- Zustand v5 (state management)
- Drizzle ORM + libsql (SQLite)
- react-datepicker v9
- @dnd-kit (drag & drop)
- Three.js
- node-pty + ws (Web Shell)
- xterm.js (terminal frontend)