"use client";

import { Moon, Sun, Monitor, Palette, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/use-theme-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const themeLibrary = useThemeStore((s) => s.themeLibrary);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const setActiveTheme = useThemeStore((s) => s.setActiveTheme);

  const themeIds = Object.keys(themeLibrary);

  const handleActivate = (id: string) => {
    const theme = themeLibrary[id];
    if (!theme) return;
    setActiveTheme(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-[transform,opacity] dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-[transform,opacity] dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {currentTheme === "light" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {currentTheme === "dark" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
          {currentTheme === "system" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>

        {themeIds.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Themes
            </DropdownMenuLabel>
            {themeIds.map((id) => {
              const theme = themeLibrary[id];
              const primary =
                theme.cssVars.light["--primary"] ?? "oklch(0.5 0.2 250)";
              const bg =
                theme.cssVars.light["--background"] ?? "oklch(0.99 0 0)";
              const isActive = activeThemeId === id;

              return (
                <DropdownMenuItem
                  key={id}
                  onClick={() => handleActivate(id)}
                  className="gap-2"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 overflow-hidden rounded-full border border-border",
                    )}
                  >
                    <span
                      className="h-full w-1/2"
                      style={{ backgroundColor: bg }}
                    />
                    <span
                      className="h-full w-1/2"
                      style={{ backgroundColor: primary }}
                    />
                  </span>
                  <span className="truncate">{theme.name ?? id}</span>
                  {isActive && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
