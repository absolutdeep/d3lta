// Minimal in-memory sliding-window rate limiter for API routes.
// Per-key (default: client IP) fixed-window counter with an expiry sweep.
// Good for coarse abuse control on low-traffic local endpoints (e.g.
// /api/logs); it is NOT a distributed or memory-safe-under-load system and
// should be replaced if the app ever moves behind multiple replicas.
export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
// Sweep old buckets so a long-lived process doesn't leak memory.
let lastSweep = Date.now();

function sweep() {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now > b.resetAt) buckets.delete(key);
  }
  lastSweep = now;
}

/** @returns true if the request should be allowed, false if rate-limited. */
export function rateLimit(
  key: string,
  { windowMs = 60_000, max = 30 }: RateLimitOptions = {},
): boolean {
  const now = Date.now();
  if (now - lastSweep > 60_000) sweep();

  const current = buckets.get(key);
  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}

/** @returns how many requests remain for the key within the current window. */
export function rateLimitRemaining(
  key: string,
  { max = 30 }: RateLimitOptions = {},
): number {
  const b = buckets.get(key);
  if (!b) return max;
  const used = Math.min(b.count, max);
  return Math.max(0, max - used);
}
