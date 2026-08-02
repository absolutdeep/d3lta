import { beforeEach, describe, it, expect, vi } from "vitest";

// Stub matchMedia before importing the store (jsdom has no matchMedia).
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

// Import after the stub is in place.
const { useThemeStore } = await import("@/store/use-theme-store");

const sampleTheme = {
  name: "designbyte",
  cssVars: {
    light: { "--background": "oklch(1 0 0)" },
    dark: { "--background": "oklch(0.2 0 0)" },
  },
} as const;

beforeEach(() => {
  useThemeStore.setState({
    currentTheme: "system",
    isDarkMode: false,
    themeLibrary: {},
    activeThemeId: null,
    sidebarCollapsed: false,
    _systemDark: false,
  });
});

describe("useThemeStore", () => {
  it("has correct initial state", () => {
    const s = useThemeStore.getState();
    expect(s.currentTheme).toBe("system");
    expect(s.isDarkMode).toBe(false);
    expect(s.themeLibrary).toEqual({});
    expect(s.activeThemeId).toBeNull();
    expect(s.sidebarCollapsed).toBe(false);
  });

  it("setTheme('dark') sets isDarkMode true", () => {
    useThemeStore.getState().setTheme("dark");
    expect(useThemeStore.getState().isDarkMode).toBe(true);
  });

  it("setTheme('light') sets isDarkMode false", () => {
    useThemeStore.getState().setTheme("light");
    expect(useThemeStore.getState().isDarkMode).toBe(false);
  });

  it("toggleTheme from light goes to dark", () => {
    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDarkMode).toBe(true);
  });

  it("addThemeToLibrary then getThemeVariables returns light vars for active theme", () => {
    useThemeStore.getState().addThemeToLibrary("t1", sampleTheme as never);
    useThemeStore.getState().setActiveTheme("t1");
    useThemeStore.getState().setTheme("light");
    expect(useThemeStore.getState().getThemeVariables()).toEqual({
      "--background": "oklch(1 0 0)",
    });
  });

  it("removeThemeFromLibrary removes the key", () => {
    useThemeStore.getState().addThemeToLibrary("t1", sampleTheme as never);
    useThemeStore.getState().removeThemeFromLibrary("t1");
    expect(useThemeStore.getState().themeLibrary).toEqual({});
  });

  it("setActiveTheme(null) clears the active theme", () => {
    useThemeStore.getState().setActiveTheme(null);
    expect(useThemeStore.getState().activeThemeId).toBeNull();
  });

  it("toggleSidebar flips sidebarCollapsed", () => {
    const before = useThemeStore.getState().sidebarCollapsed;
    useThemeStore.getState().toggleSidebar();
    expect(useThemeStore.getState().sidebarCollapsed).toBe(!before);
  });
});
