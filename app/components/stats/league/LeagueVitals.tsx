'use client';

import type { LeagueTotals, LeagueRecords, LeagueRecord } from '@/types';
import { pct } from '@/lib/stats/format';
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

  const vitals: { label: string; value: string; sub?: string }[] = [
    { label: 'Matches completed', value: matchesCompleted.toLocaleString() },
    { label: 'Games played',      value: gamesPlayed.toLocaleString() },
    {
      label: 'Won outright',
      value: outrightWins.toLocaleString(),
      sub: decided > 0 ? `${pct(outrightWins, decided)}% of matches` : undefined,
    },
    {
      label: 'Won on gold',
      value: goldWins.toLocaleString(),
      sub: decided > 0 ? `${pct(goldWins, decided)}% of matches` : undefined,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {vitals.map(v => (
          <Tile key={v.label} label={v.label} value={v.value} sub={v.sub} />
        ))}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <RecordTile
          label="Shortest match"
          record={records.shortestMatch}
          value={r => `${r.value} ${r.value === 1 ? 'game' : 'games'}`}
          // Ties on game count are broken by opponents beaten, so showing that
          // figure explains why this match holds the record over another of the
          // same length.
          sub={r => (r.detail ? `beat ${r.detail} opponents` : undefined)}
        />
        <RecordTile
          label="Longest match"
          record={records.longestMatch}
          value={r => `${r.value} ${r.value === 1 ? 'game' : 'games'}`}
          showPlayer={false}
        />
        <RecordTile
          label="Leanest outright win"
          record={records.leanestOutrightWin}
          value={r => r.value.toLocaleString()}
          sub={() => 'gold held when winning'}
        />
        <RecordTile
          label="Fastest to 100k"
          record={records.fastestGoldWin}
          value={r => `${r.value} ${r.value === 1 ? 'game' : 'games'}`}
          sub={() => `to ${(GOLD_WIN_THRESHOLD / 1000)}k gold`}
        />
      </div>
    </div>
  );
}

function Tile({ label, value, sub, player }: {
  label: string;
  value: string;
  sub?: string;
  player?: string | null;
}) {
  return (
    <div className="panel-sunken px-4 py-3">
      <p className="stat-label">{label}</p>
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

function RecordTile({ label, record, value, sub, showPlayer = true }: {
  label: string;
  record: LeagueRecord | null;
  value: (r: LeagueRecord) => string;
  sub?: (r: LeagueRecord) => string | undefined;
  showPlayer?: boolean;
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
    />
  );
}
