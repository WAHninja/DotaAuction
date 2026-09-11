'use client';

import { Info } from 'lucide-react';
import type { Rank } from '@/lib/stats/select';
import Tooltip from '@/app/components/stats/ui/Tooltip';

/**
 * A single figure with its league context attached.
 *
 * This is the component that stops the player view feeling like a separate
 * application. A bare "12,400g" tells you nothing about whether that is good;
 * "12,400g · 2nd of 8 · avg 6,100" carries the league frame with it, so you
 * never have to navigate back to find out where you stand.
 *
 * Rank and average are independently optional — a stat with no comparable peers
 * still renders its value rather than disappearing.
 */
export default function StatWithRank({
  label, value, rank, leagueAvg, tone = 'default', hint, hintId,
}: {
  label: string;
  /** Pre-formatted. Formatting belongs to the caller via lib/stats/format. */
  value: string;
  rank?: Rank | null;
  /** Pre-formatted league average, omitted when not meaningful. */
  leagueAvg?: string | null;
  tone?: 'default' | 'gold';
  /**
   * Explanation of what the figure means, shown on hover or focus.
   *
   * Several of these stats are invented for this app — market value and bid
   * strength have no meaning outside it — so a bare label leaves the reader
   * guessing. The standings table carries the same explanations on its column
   * headers; this puts them on the player page too, where there are no headers
   * to hang them from.
   */
  hint?: string;
  /** Required alongside hint: the tooltip needs a stable id for aria-describedby. */
  hintId?: string;
}) {
  return (
    <div className="panel-sunken px-4 py-3">
      {hint && hintId ? (
        <Tooltip id={hintId} content={hint} align="center">
          {/* The whole label is the trigger, not just the icon — a 12px target
              is awkward on touch and invisible to anyone not looking for it. */}
          <span
            className="stat-label inline-flex items-center gap-1 cursor-help"
            tabIndex={0}
            aria-describedby={hintId}
          >
            {label}
            <Info className="w-3 h-3 opacity-50 shrink-0" aria-hidden="true" />
          </span>
        </Tooltip>
      ) : (
        <p className="stat-label">{label}</p>
      )}
      <p className={`font-barlow text-xl font-bold tabular-nums mt-0.5 ${
        tone === 'gold' ? 'text-dota-gold' : 'text-dota-text'
      }`}>
        {value}
      </p>
      {(rank || leagueAvg) && (
        <p className="font-barlow text-[11px] text-dota-text-dim mt-1 tabular-nums">
          {rank && <span>{ordinal(rank.position)} of {rank.outOf}</span>}
          {rank && leagueAvg && <span className="opacity-50"> · </span>}
          {leagueAvg && <span>avg {leagueAvg}</span>}
        </p>
      )}
    </div>
  );
}

/** 1 -> 1st, 2 -> 2nd, 3 -> 3rd, 4 -> 4th, 11/12/13 -> 11th/12th/13th. */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:  return `${n}st`;
    case 2:  return `${n}nd`;
    case 3:  return `${n}rd`;
    default: return `${n}th`;
  }
}
