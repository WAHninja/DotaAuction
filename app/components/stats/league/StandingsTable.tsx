'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PlayerStats, PlayerDotaStat } from '@/types';
import { MIN_GAMES_FOR_RATE, MIN_OFFERS_FOR_STRENGTH } from '@/lib/stats/constants';
import { pct, kdaColour, formatStrength } from '@/lib/stats/format';
import PctBadge from '@/app/components/stats/ui/PctBadge';
import SortableTh from '@/app/components/stats/ui/SortableTh';
import RankMedal from '@/app/components/RankMedal';
import PlayerAvatar from '@/app/components/PlayerAvatar';

/**
 * The single canonical league table.
 *
 * Replaces the two separate ranked tables the dashboard tab keeps — "Player
 * Leaderboard" (auction economy) and "Player Performance" (Dota averages).
 * Both were "every player, ranked", differing only in columns, so splitting
 * them forced a reader comparing two people to scan two tables and hold the
 * rows in their head.
 *
 * Joining them is safe because both key on username, but the join is a left
 * join from the auction side: a player always has a PlayerStats row, and may
 * have no PlayerDotaStat row if no Dota game has ever been reported for them.
 * Those cells render an em-dash rather than a misleading zero.
 *
 * Rows link to the player view — this table is the index you reach players
 * through, which is the whole reason the league and player scopes can coexist
 * rather than competing for the same screen.
 */

type Row = PlayerStats & {
  winRate: number;
  avgKda:  number | null;
  dotaGames: number;
  /** Null below the sample threshold as well as when never offered, so the
   *  column and the sort agree on what counts as "no value". */
  marketValue: number | null;
};

type SortKey = 'username' | 'gamesPlayed' | 'winRate' | 'marketValue' | 'avgKda';

export default function StandingsTable({ players, dotaStats, highlightUsername }: {
  players:   PlayerStats[];
  dotaStats: PlayerDotaStat[];
  /** Signed-in user, given a gold ring and row tint so you can find yourself. */
  highlightUsername?: string | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('winRate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo<Row[]>(() => {
    const dotaByName = new Map(dotaStats.map(d => [d.username, d]));
    return players.map(p => {
      const d = dotaByName.get(p.username);
      return {
        ...p,
        winRate:   pct(p.gamesWon, p.gamesPlayed),
        avgKda:    d?.avgKda ?? null,
        dotaGames: d?.games ?? 0,
        marketValue:
          p.timesOffered >= MIN_OFFERS_FOR_STRENGTH ? p.offerStrengthReceived : null,
      };
    });
  }, [players, dotaStats]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === 'username') return a.username.localeCompare(b.username) * dir;
      // Players with no Dota data sort last regardless of direction — they have
      // no value, rather than a value of zero, and floating them to the top of
      // an ascending KDA sort would read as "worst players".
      // Nullable columns sort last in both directions — no value is not a
      // value of zero, and floating them to the top of an ascending sort would
      // read as "worst".
      if (sortKey === 'avgKda' || sortKey === 'marketValue') {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return (av - bv) * dir;
      }
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    // Names read naturally A–Z; every metric is more useful best-first.
    setSortDir(key === 'username' ? 'asc' : 'desc');
  }

  // Medals only mean anything when the order is a genuine ranking. Sorting by
  // name — or ascending by a metric — and still showing a gold medal at the top
  // would award first place to whoever is alphabetically first.
  const showMedals = sortKey !== 'username' && sortDir === 'desc';

  if (players.length === 0) {
    return (
      <div className="panel p-12 text-center font-barlow text-dota-text-dim">
        No player data yet — complete a game to see standings.
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full font-barlow text-sm min-w-[640px]" aria-label="League standings">
          <thead className="bg-dota-deep/60 border-b border-dota-border">
            <tr>
              <th scope="col" className="w-12 px-3 py-3" />
              <SortableTh<SortKey>
                colKey="username" label="Player" align="center"
                tooltip="Sort players alphabetically."
                tooltipId="std-username"
                sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
              />
              <SortableTh<SortKey>
                colKey="gamesPlayed" label="Games"
                tooltip="Total games played across every match."
                tooltipId="std-games"
                sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
              />
              <SortableTh<SortKey>
                colKey="winRate" label="Win rate" sublabel={`min. ${MIN_GAMES_FOR_RATE}`}
                tooltip={`Games won as a share of games played. Hidden below ${MIN_GAMES_FOR_RATE} games, where the figure is noise.`}
                tooltipId="std-winrate"
                sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
              />
              <SortableTh<SortKey>
                colKey="marketValue" label="Market value" sublabel={`min. ${MIN_OFFERS_FOR_STRENGTH}`}
                tooltip={`Average strength of offers received, as a share of the range allowed at the time. Comparable across matches of any length. Hidden below ${MIN_OFFERS_FOR_STRENGTH} offers.`}
                tooltipId="std-market"
                sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
              />
              <SortableTh<SortKey>
                colKey="avgKda" label="KDA"
                tooltip="Average (kills + assists) / deaths across reported Dota games."
                tooltipId="std-kda"
                sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
              />
            </tr>
          </thead>

          <tbody>
            {sorted.map((row, i) => {
              const isYou = highlightUsername === row.username;
              return (
                <tr
                  key={row.username}
                  className={`border-b border-dota-border/25 last:border-0 transition-colors hover:bg-dota-raised/40 ${
                    isYou ? 'bg-dota-gold/[0.06]' : ''
                  }`}
                >
                  <td className="px-3 py-2.5">
                    {showMedals
                      ? <RankMedal rank={i + 1} size={22} label={false} />
                      : <span className="font-barlow text-xs text-dota-text-dim tabular-nums">{i + 1}</span>}
                  </td>

                  <td className="px-3 py-2.5">
                    <Link
                      href={`/stats/${encodeURIComponent(row.username)}`}
                      className="flex items-center gap-2 min-w-0 group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold"
                    >
                      <PlayerAvatar
                        username={row.username}
                        steamAvatar={row.steamAvatar}
                        size={24}
                        className={isYou ? 'ring-2 ring-dota-gold' : ''}
                      />
                      <span className="font-semibold truncate text-dota-text group-hover:text-dota-gold transition-colors">
                        {row.username}
                      </span>
                      {isYou && <span className="stat-label shrink-0">You</span>}
                    </Link>
                  </td>

                  <td className="px-3 py-2.5 text-center tabular-nums text-dota-text-muted">
                    {row.gamesPlayed}
                  </td>

                  <td className="px-3 py-2.5 text-center">
                    <PctBadge
                      success={row.gamesWon}
                      total={row.gamesPlayed}
                      minGames={MIN_GAMES_FOR_RATE}
                    />
                  </td>

                  <td className="px-3 py-2.5 text-center tabular-nums">
                    {row.marketValue === null
                      ? <span className="text-dota-text-dim" title={`Needs ${MIN_OFFERS_FOR_STRENGTH} offers (has ${row.timesOffered})`}>—</span>
                      : <span className="font-semibold text-dota-gold">{formatStrength(row.marketValue)}</span>}
                  </td>

                  <td className="px-3 py-2.5 text-center tabular-nums">
                    {row.avgKda === null
                      ? <span className="text-dota-text-dim" title="No Dota games reported">—</span>
                      : <span className={`font-semibold ${kdaColour(row.avgKda)}`}>{row.avgKda.toFixed(2)}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
