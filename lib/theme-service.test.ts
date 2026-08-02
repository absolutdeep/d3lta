import { describe, it, expect } from "vitest";
import {
  validateThemeJson,
  extractThemeId,
} from "@/lib/theme-service";

describe("extractThemeId", () => {
  it("extracts id from a tweakcn page URL", () => {
    expect(
      extractThemeId("https://tweakcn.com/themes/cmcup07dt000104l4hj4eferh"),
    ).toBe("cmcup07dt000104l4hj4eferh");
  });

  it("extracts id from a tweakcn raw JSON URL", () => {
    expect(
      extractThemeId("https://tweakcn.com/r/themes/cmcup07dt000104l4hj4eferh"),
    ).toBe("cmcup07dt000104l4hj4eferh");
  });

  it("extracts id from a bare id", () => {
    expect(extractThemeId("cmcup07dt000104l4hj4eferh")).toBe(
      "cmcup07dt000104l4hj4eferh",
    );
  });

  it("extracts id from a filename", () => {
    expect(extractThemeId("cmcup07dt000104l4hj4eferh.json")).toBe(
      "cmcup07dt000104l4hj4eferh",
    );
  });

  it("returns null for a non-tweakcn URL", () => {
    expect(extractThemeId("https://example.com/foo")).toBeNull();
  });

  it("returns null for a too-short string", () => {
    expect(extractThemeId("abc")).toBeNull();
  });
});

describe("validateThemeJson", () => {
  it("normalizes a raw tweakcn response (unprefixed keys) into a ThemeSchema", () => {
    const raw = {
      name: "designbyte",
      cssVars: {
        light: { background: "oklch(1 0 0)", primary: "oklch(0.5 0.2 250)" },
        dark: { background: "oklch(0.2 0 0)", primary: "oklch(0.6 0.2 250)" },
      },
    };
    const result = validateThemeJson(raw);
    expect(result.name).toBe("designbyte");
    // Unprefixed keys get normalized to --prefixed CSS custom properties.
    expect(result.cssVars.light["--background"]).toBe("oklch(1 0 0)");
    expect(result.cssVars.dark["--primary"]).toBe("oklch(0.6 0.2 250)");
  });

  it("passes a normalized ThemeSchema through unchanged", () => {
    const normalized = {
      name: "designbyte",
      cssVars: {
        light: { "--background": "oklch(1 0 0)" },
        dark: { "--background": "oklch(0.2 0 0)" },
      },
    };
    const result = validateThemeJson(normalized);
    expect(result.cssVars.light["--background"]).toBe("oklch(1 0 0)");
  });

  it("throws a ZodError on invalid input (missing cssVars)", () => {
    expect(() => validateThemeJson({ name: "x" })).toThrow();
  });
});
