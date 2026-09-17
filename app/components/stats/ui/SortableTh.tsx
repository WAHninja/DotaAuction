'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import Tooltip from './Tooltip';

/**
 * Sort direction indicator. Neutral chevrons when this column isn't active.
 *
 * Exported because HeroLeaderboard builds its own left-aligned Hero column
 * header rather than using SortableTh below, and still needs a matching
 * indicator. A candidate for folding into SortableTh later.
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
  colKey, label, sublabel, tooltip, tooltipId, sortKey, sortDir, onSort,
  align = 'center', className = '',
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
  /** Applied to the <th>. Exists so callers can drop a column responsively —
   *  the header and its cells must be hidden together or the table misaligns. */
  className?: string;
}) {
  const isActive = sortKey === colKey;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-3 ${align === 'right' ? 'text-right' : 'text-center'} ${className}`}
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
