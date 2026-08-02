// Rigorous error logging & handling system for d3lta
// Structured error types
export type ErrorSeverity = "info" | "warn" | "error" | "critical";

export interface LogEntry {
  timestamp: string;
  severity: ErrorSeverity;
  source: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// --- Client-side logging (logger class) ---
export class Logger {
  private static instance: Logger;
  private buffer: LogEntry[] = [];
  private readonly MAX_BUFFER = 100;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.startFlushTimer();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatEntry(entry: Omit<LogEntry, "timestamp">): LogEntry {
    return { ...entry, timestamp: new Date().toISOString() };
  }

  private push(entry: LogEntry) {
    this.buffer.push(entry);
    if (this.buffer.length > this.MAX_BUFFER) {
      this.buffer.shift();
    }
    this.startFlushTimer();
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[d3lta:${entry.severity.toUpperCase()}][${entry.source}] ${entry.message}`,
      );
      if (entry.details) {
        console.log("  details:", entry.details);
      }
    }
  }

  info(source: string, message: string, details?: Record<string, unknown>) {
    this.push(this.formatEntry({ severity: "info", source, message, details }));
  }

  warn(source: string, message: string, details?: Record<string, unknown>) {
    this.push(this.formatEntry({ severity: "warn", source, message, details }));
  }

  error(source: string, message: string, details?: Record<string, unknown>) {
    this.push(
      this.formatEntry({ severity: "error", source, message, details }),
    );
  }

  critical(source: string, message: string, details?: Record<string, unknown>) {
    const entry = this.formatEntry({
      severity: "critical",
      source,
      message,
      details,
      stack: new Error().stack,
    });
    this.push(entry);
    if (process.env.NODE_ENV === "production") {
      void this.flushCritical(entry);
    }
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  // Periodically flush buffered (non-critical) entries to /api/logs so they
  // aren't silently dropped. Only runs in production; in dev the console log
  // in push() is enough. The route accepts a single entry, so we POST each.
  private startFlushTimer() {
    if (this.flushTimer || typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production") {
      this.flushTimer = setInterval(() => void this.flushBuffer(), 10000);
    }
  }

  private async flushBuffer() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    for (const entry of batch) {
      try {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            severity: entry.severity,
            source: entry.source,
            message: entry.message,
            details: entry.details,
          }),
        });
      } catch {
        // Re-queue on failure so logs aren't lost; cap to avoid unbounded growth.
        this.buffer.unshift(...batch.slice(-this.MAX_BUFFER));
        break;
      }
    }
  }

  private async flushCritical(entry: LogEntry) {
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity: entry.severity,
          source: entry.source,
          message: entry.message,
          details: entry.details,
        }),
      });
    } catch {
      // Silent fail
    }
  }
}

export const logger = Logger.getInstance();

// --- Server-side logging (API routes) ---
export function serverLog(
  severity: ErrorSeverity,
  source: string,
  message: string,
  details?: Record<string, unknown>,
) {
  console[
    severity === "critical" || severity === "error"
      ? "error"
      : severity === "warn"
        ? "warn"
        : "info"
  ](`[d3lta:${severity.toUpperCase()}][${source}]`, message, details ?? "");
}

// --- Drizzle DB error helper ---
export function dbError(source: string, operation: string, error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  serverLog("error", source, `DB ${operation} failed`, {
    operation,
    message: err.message,
    code: (error as { code?: string })?.code,
  });
  return err;
}
