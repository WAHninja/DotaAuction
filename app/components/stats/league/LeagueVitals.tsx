'use client';

import type { LeagueTotals, LeagueRecords, LeagueRecord } from '@/types';
import { Info } from 'lucide-react';
import { pct } from '@/lib/stats/format';
import { GLOSSARY } from '@/lib/stats/glossary';
import Tooltip from '@/app/components/stats/ui/Tooltip';
import { GOLD_WIN_THRESHOLD } from '@/lib/gold-win';

/**
 * League-wide totals, then league records.
 *
 * Two rows with different characters. The first counts what has happened; the
 * second names single notable matches, so those tiles carry a player where the
 * record belongs to someone. That player is picked out in gold — the record is
 * about them, and a name in the same muted grey as a caption reads as
 * incidental rather than as the point.
 *
 * Records are individually nullable: a league that has never had a gold-
 * threshold win has no fastest gold win, and the tile says so rather than
 * showing a zero that would look like a real result.
 */
export default function LeagueVitals({ totals, records }: {
  totals: LeagueTotals;
  records: LeagueRecords;
}) {
  const { matchesCompleted, gamesPlayed, outrightWins, goldWins } = totals;

  // Decided matches, not matchesCompleted — a finished match with no recorded
  // win_type would otherwise drag the split below 100% with no explanation.
  const decided = outrightWins + goldWins;

  const vitals: { label: string; value: string; sub?: string; hint: string; hintId: string }[] = [
    {
      label: 'Matches completed',
      value: matchesCompleted.toLocaleString(),
      hint: GLOSSARY.matchesCompleted, hintId: 'lv-matches',
    },
    {
      label: 'Games played',
      value: gamesPlayed.toLocaleString(),
      hint: GLOSSARY.gamesPlayed, hintId: 'lv-games',
    },
    {
      label: 'Won outright',
      value: outrightWins.toLocaleString(),
      sub: decided > 0 ? `${pct(outrightWins, decided)}% of matches` : undefined,
      hint: GLOSSARY.wonOutright, hintId: 'lv-outright',
    },
    {
      label: 'Won on gold',
      value: goldWins.toLocaleString(),
      sub: decided > 0 ? `${pct(goldWins, decided)}% of matches` : undefined,
      hint: GLOSSARY.wonOnGold, hintId: 'lv-gold',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {vitals.map(v => (
          <Tile key={v.label} {...v} />
        ))}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <RecordTile
          label="Shortest match"
          hint={GLOSSARY.shortestMatch}
          hintId="lv-shortest"
          record={records.shortestMatch}
          value={r => `${r.value} ${r.value === 1 ? 'game' : 'games'}`}
          // Ties on game count are broken by opponents beaten, so showing that
          // figure explains why this match holds the record over another of the
          // same length.
          sub={r => (r.detail ? `beat ${r.detail} opponents` : undefined)}
        />
        <RecordTile
          label="Longest match"
          hint={GLOSSARY.longestMatch}
          hintId="lv-longest"
          record={records.longestMatch}
          value={r => `${r.value} ${r.value === 1 ? 'game' : 'games'}`}
          showPlayer={false}
        />
        <RecordTile
          label="Leanest outright win"
          hint={GLOSSARY.leanestOutrightWin}
          hintId="lv-leanest"
          record={records.leanestOutrightWin}
          value={r => r.value.toLocaleString()}
          sub={() => 'gold held when winning'}
        />
        <RecordTile
          label="Fastest to 100k"
          hint={GLOSSARY.fastestToGold}
          hintId="lv-fastest"
          record={records.fastestGoldWin}
          value={r => `${r.value} ${r.value === 1 ? 'game' : 'games'}`}
          sub={() => `to ${(GOLD_WIN_THRESHOLD / 1000)}k gold`}
        />
      </div>
    </div>
  );
}

function Tile({ label, value, sub, player, hint, hintId }: {
  label: string;
  value: string;
  sub?: string;
  player?: string | null;
  hint?: string;
  hintId?: string;
}) {
  return (
    <div className="panel-sunken px-4 py-3">
      {/* Whole label is the hover target, matching StatWithRank — a bare 12px
          icon is a poor hit area and easy to miss entirely. */}
      {hint && hintId ? (
        <Tooltip id={hintId} content={hint}>
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
      <p className="font-barlow text-xl font-bold text-dota-text tabular-nums mt-0.5">{value}</p>
      {player && (
        <p className="font-barlow text-xs font-bold text-dota-gold mt-0.5 truncate">{player}</p>
      )}
      {sub && (
        <p className="font-barlow text-[11px] text-dota-text-dim mt-0.5 tabular-nums">{sub}</p>
      )}
    </div>
  );
}

function RecordTile({ label, record, value, sub, showPlayer = true, hint, hintId }: {
  label: string;
  record: LeagueRecord | null;
  value: (r: LeagueRecord) => string;
  sub?: (r: LeagueRecord) => string | undefined;
  showPlayer?: boolean;
  hint?: string;
  hintId?: string;
}) {
  if (record === null) {
    return (
      <div className="panel-sunken px-4 py-3">
        <p className="stat-label">{label}</p>
        <p className="font-barlow text-xl font-bold text-dota-text-dim mt-0.5">—</p>
        <p className="font-barlow text-[11px] text-dota-text-dim mt-0.5">not set yet</p>
      </div>
    );
  }

  return (
    <Tile
      label={label}
      value={value(record)}
      player={showPlayer ? record.player : null}
      sub={sub?.(record)}
      hint={hint}
      hintId={hintId}
    />
  );
}
