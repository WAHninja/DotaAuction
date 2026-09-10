'use client';

import RankMedal from '@/app/components/RankMedal';

/**
 * Compact ranked list — medal, name, headline figure, optional sub-figure.
 *
 * Used for the short "top N" panels (win streaks, acquisition impact) where a
 * full sortable table would be heavier than the data warrants.
 */
export default function RankedList({ items, emptyMessage }: {
  items: { name: string; primary: string; sub?: string }[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="font-barlow text-xs text-dota-text-dim py-4 text-center">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={`${item.name}-${i}`} className="panel-sunken px-3 py-2.5 flex items-center gap-3">
          <RankMedal rank={i + 1} size={24} />
          <span className="font-barlow font-semibold text-sm text-dota-text truncate flex-1 min-w-0">
            {item.name}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-barlow font-bold text-sm text-dota-gold tabular-nums">
              {item.primary}
            </span>
            {item.sub && (
              <span className="font-barlow text-[10px] text-dota-text-dim tabular-nums">
                {item.sub}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
