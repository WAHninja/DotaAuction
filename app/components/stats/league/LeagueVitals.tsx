'use client';

import type { StatsPayload } from '@/types';
import { pct } from '@/lib/stats/format';

/**
 * League-wide totals — the figures that belong to nobody in particular.
 *
 * Every number here is a straight sum over fields the payload already exposes.
 * That constraint is deliberate: a total that cannot be derived honestly is
 * left out rather than approximated. Games played, for instance, is not shown —
 * summing players' gamesPlayed counts each game once per participant, and the
 * payload carries no match or game count to divide by.
 */
export default function LeagueVitals({ payload }: { payload: StatsPayload }) {
  const { players, winTypeStats } = payload;

  const offersMade     = players.reduce((n, p) => n + p.offersMade, 0);
  const offersAccepted = players.reduce((n, p) => n + p.offersAccepted, 0);
  const goldWins       = winTypeStats.reduce((n, w) => n + w.goldThresholdWins, 0);
  const standingWins   = winTypeStats.reduce((n, w) => n + w.lastStandingWins, 0);
  const totalWins      = goldWins + standingWins;

  const vitals: { label: string; value: string; sub?: string }[] = [
    {
      label: 'Players',
      value: String(players.length),
    },
    {
      label: 'Offers made',
      value: offersMade.toLocaleString(),
      sub: offersMade > 0 ? `${pct(offersAccepted, offersMade)}% accepted` : undefined,
    },
    {
      label: 'Trades completed',
      value: offersAccepted.toLocaleString(),
    },
    {
      label: 'Matches decided',
      value: String(totalWins),
      // Only meaningful once something has been won — "0% by gold" on an empty
      // league is a statistic about nothing.
      sub: totalWins > 0 ? `${pct(goldWins, totalWins)}% on gold` : undefined,
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {vitals.map(v => (
        <div key={v.label} className="panel-sunken px-4 py-3">
          <p className="stat-label">{v.label}</p>
          <p className="font-barlow text-xl font-bold text-dota-text tabular-nums mt-0.5">{v.value}</p>
          {v.sub && (
            <p className="font-barlow text-[11px] text-dota-text-dim mt-1 tabular-nums">{v.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
