/**
 * Selectors over StatsPayload.
 *
 * This is the bridge between the league view and the player view. The API
 * returns league-wide arrays and nothing else — statsCache in the stats route
 * is a module-level global shared by every user, so the payload cannot be
 * personalised server-side without destroying that cache. Everything a player
 * view needs is derivable from the league payload instead, and the client
 * already knows who is signed in.
 *
 * Deliberately pure: no React, no fetching, no formatting. That keeps them
 * testable, and it keeps "what rank am I" from being reimplemented slightly
 * differently in each panel.
 *
 * Formatting of the values these return belongs in lib/stats/format.ts.
 */

import type { StatsPayload, HeadToHead, TeammateSynergy } from '@/types';

/** A value's standing within the league, 1-based. */
export type Rank = {
  /** 1 = best. */
  position: number;
  /** How many entries were ranked, so callers can render "2nd of 8". */
  outOf: number;
};

/**
 * Rank a player among their peers on one numeric field.
 *
 * `higherIsBetter` is explicit rather than inferred because the payload mixes
 * directions freely — netGold and avgKda rank descending, avgDeaths ascending.
 * Getting this wrong produces a plausible-looking number that is exactly
 * backwards, so there is no safe default to guess at.
 *
 * Ties share the lower position (two players on equal gold are both 1st, and
 * the next is 3rd) — standard competition ranking. Returns null when the player
 * has no row, so callers can distinguish "unranked" from "last".
 */
export function rankOf<T>(
  rows: T[],
  matches: (row: T) => boolean,
  value: (row: T) => number,
  higherIsBetter = true,
): Rank | null {
  const target = rows.find(matches);
  if (!target) return null;

  const mine = value(target);
  const ahead = rows.filter(r =>
    higherIsBetter ? value(r) > mine : value(r) < mine,
  ).length;

  return { position: ahead + 1, outOf: rows.length };
}

/**
 * Percentile from a rank, 0–100, where 100 is best.
 *
 * Only meaningful for reasonably sized leagues. With eight players each rank is
 * worth ~14 points, so a percentile says little that "2nd of 8" doesn't say
 * more honestly — prefer showing the rank itself unless the league is large.
 */
export function percentileOf(rank: Rank): number {
  if (rank.outOf <= 1) return 100;
  return Math.round(((rank.outOf - rank.position) / (rank.outOf - 1)) * 100);
}

/**
 * Mean of one field across the league — the comparison anchor for a player's
 * own figure ("12,400g · league avg 6,100").
 *
 * Returns null for an empty set rather than NaN, so callers can omit the
 * comparison instead of rendering "NaN".
 */
export function leagueAverage<T>(rows: T[], value: (row: T) => number): number | null {
  if (rows.length === 0) return null;
  return rows.reduce((sum, r) => sum + value(r), 0) / rows.length;
}

/**
 * Everything the payload knows about one player, gathered in one place.
 *
 * Each field is independently nullable: a player can have auction stats without
 * ever having had Dota stats reported, or a win streak without a recorded sale.
 * Panels should degrade per-section rather than hiding the whole player page.
 */
export function forPlayer(payload: StatsPayload, username: string) {
  return {
    core:        payload.players.find(p => p.username === username) ?? null,
    dota:        payload.playerDotaStats.find(p => p.username === username) ?? null,
    acquisition: payload.acquisitionImpact.find(a => a.username === username) ?? null,
    streak:      payload.winStreaks.find(w => w.username === username) ?? null,
    winTypes:    payload.winTypeStats.find(w => w.username === username) ?? null,
  };
}

/** One row of a player's head-to-head record, oriented from their side. */
export type H2HRecord = {
  opponent: string;
  games:    number;
  wins:     number;
  losses:   number;
};

/**
 * A player's record against every opponent they've faced.
 *
 * HeadToHead rows are stored pairwise with an arbitrary A/B orientation, so the
 * subject can be on either side. This normalises to the subject's perspective —
 * without it, every consumer has to re-derive which column is "mine", which is
 * exactly the bug that makes a 3–1 record display as 1–3.
 *
 * Sorted by games played so the most meaningful rivalries surface first.
 */
export function headToHeadFor(rows: HeadToHead[], username: string): H2HRecord[] {
  return rows
    .filter(r => r.playerA === username || r.playerB === username)
    .map(r => {
      const isA = r.playerA === username;
      const wins = isA ? r.playerAWins : r.playerBWins;
      return {
        opponent: isA ? r.playerB : r.playerA,
        games:    r.totalGames,
        wins,
        losses:   r.totalGames - wins,
      };
    })
    .sort((a, b) => b.games - a.games);
}

/** One partner's record from the subject's perspective. */
export type PartnerRecord = {
  partner: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
};

/**
 * A player's record alongside every teammate they have played with.
 *
 * Mirrors headToHeadFor: synergy rows carry an arbitrary A/B orientation, so
 * the subject can be on either side and every consumer would otherwise have to
 * re-derive which column is theirs. Unlike head-to-head the outcome is shared
 * between both players, so there is no win column to swap — only the partner's
 * name changes with orientation.
 *
 * Sorted by games together, so the partnerships with enough history to mean
 * something come first rather than whichever pairing happens to sit at 100%
 * off a single game.
 */
export function synergyFor(rows: TeammateSynergy[], username: string): PartnerRecord[] {
  return rows
    .filter(r => r.playerA === username || r.playerB === username)
    .map(r => ({
      partner: r.playerA === username ? r.playerB : r.playerA,
      games:   r.gamesTogether,
      wins:    r.winsTogether,
      losses:  r.gamesTogether - r.winsTogether,
      winRate: r.winRate,
    }))
    .sort((a, b) => b.games - a.games);
}
