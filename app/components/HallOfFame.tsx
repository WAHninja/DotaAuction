import { Trophy, Zap, Scale, Swords } from 'lucide-react';
import type { HallOfFameEntry, HallOfFameRecord, HallOfFameProps } from '@/types';

// Re-export so any existing import from this file doesn't break while
// callers migrate to importing from '@/types' directly.
export type { HallOfFameEntry, HallOfFameRecord, HallOfFameProps };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Entries are capped at 3 for rendering regardless of how many the API
// returns. This guards against RANK_STYLES / RANK_LABELS index going out of
// bounds — accessing index 3 on a length-3 tuple gives undefined, which
// Tailwind silently drops (className) or renders as the string "undefined" (text).
const MAX_RANK = 3;

const RANK_STYLES = [
  'text-dota-gold',
  'text-dota-text-muted',
  'text-amber-600',
] as const;

const RANK_LABELS = ['🥇', '🥈', '🥉'] as const;

// ---------------------------------------------------------------------------
// Tooltip
//
// Follows the same accessible pattern used in StatsTab:
//   • The visible title is wrapped in a <button> so it's in the tab order
//     and activatable with Enter / Space.
//   • The tooltip div carries role="tooltip" and a unique id.
//   • The button carries aria-describedby pointing at that id.
//   • Visibility is driven by group-hover AND group-focus-within so keyboard
//     users see the tooltip when the button is focused.
// ---------------------------------------------------------------------------

function Tooltip({ id, content, label }: { id: string; content: string; label: string }) {
  return (
    <div className="relative group min-w-0">
      <button
        type="button"
        aria-describedby={id}
        className="
          stat-label truncate text-left
          border-b border-dotted border-dota-text-dim
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-dota-gold focus-visible:ring-offset-1
          focus-visible:ring-offset-dota-raised rounded-sm
        "
      >
        {label}
      </button>
      <div
        id={id}
        role="tooltip"
        className="
          pointer-events-none
          absolute bottom-full left-0 mb-2 z-20
          w-56 px-3 py-2 rounded
          bg-dota-raised border border-dota-border-bright
          font-barlow text-xs text-dota-text-muted leading-snug
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-opacity duration-150
          whitespace-normal
        "
      >
        {content}
        <span
          aria-hidden="true"
          className="absolute top-full left-4 border-4 border-transparent border-t-dota-border-bright"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordEntry
// ---------------------------------------------------------------------------

function RecordEntry({ entry, rank }: { entry: HallOfFameEntry; rank: number }) {
  // rank is guaranteed 0–2 at call site (entries sliced to MAX_RANK before mapping)
  const rankStyle = RANK_STYLES[rank];
  const rankLabel = RANK_LABELS[rank];
  const isFirst   = rank === 0;

  return (
    <div className="flex items-baseline justify-between gap-2 min-w-0">
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className={`text-xs shrink-0 ${rankStyle}`}>
          {rankLabel}
        </span>
        <span className={`font-cinzel font-bold text-sm leading-tight truncate ${isFirst ? 'text-inherit' : 'text-dota-text'}`}>
          {entry.holder}
        </span>
      </div>
      <span className="font-barlow text-xs font-semibold text-dota-text-muted tabular-nums shrink-0">
        {entry.stat}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlaceholderSkeleton
//
// Matches the actual RecordEntry layout: rank badge | name bar | stat bar.
// aria-hidden so screen readers skip decorative loading chrome entirely.
// ---------------------------------------------------------------------------

function PlaceholderSkeleton() {
  return (
    // aria-hidden — purely decorative; a loading message is conveyed by
    // context (no data exists yet), not by these placeholder shapes.
    <div className="space-y-1.5 py-0.5" aria-hidden="true">
      {[...Array(MAX_RANK)].map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          {/* rank badge placeholder */}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-4 rounded bg-dota-border/40 shrink-0" />
            {/* name placeholder — different widths to feel natural */}
            <div className={`h-3 rounded bg-dota-border/30 ${i === 0 ? 'w-20' : i === 1 ? 'w-16' : 'w-12'}`} />
          </div>
          {/* stat placeholder */}
          <div className="h-3 w-10 rounded bg-dota-border/20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordCard
// ---------------------------------------------------------------------------

function RecordCard({
  icon: Icon,
  title,
  tooltip,
  tooltipId,
  record,
  accentClass,
  iconBgClass,
}: {
  icon: React.ElementType;
  title: string;
  tooltip: string;
  tooltipId: string;
  record: HallOfFameRecord;
  accentClass: string;
  iconBgClass: string;
}) {
  // Clamp to MAX_RANK so RANK_STYLES / RANK_LABELS are never accessed
  // out of bounds, even if the API is ever changed to return more entries.
  const entries = record ? record.slice(0, MAX_RANK) : null;

  return (
    <div className={`panel-raised p-3 flex flex-col gap-2.5 min-w-0 ${accentClass}`}>

      {/* Icon + tooltip-enabled title */}
      <div className="flex items-center gap-2">
        <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`w-3.5 h-3.5 ${accentClass}`} aria-hidden="true" />
        </div>
        <Tooltip id={tooltipId} content={tooltip} label={title} />
      </div>

      {/* Ranked entries or skeleton */}
      {entries && entries.length > 0 ? (
        <div className="space-y-1.5">
          {entries.map((entry, i) => (
            <RecordEntry key={`${entry.holder}-${i}`} entry={entry} rank={i} />
          ))}
        </div>
      ) : (
        <PlaceholderSkeleton />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HallOfFame
// ---------------------------------------------------------------------------

export default function HallOfFame({
  mostMatchWins,
  fewestGamesToWin,
  biggestGoldUnderdog,
  biggestUnderdogWin,
}: HallOfFameProps) {
  return (
    <div className="panel p-3 grid grid-cols-2 lg:grid-cols-4 gap-3">

      <RecordCard
        icon={Trophy}
        title="Most Match Wins"
        tooltip="Total number of full matches won across all time."
        tooltipId="hof-tooltip-wins"
        record={mostMatchWins}
        accentClass="text-dota-gold"
        iconBgClass="bg-dota-gold/10 border border-dota-gold/20"
      />

      <RecordCard
        icon={Zap}
        title="Fastest Win"
        tooltip="Fewest games needed to win a single match."
        tooltipId="hof-tooltip-fastest"
        record={fewestGamesToWin}
        accentClass="text-dota-radiant-light"
        iconBgClass="bg-dota-radiant/10 border border-dota-radiant/20"
      />

      <RecordCard
        icon={Scale}
        title="Gold Underdog"
        tooltip="Won a match while holding less accumulated gold than the opposing team at the final game."
        tooltipId="hof-tooltip-gold"
        record={biggestGoldUnderdog}
        accentClass="text-dota-info"
        iconBgClass="bg-dota-info/10 border border-dota-info/20"
      />

      <RecordCard
        icon={Swords}
        title="Biggest Underdog"
        tooltip="Won the final game outnumbered by the most players."
        tooltipId="hof-tooltip-underdog"
        record={biggestUnderdogWin}
        accentClass="text-dota-dire-light"
        iconBgClass="bg-dota-dire/10 border border-dota-dire/20"
      />

    </div>
  );
}
