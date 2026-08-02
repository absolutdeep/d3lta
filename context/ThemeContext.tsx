"use client";

import { useEffect, ReactNode } from "react";
import { useThemeStore } from "@/store/use-theme-store";

// Provider component — the single place that applies theme CSS variables to
// the DOM and toggles the `dark` class. State lives in the Zustand store
// (useThemeStore); this provider only bridges store → <html>. The React
// Context / hook / HOC API surface was removed because nothing used it —
// components read the store directly.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const syncDarkMode = useThemeStore((s) => s.syncDarkMode);

  // Apply CSS variables + toggle the `dark` class whenever the store changes,
  // and keep it in sync with the OS color-scheme when in "system" mode.
  useEffect(() => {
    // Track the CSS vars we've injected so we can clear them when the theme
    // changes or is removed (otherwise stale vars linger on :root).
    const injectedVars = new Set<string>();

    const apply = () => {
      const state = useThemeStore.getState();
      const variables = state.getThemeVariables();
      const root = document.documentElement;

      // Clear previously-injected vars that are no longer present.
      for (const key of injectedVars) {
        if (!(key in variables)) {
          root.style.removeProperty(key);
          injectedVars.delete(key);
        }
      }

      // Set CSS variables for an imported theme (no-op if none active)
      for (const [key, value] of Object.entries(variables)) {
        root.style.setProperty(key, value);
        injectedVars.add(key);
      }

      // Toggle the `dark` class based on the store's resolved isDarkMode
      if (state.isDarkMode) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    // Apply immediately
    apply();

    // Re-apply on every theme/active-theme change
    const unsubscribe = useThemeStore.subscribe(apply);

    // Track OS preference changes for "system" mode
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      syncDarkMode();
      apply();
    };
    mql.addEventListener("change", onSystemChange);

    return () => {
      unsubscribe();
      mql.removeEventListener("change", onSystemChange);
    };
  }, [syncDarkMode]);

  return <>{children}</>;
}
