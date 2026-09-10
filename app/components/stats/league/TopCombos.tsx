'use client';

import { useState } from 'react';
import type { TeamCombo } from '@/types';
import { pctColour } from '@/lib/stats/format';
import RankMedal from '@/app/components/RankMedal';

/**
 * The team compositions that win most often.
 *
 * Pairing-owned rather than player-owned — a combination belongs to no single
 * player, so like the hero leaderboard it lives on the league view. Moved here
 * from the dashboard stats tab during its retirement.
 *
 * Collapsed to the top five by default with a show-all toggle: the tail of this
 * list is long and mostly one-game combinations.
 */
export default function TopCombos({ combos }: { combos: TeamCombo[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? combos : combos.slice(0, 5);

  return (
    <section className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-dota-border">
        <h2 className="font-cinzel text-lg font-bold text-dota-gold">Top Winning Combinations</h2>
        <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
          Most frequent winning team compositions
        </p>
      </div>

      <div className="p-4">
        {combos.length === 0 ? (
          <p className="text-center font-barlow text-dota-text-dim py-6">No completed games yet.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {visible.map((c, i) => (
                <li key={c.combo} className="panel-sunken p-3 flex items-center gap-3">
                  <RankMedal rank={i + 1} size={24} />
                  <span className="truncate font-barlow font-semibold text-sm text-dota-text flex-1 min-w-0">
                    {c.combo}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-barlow text-xs text-dota-text-dim tabular-nums whitespace-nowrap">
                      {c.wins}W – {c.gamesPlayed - c.wins}L
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(c.winRate)}`}>
                      {c.winRate}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {combos.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="btn-ghost w-full mt-3 text-xs py-1.5"
              >
                {showAll ? 'Show less' : `Show all ${combos.length}`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
