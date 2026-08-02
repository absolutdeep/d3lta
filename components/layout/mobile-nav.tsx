"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Orbit } from "lucide-react";

import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Mobile drawer: replaces the (hidden below `lg`) desktop sidebar so users can
// navigate from any viewport. The Menu trigger only shows on small screens;
// the desktop sidebar remains at lg+.
export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.18)]">
              <Orbit className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-bold tracking-[0.3em]">
              D3LTA
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1.5 px-2" aria-label="Mobile">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <SheetClose key={item.href} asChild>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] transition-[background-color,color,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "border-border text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                    mobileAccent(i),
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active && "text-fuchsia-300",
                    )}
                  />
                  <span className="truncate font-display">{item.label}</span>
                </Link>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

// Per-module neon border accent, matching the desktop sidebar.
const MOBILE_ACCENTS = [
  "border-fuchsia-500/40 hover:border-fuchsia-500/70",
  "border-cyan-500/40 hover:border-cyan-500/70",
  "border-emerald-500/40 hover:border-emerald-500/70",
  "border-amber-500/40 hover:border-amber-500/70",
];

function mobileAccent(i: number) {
  return MOBILE_ACCENTS[i % MOBILE_ACCENTS.length];
}
