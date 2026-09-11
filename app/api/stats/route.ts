import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/app/session'
import { buildGameIndex, computeOfferStrength } from '@/lib/stats/compute/offer-strength';
import { computeSelectionRate } from '@/lib/stats/compute/selection-rate';
import { computeSynergy } from '@/lib/stats/compute/synergy';
import { computeRecentForm, type FormResult } from '@/lib/stats/compute/form';
import { computeLastStands } from '@/lib/stats/compute/last-stand';
import { MIN_PICKS_FOR_RATE } from '@/lib/stats/constants';

// ---------------------------------------------------------------------------
// Module-level cache
//
// Stats are entirely global — the response is identical for every authenticated
// user. A module-level cache with a 60-second TTL means the DB queries run at
// most once per minute regardless of how many users are hitting the Stats tab
// simultaneously.
// ---------------------------------------------------------------------------

// MIN_PICKS_FOR_RATE now comes from lib/stats/constants — it was declared
// here as well, so raising one copy would have silently disagreed with the
// client and shown a hero rate the table then hid, or vice versa.

type StatsPayload = {
  leagueTotals: LeagueTotalsRow;
  players: PlayerRow[];
  teammateSynergy: SynergyRow[];
  winStreaks: WinStreakRow[];
  headToHead: HeadToHeadRow[];
  heroStats: HeroStatRow[];
  playerDotaStats: PlayerDotaStatRow[];
};

type StatsCache = {
  data: StatsPayload;
  cachedAt: number;
};

/**
 * League-wide totals. Match-level rather than player-level: these describe the
 * league itself and belong to nobody, which is why they are a single object
 * rather than another per-player array.
 *
 * Counted from `matches`, not by summing player rows. Summing each player's
 * gamesPlayed counts every game once per participant — a five-a-side game would
 * register as ten — which is why the previous vitals strip could not show a
 * games total honestly and omitted it.
 */
type LeagueTotalsRow = {
  matchesCompleted: number;
  gamesPlayed: number;
  /** Matches ended by being the last player standing. */
  outrightWins: number;
  /** Matches ended by a player crossing the gold threshold. */
  goldWins: number;
};

/** A pair of players and how they fare on the same side. */
type SynergyRow = {
  playerAId: number;
  playerA: string;
  playerBId: number;
  playerB: string;
  gamesTogether: number;
  winsTogether: number;
  /** Percentage to one decimal. Computed here so every consumer agrees. */
  winRate: number;
};

type PlayerRow = {
  username: string;
  /** Steam avatar URL, null when the account has no Steam profile linked.
   *  Included so the standings table and player pages can show real portraits
   *  rather than falling back to initials for everyone but the signed-in user. */
  steamAvatar: string | null;
  gamesPlayed: number;
  gamesWon: number;
  timesSold: number;
  timesOffered: number;
  offersMade: number;
  offersAccepted: number;
  /** Mean position of offers received within the range permitted at the time,
   *  0–1. The market's valuation of this player, comparable across matches of
   *  any length. null when never offered. */
  offerStrengthReceived: number | null;
  /** Mean position of offers this player submitted, 0–1. A bidding-behaviour
   *  measure. null when they have never made one. */
  offerStrengthMade: number | null;
  /** Discretionary offers where this player was an available target — that is,
   *  their team had three or more members so a real choice existed. */
  selectionOpportunities: number;
  /** How many of those offers named them. */
  selectionCount: number;
  /** Selections against what chance alone would produce. 1.0 = as often as
   *  random, 2.0 = twice as often. null when never in a discretionary spot. */
  selectionIndex: number | null;
  /** Last 10 results, oldest first — the rightmost entry is the latest game. */
  recentForm: FormResult[];
  /** Games entered as the only player on their side — a chance to win the
   *  whole match outright, since a single-player win ends it. */
  lastStandOpportunities: number;
  /** How many of those they converted. */
  lastStandWins: number;
  /** Mean opposing team size across those games — how outnumbered they were.
   *  null when they have never been in that position. */
  lastStandAvgOpponents: number | null;
  /** Retained for now but no longer surfaced: a lifetime sum that grows with
   *  games played, in a currency that resets every match. */
};



type WinStreakRow = {
  username: string;
  longestStreak: number;
  matchId: number;
};

type HeadToHeadRow = {
  playerAId: number;
  playerA: string;
  playerBId: number;
  playerB: string;
  totalGames: number;
  playerAWins: number;
  playerBWins: number;
};



type HeroStatRow = {
  hero: string;
  picks: number;
  wins: number;
  winRate: number | null;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKda: number;
  topKills: number;
  topKillsPlayer: string | null;
};

type PlayerDotaStatRow = {
  username: string;
  games: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKda: number;
  topKills: number;
  topKillsHero: string | null;
};

const CACHE_TTL_MS = 60 * 1_000; // 60 seconds
let statsCache: StatsCache | null = null;

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // Serve from cache if still fresh
  if (statsCache && Date.now() - statsCache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(statsCache.data);
  }

  try {
    const [
      usersResult,
      matchPlayersResult,
      matchTotalsResult,
      gamesResult,
      offersResult,
      winStreakResult,
      headToHeadResult,
      heroStatsResult,
      playerDotaStatsResult,
      heroTopKillsResult,
      playerTopKillsResult,
    ] = await Promise.all([

      // 1. All users — builds the base playersMap
      db.query<{ id: number; username: string; steam_avatar: string | null }>(
        `SELECT id, username, steam_avatar FROM users`
      ),

      // 2. All match participation rows — for matchesPlayed count
      db.query<{ match_id: number; user_id: number }>(
        `SELECT match_id, user_id FROM match_players`
      ),

      // 2b. Match-level totals for the league vitals strip.
      //
      // COUNT() returns bigint, which node-postgres hands back as a string to
      // avoid precision loss; ::int narrows to int4 so these arrive as numbers
      // and do not need parsing at the call site.
      db.query<{
        matches_completed: number;
        last_standing_wins: number;
        gold_threshold_wins: number;
      }>(
        `SELECT
           COUNT(*)::int                                          AS matches_completed,
           COUNT(*) FILTER (WHERE win_type = 'last_standing')::int  AS last_standing_wins,
           COUNT(*) FILTER (WHERE win_type = 'gold_threshold')::int AS gold_threshold_wins
         FROM matches
         WHERE status = 'finished'`
      ),

      // 3. All finished games — for win/loss counts and team combo tracking
      // match_id is needed to work out each game's position within its match,
      // which is what makes a historical offer amount interpretable.
      db.query<{
        id: number;
        match_id: number;
        team_1_members: number[];
        team_a_members: number[];
        winning_team: 'team_1' | 'team_a' | null;
      }>(
        `SELECT id, match_id, team_1_members, team_a_members, winning_team
         FROM games
         WHERE status = 'finished'`
      ),

      // 4. All offers — for offer/sold counts and average bid value
      // game_id ties an offer to the game it was made in, and so to the offer
      // range that applied at the time.
      db.query<{
        game_id: number;
        from_player_id: number;
        target_player_id: number;
        offer_amount: number;
        status: string;
      }>(
        `SELECT game_id, from_player_id, target_player_id, offer_amount, status
         FROM offers`
      ),

      // 7. Win streaks CTE
      db.query<{
        username: string;
        longest_streak: string;
        match_id: number;
      }>(`
        WITH player_game_results AS (
          SELECT
            mp.user_id,
            u.username,
            g.id        AS game_id,
            g.match_id,
            ROW_NUMBER() OVER (
              PARTITION BY mp.user_id, mp.match_id
              ORDER BY g.id
            )           AS seq,
            CASE
              WHEN g.winning_team = 'team_1'
               AND g.team_1_members @> ARRAY[mp.user_id] THEN 1
              WHEN g.winning_team = 'team_a'
               AND g.team_a_members @> ARRAY[mp.user_id] THEN 1
              ELSE 0
            END         AS won
          FROM match_players mp
          JOIN users u ON u.id       = mp.user_id
          JOIN games  g ON g.match_id = mp.match_id
          WHERE g.status = 'finished'
            AND (
              g.team_1_members @> ARRAY[mp.user_id]
              OR g.team_a_members @> ARRAY[mp.user_id]
            )
        ),
        win_groups AS (
          SELECT *,
            seq - ROW_NUMBER() OVER (
              PARTITION BY user_id, match_id
              ORDER BY seq
            ) AS grp
          FROM player_game_results
          WHERE won = 1
        ),
        streaks AS (
          SELECT user_id, username, match_id, COUNT(*) AS streak_length
          FROM   win_groups
          GROUP  BY user_id, username, match_id, grp
        ),
        best_per_player AS (
          SELECT DISTINCT ON (user_id)
            user_id,
            username,
            streak_length AS longest_streak,
            match_id
          FROM  streaks
          ORDER BY user_id, streak_length DESC
        )
        SELECT username, longest_streak, match_id
        FROM   best_per_player
        WHERE  longest_streak >= 2
        ORDER  BY longest_streak DESC
        LIMIT  10
      `),

      // 8. Head-to-head records CTE
      db.query<{
        player_a_id: string;
        player_a: string;
        player_b_id: string;
        player_b: string;
        total_games: string;
        player_a_wins: string;
        player_b_wins: string;
      }>(`
        WITH opposing_pairs AS (
          SELECT
            LEAST(t1_player, t2_player)    AS player_a_id,
            GREATEST(t1_player, t2_player) AS player_b_id,
            CASE
              WHEN t1_player < t2_player AND g.winning_team = 'team_1' THEN 1
              WHEN t1_player > t2_player AND g.winning_team = 'team_a' THEN 1
              ELSE 0
            END                            AS lower_id_won
          FROM games g
          CROSS JOIN LATERAL UNNEST(g.team_1_members) AS t1(t1_player)
          CROSS JOIN LATERAL UNNEST(g.team_a_members) AS t2(t2_player)
          WHERE g.status = 'finished'
            AND g.winning_team IS NOT NULL
        )
        SELECT
          player_a_id,
          ua.username   AS player_a,
          player_b_id,
          ub.username   AS player_b,
          COUNT(*)::int                       AS total_games,
          SUM(lower_id_won)::int              AS player_a_wins,
          (COUNT(*) - SUM(lower_id_won))::int AS player_b_wins
        FROM   opposing_pairs
        JOIN   users ua ON ua.id = player_a_id
        JOIN   users ub ON ub.id = player_b_id
        GROUP  BY player_a_id, ua.username, player_b_id, ub.username
        ORDER  BY total_games DESC
      `),

      // 10. Hero stats — aggregated from dota_game_stats, joined to games to
      // determine whether the hero's team won. KDA is computed in SQL using
      // GREATEST(deaths, 1) as the divisor to avoid division by zero, matching
      // the same floor used in the client-side formula.
      //
      // Win logic: a dota_game_stats row's `team` column tells us which side
      // the player was on; we join to games.winning_team to check if that
      // side won. Only finished games are counted, consistent with every
      // other win-rate query in this file.
      db.query<{
        hero: string;
        picks: string;
        wins: string;
        avg_kills: string;
        avg_deaths: string;
        avg_assists: string;
        avg_kda: string;
      }>(`
        SELECT
          dgs.hero,
          COUNT(*)                                                          AS picks,
          COUNT(*) FILTER (WHERE dgs.team = g.winning_team)                 AS wins,
          AVG(dgs.kills)::numeric(10,2)                                     AS avg_kills,
          AVG(dgs.deaths)::numeric(10,2)                                    AS avg_deaths,
          AVG(dgs.assists)::numeric(10,2)                                   AS avg_assists,
          AVG(
            (dgs.kills + dgs.assists)::numeric / GREATEST(dgs.deaths, 1)
          )::numeric(10,2)                                                  AS avg_kda
        FROM dota_game_stats dgs
        JOIN games g ON g.id = dgs.game_id
        WHERE dgs.hero IS NOT NULL
          AND g.status = 'finished'
        GROUP BY dgs.hero
        ORDER BY picks DESC, dgs.hero ASC
      `),

      // 11. Per-player average Dota performance across all reported games.
      // Same KDA formula as the hero query for consistency. Only finished
      // games are counted — a game still in progress shouldn't contribute
      // partial/live stats to a season average.
      db.query<{
        username: string;
        games: string;
        avg_kills: string;
        avg_deaths: string;
        avg_assists: string;
        avg_kda: string;
      }>(`
        SELECT
          u.username,
          COUNT(*)                                                          AS games,
          AVG(dgs.kills)::numeric(10,2)                                     AS avg_kills,
          AVG(dgs.deaths)::numeric(10,2)                                    AS avg_deaths,
          AVG(dgs.assists)::numeric(10,2)                                   AS avg_assists,
          AVG(
            (dgs.kills + dgs.assists)::numeric / GREATEST(dgs.deaths, 1)
          )::numeric(10,2)                                                  AS avg_kda
        FROM dota_game_stats dgs
        JOIN games g ON g.id = dgs.game_id
        JOIN users u ON u.id = dgs.player_id
        WHERE g.status = 'finished'
        GROUP BY u.id, u.username
        ORDER BY avg_kda DESC, u.username ASC
      `),

      // 12. Highest kills recorded on each hero, and who did it.
      db.query<{ hero: string; kills: string; username: string }>(`
        SELECT DISTINCT ON (dgs.hero)
          dgs.hero,
          dgs.kills,
          u.username
        FROM dota_game_stats dgs
        JOIN games g ON g.id = dgs.game_id
        JOIN users u ON u.id = dgs.player_id
        WHERE dgs.hero IS NOT NULL
          AND g.status = 'finished'
        ORDER BY dgs.hero, dgs.kills DESC, dgs.game_id ASC
      `),

      // 13. Highest kills a player has ever recorded in one game, plus the
      // hero they were on when it happened.
      db.query<{ username: string; kills: string; hero: string | null }>(`
        SELECT DISTINCT ON (dgs.player_id)
          u.username,
          dgs.kills,
          dgs.hero
        FROM dota_game_stats dgs
        JOIN games g ON g.id = dgs.game_id
        JOIN users u ON u.id = dgs.player_id
        WHERE g.status = 'finished'
        ORDER BY dgs.player_id, dgs.kills DESC, dgs.game_id ASC
      `),
    ]);

    // -------------------------------------------------------------------------
    // Process query results (unchanged sections 1-8 from the original)
    // -------------------------------------------------------------------------

    const playersMap = new Map<number, {
      username: string;
      steamAvatar: string | null;
      matchesPlayed: Set<number>;
      gamesPlayed: number;
      gamesWon: number;
      timesOffered: number;
      timesSold: number;
      offersMade: number;
      offersAccepted: number;
      totalOfferValueAsTarget: number;
      offerCountAsTarget: number;
    }>();

    for (const user of usersResult.rows) {
      playersMap.set(user.id, {
        username:                user.username,
        steamAvatar:             user.steam_avatar ?? null,
        matchesPlayed:           new Set<number>(),
        gamesPlayed:             0,
        gamesWon:                0,
        timesOffered:            0,
        timesSold:               0,
        offersMade:              0,
        offersAccepted:          0,
        totalOfferValueAsTarget: 0,
        offerCountAsTarget:      0,
      });
    }

    for (const row of matchPlayersResult.rows) {
      playersMap.get(row.user_id)?.matchesPlayed.add(row.match_id);
    }

    for (const game of gamesResult.rows) {
      const team1 = game.team_1_members || [];
      const teamA = game.team_a_members || [];

      // Re-derived here now that the team-combination tracking that used to
      // compute it alongside has been removed. Note this preserves the original
      // behaviour for a game with no winner: winning_team === null falls to the
      // teamA branch, so nobody on team_1 is credited — which is right, since
      // an undecided game should award no wins at all.
      const winningTeam = game.winning_team === 'team_1' ? team1 : teamA;

      for (const playerId of new Set<number>([...team1, ...teamA])) {
        const stats = playersMap.get(playerId);
        if (!stats) continue;
        stats.gamesPlayed += 1;
        if (game.winning_team !== null && winningTeam.includes(playerId)) {
          stats.gamesWon += 1;
        }
      }
    }

    for (const offer of offersResult.rows) {
      if (offer.from_player_id != null) {
        const fromStats = playersMap.get(offer.from_player_id);
        if (fromStats) {
          fromStats.offersMade += 1;
          if (offer.status === 'accepted') fromStats.offersAccepted += 1;
        }
      }
      if (offer.target_player_id != null) {
        const targetStats = playersMap.get(offer.target_player_id);
        if (targetStats) {
          targetStats.timesOffered            += 1;
          targetStats.totalOfferValueAsTarget += offer.offer_amount || 0;
          targetStats.offerCountAsTarget      += 1;
          if (offer.status === 'accepted') targetStats.timesSold += 1;
        }
      }
    }

    const heroTopKillsMap = new Map<string, { kills: number; username: string }>(
      heroTopKillsResult.rows.map(r => [r.hero, { kills: Number(r.kills), username: r.username }])
    );

    const playerTopKillsMap = new Map<string, { kills: number; hero: string | null }>(
      playerTopKillsResult.rows.map(r => [r.username, { kills: Number(r.kills), hero: r.hero }])
    );

    // -------------------------------------------------------------------------
    // Build response payload
    // -------------------------------------------------------------------------

    // Offer strength — see lib/stats/compute/offer-strength for why raw offer
    // amounts are not comparable between matches.
    const gameIndex     = buildGameIndex(gamesResult.rows);
    const offerStrength = computeOfferStrength(offersResult.rows, gameIndex);

    // Selection rate — only counts offers where the offering team had a real
    // alternative. See lib/stats/compute/selection-rate.
    const selection = computeSelectionRate(gamesResult.rows, offersResult.rows);

    // Teammate synergy — pairs on the same side. Uses the finished-game rows
    // already fetched, so no extra query.
    const synergyPairs = computeSynergy(gamesResult.rows);

    // Recent form — the first time-aware figure in the payload.
    const recentForm = computeRecentForm(gamesResult.rows);

    // Last stands — games entered alone, which are the only games that can end
    // a match outright. See lib/stats/compute/last-stand.
    const lastStands = computeLastStands(gamesResult.rows);

    // entries(), not values(): the map key is the user id, which is the join
    // key for offer strength and is not repeated inside the value.
    const players: PlayerRow[] = Array.from(playersMap.entries()).map(([id, p]) => ({
      username:          p.username,
      steamAvatar:       p.steamAvatar,
      gamesPlayed:       p.gamesPlayed,
      gamesWon:          p.gamesWon,
      timesSold:         p.timesSold,
      timesOffered:      p.timesOffered,
      offersMade:        p.offersMade,
      offersAccepted:    p.offersAccepted,
      offerStrengthReceived: offerStrength.get(id)?.received ?? null,
      offerStrengthMade:     offerStrength.get(id)?.made     ?? null,
      selectionOpportunities: selection.get(id)?.opportunities ?? 0,
      selectionCount:         selection.get(id)?.selections    ?? 0,
      selectionIndex:         selection.get(id)?.index         ?? null,
      recentForm:             recentForm.get(id) ?? [],
      lastStandOpportunities: lastStands.get(id)?.opportunities ?? 0,
      lastStandWins:          lastStands.get(id)?.wins          ?? 0,
      lastStandAvgOpponents:  lastStands.get(id)?.avgOpponents  ?? null,
    }));

    const winStreaks: WinStreakRow[] = winStreakResult.rows.map(r => ({
      username:      r.username,
      longestStreak: Number(r.longest_streak),
      matchId:       Number(r.match_id),
    }));

    const headToHead: HeadToHeadRow[] = headToHeadResult.rows.map(r => ({
      playerAId:   Number(r.player_a_id),
      playerA:     r.player_a,
      playerBId:   Number(r.player_b_id),
      playerB:     r.player_b,
      totalGames:  Number(r.total_games),
      playerAWins: Number(r.player_a_wins),
      playerBWins: Number(r.player_b_wins),
    }));

    const heroStats: HeroStatRow[] = heroStatsResult.rows.map(r => {
      const picks   = Number(r.picks);
      const wins    = Number(r.wins);
      const topKill = heroTopKillsMap.get(r.hero) ?? null;
      return {
        hero:           r.hero,
        picks,
        wins,
        winRate:        picks >= MIN_PICKS_FOR_RATE ? +((wins / picks) * 100).toFixed(1) : null,
        avgKills:       Number(r.avg_kills),
        avgDeaths:      Number(r.avg_deaths),
        avgAssists:     Number(r.avg_assists),
        avgKda:         Number(r.avg_kda),
        topKills:       topKill?.kills ?? 0,
        topKillsPlayer: topKill?.username ?? null,
      };
    });

    const playerDotaStats: PlayerDotaStatRow[] = playerDotaStatsResult.rows.map(r => {
      const topKill = playerTopKillsMap.get(r.username) ?? null;
      return {
        username:     r.username,
        games:        Number(r.games),
        avgKills:     Number(r.avg_kills),
        avgDeaths:    Number(r.avg_deaths),
        avgAssists:   Number(r.avg_assists),
        avgKda:       Number(r.avg_kda),
        topKills:     topKill?.kills ?? 0,
        topKillsHero: topKill?.hero ?? null,
      };
    });

    // gamesPlayed comes from the finished-games rows already fetched for
    // win/loss counting, so it costs nothing extra and is a true game count
    // rather than a per-participant sum.
    const totals = matchTotalsResult.rows[0];
    const leagueTotals: LeagueTotalsRow = {
      matchesCompleted: totals?.matches_completed ?? 0,
      gamesPlayed:      gamesResult.rows.length,
      outrightWins:     totals?.last_standing_wins ?? 0,
      goldWins:         totals?.gold_threshold_wins ?? 0,
    };

    // Names are attached here rather than inside the computation so that stays
    // a pure function of ids. Pairs referencing a deleted user are dropped.
    const teammateSynergy: SynergyRow[] = synergyPairs.flatMap(p => {
      const a = playersMap.get(p.playerAId);
      const b = playersMap.get(p.playerBId);
      if (!a || !b) return [];
      return [{
        playerAId:     p.playerAId,
        playerA:       a.username,
        playerBId:     p.playerBId,
        playerB:       b.username,
        gamesTogether: p.gamesTogether,
        winsTogether:  p.winsTogether,
        winRate:       p.gamesTogether > 0
          ? +((p.winsTogether / p.gamesTogether) * 100).toFixed(1)
          : 0,
      }];
    });

    const data: StatsPayload = {
      leagueTotals,
      players,
      teammateSynergy,
      winStreaks,
      headToHead,
      heroStats,
      playerDotaStats,
    };

    // Store in cache
    statsCache = { data, cachedAt: Date.now() };

    return NextResponse.json(data);

  } catch (error) {
    console.error('[STATS_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to build stats' },
      { status: 500 }
    );
  }
}
