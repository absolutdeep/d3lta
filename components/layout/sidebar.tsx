"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Orbit, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";
import { useThemeStore } from "@/store/use-theme-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useThemeStore();

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 border-r border-border bg-sidebar transition-[width] duration-300 lg:flex lg:flex-col",
        sidebarCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Orbit className="h-4 w-4" />
        </div>
        {!sidebarCollapsed && (
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            d3lta
          </span>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  sidebarCollapsed && "justify-center px-2",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
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
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Collapse</span>}
          </span>
        </Button>
      </div>
    </aside>
  );
}
