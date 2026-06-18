import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/app/session'

// ---------------------------------------------------------------------------
// Module-level cache
//
// Stats are entirely global — the response is identical for every authenticated
// user. A module-level cache with a 60-second TTL means the DB queries run at
// most once per minute regardless of how many users are hitting the Stats tab
// simultaneously.
// ---------------------------------------------------------------------------

const MIN_PICKS_FOR_RATE = 3;

type StatsPayload = {
  players: PlayerRow[];
  topWinningCombos: TeamComboRow[];
  acquisitionImpact: AcquisitionRow[];
  winStreaks: WinStreakRow[];
  headToHead: HeadToHeadRow[];
  winTypeStats: WinTypeStatsRow[];
  heroStats: HeroStatRow[];
  playerDotaStats: PlayerDotaStatRow[];
};

type StatsCache = {
  data: StatsPayload;
  cachedAt: number;
};

type PlayerRow = {
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  timesSold: number;
  timesOffered: number;
  offersMade: number;
  offersAccepted: number;
  averageOfferValue: number;
  netGold: number;
};

type TeamComboRow = {
  combo: string;
  wins: number;
  gamesPlayed: number;
  winRate: number;
};

type AcquisitionRow = {
  username: string;
  totalAcquisitions: number;
  winsAfterAcquisition: number;
  winRate: number;
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

type WinTypeStatsRow = {
  username: string;
  lastStandingWins: number;
  goldThresholdWins: number;
  totalWins: number;
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
  avgNetWorth: number;
};

type PlayerDotaStatRow = {
  username: string;
  games: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKda: number;
  avgNetWorth: number;
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
      gamesResult,
      offersResult,
      netGoldResult,
      acquisitionResult,
      winStreakResult,
      headToHeadResult,
      winTypeResult,
      heroStatsResult,
      playerDotaStatsResult,
    ] = await Promise.all([

      // 1. All users — builds the base playersMap
      db.query<{ id: number; username: string }>(
        `SELECT id, username FROM users`
      ),

      // 2. All match participation rows — for matchesPlayed count
      db.query<{ match_id: number; user_id: number }>(
        `SELECT match_id, user_id FROM match_players`
      ),

      // 3. All finished games — for win/loss counts and team combo tracking
      db.query<{
        id: number;
        team_1_members: number[];
        team_a_members: number[];
        winning_team: 'team_1' | 'team_a' | null;
      }>(
        `SELECT id, team_1_members, team_a_members, winning_team
         FROM games
         WHERE status = 'finished'`
      ),

      // 4. All offers — for offer/sold counts and average bid value
      db.query<{
        from_player_id: number;
        target_player_id: number;
        offer_amount: number;
        status: string;
      }>(
        `SELECT from_player_id, target_player_id, offer_amount, status
         FROM offers`
      ),

      // 5. Net gold per player — sum of all gold_change entries
      db.query<{ player_id: number; net_gold: string }>(
        `SELECT player_id, SUM(gold_change) AS net_gold
         FROM game_player_stats
         GROUP BY player_id`
      ),

      // 6. Acquisition impact CTE
      db.query<{
        username: string;
        total_acquisitions: string;
        wins_after_acquisition: string;
        win_rate: string;
      }>(`
        WITH acquisition_stats AS (
          SELECT
            o.target_player_id,
            u.username,
            COUNT(*)                                                    AS total_acquisitions,
            SUM(CASE
              WHEN prev_game.team_1_members @> ARRAY[o.target_player_id]
                   AND next_game.winning_team = 'team_a' THEN 1
              WHEN prev_game.team_a_members @> ARRAY[o.target_player_id]
                   AND next_game.winning_team = 'team_1' THEN 1
              ELSE 0
            END)                                                        AS wins_after_acquisition
          FROM offers o
          JOIN games prev_game ON prev_game.id = o.game_id
          JOIN users u         ON u.id          = o.target_player_id
          JOIN LATERAL (
            SELECT *
            FROM   games g2
            WHERE  g2.match_id = prev_game.match_id
              AND  g2.id       > prev_game.id
              AND  g2.status   = 'finished'
            ORDER BY g2.id ASC
            LIMIT 1
          ) next_game ON true
          WHERE o.status = 'accepted'
          GROUP BY o.target_player_id, u.username
          HAVING COUNT(*) >= 2
        )
        SELECT
          username,
          total_acquisitions,
          wins_after_acquisition,
          ROUND(wins_after_acquisition::numeric / total_acquisitions * 100, 1) AS win_rate
        FROM acquisition_stats
        ORDER BY win_rate DESC, total_acquisitions DESC
      `),

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

      // 9. Win type breakdown — how each player's match wins were achieved.
      // Only players with at least one match win are included.
      db.query<{
        username: string;
        last_standing_wins: string;
        gold_threshold_wins: string;
        total_wins: string;
      }>(`
        SELECT
          u.username,
          COUNT(*) FILTER (WHERE m.win_type = 'last_standing')  AS last_standing_wins,
          COUNT(*) FILTER (WHERE m.win_type = 'gold_threshold') AS gold_threshold_wins,
          COUNT(*)                                               AS total_wins
        FROM matches m
        JOIN users u ON u.id = m.winner_id
        WHERE m.winner_id IS NOT NULL
        GROUP BY u.id, u.username
        ORDER BY total_wins DESC, u.username ASC
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
        avg_net_worth: string;
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
          )::numeric(10,2)                                                  AS avg_kda,
          AVG(dgs.net_worth)::numeric(10,0)                                 AS avg_net_worth
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
        avg_net_worth: string;
      }>(`
        SELECT
          u.username,
          COUNT(*)                                                          AS games,
          AVG(dgs.kills)::numeric(10,2)                                     AS avg_kills,
          AVG(dgs.deaths)::numeric(10,2)                                    AS avg_deaths,
          AVG(dgs.assists)::numeric(10,2)                                   AS avg_assists,
          AVG(
            (dgs.kills + dgs.assists)::numeric / GREATEST(dgs.deaths, 1)
          )::numeric(10,2)                                                  AS avg_kda,
          AVG(dgs.net_worth)::numeric(10,0)                                 AS avg_net_worth
        FROM dota_game_stats dgs
        JOIN games g ON g.id = dgs.game_id
        JOIN users u ON u.id = dgs.player_id
        WHERE g.status = 'finished'
        GROUP BY u.id, u.username
        ORDER BY avg_kda DESC, u.username ASC
      `),
    ]);

    // -------------------------------------------------------------------------
    // Process query results (unchanged sections 1-8 from the original)
    // -------------------------------------------------------------------------

    const playersMap = new Map<number, {
      username: string;
      matchesPlayed: Set<number>;
      gamesPlayed: number;
      gamesWon: number;
      timesOffered: number;
      timesSold: number;
      offersMade: number;
      offersAccepted: number;
      totalOfferValueAsTarget: number;
      offerCountAsTarget: number;
      netGold: number;
    }>();

    for (const user of usersResult.rows) {
      playersMap.set(user.id, {
        username:                user.username,
        matchesPlayed:           new Set<number>(),
        gamesPlayed:             0,
        gamesWon:                0,
        timesOffered:            0,
        timesSold:               0,
        offersMade:              0,
        offersAccepted:          0,
        totalOfferValueAsTarget: 0,
        offerCountAsTarget:      0,
        netGold:                 0,
      });
    }

    for (const row of matchPlayersResult.rows) {
      playersMap.get(row.user_id)?.matchesPlayed.add(row.match_id);
    }

    const teamComboWins  = new Map<string, number>();
    const teamComboGames = new Map<string, number>();

    for (const game of gamesResult.rows) {
      const team1 = game.team_1_members || [];
      const teamA = game.team_a_members || [];

      const winningTeam = game.winning_team === 'team_1' ? team1 : teamA;
      const losingTeam  = game.winning_team === 'team_1' ? teamA : team1;

      const winComboKey = winningTeam
        .map((id: number) => playersMap.get(id)?.username || `Player#${id}`)
        .sort()
        .join(' + ');

      teamComboWins.set(winComboKey,  (teamComboWins.get(winComboKey)  || 0) + 1);
      teamComboGames.set(winComboKey, (teamComboGames.get(winComboKey) || 0) + 1);

      const loseComboKey = losingTeam
        .map((id: number) => playersMap.get(id)?.username || `Player#${id}`)
        .sort()
        .join(' + ');

      if (!teamComboWins.has(loseComboKey)) teamComboWins.set(loseComboKey, 0);
      teamComboGames.set(loseComboKey, (teamComboGames.get(loseComboKey) || 0) + 1);

      for (const playerId of new Set<number>([...team1, ...teamA])) {
        const stats = playersMap.get(playerId);
        if (!stats) continue;
        stats.gamesPlayed += 1;
        if (winningTeam.includes(playerId)) stats.gamesWon += 1;
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

    for (const row of netGoldResult.rows) {
      const stats = playersMap.get(row.player_id);
      if (stats) stats.netGold = parseInt(row.net_gold, 10);
    }

    // -------------------------------------------------------------------------
    // Build response payload
    // -------------------------------------------------------------------------

    const players: PlayerRow[] = Array.from(playersMap.values()).map(p => ({
      username:          p.username,
      gamesPlayed:       p.gamesPlayed,
      gamesWon:          p.gamesWon,
      timesSold:         p.timesSold,
      timesOffered:      p.timesOffered,
      offersMade:        p.offersMade,
      offersAccepted:    p.offersAccepted,
      averageOfferValue:
        p.offerCountAsTarget > 0
          ? +(p.totalOfferValueAsTarget / p.offerCountAsTarget).toFixed(1)
          : 0,
      netGold: p.netGold,
    }));

    const topWinningCombos: TeamComboRow[] = Array.from(teamComboWins.entries())
      .map(([combo, wins]) => {
        const gamesPlayed = teamComboGames.get(combo) || 0;
        const winRate     = gamesPlayed > 0 ? +(wins / gamesPlayed * 100).toFixed(1) : 0;
        return { combo, wins, gamesPlayed, winRate };
      })
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
      .slice(0, 10);

    const acquisitionImpact: AcquisitionRow[] = acquisitionResult.rows.map(r => ({
      username:             r.username,
      totalAcquisitions:    Number(r.total_acquisitions),
      winsAfterAcquisition: Number(r.wins_after_acquisition),
      winRate:              Number(r.win_rate),
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

    const winTypeStats: WinTypeStatsRow[] = winTypeResult.rows.map(r => ({
      username:          r.username,
      lastStandingWins:  Number(r.last_standing_wins),
      goldThresholdWins: Number(r.gold_threshold_wins),
      totalWins:         Number(r.total_wins),
    }));

    // Hero stats — winRate is null below MIN_PICKS_FOR_RATE to avoid
    // misleading small-sample percentages (e.g. 1/1 = "100%").
    const heroStats: HeroStatRow[] = heroStatsResult.rows.map(r => {
      const picks = Number(r.picks);
      const wins  = Number(r.wins);
      return {
        hero:        r.hero,
        picks,
        wins,
        winRate:     picks >= MIN_PICKS_FOR_RATE ? +((wins / picks) * 100).toFixed(1) : null,
        avgKills:    Number(r.avg_kills),
        avgDeaths:   Number(r.avg_deaths),
        avgAssists:  Number(r.avg_assists),
        avgKda:      Number(r.avg_kda),
        avgNetWorth: Number(r.avg_net_worth),
      };
    });

    const playerDotaStats: PlayerDotaStatRow[] = playerDotaStatsResult.rows.map(r => ({
      username:    r.username,
      games:       Number(r.games),
      avgKills:    Number(r.avg_kills),
      avgDeaths:   Number(r.avg_deaths),
      avgAssists:  Number(r.avg_assists),
      avgKda:      Number(r.avg_kda),
      avgNetWorth: Number(r.avg_net_worth),
    }));

    const data: StatsPayload = {
      players,
      topWinningCombos,
      acquisitionImpact,
      winStreaks,
      headToHead,
      winTypeStats,
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
