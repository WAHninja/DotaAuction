'use client';

import { ShoppingCart } from 'lucide-react';
import type { PlayerStats } from '@/types';
import { MIN_SELECTION_OPPORTUNITIES } from '@/lib/stats/constants';
import { pct } from '@/lib/stats/format';

/**
 * How often this player gets picked to be sold, when their team had a choice.
 *
 * Replaces the raw "times offered" count, which conflated two very different
 * things: being chosen over a teammate, and being the only legal target on a
 * two-player side. See lib/stats/compute/selection-rate for the reasoning.
 *
 * The index is framed as a multiple of chance rather than a percentage, because
 * the baseline moves with team size — 50% on a three-player team and 25% on a
 * five-player team are the same result, and showing both as percentages invites
 * exactly the wrong comparison.
 */
export default function SelectionPanel({ core }: { core: PlayerStats }) {
  const { selectionOpportunities, selectionCount, selectionIndex } = core;

  // Renders nothing at all with no discretionary situations, rather than an
  // explanatory message. Seven panels each explaining their own absence added
  // up to a page of negatives for a new player; the page-level notice now says
  // it once.
  if (selectionOpportunities === 0) return null;

  const hasSample = selectionOpportunities >= MIN_SELECTION_OPPORTUNITIES;

  const verdict =
    selectionIndex === null ? null
    : selectionIndex >= 1.25 ? { text: 'Offered more often than chance', tone: 'text-dota-gold' }
    : selectionIndex <= 0.75 ? { text: 'Offered less often than chance', tone: 'text-dota-text-muted' }
    : { text: 'Offered about as often as chance', tone: 'text-dota-text-muted' };

  return (
    <section className="panel overflow-hidden">
      <Header />

      <div className="p-5 space-y-3">
        <div className="flex flex-wrap items-baseline gap-6">
        <div>
          <p className="stat-label">Versus chance</p>
          {hasSample && selectionIndex !== null ? (
            <p className={`font-barlow text-3xl font-bold tabular-nums ${verdict?.tone ?? ''}`}>
              {selectionIndex.toFixed(2)}×
            </p>
          ) : (
            <p
              className="font-barlow text-3xl font-bold text-dota-text-dim"
              title={`Needs ${MIN_SELECTION_OPPORTUNITIES} opportunities (has ${selectionOpportunities})`}
            >
              —
            </p>
          )}
        </div>

        <div>
          <p className="stat-label">Picked</p>
          <p className="font-barlow text-lg font-bold text-dota-text tabular-nums">
            {selectionCount} of {selectionOpportunities}
            <span className="text-dota-text-dim text-xs font-normal">
              {' '}({pct(selectionCount, selectionOpportunities)}%)
            </span>
          </p>
        </div>

        </div>

        {hasSample && verdict && (
          <p className={`font-barlow text-sm ${verdict.tone}`}>{verdict.text}</p>
        )}
      </div>

      {!hasSample && (
        <p className="font-barlow text-[11px] text-dota-text-dim px-5 pb-4">
          Needs {MIN_SELECTION_OPPORTUNITIES} opportunities before the ratio means anything.
        </p>
      )}
    </section>
  );
}

function Header() {
  return (
    <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
      <ShoppingCart className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
      <div>
        <h2 className="font-cinzel text-lg font-bold text-dota-gold">Selection</h2>
        <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
          How often teammates pick you to sell, counting only games where they had a choice
        </p>
      </div>
    </div>
  );
}
