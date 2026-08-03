"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Orbit, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";
import { useThemeStore } from "@/store/use-theme-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Neon accent per nav index, echoed from the HUD pack: fuchsia / cyan /
// emerald / amber. Used to tint each nav row's border + active glow so the rail
// reads like a bank of console modules rather than a flat list.

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useThemeStore();

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-300 lg:flex lg:flex-col",
        sidebarCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.18)]">
          <Orbit className="h-4 w-4" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0 leading-tight">
            <span className="block truncate font-display text-base font-bold tracking-[0.3em] text-sidebar-foreground">
              D3LTA
            </span>
            <span className="block truncate text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Control Grid
            </span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <p
          className={cn(
            "mb-2 px-3 text-[10px] font-semibold tracking-[0.25em] text-muted-foreground uppercase",
            sidebarCollapsed && "sr-only",
          )}
        >
          Modules
        </p>
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] transition-[background-color,color,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar focus-visible:outline-none",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-border bg-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                  // collapse: hide the tracking/uppercase treatment, center icon
                  sidebarCollapsed
                    ? "justify-center border-transparent px-2 tracking-normal"
                    : navAccent(i),
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active && "text-fuchsia-300",
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="truncate font-display">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <span className="flex items-center gap-3">
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span className="text-xs uppercase tracking-[0.14em]">
                Collapse
              </span>
            </span>
          )}
        </Button>
      </div>
    </aside>
  );
}

// Apply the per-module neon border accent unless collapsed (handled above).
function navAccent(i: number) {
  return navItems[i] ? navAccents[i % navAccents.length] : "border-border";
}

const navAccents = [
  "border-fuchsia-500/40 hover:border-fuchsia-500/70",
  "border-cyan-500/40 hover:border-cyan-500/70",
  "border-emerald-500/40 hover:border-emerald-500/70",
  "border-amber-500/40 hover:border-amber-500/70",
];
