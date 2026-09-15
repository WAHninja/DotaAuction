/**
 * The stats cache, extracted so writers can invalidate it.
 *
 * It previously lived as a module-level variable inside the stats route, which
 * meant nothing else could reach it and freshness rested entirely on a 60
 * second TTL. That was wrong in both directions: stats lagged a finished game
 * by up to a minute, and rebuilt every minute through the hours when nobody was
 * playing at all — thirteen queries and nine full-history replays, to produce
 * byte-identical output.
 *
 * Moving the state here lets the routes that change the underlying data say so
 * directly. Freshness becomes a consequence of writes rather than of elapsed
 * time, so the cache can be both instantly correct and almost never rebuilt.
 *
 * ── Scope ───────────────────────────────────────────────────────────────────
 *
 * This is per-process memory. It works because the app runs as a single
 * long-lived Node process; on a platform that span up multiple instances each
 * would hold its own copy and invalidation would only reach one of them. The
 * TTL below is what would stop that being permanent, which is one of two
 * reasons it is still here.
 *
 * The other is that seven routes write stats-relevant data, and a future eighth
 * will be easy to forget. The TTL is the backstop for exactly that mistake —
 * long enough to be nearly free, short enough that a missed hook shows up as
 * stats that lag rather than stats that are wrong forever.
 */

import type { StatsPayload } from '@/types';

/**
 * Backstop only — invalidation is what keeps this correct.
 *
 * Raised from 60 seconds to 10 minutes. With writers invalidating directly, a
 * shorter TTL bought nothing but recomputation.
 */
export const CACHE_TTL_MS = 10 * 60 * 1_000;

type CacheEntry = { data: StatsPayload; cachedAt: number };

let cache: CacheEntry | null = null;
let inFlight: Promise<StatsPayload> | null = null;

/** What is cached, and whether it is still within the TTL. */
export function cachedStats(): { data: StatsPayload; fresh: boolean } | null {
  if (!cache) return null;
  return { data: cache.data, fresh: Date.now() - cache.cachedAt < CACHE_TTL_MS };
}

/**
 * Run a rebuild, or join the one already running.
 *
 * Holding the promise rather than the result is what stops a cold cache letting
 * every concurrent request start its own rebuild. Cleared in a finally so a
 * failed attempt does not wedge the endpoint — the next request simply retries.
 */
export function rebuildStats(build: () => Promise<StatsPayload>): Promise<StatsPayload> {
  if (!inFlight) {
    inFlight = build()
      .then(data => {
        cache = { data, cachedAt: Date.now() };
        return data;
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

/**
 * Drop the cached payload. Call after committing anything stats depend on.
 *
 * Clears rather than marking stale, deliberately. Serving stale data is right
 * when a TTL lapses and nothing has necessarily changed; it is wrong here,
 * because we know something changed — showing pre-game figures to someone who
 * has just watched a match finish is worse than making them wait a second.
 *
 * No rebuild is triggered here. During a session writes arrive in bursts as
 * offers are submitted, and eagerly rebuilding after each would do the work
 * repeatedly for nobody's benefit. The next reader pays once, and the in-flight
 * guard above means only one of them pays even if several arrive together.
 *
 * An in-progress rebuild is intentionally left alone: it will finish and write
 * a result computed before this change. That result is at most one write out of
 * date and gets corrected by the next invalidation — cancelling it would be
 * more machinery than the staleness is worth.
 */
export function invalidateStatsCache(reason: string): void {
  if (cache) {
    console.log(`[STATS_CACHE_INVALIDATED] ${reason}`);
  }
  cache = null;
}
