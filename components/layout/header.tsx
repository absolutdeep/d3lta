"use client";

import { Bell, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile brand — desktop wordmark lives in the sidebar */}
      <MobileNav />
      <span className="font-display text-sm font-bold tracking-[0.3em] text-foreground lg:hidden">
        D3LTA
      </span>

      {/* HUD search */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fuchsia-400/80" />
        <Input
          placeholder="QUERY_GRID…"
          aria-label="Search"
          className="font-mono pl-9 text-xs uppercase tracking-[0.12em]"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] font-semibold tracking-[0.2em] text-emerald-400 uppercase md:inline-flex">
          <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
          Grid online
        </span>

        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="rounded-md"
        >
          <Bell className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8 rounded-md border border-fuchsia-500/40">
          <AvatarFallback className="rounded-md bg-fuchsia-500/10 font-display text-xs font-semibold text-fuchsia-300">
            D
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
