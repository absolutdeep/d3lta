"use client";

import { Trash2, Palette } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/use-theme-store";
import { logger } from "@/lib/error-handling";

const SOURCE = "theme-library";

export function ThemeLibrary() {
  const {
    themeLibrary,
    activeThemeId,
    setActiveTheme,
    removeThemeFromLibrary,
  } = useThemeStore();

  const themeIds = Object.keys(themeLibrary);

  const handleActivate = (id: string) => {
    const theme = themeLibrary[id];
    if (!theme) return;

    setActiveTheme(id);
    logger.info(SOURCE, `Theme activated: ${id}`);
  };

  const handleRemove = (id: string) => {
    removeThemeFromLibrary(id);
    if (activeThemeId === id) {
      setActiveTheme(null);
    }
    logger.info(SOURCE, `Theme removed: ${id}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4" />
          Theme Library
        </CardTitle>
      </CardHeader>
      <CardContent>
        {themeIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No themes saved yet. Import one above or drag a JSON file.
          </p>
        ) : (
          <div className="space-y-2">
            {themeIds.map((id) => {
              const theme = themeLibrary[id];
              const isActive = activeThemeId === id;

              // Build a quick color preview from primary + background
              const primary =
                theme.cssVars.light["--primary"] ?? "oklch(0.5 0.2 250)";
              const bg =
                theme.cssVars.light["--background"] ?? "oklch(0.99 0 0)";

              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-md border border-border p-2"
                >
                  {/* Color swatch */}
                  <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
                    <div
                      className="h-8 w-8"
                      style={{ backgroundColor: bg }}
                      title="Background"
                    />
                    <div
                      className="h-8 w-8"
                      style={{ backgroundColor: primary }}
                      title="Primary"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {theme.name ?? id}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {theme.name ? id : "Default radius"}
                      {theme.cssVars.radius
                        ? ` · Radius: ${theme.cssVars.radius}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleActivate(id)}
                    >
                      {isActive ? "Active" : "Apply"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Remove theme ${theme.name ?? id}`}
                      onClick={() => handleRemove(id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
