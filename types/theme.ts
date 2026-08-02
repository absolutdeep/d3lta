// Theme schema types matching tweakcn JSON structure.
//
// tweakcn's /r/themes/:id endpoint returns a shadcn registry-item:
//   { name, cssVars: { theme?, light, dark } }
// The cssVars.light/dark keys are UNPREFIXED (e.g. "background"),
// so we normalize them to "--background" before applying to :root.

export interface ThemeCssVars {
  [key: string]: string;
}

export interface TweakcnCssVars {
  theme?: Record<string, string>;
  light?: Record<string, string>;
  dark?: Record<string, string>;
}

export interface ThemeSchema {
  name?: string;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
    radius?: string;
    font?: string;
    shadow?: string;
    spacing?: string;
    "letter-spacing"?: string;
  };
}

// Tweakcn URL response shape (registry-item.json)
export interface TweakcnThemeResponse {
  name?: string;
  cssVars: TweakcnCssVars;
}
