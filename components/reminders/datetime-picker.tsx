import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datetime-picker.css";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Number of days in a given year/month (0-based month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Build a Date preserving the time portion of `base`. */
function withTime(date: Date, base: Date): Date {
  const next = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    base.getHours(),
    base.getMinutes(),
    0,
    0,
  );
  return next;
}

function selectClasses(base: string): string {
  return cn(
    "h-8 rounded-md border border-[rgba(0,255,255,0.3)] bg-black/40 px-2 text-sm text-cyan-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
    "shadow-[0_0_4px_rgb(0,255,255)]",
    base,
  );
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

  // Reference date used to seed the dropdowns when no value is set yet.
  const now = new Date();
  const year = value ? value.getFullYear() : now.getFullYear();
  const month = value ? value.getMonth() : now.getMonth();
  const day = value ? value.getDate() : now.getDate();

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleSelect = (date: Date | null) => {
    if (!date) return;
    onChange(withTime(date, value ?? new Date()));
  };

  const handleDatePart = (part: "year" | "month" | "day", raw: string) => {
    const base = value ?? new Date();
    const nextYear = part === "year" ? Number(raw) : base.getFullYear();
    const nextMonth = part === "month" ? Number(raw) : base.getMonth();
    const maxDay = daysInMonth(nextYear, nextMonth);
    const nextDay =
      part === "day"
        ? Math.min(Number(raw), maxDay)
        : Math.min(base.getDate(), maxDay);
    onChange(withTime(new Date(nextYear, nextMonth, nextDay), base));
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
            "border-[rgba(0,255,255,0.4)] hover:border-[rgba(0,255,255,0.6)] hover:bg-[rgba(0,255,255,0.05)]",
            "text-cyan-400 dark:text-cyan-200",
            "shadow-[0_0_8px_rgb(0,255,255)] hover:shadow-[0_0_12px_rgb(0,255,255)]",
            "transition-all duration-200",
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
      <PopoverContent
        className={cn(
          "w-auto p-4 border-[rgba(0,255,255,0.3)] bg-black/60 backdrop-blur-sm",
          "shadow-[0_0_15px_rgb(0,255,255)]",
          "text-cyan-400",
          "outline-none",
          "min-w-[calc(100%+20%)]",
        )}
        align="start"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400 uppercase tracking-wider">
              DATE
            </span>
            <div className="ml-auto flex items-center gap-2">
              <select
                aria-label="Select year"
                value={year}
                onChange={(e) => void handleDatePart("year", e.target.value)}
                className={selectClasses("w-[84px]")}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                aria-label="Select month"
                value={month}
                onChange={(e) => void handleDatePart("month", e.target.value)}
                className={selectClasses("w-[116px]")}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                aria-label="Select day"
                value={day}
                onChange={(e) => void handleDatePart("day", e.target.value)}
                className={selectClasses("w-[72px]")}
              >
                {Array.from({ length: daysInMonth(year, month) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DatePicker
            inline
            selected={value ?? undefined}
            onChange={handleSelect}
            calendarStartDay={0}
            showTimeSelect
            timeIntervals={15}
            className="text-cyan-400 dark:text-cyan-200"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
