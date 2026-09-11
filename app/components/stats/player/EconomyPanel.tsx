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
 * Both gold figures that used to sit here are gone. Average offer value and net
 * gold both scaled with match length — the permitted offer range shifts and
 * widens every game — so they measured exposure rather than worth.
 */
export default function EconomyPanel({ core }: { core: PlayerStats }) {
  const rows: { label: string; value: string; detail?: string }[] = [
    {
      label: 'Offers made',
      value: String(core.offersMade),
      detail: core.offersMade > 0
        ? `${core.offersAccepted} accepted · ${pct(core.offersAccepted, core.offersMade)}%`
        : undefined,
    },
    {
      label: 'Market value',
      value: core.timesOffered >= MIN_OFFERS_FOR_STRENGTH
        ? formatStrength(core.offerStrengthReceived)
        : '—',
      detail: core.timesOffered >= MIN_OFFERS_FOR_STRENGTH
        ? 'avg offer received, share of range'
        : `needs ${MIN_OFFERS_FOR_STRENGTH} offers`,
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
        ? 'how hard they bid, share of range'
        : `needs ${MIN_OFFERS_FOR_STRENGTH} offers`,
    },
  ];

  return (
    <section className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <GoldIcon className="w-4 h-4 shrink-0" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Economy</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Auction activity across every match
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-dota-border/40">
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
