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
      if (stats) stats.matchesPlayed.add(row.match_id)
    }

    /* =========================
       3️⃣ Games / Combos
    ========================= */

    const gamesResult = await db.query(
      `
      SELECT
        id,
        team_1_members,
        team_a_members,
        winning_team,
        finished_at
      FROM games
      WHERE status = 'finished'
      `
    )

    /**
     * comboKey => { wins, lastPlayedAt }
     */
    const comboMap = new Map<string, { wins: number; lastPlayedAt: string }>()

    for (const game of gamesResult.rows) {
      const team1 = game.team_1_members || []
      const teamA = game.team_a_members || []

      const winningTeam =
        game.winning_team === 'team_1' ? team1 : teamA

      // Normalize combo (ORDER INDEPENDENT)
      const comboKey = winningTeam
        .map((id: number) => playersMap.get(id)?.username || `Player#${id}`)
        .sort((a: string, b: string) => a.localeCompare(b))
        .join(' + ')

      const existing = comboMap.get(comboKey)

      if (existing) {
        existing.wins += 1
        if (game.finished_at > existing.lastPlayedAt) {
          existing.lastPlayedAt = game.finished_at
        }
      } else {
        comboMap.set(comboKey, {
          wins: 1,
          lastPlayedAt: game.finished_at,
        })
      }

      // Games played / won per player
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
        status
      FROM offers
      `
    )

    for (const offer of offersResult.rows) {
      // Offer made
      if (offer.from_player_id != null) {
        const fromStats = playersMap.get(offer.from_player_id)
        if (fromStats) {
          fromStats.offersMade += 1
          if (offer.status === 'accepted') {
            fromStats.offersAccepted += 1
          }
        }
      }

      // Offer received
      if (offer.target_player_id != null) {
        const targetStats = playersMap.get(offer.target_player_id)
        if (targetStats) {
          targetStats.timesOffered += 1
          if (offer.status === 'accepted') {
            targetStats.timesSold += 1
          }
        }
      }
    }

    /* =========================
       5️⃣ Build response
    ========================= */

    const players = Array.from(playersMap.values()).map(p => ({
      username: p.username,

      matchesPlayed: p.matchesPlayed.size,
      gamesPlayed: p.gamesPlayed,
      gamesWon: p.gamesWon,

      timesOffered: p.timesOffered,
      timesSold: p.timesSold,

      offersMade: p.offersMade,
      offersAccepted: p.offersAccepted,
    }))

    const topWinningCombos = Array.from(comboMap.entries()).map(
      ([combo, data]) => ({
        combo,
        wins: data.wins,
        lastPlayedAt: data.lastPlayedAt,
      })
    )

    return NextResponse.json({
      players,
      topWinningCombos,
    })
  } catch (error) {
    console.error('[STATS_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to build stats' },
      { status: 500 }
    )
  }
}
