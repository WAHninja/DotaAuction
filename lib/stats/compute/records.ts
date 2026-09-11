/**
 * League records — the notable extremes, rather than per-player aggregates.
 *
 * Everything here is a single match that stands out, so each record carries the
 * match it happened in and, where it belongs to someone, the player who set it.
 *
 * All four are derived from data the stats route already has to hand plus one
 * small matches query. In particular there is no need to reconstruct running
 * gold totals: the match ends the moment a player crosses GOLD_WIN_THRESHOLD,
 * so "fewest games to 100k" is simply the shortest match won on gold, and
 * match_players.gold is already the final figure for a finished match.
 */

import { GOLD_WIN_THRESHOLD } from '@/lib/gold-win';

export type RecordMatchRow = {
  id: number;
  winner_id: number | null;
  win_type: 'last_standing' | 'gold_threshold' | null;
};

export type RecordGameRow = { match_id: number };

export type RecordMatchPlayerRow = {
  match_id: number;
  user_id: number;
  gold: number;
};

/** A record tied to a specific match, and sometimes to a player. */
export type LeagueRecord = {
  matchId: number;
  /** The figure the record is about — games, or gold. */
  value: number;
  /** Player id, when the record belongs to someone. Resolved to a name by the
   *  caller, which has the user table. */
  playerId: number | null;
  /** Extra context for display, e.g. how many opponents were beaten. */
  detail: number | null;
};

export type LeagueRecords = {
  /** Fewest games in a finished match. */
  shortestMatch: LeagueRecord | null;
  /** Most games in a finished match. */
  longestMatch: LeagueRecord | null;
  /** Least gold a player held while winning outright. */
  leanestOutrightWin: LeagueRecord | null;
  /** Fewest games taken to reach the gold threshold. */
  fastestGoldWin: LeagueRecord | null;
};

export { GOLD_WIN_THRESHOLD };

export function computeLeagueRecords(
  matches: RecordMatchRow[],
  games: RecordGameRow[],
  matchPlayers: RecordMatchPlayerRow[],
): LeagueRecords {
  const gamesPerMatch = new Map<number, number>();
  for (const g of games) {
    gamesPerMatch.set(g.match_id, (gamesPerMatch.get(g.match_id) ?? 0) + 1);
  }

  const playersPerMatch = new Map<number, number>();
  const goldByMatchPlayer = new Map<string, number>();
  for (const mp of matchPlayers) {
    playersPerMatch.set(mp.match_id, (playersPerMatch.get(mp.match_id) ?? 0) + 1);
    goldByMatchPlayer.set(`${mp.match_id}:${mp.user_id}`, mp.gold);
  }

  // A match with no recorded games cannot hold a "fewest games" record — it
  // would win that comparison with zero and say nothing about anyone.
  const played = matches.filter(m => (gamesPerMatch.get(m.id) ?? 0) > 0);

  let shortest: LeagueRecord | null = null;
  let longest: LeagueRecord | null = null;

  for (const m of played) {
    const count = gamesPerMatch.get(m.id)!;
    // Opponents beaten: everyone else who took part. This is the tie-break for
    // the shortest match — winning a three-game match against five people is a
    // better record than winning one against two, and without it the record
    // would go to whichever short match happened to be found first.
    const opponents = Math.max(0, (playersPerMatch.get(m.id) ?? 1) - 1);
    const entry: LeagueRecord = {
      matchId: m.id, value: count, playerId: m.winner_id, detail: opponents,
    };

    if (
      shortest === null ||
      count < shortest.value ||
      (count === shortest.value && opponents > (shortest.detail ?? 0))
    ) {
      shortest = entry;
    }
    if (longest === null || count > longest.value) longest = entry;
  }

  // Leanest outright win: the smallest gold pile a player was sitting on when
  // they took the match by being last standing. Only last_standing qualifies —
  // a gold-threshold win is by definition at least GOLD_WIN_THRESHOLD, so
  // including those would make the record meaningless.
  let leanest: LeagueRecord | null = null;
  for (const m of played) {
    if (m.win_type !== 'last_standing' || m.winner_id === null) continue;
    const gold = goldByMatchPlayer.get(`${m.id}:${m.winner_id}`);
    if (gold === undefined) continue;
    if (leanest === null || gold < leanest.value) {
      leanest = { matchId: m.id, value: gold, playerId: m.winner_id, detail: null };
    }
  }

  // Fewest games to the gold threshold. The match ends the instant someone
  // crosses it, so the game count of a gold-won match *is* the number of games
  // that player took to get there — no running totals required.
  let fastestGold: LeagueRecord | null = null;
  for (const m of played) {
    if (m.win_type !== 'gold_threshold' || m.winner_id === null) continue;
    const count = gamesPerMatch.get(m.id)!;
    if (fastestGold === null || count < fastestGold.value) {
      fastestGold = { matchId: m.id, value: count, playerId: m.winner_id, detail: null };
    }
  }

  return {
    shortestMatch:      shortest,
    longestMatch:       longest,
    leanestOutrightWin: leanest,
    fastestGoldWin:     fastestGold,
  };
}
