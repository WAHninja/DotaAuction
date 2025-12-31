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

    // 2️⃣ Fetch all games for these matches
    const gamesResult = await db.query(
      `
      SELECT id AS game_id, match_id, team_a_members, team_1_members, winning_team
      FROM games
      WHERE match_id = ANY($1)
      ORDER BY id ASC
      `,
      [matchIds]
    )
    const games = gamesResult.rows.filter((g: any) => g.winning_team) // only finished games

    // 3️⃣ Fetch all users
    const usersResult = await db.query(`SELECT id, username FROM users`)
    const playerIdToUsername: Record<number, string> = {}
    usersResult.rows.forEach((u: any) => {
      playerIdToUsername[u.id] = u.username
    })

    // 4️⃣ Fetch all offers for these games
    const gameIds = games.map(g => g.game_id)
    const offersResult = await db.query(
      `
      SELECT from_player_id, target_player_id, status, game_id
      FROM offers
      WHERE game_id = ANY($1)
      `,
      [gameIds]
    )

    // 5️⃣ Initialize maps
    const playerStatsMap = new Map<number, any>()
    const teamComboWins = new Map<string, number>()

    // 6️⃣ Compute stats
    for (const game of games) {
      const teamA = [...new Set(game.team_a_members)]
      const team1 = [...new Set(game.team_1_members)]
      const winnerTeamIds = game.winning_team === 'team_1' ? team1 : teamA

      // Track winning combinations
      const winnerUsernames = winnerTeamIds.map(id => playerIdToUsername[id] || `Player#${id}`)
      const comboKey = [...winnerUsernames].sort().join(' + ')
      teamComboWins.set(comboKey, (teamComboWins.get(comboKey) || 0) + 1)

      // Update stats for all participants
      const allPlayers = [...new Set([...teamA, ...team1])]
      for (const playerId of allPlayers) {
        if (!playerStatsMap.has(playerId)) {
          playerStatsMap.set(playerId, {
            matches: new Set<number>(),
            gamesPlayed: 0,
            gamesWon: 0,
            offersMade: 0,
            offersAccepted: 0,
            timesSold: 0,
          })
        }
        const stats = playerStatsMap.get(playerId)
        stats.matches.add(game.match_id)
        stats.gamesPlayed += 1
        if (winnerTeamIds.includes(playerId)) stats.gamesWon += 1
      }
    }

    // 7️⃣ Process offers
    for (const offer of offersResult.rows) {
      const fromStats = playerStatsMap.get(offer.from_player_id)
      if (fromStats) {
        fromStats.offersMade += 1
        if (offer.status === 'accepted') fromStats.offersAccepted += 1
      }

      const targetStats = playerStatsMap.get(offer.target_player_id)
      if (targetStats && offer.status === 'accepted') {
        targetStats.timesSold += 1
      }
    }

    // 8️⃣ Convert stats to array with usernames and percentages
    const playersStatsArray = Array.from(playerStatsMap.entries()).map(([playerId, stats]) => {
      const username = playerIdToUsername[playerId] || `Player#${playerId}`
      return {
        username,
        matches: stats.matches.size,
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        gamesWinRate: stats.gamesPlayed > 0 ? +(stats.gamesWon / stats.gamesPlayed * 100).toFixed(1) : 0,
        offersMade: stats.offersMade,
        offersAccepted: stats.offersAccepted,
        offersAcceptedRate: stats.offersMade > 0 ? +(stats.offersAccepted / stats.offersMade * 100).toFixed(1) : 0,
        timesSold: stats.timesSold,
        timesSoldRate: stats.gamesPlayed > 0 ? +(stats.timesSold / stats.gamesPlayed * 100).toFixed(1) : 0,
      }
    })

    // 9️⃣ Top winning team combinations
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
