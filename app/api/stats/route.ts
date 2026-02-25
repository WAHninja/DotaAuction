import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  try {
    /* =========================
       1️⃣ Load users
    ========================= */

    const usersResult = await db.query(
      `SELECT id, username FROM users`
    )

    const playersMap = new Map<number, any>()

    for (const user of usersResult.rows) {
      playersMap.set(user.id, {
        userId: user.id,
        username: user.username,

        matchesPlayed: new Set<number>(),
        gamesPlayed: 0,
        gamesWon: 0,

        timesOffered: 0,
        timesSold: 0,

        offersMade: 0,
        offersAccepted: 0,

        totalOfferValueAsTarget: 0,
        offerCountAsTarget: 0,

        netGold: 0,
      })
    }

    /* =========================
       2️⃣ Matches played
    ========================= */

    const matchPlayersResult = await db.query(
      `SELECT match_id, user_id FROM match_players`
    )

    for (const row of matchPlayersResult.rows) {
      const stats = playersMap.get(row.user_id)
      if (stats) {
        stats.matchesPlayed.add(row.match_id)
      }
    }

    /* =========================
       3️⃣ Games played / won
    ========================= */

    const gamesResult = await db.query(
      `
      SELECT
        id,
        team_1_members,
        team_a_members,
        winning_team
      FROM games
      WHERE status = 'finished'
      `
    )

    const teamComboWins = new Map<string, number>()

    for (const game of gamesResult.rows) {
      const team1 = game.team_1_members || []
      const teamA = game.team_a_members || []

      const winningTeam =
        game.winning_team === 'team_1' ? team1 : teamA

      const comboKey = winningTeam
        .map((id: number) => playersMap.get(id)?.username || `Player#${id}`)
        .sort()
        .join(' + ')

      teamComboWins.set(
        comboKey,
        (teamComboWins.get(comboKey) || 0) + 1
      )

      const allPlayers = new Set<number>([...team1, ...teamA])

      for (const playerId of allPlayers) {
        const stats = playersMap.get(playerId)
        if (!stats) continue
        stats.gamesPlayed += 1
        if (winningTeam.includes(playerId)) {
          stats.gamesWon += 1
        }
      }
    }

    /* =========================
       4️⃣ Offers
    ========================= */

    const offersResult = await db.query(
      `
      SELECT
        from_player_id,
        target_player_id,
        offer_amount,
        status
      FROM offers
      `
    )

    for (const offer of offersResult.rows) {
      if (offer.from_player_id != null) {
        const fromStats = playersMap.get(offer.from_player_id)
        if (fromStats) {
          fromStats.offersMade += 1
          if (offer.status === 'accepted') {
            fromStats.offersAccepted += 1
          }
        }
      }

      if (offer.target_player_id != null) {
        const targetStats = playersMap.get(offer.target_player_id)
        if (targetStats) {
          targetStats.timesOffered += 1
          targetStats.totalOfferValueAsTarget += offer.offer_amount || 0
          targetStats.offerCountAsTarget += 1

          if (offer.status === 'accepted') {
            targetStats.timesSold += 1
          }
        }
      }
    }

    /* =========================
       5️⃣ Net gold
    ========================= */

    const netGoldResult = await db.query(
      `
      SELECT
        player_id,
        SUM(gold_change) AS net_gold
      FROM game_player_stats
      GROUP BY player_id
      `
    )

    for (const row of netGoldResult.rows) {
      const stats = playersMap.get(row.player_id)
      if (stats) {
        stats.netGold = parseInt(row.net_gold, 10)
      }
    }

    /* =========================
       6️⃣ New metrics — run in parallel
    ========================= */

    const [
      acquisitionResult,
      winStreakResult,
      headToHeadResult,
    ] = await Promise.all([

      /* ── Acquisition Impact ─────────────────────────────────────────────
         For each player who has been sold (accepted offer → target), find
         the immediately following game in that match and check whether their
         new team won.

         Win condition is inverted: if they were on team_1 before the sale
         they move to team_a, so winning means next_game.winning_team = 'team_a',
         and vice versa.

         LATERAL subquery gets the next finished game in the same match with
         a higher id (games are inserted sequentially so id ordering equals
         creation order).

         Minimum 2 acquisitions before a player appears — a single data point
         is too small to be meaningful.
      ──────────────────────────────────────────────────────────────────── */
      db.query(`
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

      /* ── Win Streaks ────────────────────────────────────────────────────
         Classic gaps-and-islands to find the longest consecutive win run
         for each player within a single match.

         Step 1 — player_game_results: for every finished game a player
           participated in, record whether they won and their sequence
           number within that match (ROW_NUMBER ordered by game id).

         Step 2 — win_groups: keep only wins, then subtract a second
           ROW_NUMBER (over wins only) from the overall sequence number.
           Consecutive wins share the same difference → same island group.

         Step 3 — streaks: count rows per island.

         Step 4 — best_per_player: DISTINCT ON (user_id) keeps only each
           player's single best streak; ORDER BY streak_length DESC picks
           the longest.

         Streaks of length 1 are excluded (min 2) — a single win is not
         a meaningful streak.
      ──────────────────────────────────────────────────────────────────── */
      db.query(`
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

      /* ── Head-to-Head ───────────────────────────────────────────────────
         For every finished game, take the cartesian product of
         team_1_members × team_a_members — every pair of players on
         opposing teams. Canonicalise each pair by LEAST/GREATEST(id) so
         each pair always appears in the same order regardless of which
         team they happened to be on.

         lower_id_won = 1 when the player with the lower numeric id won
         (i.e. they were on team_1 and team_1 won, or on team_a and team_a won).

         CROSS JOIN UNNEST produces one row per element of the array,
         joined with every element of the other array → full opposing
         pairings for each game.
      ──────────────────────────────────────────────────────────────────── */
      db.query(`
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
    ])

    /* =========================
       7️⃣ Build response
    ========================= */

    const players = Array.from(playersMap.values()).map(p => ({
      username: p.username,

      gamesPlayed: p.gamesPlayed,
      gamesWon:    p.gamesWon,

      timesSold:    p.timesSold,
      timesOffered: p.timesOffered,

      offersMade:    p.offersMade,
      offersAccepted: p.offersAccepted,

      averageOfferValue:
        p.offerCountAsTarget > 0
          ? +(p.totalOfferValueAsTarget / p.offerCountAsTarget).toFixed(1)
          : 0,

      netGold: p.netGold,
    }))

    const topWinningCombos = Array.from(teamComboWins.entries())
      .map(([combo, wins]) => ({ combo, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)

    const acquisitionImpact = acquisitionResult.rows.map(r => ({
      username:            r.username,
      totalAcquisitions:   Number(r.total_acquisitions),
      winsAfterAcquisition: Number(r.wins_after_acquisition),
      winRate:             Number(r.win_rate),
    }))

    const winStreaks = winStreakResult.rows.map(r => ({
      username:      r.username,
      longestStreak: Number(r.longest_streak),
      matchId:       Number(r.match_id),
    }))

    const headToHead = headToHeadResult.rows.map(r => ({
      playerAId:   Number(r.player_a_id),
      playerA:     r.player_a,
      playerBId:   Number(r.player_b_id),
      playerB:     r.player_b,
      totalGames:  Number(r.total_games),
      playerAWins: Number(r.player_a_wins),
      playerBWins: Number(r.player_b_wins),
    }))

    return NextResponse.json({
      players,
      topWinningCombos,
      acquisitionImpact,
      winStreaks,
      headToHead,
    })

  } catch (error) {
    console.error('[STATS_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to build stats' },
      { status: 500 }
    )
  }
}
