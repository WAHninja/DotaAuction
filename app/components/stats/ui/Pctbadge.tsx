'use client';

import { pct, pctColour } from '@/lib/stats/format';

/**
 * A win/success rate rendered as a coloured badge with its raw fraction.
 *
 * This is the single place a rate becomes a percentage on screen. Route every
 * rate through it rather than formatting inline, so the confidence rule below
 * is applied consistently — a table that formats its own percentages will
 * eventually show "67%" from three games as though it were solid.
 *
 * Renders an em-dash when there is no data at all, and also when total falls
 * below minGames, with the shortfall explained in the title attribute.
 */
export default function PctBadge({ success, total, minGames = 0 }: {
  success: number;
  total: number;
  minGames?: number;
}) {
  if (total === 0) return <span className="text-dota-text-dim text-xs">—</span>;

  if (total < minGames) {
    return (
      <span className="text-dota-text-dim text-xs" title={`Need ${minGames} (has ${total})`}>—</span>
    );
  }

  const rate = pct(success, total);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(rate)}`}>
      {rate}%
      <span className="text-[10px] opacity-50 font-normal">{success}/{total}</span>
    </span>
  );
}
