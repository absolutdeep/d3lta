# d3lta Dashboard Architecture Overview

## Executive Summary

d3lta is a Next.js 16.2.12 dashboard application featuring:
- **Dynamic theming** via tweakcn JSON schema integration
- **Drag-and-drop theme loading** using dnd-kit
- **Persistent state** with Zustand middleware
- **3D visualization** with Three.js (solar system demo)
- **Full-stack data layer** with Drizzle ORM + SQLite/libsql
- **Comprehensive error handling** with structured logging
- **Modern stack**: Next.js App Router, Tailwind v4, shadcn/ui

## Core Architecture Decisions

### 1. Theme System
**Problem**: Need to dynamically apply themes from external JSON schemas (tweakcn format) and allow user customization.

**Solution**:
- **Theme Store** (`src/store/use-theme-store.ts`): Zustand store with persistence
  - Manages current theme mode (light/dark/system)
  - Maintains theme library (saved tweakcn themes)
  - Tracks active theme ID and sidebar state
- **CSS Variable Injection**: Theme values are injected as CSS custom properties (`--background`, `--primary`, etc.) for instant UI updates
- **Theme Sources**:
  1. Direct tweakcn URL import (immediate application)
  2. Tweakcn JSON upload (saved to library)
  3. Manual theme creation (future)

**Benefits**:
- Instant theme switching without page reload
- Persistent theme preferences across sessions
- Library of user-customizable themes
- Compatible with shadcn/ui's CSS variable approach

### 2. Layout & Navigation
**Based on**: Tailwind Admin Next.js Free Template

**Structure**:
- **Responsive Sidebar**: Collapsible on xl< screens (like template)
- **Top Header**: Fixed height with user/actions
- **Content Area**: 12-column grid layout for dashboard widgets
- **Theme Provider**: Wraps entire app to provide theme context

**Components Reused/Adapted**:
- Header and sidebar layouts from template
- Shadcn/ui component library (buttons, inputs, cards, etc.)
- Utility classes for consistent spacing and styling

### 3. Drag-and-Drop Theme Loading
**Using**: @dnd-kit/core + @dnd-kit/sortable

**Implementation**:
- **Drop Zone Component** (`src/components/theme/ThemeDropzone.tsx`):
  - Accepts URLs (tweakcn theme links) and file uploads (JSON)
  - Validates dropped content against tweakcn schema
  - On success: adds to theme library and optionally applies immediately
- **Theme Library Panel** (`src/components/theme/ThemeLibrary.tsx`):
  - Displays saved themes with preview cards
  - Allows setting as active theme or deletion
- **Drag Handling**:
  - Uses `useDraggable` for source elements (if implementing drag-from-library)
  - Uses `useDroppable` for target drop zones
  - Handles `onDrop` event to extract URL/File data

### 4. Three.js Solar System Widget
**Purpose**: Demonstrate 3D capabilities in dashboard context

**Implementation** (`src/components/threejs/SolarSystem.tsx`):
- **Scene Setup**: Perspective camera, WebGL renderer, orbit controls
- **Central Sun**: Larger sphere with emissive material
- **Orbiting Planets**: 5 smaller spheres with elliptical paths
  - Position calculated using parametric equations:
    ```
    x = centerX + a * cos(t * speed)
    z = centerZ + b * sin(t * speed)
    ```
  - Each planet has unique size, color, orbit radius, and speed
- **Animation Loop**: `requestAnimationFrame` with time-based updates
- **Responsive**: Uses ResizeObserver to adapt to container size
- **Performance**: 
  - Instanced meshes for planets (if scaling to many objects)
  - Frustum culling (handled by Three.js)
  - Dispose resources on unmount

### 5. Data Layer
**Using**: Drizzle ORM + SQLite (via libsql for potential cloud sync)

**Schema Design** (`src/lib/db/schema.ts`):
- **Users**: Future authentication foundation
- **Themes**: Stores theme metadata + JSON schema
- **User Preferences**: Per-user settings (theme, sidebar state)
- **Dashboard Layouts**: Save widget configurations
- **Audit Logs**: Error tracking and user actions

**Benefits**:
- Type-safe database operations
- Migration support for schema evolution
- Query builder prevents SQL injection
- Familiar SQL-like API

### 6. Error Handling & Logging
**System**: Multi-layered approach

**Client-Side** (`src/lib/error-handling.ts`):
- **Logger Class**: Buffered logging with severity levels
- **Error Boundary**: React component that catches render errors
- **withErrorHandling Wrapper**: Async function wrapper with fallback
- **Server Logging Endpoint**: POST `/api/logs` for critical errors

**Server-Side**:
- Structured logging in API routes
- Database error handling helpers
- Audit log table for persistent error tracking

**Features**:
- Color-coded console output in development
- Production error forwarding to server
- Structured JSON logs for external log aggregation
- Graceful degradation via fallback UIs

### 7. State Management
**Primary**: Zustand for global state (theme, UI, auth)
**Alternative**: React Context (`src/context/ThemeContext.tsx`) for simpler cases
**Form State**: React Hook Form (integrated with shadcn/ui)
**Server State**: SWR or TanStack Query (for API data fetching)

### 8. Performance Optimizations
- **Code Splitting**: Dynamic imports for heavy charts/3D
- **Lazy Loading**: Images and components load on visibility
- **Memoization**: React.memo for expensive components
- **Virtualization**: For large lists/tables (future)
- **Debouncing**: Rapid updates (search, resize) use lodash.debounce
- **Image Optimization**: Next.js Image component with priority props

## Implementation Roadmap

### Phase 1: Foundation (Complete)
- Project setup with Next.js, Tailwind, shadcn
- Theme store with Zustand
- Basic layout (sidebar/header/content)
- Error logging system

### Phase 2: Theme System
- Theme library persistence — **localStorage (active) is the single source**;
  the DB `/api/themes` + `/api/preferences` routes exist but are not wired
  into the client (dormant). Decide: wire server persistence or remove the
  routes (see docs/REVIEW_2026-08-02, Batch 3).
- Drop zone for tweakcn URLs/JSON
- Theme preview and application
- CSS variable injection system

### Phase 3: Dashboard Widgets
- Overview cards (stats, metrics)
- Basic charts (recharts/apexcharts)
- Activity feed
- Three.js solar system widget

### Phase 4: Data Layer
- Drizzle ORM setup with SQLite
- Theme and preference CRUD operations
- User authentication (future)

### Phase 5: Polish & Performance
- Loading states and skeletons
- Error boundaries and fallbacks
- SEO metadata and OG tags
- PWA manifest and offline support

## File Structure Reference
See `PROJECT_STRUCTURE.md` for complete directory layout.

## Key Dependencies
- **next**: ^16.2.12 (App Router, RSC)
- **react**: ^19.2.4
- **tailwindcss**: ^4 (with @tailwindcss/postcss)
- **shadcn/ui**: ^4.16.1 (via shadcn CLI)
- **zustand**: ^4.x (state management with persist middleware)
- **dnd-kit**: ^@dnd-kit/core + @dnd-kit/sortable
- **three**: ^0.160.0 (3D graphics)
- **drizzle-orm**: ^0.30.0 (ORM)
- **libsql**: ^0.3.10 (SQLite/Wasm driver)
- **class-variance-authority**: ^0.7.1 (CVA for variants)
- **clsx**: ^2.1.1 (conditional class names)
- **tailwind-merge**: ^3.6.0 (tailwind class merging)
- **next-themes**: ^0.4.6 (system theme detection)

## Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## Environment Variables
Create `.env.local`:
```
# Database
DATABASE_URL="file:./dev.sqlite"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Feature flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

## Browser Support
- Chrome/Firefox/Safari/Edge (last 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Android

## Accessibility
- WCAG 2.1 AA compliance target
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus-visible outlines
- Color contrast ratios >= 4.5:1

## Future Enhancements
1. **User Authentication** (NextAuth.js + database)
2. **Real-time Updates** (WebSocket or Server-Sent Events)
3. **Advanced Charting** (Recharts, ApexCharts, or Chart.js with custom wrappers)
4. **Dashboard Layout Builder** (drag-and-drop widget positioning)
5. **Data Export** (CSV/JSON/PNG export for widgets)
6. **Theme Editor** (visual tweakcn property editor)
7. **Internationalization** (next-i18next or similar)
8. **Testing Suite** (Vitest + React Testing Library + Playwright)