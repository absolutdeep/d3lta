# d3lta

A cyberpunk-themed B2B fintech dashboard built with Next.js 16, Tailwind v4, shadcn/ui, Zustand, Drizzle ORM (libsql), and react-datepicker.

## Features

- **Cyberpunk HUD theme** — dark/light mode with neon fuchsia/cyan/emerald accents, Orbitron display font
- **Web Shell** (`/ssh`) — local browser terminal via node-pty + WebSocket bridge
- **Theme system** — import tweakcn themes by URL/JSON, drag-and-drop, persisted library
- **Drag-and-drop reordering** — Tasks & Reminders pages with persistent sort order
- **Reminders** — react-datepicker with Year/Month/Day dropdowns, Sunday-start calendar, integrated time select
- **Tasks** — CRUD with status workflow (pending/in_progress/done)
- **System stats** — live CPU, memory, disk, process monitoring
- **Agents page** — Hermes profile browser with session history
- **Three.js solar system** — lazy-loaded 3D widget
- **Error handling** — centralized logger, ErrorBoundary, server/db helpers

## Getting Started

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Commands

```bash
pnpm run dev        # development server
pnpm run build      # production build
pnpm run lint       # ESLint check
pnpm run test       # Vitest unit tests
```

## Tech Stack

- Next.js 16.2 (App Router, Turbopack)
- Tailwind CSS v4
- shadcn/ui (Radix Nova)
- Zustand v5
- Drizzle ORM + libsql (SQLite)
- react-datepicker v9
- @dnd-kit (drag & drop)
- Three.js
- node-pty + ws (Web Shell)
- xterm.js
