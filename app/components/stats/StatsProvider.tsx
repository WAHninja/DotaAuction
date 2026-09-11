'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { StatsPayload, Me } from '@/types';

/**
 * Fetches the stats payload and the signed-in user once, and shares both.
 *
 * Replaces the eight separate useState calls that previously lived in StatsTab.
 * They were only ever written together from a single response, so they were one
 * piece of state wearing eight hats — and any second stats surface would have
 * had to duplicate all eight declarations plus the fetch.
 *
 * `me` is the other half of the fix. StatsTab already fetched /api/me alongside
 * the stats and then discarded the result (`void meData`), leaving a comment
 * saying it would be used for head-to-head pre-selection. It never was. Every
 * player-scoped view needs to know who is signed in, so it is exposed here
 * rather than re-fetched per panel.
 *
 * Freshness is handled server-side: the stats route caches the payload for its
 * own TTL, so there is no client-side revalidation here. When the league and
 * player routes exist, mounting this above both means navigating between them
 * reuses the same fetch instead of re-requesting.
 */

type StatsContextValue = {
  payload: StatsPayload | null;
  me:      Me | null;
  loading: boolean;
  /** User-facing message, null when fine. Distinct from `payload === null`,
   *  which is also the pre-load state. */
  error:   string | null;
};

const EMPTY: StatsContextValue = {
  payload: null,
  me:      null,
  loading: true,
  error:   null,
};

// Default is undefined, not EMPTY, so useStats can actually detect a missing
// provider. Defaulting to EMPTY would make the guard below unreachable and turn
// "you forgot the provider" into a permanent silent loading state.
const StatsContext = createContext<StatsContextValue | undefined>(undefined);

/**
 * Read the shared stats state.
 *
 * Throws outside a provider rather than silently returning empty data — a panel
 * rendering "no stats yet" because someone forgot the provider is a far more
 * confusing bug than a clear error at mount.
 */
export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (ctx === undefined) {
    throw new Error('useStats must be used inside <StatsProvider>');
  }
  return ctx;
}

/** Convenience for the common case: the payload's row for the signed-in user. */
export function useMyStats() {
  const { payload, me } = useStats();
  if (!payload || !me) return null;
  return payload.players.find(p => p.username === me.username) ?? null;
}

export default function StatsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StatsContextValue>(EMPTY);

  useEffect(() => {
    // Guards against setting state after unmount, and against a slow first
    // response overwriting a newer one if this ever remounts quickly.
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, meRes] = await Promise.all([
          fetch('/api/stats', { credentials: 'include' }),
          fetch('/api/me',    { credentials: 'include' }),
        ]);

        if (!statsRes.ok) throw new Error(`stats ${statsRes.status}`);

        const statsData = await statsRes.json();

        // /api/me returning 401 is not fatal here. The stats themselves are
        // league-wide and still worth showing; only the personalised parts
        // need a user, and they can fall back to the league view.
        const meData = meRes.ok ? await meRes.json() : null;

        if (cancelled) return;

        setState({
          // Default every array. A payload missing a key — an older deploy, a
          // partial response — should blank one panel, not crash the page on
          // `.map` of undefined.
          payload: {
            // An object rather than an array, so it needs its own zeroed
            // default — `?? []` would leave the vitals strip reading
            // properties off an array and rendering undefined.
            leagueTotals: statsData.leagueTotals ?? {
              matchesCompleted: 0,
              gamesPlayed:      0,
              outrightWins:     0,
              goldWins:         0,
            },
            players:           statsData.players           ?? [],
            topWinningCombos:  statsData.topWinningCombos  ?? [],
            acquisitionImpact: statsData.acquisitionImpact ?? [],
            winStreaks:        statsData.winStreaks        ?? [],
            headToHead:        statsData.headToHead        ?? [],
            winTypeStats:      statsData.winTypeStats      ?? [],
            heroStats:         statsData.heroStats         ?? [],
            playerDotaStats:   statsData.playerDotaStats   ?? [],
          },
          me:      meData?.user ?? null,
          loading: false,
          error:   null,
        });
      } catch (err) {
        console.error('[STATS_LOAD_ERROR]', err);
        if (cancelled) return;
        setState({ payload: null, me: null, loading: false, error: 'Failed to load statistics' });
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return <StatsContext.Provider value={state}>{children}</StatsContext.Provider>;
}
