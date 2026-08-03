import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { ThemeSchema } from "@/types/theme";

type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  // Current theme state
  currentTheme: ThemeMode;
  isDarkMode: boolean;

  // Theme library
  themeLibrary: Record<string, ThemeSchema>; // id => theme
  activeThemeId: string | null;

  // UI state
  sidebarCollapsed: boolean;

  // Internal: last-seen OS "prefers dark" value (not persisted)
  _systemDark: boolean;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  addThemeToLibrary: (id: string, theme: ThemeSchema) => void;
  removeThemeFromLibrary: (id: string) => void;
  setActiveTheme: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Sync isDarkMode from currentTheme + OS preference
  syncDarkMode: () => void;

  // Derived: get current theme variables (light or dark based on currentTheme and system preference)
  getThemeVariables: () => Record<string, string>;
}

// Resolve whether dark mode is active for a given theme + OS preference
function resolveIsDark(theme: ThemeMode, systemDark: boolean): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return systemDark; // 'system'
}

function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Persist theme settings across sessions
export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentTheme: "dark",
        isDarkMode: true,
        themeLibrary: {},
        activeThemeId: null,
        sidebarCollapsed: false,
        _systemDark: false,

        // Theme actions — keep isDarkMode in sync with the chosen mode
        setTheme: (theme) =>
          set((state) => ({
            currentTheme: theme,
            isDarkMode: resolveIsDark(theme, state._systemDark),
          })),

        toggleTheme: () =>
          set((state) => {
            const newTheme: ThemeMode =
              state.currentTheme === "light" ? "dark" : "light";
            return {
              currentTheme: newTheme,
              isDarkMode: resolveIsDark(newTheme, state._systemDark),
            };
          }),

        syncDarkMode: () =>
          set((state) => {
            const systemDark = prefersDark();
            return {
              _systemDark: systemDark,
              isDarkMode: resolveIsDark(state.currentTheme, systemDark),
            };
          }),

        // Theme library management
        addThemeToLibrary: (id, theme) =>
          set((state) => ({
            themeLibrary: { ...state.themeLibrary, [id]: theme },
          })),

        removeThemeFromLibrary: (id) =>
          set((state) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [id]: _, ...rest } = state.themeLibrary;
            return { themeLibrary: rest };
          }),

        setActiveTheme: (id) => set({ activeThemeId: id }),

        // Sidebar actions
        toggleSidebar: () =>
          set((state) => ({
            sidebarCollapsed: !state.sidebarCollapsed,
          })),
        setSidebarCollapsed: (collapsed) =>
          set({ sidebarCollapsed: collapsed }),

        // Derived: get current theme variables
        getThemeVariables: () => {
          const { activeThemeId, themeLibrary, isDarkMode } = get();

          // If no active theme, return empty object (let .dark class / globals.css drive colors)
          if (!activeThemeId || !themeLibrary[activeThemeId]) {
            return {};
          }

          const theme = themeLibrary[activeThemeId];

          // Use the store's already-resolved isDarkMode (kept in sync with the
          // theme mode + OS preference). Read from state, never re-probe the
          // OS here — this is the single source of truth so the DOM never
          // disagrees with the store.
          return isDarkMode ? theme.cssVars.dark : theme.cssVars.light;
        },
      }),
      {
        name: "theme-storage", // name of the item in localStorage
        partialize: (state) => ({
          // Only persist these values
          currentTheme: state.currentTheme,
          themeLibrary: state.themeLibrary,
          activeThemeId: state.activeThemeId,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      },
    ),
  ),
);
