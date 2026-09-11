'use client';

import { Shield } from 'lucide-react';
import type { PlayerStats } from '@/types';
import { MIN_LAST_STANDS_FOR_RATE } from '@/lib/stats/constants';
import { pct } from '@/lib/stats/format';

/**
 * Games entered alone, and how many were converted into an outright match win.
 *
 * Kept out of the ranked stat strip at the top of the page deliberately. Those
 * figures are league-comparable and carry a rank; this one is not, because the
 * number of opportunities varies enormously between players and the difficulty
 * varies with how outnumbered they were. Ranking players on it would compare
 * someone's two 1-v-2 stands against someone else's eight 1-v-4s.
 *
 * Raw counts lead, with the percentage as support rather than the headline —
 * "2 of 5" is meaningful at a sample size where "40%" is not.
 */
export default function LastStandPanel({ core }: { core: PlayerStats }) {
  const { lastStandOpportunities, lastStandWins, lastStandAvgOpponents } = core;

  // Never having been alone is ordinary rather than notable, so the panel is
  // omitted entirely instead of announcing its own absence. See the page-level
  // notice, which explains the gaps once.
  if (lastStandOpportunities === 0) return null;

  return (
    <section className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <Shield className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Last Stands</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Games entered alone — a win here ends the match outright
          </p>
        </div>
      </div>

      {(
        <div className="p-5 space-y-3">
          <div className="flex flex-wrap items-baseline gap-6">
          <div>
            <p className="stat-label">Converted</p>
            <p className="font-barlow text-3xl font-bold text-dota-gold tabular-nums">
              {lastStandWins}
              <span className="text-dota-text-muted text-lg font-normal">
                {' '}of {lastStandOpportunities}
              </span>
            </p>
          </div>

          <div>
            <p className="stat-label">Conversion rate</p>
            {lastStandOpportunities >= MIN_LAST_STANDS_FOR_RATE ? (
              <p className="font-barlow text-lg font-bold text-dota-text tabular-nums">
                {pct(lastStandWins, lastStandOpportunities)}%
              </p>
            ) : (
              <p
                className="font-barlow text-lg font-bold text-dota-text-dim"
                title={`Needs ${MIN_LAST_STANDS_FOR_RATE} last stands (has ${lastStandOpportunities})`}
              >
                —
              </p>
            )}
          </div>

          {lastStandAvgOpponents !== null && (
            <div>
              <p className="stat-label">Typically facing</p>
              <p className="font-barlow text-lg font-bold text-dota-text tabular-nums">
                {lastStandAvgOpponents}
                <span className="text-dota-text-dim text-xs font-normal"> opponents</span>
              </p>
            </div>
          )}

          </div>

          {lastStandWins > 0 && (
            <p className="font-barlow text-sm text-dota-gold">
              {lastStandWins === 1
                ? 'Won a match outright from here'
                : `Won ${lastStandWins} matches outright from here`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
