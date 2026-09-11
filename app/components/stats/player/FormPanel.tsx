'use client';

import { TrendingUp } from 'lucide-react';
import type { AcquisitionImpact, WinStreak } from '@/types';

/**
 * The three small per-player records, gathered into one panel.
 *
 * Each of these occupied a full-width league table in the dashboard tab for
 * what is, per person, a single number. Grouped here they take one row.
 *
 * "Wins on gold" used to sit here and has been removed. How a match ended is a
 * property of the match, not of any player in it — attributing "63% of your
 * wins came on gold" to an individual implies a playstyle they may have had no
 * hand in. It is now a league fact in the vitals strip.
 *
 * Both remaining sections are independently optional: a player can have a
 * streak without ever having been traded. When neither has data the panel
 * returns null rather than rendering an empty shell.
 */
export default function FormPanel({ streak, acquisition }: {
  streak:      WinStreak | null;
  acquisition: AcquisitionImpact | null;
}) {
  const cards: { label: string; value: string; detail: string }[] = [];

  if (streak && streak.longestStreak > 0) {
    cards.push({
      label:  'Longest win streak',
      value:  String(streak.longestStreak),
      detail: `consecutive games · match #${streak.matchId}`,
    });
  }

  if (acquisition && acquisition.totalAcquisitions > 0) {
    cards.push({
      label:  'After being traded',
      value:  `${acquisition.winRate}%`,
      detail: `${acquisition.winsAfterAcquisition} of ${acquisition.totalAcquisitions} games won`,
    });
  }

  if (cards.length === 0) return null;

  return (
    <section className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <TrendingUp className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Form</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Streaks, transfers, and how wins were achieved
          </p>
        </div>
      </div>

      <div className="p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(c => (
          <div key={c.label} className="panel-sunken px-4 py-3">
            <p className="stat-label">{c.label}</p>
            <p className="font-barlow text-xl font-bold text-dota-gold tabular-nums mt-0.5">{c.value}</p>
            <p className="font-barlow text-[11px] text-dota-text-dim mt-1 tabular-nums">{c.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
