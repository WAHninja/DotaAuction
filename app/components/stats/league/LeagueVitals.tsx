'use client';

import type { LeagueTotals } from '@/types';
import { pct } from '@/lib/stats/format';

/**
 * League-wide totals — the figures that belong to nobody in particular.
 *
 * Now sourced from match- and game-level counts rather than sums of per-player
 * fields. The previous version showed players, offers made and trades
 * completed; all three were dropped deliberately:
 *
 *   - Player count is a constant for a fixed group of friends, so it carries no
 *     information and occupied a quarter of the strip.
 *   - Trades completed tracks games played almost exactly, since a game
 *     normally resolves one trade — it was a second copy of a number already on
 *     screen.
 *   - Offers made is a function of participation rather than a league fact.
 *
 * What replaced them answers the question the strip should answer: how much has
 * been played, and how do matches actually end.
 */
export default function LeagueVitals({ totals }: { totals: LeagueTotals }) {
  const { matchesCompleted, gamesPlayed, outrightWins, goldWins } = totals;

  // Decided matches, not matchesCompleted — a finished match with no recorded
  // win_type would otherwise drag the split below 100% with no explanation.
  const decided = outrightWins + goldWins;

  const vitals: { label: string; value: string; sub?: string }[] = [
    {
      label: 'Matches completed',
      value: matchesCompleted.toLocaleString(),
    },
    {
      label: 'Games played',
      value: gamesPlayed.toLocaleString(),
      sub: matchesCompleted > 0
        ? `${(gamesPlayed / matchesCompleted).toFixed(1)} per match`
        : undefined,
    },
    {
      label: 'Won outright',
      value: outrightWins.toLocaleString(),
      sub: decided > 0 ? `${pct(outrightWins, decided)}% of matches` : undefined,
    },
    {
      label: 'Won on gold',
      value: goldWins.toLocaleString(),
      sub: decided > 0 ? `${pct(goldWins, decided)}% of matches` : undefined,
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
