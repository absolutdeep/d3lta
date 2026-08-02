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
          <SheetTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Orbit className="h-4 w-4" />
            </span>
            d3lta
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-2" aria-label="Mobile">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <SheetClose key={item.href} asChild>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
