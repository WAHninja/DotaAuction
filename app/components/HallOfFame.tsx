import { Trophy, Zap, Scale, Swords } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type HallOfFameRecord = {
  holder: string;
  stat: string;
} | null;

export type HallOfFameProps = {
  mostMatchWins: HallOfFameRecord;
  fewestGamesToWin: HallOfFameRecord;
  closestGoldWin: HallOfFameRecord;
  biggestUnderdogWin: HallOfFameRecord;
};

// ── Individual record card ────────────────────────────────────────────────────

function RecordCard({
  icon: Icon,
  title,
  record,
  accentClass,
  iconBgClass,
}: {
  icon: React.ElementType;
  title: string;
  record: HallOfFameRecord;
  accentClass: string;
  iconBgClass: string;
}) {
  return (
    <div className="panel-raised p-3.5 flex flex-col gap-2 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`w-3.5 h-3.5 ${accentClass}`} />
        </div>
        <span className="stat-label truncate">{title}</span>
      </div>
      {/* Content */}
      {record ? (
        <div className="space-y-0.5 min-w-0">
          <p className={`font-cinzel font-bold text-base leading-tight truncate ${accentClass}`}>
            {record.holder}
          </p>
          <p className="font-barlow font-bold text-sm text-dota-text tabular-nums">
            {record.stat}
          </p>
        </div>
      ) : (
        <div className="space-y-1 py-0.5">
          <div className="h-4 w-20 rounded bg-dota-border/40" />
          <div className="h-3 w-12 rounded bg-dota-border/30" />
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
        record={mostMatchWins}
        accentClass="text-dota-gold"
        iconBgClass="bg-dota-gold/10 border border-dota-gold/20"
      />
      <RecordCard
        icon={Zap}
        title="Fastest Win"
        record={fewestGamesToWin}
        accentClass="text-dota-radiant-light"
        iconBgClass="bg-dota-radiant/10 border border-dota-radiant/20"
      />
      <RecordCard
        icon={Scale}
        title="Gold Differance"
        record={closestGoldWin}
        accentClass="text-dota-info"
        iconBgClass="bg-dota-info/10 border border-dota-info/20"
      />
      <RecordCard
        icon={Swords}
        title="Biggest Underdog"
        record={biggestUnderdogWin}
        accentClass="text-dota-dire-light"
        iconBgClass="bg-dota-dire/10 border border-dota-dire/20"
      />
    </div>
  );
}
