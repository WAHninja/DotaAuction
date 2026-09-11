'use client';

import { ShoppingCart } from 'lucide-react';
import type { PlayerStats } from '@/types';
import { MIN_SELECTION_OPPORTUNITIES } from '@/lib/stats/constants';
import { pct } from '@/lib/stats/format';

/**
 * How often this player gets picked to be sold, when their team had a choice.
 *
 * Previously led with "Versus chance: 1.05×", which asked the reader to hold
 * three ideas at once — that there is a baseline, that the baseline moves with
 * team size, and that the figure is a ratio against it. None of that was on the
 * screen, so the number was unreadable without an explanation it did not carry.
 *
 * It now shows two percentages side by side: how often they were actually
 * picked, and how often pure chance would have picked them. Two like-for-like
 * figures need no explanation — and the second is where the varying team sizes
 * are quietly accounted for, since it is accumulated per opportunity rather
 * than assumed.
 *
 * The ratio still drives the verdict sentence; it is simply no longer the thing
 * the reader has to interpret.
 *
 * Background this panel exists to correct: every member of a winning team must
 * offer a teammate, so on a two-player side the offer is forced and carries no
 * judgement at all. Only games with three or more a side are counted.
 */
export default function SelectionPanel({ core }: { core: PlayerStats }) {
  const { selectionOpportunities, selectionCount, selectionExpected, selectionIndex } = core;

  // Renders nothing with no discretionary situations, rather than explaining
  // its own absence — the page-level notice covers that once.
  if (selectionOpportunities === 0) return null;

  const hasSample  = selectionOpportunities >= MIN_SELECTION_OPPORTUNITIES;
  const actualRate = pct(selectionCount, selectionOpportunities);
  const chanceRate = pct(selectionExpected, selectionOpportunities);

  const verdict =
    selectionIndex === null ? null
    : selectionIndex >= 1.25 ? { text: 'Teammates pick you more often than chance would', tone: 'text-dota-gold' }
    : selectionIndex <= 0.75 ? { text: 'Teammates pick you less often than chance would', tone: 'text-dota-text-muted' }
    : { text: 'Teammates pick you about as often as chance would', tone: 'text-dota-text-muted' };

  return (
    <section className="panel overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <ShoppingCart className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Selection</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            When a teammate could have offered someone else, how often did they pick you?
          </p>
        </div>
      </div>

      <div className="p-5 space-y-3 flex-1">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div>
            <p className="stat-label">Picked</p>
            <p className="font-barlow text-3xl font-bold text-dota-gold tabular-nums">
              {hasSample ? `${actualRate}%` : '—'}
            </p>
            <p className="font-barlow text-[11px] text-dota-text-dim mt-1 tabular-nums">
              {selectionCount} of {selectionOpportunities} times
            </p>
          </div>

          {/* The comparison that makes the figure beside it mean anything.
              Alone, 43% could be high or low depending on how many teammates
              were in the running each time. */}
          <div>
            <p className="stat-label">If it were random</p>
            <p className="font-barlow text-3xl font-bold text-dota-text-muted tabular-nums">
              {chanceRate}%
            </p>
            <p className="font-barlow text-[11px] text-dota-text-dim mt-1">
              based on how many teammates could have been picked
            </p>
          </div>
        </div>

        {hasSample && verdict ? (
          <p className={`font-barlow text-sm ${verdict.tone}`}>{verdict.text}</p>
        ) : (
          <p className="font-barlow text-[11px] text-dota-text-dim">
            Needs {MIN_SELECTION_OPPORTUNITIES} games with a real choice before the
            comparison means anything.
          </p>
        )}
      </div>
    </section>
  );
}
