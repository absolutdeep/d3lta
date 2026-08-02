# d3lta Project Structure

## Root
- `/app` - Next.js app router
- `/components` - React components
- `/src` - Source code (business logic, hooks, utils)
- `/public` - Static assets
- `/styles` - Global CSS (if not in app/)
- `/scripts` - Utility scripts
- `/tests` - Test files

## Detailed Structure

### /app
```
app/
├── layout.tsx          # Root layout with ThemeProvider
├── page.tsx            # Home page (dashboard)
├── loading.tsx         # Global loading UI
├── error.tsx           # Global error boundary
├── not-found.tsx       # 404 page
├── dashboard/          # Dashboard routes
│   ├── layout.tsx      # Dashboard layout (sidebar + header)
│   ├── page.tsx        # Dashboard index
│   └── widgets/        # Widget components
├── api/                # API routes
│   ├── themes/         # Theme management endpoints
│   │   ├── route.ts    # GET/POST /api/themes
│   │   └── [id]/route.ts # GET/PUT/DELETE /api/themes/:id
│   ├── preferences/    # User preferences
│   │   └── route.ts
│   ├── logs/           # Logging endpoint
│   │   └── route.ts    # POST /api/logs (receive client errors)
│   └── health/         # Health checks
│       └── route.ts
├── auth/               # Authentication (future)
│   └── [...nextauth]/  # NextAuth route
└── (theme-preview)/    # Theme preview route (optional)
    └── page.tsx
```

### /components
```
components/
├── ui/                 # Shadcn UI components (button, input, etc.)
├── layout/             # Layout components
│   ├── header.tsx      # Top header
│   ├── sidebar.tsx     # Collapsible sidebar
│   └── breadcrumbs.tsx # Breadcrumb navigation
├── widgets/            # Dashboard widgets
│   ├── overview/       # Stats overview
│   ├── charts/         # Chart components (recharts, apexcharts, or three.js)
│   ├── tables/         # Data tables
│   └── activity/       # Activity feed
├── theme/              # Theme-specific components
│   ├── ThemeDropzone.tsx     # DnD drop zone for theme URLs
│   ├── ThemeLibrary.tsx      # Panel to manage saved themes
│   ├── ThemePreview.tsx      # Preview theme before applying
│   └── ThemeToggle.tsx       # Light/dark/system toggle
├── threejs/            # Three.js components
│   └── SolarSystem.tsx # Solar system visualization
└── ui-kit/             # Custom UI components beyond shadcn
```

### /src
```
src/
├── lib/                # Library code (utils, services, etc.)
│   ├── db/             # Database layer
│   │   ├── schema.ts   # Drizzle schema
│   │   ├── client.ts   # Database client
│   │   └── migrations/ # Migration scripts
│   ├── theme/          # Theme service
│   │   ├── service.ts  # Theme operations
│   │   └── types.ts    # Theme schema types
│   ├── api/            # API service layer
│   │   └── client.ts   # HTTP client for API calls
│   ├── error-handling/ # Error handling utilities
│   │   └── index.ts    # Logger, ErrorBoundary, withErrorHandling
│   └── utils/          # General utilities
│       ├── date-utils.ts
│       ├── string-utils.ts
│       └── validation.ts
├── store/              # Zustand stores
│   ├── use-theme-store.ts      # Theme state
│   ├── use-ui-store.ts         # UI state (sidebar, modals, etc.)
│   └── use-auth-store.ts       # Auth state (future)
├── context/            # React context providers
│   ├── ThemeContext.tsx    # Theme context (alternative to Zustand)
│   └── AuthContext.tsx     # Auth context (future)
├── hooks/              # Custom React hooks
│   ├── use-theme.ts      # Hook to consume theme
│   ├── use-dnd.ts        # Hook for drag-and-drop operations
│   └── use-api.ts        # Hook for API requests
└── types/              # TypeScript types
    ├── theme.ts        # Theme schema types
    ├── api.ts          # API response types
    └── index.ts        # Barrel export
```

### /public
```
public/
├── favicon.ico
├── manifest.json
├── robots.txt
├── globe.svg           # From current project
├── window.svg          # From current project
└── file.svg            # From current project
```

### Configuration Files
```
- package.json          # Dependencies and scripts
- next.config.ts        # Next.js configuration
- tsconfig.json         # TypeScript configuration
- postcss.config.mjs    # PostCSS/Tailwind configuration
- components.json       # Shadcn configuration
- tailwind.css          # Base Tailwind import (if needed)
- .eslintrc.json        # ESLint configuration
- .gitignore            # Git ignore rules
- README.md             # Project documentation
```

### Database (SQLite file)
```
- dev.sqlite            # Development database (in .devserver or root)
```

## Key Implementation Notes

1. **Theme System**: 
   - Uses zustand for client-side state with persistence
   - Themes stored in database for multi-user support
   - CSS variables injected into :root for immediate theme switching

2. **Error Handling**:
   - Centralized logger service with severity levels
   - React Error Boundary for graceful UI degradation
   - Server-side logging endpoint for critical errors
   - Database audit log for persistent error tracking

3. **Performance**:
   - Lazy load heavy components (charts, three.js)
   - Use React.memo for expensive components
   - Implement virtualization for large lists/tables
   - Debounce rapid UI updates (drag events, search)

4. **Security**:
   - API routes validate input
   - Database uses parameterized queries
   - Sanitize any user-generated content
   - CSP headers in next.config.js

5. **Development Experience**:
   - Strict TypeScript with noImplicitAny
   - ESLint with plugin:@typescript-eslint/recommended
   - Prettier for code formatting
   - Husky + lint-staged for pre-commit hooks

6. **Testing Strategy** (for future):
   - Unit tests with Vitest
   - Component tests with React Testing Library
   - E2E tests with Playwright
   with Playwright
   - Mock Service Worker for API mocking