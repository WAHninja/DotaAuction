import { Trophy, Zap, Scale, Swords } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type HallOfFameEntry = {
  holder: string;
  stat: string;
};

export type HallOfFameRecord = HallOfFameEntry[] | null;

export type HallOfFameProps = {
  mostMatchWins: HallOfFameRecord;
  fewestGamesToWin: HallOfFameRecord;
  closestGoldWin: HallOfFameRecord;
  biggestUnderdogWin: HallOfFameRecord;
};

const RANK_STYLES = [
  'text-dota-gold',
  'text-dota-text-muted',
  'text-amber-600',
] as const;

const RANK_LABELS = ['🥇', '🥈', '🥉'] as const;

// ── Individual record card ────────────────────────────────────────────────────

function RecordCard({
  icon: Icon,
  title,
  tooltip,
  record,
  accentClass,
  iconBgClass,
}: {
  icon: React.ElementType;
  title: string;
  tooltip: string;
  record: HallOfFameRecord;
  accentClass: string;
  iconBgClass: string;
}) {
  return (
    <div className="panel-raised p-3 flex flex-col gap-2.5 min-w-0">

      {/* Title row with tooltip */}
      <div className="flex items-center gap-2">
        <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`w-3.5 h-3.5 ${accentClass}`} />
        </div>
        {/* Tooltip wrapper — pure CSS, no JS needed */}
        <div className="relative group min-w-0">
          <span className="stat-label truncate cursor-help border-b border-dotted border-dota-text-dim">
            {title}
          </span>
          {/* Tooltip bubble */}
          <div className="
            pointer-events-none absolute bottom-full left-0 mb-2 z-10
            w-48 px-2.5 py-1.5 rounded
            bg-dota-raised border border-dota-border-bright
            font-barlow text-xs text-dota-text-muted leading-snug
            opacity-0 group-hover:opacity-100
            transition-opacity duration-150
          ">
            {tooltip}
          </div>
        </div>
      </div>

      {/* Ranked entries */}
      {record && record.length > 0 ? (
        <div className="space-y-1.5">
          {record.map((entry, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2 min-w-0">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className={`text-xs shrink-0 ${RANK_STYLES[i]}`}>
                  {RANK_LABELS[i]}
                </span>
                <span className={`font-cinzel font-bold text-sm leading-tight truncate ${i === 0 ? accentClass : 'text-dota-text'}`}>
                  {entry.holder}
                </span>
              </div>
              <span className="font-barlow text-xs font-semibold text-dota-text-muted tabular-nums shrink-0">
                {entry.stat}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5 py-0.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-2">
              <div className="h-3 w-4 rounded bg-dota-border/40" />
              <div className={`h-3 rounded bg-dota-border/30 ${i === 0 ? 'w-20' : i === 1 ? 'w-16' : 'w-12'}`} />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export default function HallOfFame({
  mostMatchWins,
  fewestGamesToWin,
  closestGoldWin,
  biggestUnderdogWin,
}: HallOfFameProps) {
  return (
    <div className="panel p-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
      <RecordCard
        icon={Trophy}
        title="Most Match Wins"
        tooltip="Total number of matches won across all time"
        record={mostMatchWins}
        accentClass="text-dota-gold"
        iconBgClass="bg-dota-gold/10 border border-dota-gold/20"
      />
      <RecordCard
        icon={Zap}
        title="Fastest Win"
        tooltip="Fewest games needed to win a single match"
        record={fewestGamesToWin}
        accentClass="text-dota-radiant-light"
        iconBgClass="bg-dota-radiant/10 border border-dota-radiant/20"
      />
      <RecordCard
        icon={Scale}
        title="Closest Gold"
        tooltip="Smallest difference between winning and losing team's total gold in the final game. Negative means the winner had less gold."
        record={closestGoldWin}
        accentClass="text-dota-info"
        iconBgClass="bg-dota-info/10 border border-dota-info/20"
      />
      <RecordCard
        icon={Swords}
        title="Biggest Underdog"
        tooltip="Won the final game outnumbered by the most players"
        record={biggestUnderdogWin}
        accentClass="text-dota-dire-light"
        iconBgClass="bg-dota-dire/10 border border-dota-dire/20"
      />
    </div>
  );
}
