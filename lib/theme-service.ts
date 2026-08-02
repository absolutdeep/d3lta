// Theme service — fetch, validate, apply tweakcn themes
import { z } from "zod";
import { useThemeStore } from "@/store/use-theme-store";
import { logger } from "@/lib/error-handling";
import type { ThemeSchema, TweakcnThemeResponse } from "@/types/theme";

const SOURCE = "theme-service";

// ── URL pattern helpers ───────────────────────────────────────────────────────
// tweakcn exposes two URLs per theme:
//   https://tweakcn.com/themes/<id>      → human page (contains the name in <title>)
//   https://tweakcn.com/r/themes/<id>    → raw registry JSON (contains cssVars + name)
// Either can be pasted; we resolve the JSON endpoint from the id, and (optionally)
// pull the human-friendly name from the page <title>.

export function extractThemeId(urlOrFilename: string): string | null {
  // Full tweakcn URL: https://tweakcn.com/themes/<id> or /r/themes/<id>
  const urlMatch = urlOrFilename.match(
    /tweakcn\.com\/(?:r\/)?themes\/([a-z0-9]+)/i,
  );
  if (urlMatch) return urlMatch[1];

  // Bare filename or id: <id>.json or just <id> (tweakcn ids are 10+ lowercase
  // alphanumerics, e.g. cmcup07dt000104l4hj4eferh). This lets a downloaded file
  // named by its id recover the full name from the tweakcn page.
  const base = urlOrFilename
    .replace(/\.(json|txt)$/i, "")
    .split(/[\\/?#]/)
    .pop();
  if (base && /^[a-z0-9]{10,}$/i.test(base)) return base;

  return null;
}

function isJsonEndpoint(url: string): boolean {
  return /\/r\/themes\//i.test(url);
}

function buildJsonUrl(id: string): string {
  return `https://tweakcn.com/r/themes/${id}`;
}

function buildPageUrl(id: string): string {
  return `https://tweakcn.com/themes/${id}`;
}

// ── Zod validator for the normalized ThemeSchema ───────────────────────────────
const CssVarsSchema = z.record(z.string());

const ThemeSchemaValidator = z.object({
  name: z.string().optional(),
  cssVars: z.object({
    light: CssVarsSchema,
    dark: CssVarsSchema,
    radius: z.string().optional(),
    font: z.string().optional(),
    shadow: z.string().optional(),
    spacing: z.string().optional(),
    "letter-spacing": z.string().optional(),
  }),
});

// ── Normalization: tweakcn returns UNPREFIXED keys (e.g. "background").
// Tailwind v4 + our globals.css expect the "--" prefix (e.g. "--background"). ──
function prefixVar(key: string, value: string): [string, string] {
  const normalizedKey = key.startsWith("--") ? key : `--${key}`;
  return [normalizedKey, value];
}

function normalizeVars(vars?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!vars) return out;
  for (const [k, v] of Object.entries(vars)) {
    const [pk, pv] = prefixVar(k, v);
    out[pk] = pv;
  }
  return out;
}

/**
 * Convert a raw tweakcn registry response into our normalized ThemeSchema.
 * Handles the `theme` sub-object (font/radius/tracking) and carries `name`.
 */
function toThemeSchema(raw: TweakcnThemeResponse): ThemeSchema {
  const cv = raw.cssVars ?? {};
  const themeBlock = cv.theme ?? {};

  const light = normalizeVars(cv.light);
  const dark = normalizeVars(cv.dark);

  // Pull radius/font/etc. out of the `theme` block if present
  const radius = themeBlock["radius"];
  const font = themeBlock["font-sans"];

  const schema: ThemeSchema = {
    name: raw.name,
    cssVars: {
      light,
      dark,
      ...(radius ? { radius } : {}),
      ...(font ? { font } : {}),
    },
  };
  return schema;
}

/**
 * Validate raw JSON against the tweakcn schema
 */
export function validateThemeJson(raw: unknown): ThemeSchema {
  // First normalize if it's a raw tweakcn response (has unprefixed keys)
  let normalized: unknown = raw;
  if (
    raw &&
    typeof raw === "object" &&
    "cssVars" in (raw as Record<string, unknown>) &&
    (raw as TweakcnThemeResponse).cssVars
  ) {
    normalized = toThemeSchema(raw as TweakcnThemeResponse);
  }

  const parsed = ThemeSchemaValidator.parse(normalized);
  return parsed as ThemeSchema;
}

/**
 * Extract a human-friendly theme name from the tweakcn page <title>.
 * The page title is formatted as "Name - tweakcn" (or similar).
 * Returns null if it can't be determined.
 */
export function extractNameFromPage(html: string): string | null {
  // Prefer <title>Name - tweakcn</title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].trim();
    // Strip a trailing " - tweakcn" / " | tweakcn" / " – tweakcn"
    const name = title.replace(/\s*[–\-|]\s*tweakcn\s*$/i, "").trim();
    if (name && name.toLowerCase() !== "tweakcn") {
      return name;
    }
  }
  // Fallback: og:title
  const ogMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
  );
  if (ogMatch) {
    const name = ogMatch[1].replace(/\s*[–\-|]\s*tweakcn\s*$/i, "").trim();
    if (name) return name;
  }
  return null;
}

/**
 * Fetch the human-readable theme name from the /themes/:id page.
 * Used when only the JSON endpoint was supplied, or to prefer the page's label.
 */
export async function fetchThemeName(id: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/themes/name?url=${encodeURIComponent(buildPageUrl(id))}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { name: string | null };
    return data.name;
  } catch (err) {
    logger.warn(
      SOURCE,
      `Could not fetch theme name from page: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

/**
 * Fetch theme JSON from a tweakcn URL (the /r/themes/:id endpoint).
 * Accepts both the theme page URL and the raw JSON endpoint URL.
 */
export async function fetchThemeFromUrl(url: string): Promise<ThemeSchema> {
  logger.info(SOURCE, `Fetching theme from URL: ${url}`);

  const id = extractThemeId(url);

  let jsonUrl = url;
  if (id && !isJsonEndpoint(url)) {
    jsonUrl = buildJsonUrl(id);
    logger.info(SOURCE, `Resolved JSON endpoint: ${jsonUrl}`);
  }

  const res = await fetch(jsonUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch theme: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as TweakcnThemeResponse;
  const theme = toThemeSchema(data);

  // Resolve a friendly name:
  // 1) If the JSON already carries `name`, use it.
  // 2) Otherwise, if we have an id, fetch the page <title>.
  // 3) As a last resort, fall back to the id itself.
  if (!theme.name || theme.name.trim() === "") {
    if (id) {
      const pageName = await fetchThemeName(id);
      if (pageName) theme.name = pageName;
    }
    if (!theme.name) theme.name = id ?? "Imported Theme";
  }

  return theme;
}

/**
 * Read and validate a JSON File object (from file upload / drag-and-drop)
 *
 * Name resolution for JSON-only uploads:
 *  1) If the file content has a `name`, use it.
 *  2) Else if the filename is a tweakcn id (e.g. `cmcup07dt…json`), fetch the
 *     theme page to recover the full name from its <title>.
 *  3) Else humanize the filename (strip .json, replace -/_ with spaces).
 */
export async function validateThemeFile(file: File): Promise<ThemeSchema> {
  logger.info(SOURCE, `Reading file: ${file.name} (${file.size} bytes)`);
  const text = await file.text();
  const data = JSON.parse(text) as TweakcnThemeResponse;
  const theme = validateThemeJson(data);

  if (!theme.name || theme.name.trim() === "") {
    const id = extractThemeId(file.name);
    if (id) {
      const pageName = await fetchThemeName(id);
      if (pageName) theme.name = pageName;
    }
    if (!theme.name || theme.name.trim() === "") {
      // Humanize the filename: drop .json, swap separators for spaces
      const base = file.name.replace(/\.json$/i, "");
      const human = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
      theme.name = human || "Imported Theme";
    }
  }

  return theme;
}

/**
 * Build a stable, human-readable id for a theme from a URL.
 * Uses the id from the URL path; falls back to the theme name; then timestamp.
 */
function deriveThemeId(url: string, name?: string): string {
  const id = extractThemeId(url);
  if (id) return id;
  if (name) return name.replace(/\s+/g, "-").toLowerCase();
  return Date.now().toString();
}

/**
 * Fetch a theme, validate, apply, and save to Zustand store.
 * The display name is taken from the theme page (per id) when available.
 */
export async function importThemeFromUrl(url: string): Promise<{
  success: boolean;
  message: string;
  themeId?: string;
}> {
  try {
    const theme = await fetchThemeFromUrl(url);
    const { addThemeToLibrary, setActiveTheme } = useThemeStore.getState();

    const themeId = deriveThemeId(url, theme.name);

    addThemeToLibrary(themeId, theme);
    setActiveTheme(themeId);

    logger.info(
      SOURCE,
      `Theme imported and applied: ${themeId} (${theme.name})`,
    );
    return {
      success: true,
      message: `Theme "${theme.name ?? themeId}" applied successfully`,
      themeId,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(SOURCE, `Failed to import theme from URL: ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * Import a theme from a File object (JSON upload)
 */
export async function importThemeFromJsonFile(file: File): Promise<{
  success: boolean;
  message: string;
  themeId?: string;
}> {
  try {
    const theme = await validateThemeFile(file);
    const { addThemeToLibrary, setActiveTheme } = useThemeStore.getState();

    const themeId =
      (theme.name && theme.name.replace(/\s+/g, "-").toLowerCase()) ||
      file.name.replace(/\.json$/i, "") ||
      Date.now().toString();

    addThemeToLibrary(themeId, theme);
    setActiveTheme(themeId);

    logger.info(SOURCE, `Theme imported from file: ${themeId} (${theme.name})`);
    return {
      success: true,
      message: `Theme "${theme.name ?? themeId}" applied successfully`,
      themeId,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(SOURCE, `Failed to import theme from file: ${error.message}`);
    return { success: false, message: error.message };
  }
}
