"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

function toTimeValue(d: Date | null): string {
  if (!d) return "";
  // Local HH:mm (no timezone shift) for the <input type="time">
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  id,
  className,
  "aria-label": ariaLabel,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (day: Date | undefined) => {
    if (!day) return;
    const base = value ?? new Date();
    const next = new Date(day);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    onChange(next);
  };

  const handleTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value; // "HH:mm"
    const base = value ?? new Date();
    const next = new Date(base);
    if (t) {
      const [h, m] = t.split(":").map(Number);
      next.setHours(h, m, 0, 0);
    } else {
      next.setHours(0, 0, 0, 0);
    }
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-label={ariaLabel ?? undefined}
          data-empty={!value}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "PPP 'at' h:mm a")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="flex items-center gap-2 border-t px-3 py-3">
          <span className="text-sm text-muted-foreground">Time</span>
          <input
            type="time"
            value={toTimeValue(value)}
            onChange={handleTime}
            className="ml-auto rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
