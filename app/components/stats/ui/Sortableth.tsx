'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import Tooltip from './Tooltip';

/**
 * Sort direction indicator. Neutral chevrons when this column isn't active.
 *
 * Exported because several tables in StatsTab build their own header cells
 * rather than using SortableTh below, and still need a matching indicator.
 * Those are candidates for folding into SortableTh later.
 */
export function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 opacity-30" aria-hidden="true" />;
  return dir === 'desc'
    ? <ChevronDown className="w-3 h-3 text-dota-gold" aria-hidden="true" />
    : <ChevronUp   className="w-3 h-3 text-dota-gold" aria-hidden="true" />;
}

/**
 * Generic sortable table header cell.
 *
 * Generic over the column-key union so each table keeps its own key type and a
 * typo in colKey is a compile error rather than a dead click handler.
 *
 * Carries aria-sort for screen readers and a visible focus ring for keyboard
 * users — both easy to lose if a table hand-rolls its own header.
 */
export default function SortableTh<K extends string>({
  colKey, label, sublabel, tooltip, tooltipId, sortKey, sortDir, onSort, align = 'center',
}: {
  colKey: K;
  label: string;
  sublabel?: string;
  tooltip: string;
  tooltipId: string;
  sortKey: K;
  sortDir: 'asc' | 'desc';
  onSort: (key: K) => void;
  align?: 'center' | 'right';
}) {
  const isActive = sortKey === colKey;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-3 ${align === 'right' ? 'text-right' : 'text-center'}`}
    >
      <Tooltip id={tooltipId} content={tooltip} align={align === 'right' ? 'right' : 'center'}>
        <button
          type="button"
          onClick={() => onSort(colKey)}
          aria-describedby={tooltipId}
          className={`
            flex flex-col ${align === 'right' ? 'items-end' : 'items-center'} gap-0.5 mx-auto
            font-barlow font-semibold text-xs whitespace-nowrap transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold
            focus-visible:ring-offset-1 focus-visible:ring-offset-dota-deep rounded
            ${isActive ? 'text-dota-gold' : 'text-dota-text-muted hover:text-dota-text'}
          `}
        >
          <span className="flex items-center gap-1">
            {label}
            <SortIcon active={isActive} dir={sortDir} />
          </span>
          {sublabel && (
            <span className="text-[10px] opacity-40 tracking-normal normal-case font-normal">
              {sublabel}
            </span>
          )}
        </button>
      </Tooltip>
    </th>
  );
}
