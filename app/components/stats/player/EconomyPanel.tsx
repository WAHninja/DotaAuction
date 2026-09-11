'use client';

import type { PlayerStats } from '@/types';
import { pct, formatStrength } from '@/lib/stats/format';
import { MIN_OFFERS_FOR_STRENGTH } from '@/lib/stats/constants';
import GoldIcon from '@/app/components/GoldIcon';

/**
 * A player's auction economy: what they bid, what they were worth, what stuck.
 *
 * The headline figures (net gold, times sold) live in the ranked strip at the
 * top of the page. This panel carries the detail behind them — the activity
 * that produced those numbers, which is only interesting once you already know
 * the outcome.
 *
 * Rates here are shown without a minimum-sample guard, unlike win rates. An
 * acceptance rate is a description of what happened to a known, small number of
 * offers rather than an estimate of underlying skill, so "1 of 2 accepted" is a
 * complete fact rather than a noisy sample — and the raw counts sit beside it.
 *
 * Strengths are the exception and are guarded, because they are averages
 * estimating something ongoing rather than descriptions of what happened.
 *
 * Market value used to lead this panel and has moved out. It is already the
 * headline figure in the ranked strip at the top of the page, where it carries
 * a league rank and average this panel cannot show. Repeating it here gave the
 * reader the same number twice with no signal about which was authoritative.
 * What remains is the activity behind it — what they bid, what came in.
 *
 * Both gold figures that used to sit here are gone. Average offer value and net
 * gold both scaled with match length — the permitted offer range shifts and
 * widens every game — so they measured exposure rather than worth.
 */
export default function EconomyPanel({ core }: { core: PlayerStats }) {
  // A player who has neither bid nor been bid on has no economy to show — four
  // zeroes would be noise rather than information.
  if (core.offersMade === 0 && core.timesOffered === 0) return null;

  const rows: { label: string; value: string; detail?: string }[] = [
    {
      label: 'Offers made',
      value: String(core.offersMade),
      detail: core.offersMade > 0
        ? `${core.offersAccepted} accepted · ${pct(core.offersAccepted, core.offersMade)}%`
        : undefined,
    },
    {
      label: 'Offers received',
      value: String(core.timesOffered),
      // Flags how much of the raw count was forced. On two-player teams every
      // member is offered every game, so the bare number says little on its own
      // — the Selection panel breaks it down properly.
      detail: core.timesOffered > 0
        ? `${core.selectionOpportunities} with a real choice`
        : undefined,
    },
    {
      label: 'Bid strength',
      value: core.offersMade >= MIN_OFFERS_FOR_STRENGTH
        ? formatStrength(core.offerStrengthMade)
        : '—',
      detail: core.offersMade >= MIN_OFFERS_FOR_STRENGTH
        ? 'position in the range they were allowed to bid'
        : `needs ${MIN_OFFERS_FOR_STRENGTH} offers`,
    },
  ];

  return (
    <section className="panel overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <GoldIcon className="w-4 h-4 shrink-0" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Economy</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Auction activity across every match
          </p>
        </div>
      </div>

      {/* Three across at every size above mobile. This panel used to span the
          full page width; it now shares a row, so the old 2-then-3 breakpoint
          left an orphan cell on its own line at half width. */}
      <dl className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-dota-border/40 flex-1">
        {rows.map(r => (
          <div key={r.label} className="px-4 py-3">
            <dt className="stat-label">{r.label}</dt>
            <dd className="font-barlow text-lg font-bold text-dota-text tabular-nums mt-0.5">
              {r.value}
            </dd>
            {r.detail && (
              <dd className="font-barlow text-[11px] text-dota-text-dim mt-0.5 tabular-nums">
                {r.detail}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
