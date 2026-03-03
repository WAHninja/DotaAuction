// lib/rate-limit.ts
//
// Simple in-memory rate limiter keyed by IP address.
//
// Trade-offs vs a Redis-based solution:
//   • State resets on server restart — acceptable for a small friend-group app
//   • Doesn't share state across multiple instances — fine for Render's free
//     tier which runs a single instance
//   • No extra infrastructure or billing required
//
// If the app ever scales to multiple instances, swap the Map for an
// Upstash Redis store with minimal changes to the call sites.

type Entry = {
  count: number;
  windowStart: number;
};

// One map per limiter instance — isolated between login, register, etc.
// so a burst of login attempts doesn't consume the register allowance.
const stores = new Map<string, Map<string, Entry>>();

export type RateLimitOptions = {
  /** Unique name for this limiter — keeps stores isolated. */
  id: string;
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Rolling window duration in milliseconds. */
  windowMs: number;
};

export type RateLimitResult =
  | { readonly allowed: true }
  | { readonly allowed: false; retryAfterMs: number };

export function rateLimit(ip: string, options: RateLimitOptions): RateLimitResult {
  const { id, limit, windowMs } = options;
  const now = Date.now();

  if (!stores.has(id)) {
    stores.set(id, new Map());
  }
  const store = stores.get(id)!;

  const entry = store.get(ip);

  // First request from this IP, or window has expired — start a fresh window
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  // Within the window — increment and check
  entry.count += 1;

  if (entry.count > limit) {
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true };
}

/**
 * Extract the real client IP from a Next.js request.
 * Prefers the X-Forwarded-For header set by Render's proxy.
 * Falls back to a placeholder that still allows rate limiting to work
 * (all unknown-IP requests share one bucket, which is conservative but safe).
 */
export function getIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list — the first value is the
    // original client IP, subsequent values are intermediate proxies.
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
