import { Trophy, Zap, Scale, Swords } from 'lucide-react';
import Image from 'next/image';

// ── Types ─────────────────────────────────────────────────────────────────────

export type HallOfFameRecord = {
  holder: string;
  stat: string;
  detail: string;
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
    <div className="panel-raised p-4 flex flex-col gap-3">

      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <div className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`w-4 h-4 ${accentClass}`} />
        </div>
        <span className="stat-label">{title}</span>
      </div>

      {/* Content */}
      {record ? (
        <>
          <div className="space-y-0.5">
            <p className={`font-cinzel font-bold text-lg leading-tight ${accentClass}`}>
              {record.holder}
            </p>
            <p className="font-barlow font-bold text-dota-text tabular-nums">
              {record.stat}
            </p>
          </div>
          <p className="font-barlow text-xs text-dota-text-dim leading-snug mt-auto">
            {record.detail}
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-1 py-2">
          <div className="h-4 w-24 rounded bg-dota-border/40" />
          <div className="h-3 w-16 rounded bg-dota-border/30" />
          <p className="font-barlow text-xs text-dota-text-dim mt-1">No data yet</p>
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
    <div className="panel overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-dota-border flex items-center gap-3">
        <Trophy className="w-4 h-4 text-dota-gold shrink-0" />
        <h2 className="font-cinzel text-base font-bold text-dota-gold tracking-wide">
          Hall of Fame
        </h2>
      </div>

      {/* Record grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">

        <RecordCard
          icon={Trophy}
          title="Most Match Wins"
          record={mostMatchWins}
          accentClass="text-dota-gold"
          iconBgClass="bg-dota-gold/10 border border-dota-gold/20"
        />

        <RecordCard
          icon={Zap}
          title="Fastest Match Win"
          record={fewestGamesToWin}
          accentClass="text-dota-radiant-light"
          iconBgClass="bg-dota-radiant/10 border border-dota-radiant/20"
        />

        <RecordCard
          icon={Scale}
          title="Closest Gold Victory"
          record={closestGoldWin}
          accentClass="text-dota-info"
          iconBgClass="bg-dota-info/10 border border-dota-info/20"
        />

        <RecordCard
          icon={Swords}
          title="Biggest Underdog Win"
          record={biggestUnderdogWin}
          accentClass="text-dota-dire-light"
          iconBgClass="bg-dota-dire/10 border border-dota-dire/20"
        />

      </div>
    </div>
  );
}
