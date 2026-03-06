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

// Flat type — no discriminated union — avoids narrowing issues with strict: false.
// retryAfterMs is 0 when allowed: true.
export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

export function rateLimit(ip: string, options: RateLimitOptions): RateLimitResult {
  const { id, limit, windowMs } = options;
  const now = Date.now();

  if (!stores.has(id)) {
    stores.set(id, new Map());
  }

  const store = stores.get(id)!;
  const entry = store.get(ip);

  // First request from this IP, or window has expired — start a fresh window.
  // Expired entries are pruned here on access rather than via a background
  // sweep, which keeps the store from accumulating entries indefinitely for
  // IPs that only ever make a handful of requests.
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  // Within the window — increment and check
  entry.count += 1;

  if (entry.count > limit) {
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Extract the real client IP from a Next.js request.
 *
 * X-Forwarded-For is a comma-separated list of IPs appended by each proxy
 * in the chain: "client, proxy1, proxy2". Render's infrastructure appends
 * the verified client IP as the LAST value — reading the first value instead
 * is unsafe because callers can inject arbitrary IPs there (e.g. sending
 * "X-Forwarded-For: 1.2.3.4" to appear as a different IP and bypass limits).
 *
 * We read the last value because that's the one Render itself wrote and
 * cannot be spoofed by the client.
 *
 * If you migrate away from Render, verify where your proxy appends the real
 * IP — some providers use the first value or a separate header (e.g.
 * CF-Connecting-IP on Cloudflare, X-Real-IP on nginx).
 */
export function getIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Last value is the one appended by Render's proxy — not spoofable.
    return forwarded.split(',').at(-1)!.trim();
  }
  return 'unknown';
}
