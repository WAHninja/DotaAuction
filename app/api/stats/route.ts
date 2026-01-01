// /api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Fetch all matches
    const matchesResult = await db.query(`SELECT id FROM matches`)
    const matchIds = matchesResult.rows.map((m: any) => m.id)
    if (matchIds.length === 0) {
      return NextResponse.json({ players: [], topWinningCombos: [] })
    }

    // 2️⃣ Fetch all finished games
    const gamesResult = await db.query(
      `
      SELECT id AS game_id, match_id, team_a_members, team_1_members, winning_team
      FROM games
      WHERE match_id = ANY($1) AND status = 'finished'
      ORDER BY id ASC
      `,
      [matchIds]
    )
    const games = gamesResult.rows

    // 3️⃣ Fetch users
    const usersResult = await db.query(`SELECT id, username FROM users`)
    const playerIdToUsername: Record<number, string> = {}
    usersResult.rows.forEach((u: any) => {
      playerIdToUsername[u.id] = u.username
    })

    // 4️⃣ Fetch offers
    const gameIds = games.map(g => g.game_id)
    const offersResult = await db.query(
      `
      SELECT from_player_id, target_player_id, status, game_id
      FROM offers
      WHERE game_id = ANY($1)
      `,
      [gameIds]
    )

    // 5️⃣ Init maps
    const playerStatsMap = new Map<number, any>()
    const teamComboWins = new Map<string, number>()

    for (const game of games) {
      const teamA = game.team_a_members as number[]
      const team1 = game.team_1_members as number[]
      const winnerTeamIds = game.winning_team === 'team_1' ? team1 : teamA

      // Winning combos
      const winnerUsernames = winnerTeamIds.map(id => playerIdToUsername[id] || `Player#${id}`)
      const comboKey = [...winnerUsernames].sort().join(' + ')
      teamComboWins.set(comboKey, (teamComboWins.get(comboKey) || 0) + 1)

      // Player stats
      const allPlayers = Array.from(new Set([...teamA, ...team1]))
      for (const playerId of allPlayers) {
        if (!playerStatsMap.has(playerId)) {
          playerStatsMap.set(playerId, {
            matches: new Set<number>(),
            gamesPlayed: 0,
            gamesWon: 0,
            offersMade: 0,
            offersAccepted: 0,
            timesSold: 0,
            timesOffered: 0, // ✅
          })
        }

        const stats = playerStatsMap.get(playerId)
        stats.matches.add(game.match_id)
        stats.gamesPlayed += 1
        if (winnerTeamIds.includes(playerId)) {
          stats.gamesWon += 1
        }
      }
    }

    // 6️⃣ Offers logic
    for (const offer of offersResult.rows) {
      const fromStats = playerStatsMap.get(offer.from_player_id)
      if (fromStats) {
        fromStats.offersMade += 1
        if (offer.status === 'accepted') {
          fromStats.offersAccepted += 1
        }
      }

      const targetStats = playerStatsMap.get(offer.target_player_id)
      if (targetStats) {
        targetStats.timesOffered += 1
        if (offer.status === 'accepted') {
          targetStats.timesSold += 1
        }
      }
    }

    // 7️⃣ Output
    const playersStatsArray = Array.from(playerStatsMap.entries()).map(([playerId, stats]) => {
      const username = playerIdToUsername[playerId] || `Player#${playerId}`
      return {
        username,
        matches: stats.matches.size,
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        gamesWinRate:
          stats.gamesPlayed > 0 ? +(stats.gamesWon / stats.gamesPlayed * 100).toFixed(1) : 0,

        offersMade: stats.offersMade,
        offersAccepted: stats.offersAccepted,
        offersAcceptedRate:
          stats.offersMade > 0 ? +(stats.offersAccepted / stats.offersMade * 100).toFixed(1) : 0,

        timesSold: stats.timesSold,
        timesOffered: stats.timesOffered, // ✅ REQUIRED
        timesSoldRate:
          stats.timesOffered > 0 ? +(stats.timesSold / stats.timesOffered * 100).toFixed(1) : 0,
      }

    const topWinningCombos = Array.from(teamComboWins.entries())
      .map(([combo, wins]) => ({ combo, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)

    return NextResponse.json({ players: playersStatsArray, topWinningCombos })
  } catch (error) {
    console.error('[STATS_ERROR]', error)
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 })
  }
}
