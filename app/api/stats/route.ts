// /api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Fetch all completed matches
    const matchesResult = await db.query(`
      SELECT id FROM matches
    `)
    const matchIds = matchesResult.rows.map((m: any) => m.id)

    if (matchIds.length === 0) {
      return NextResponse.json({ players: [], topWinningCombos: [] })
    }

    // 2️⃣ Fetch all games in those matches
    const gamesResult = await db.query(
      `
      SELECT id AS game_id, match_id, team_a_members, team_1_members, winning_team
      FROM games
      WHERE match_id = ANY($1)
      ORDER BY id ASC
      `,
      [matchIds]
    )

    const games = gamesResult.rows

    // 3️⃣ Fetch all users
    const usersResult = await db.query(`
      SELECT id, username FROM users
    `)
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

    // 5️⃣ Prepare maps
    const playerStatsMap = new Map<string, any>()
    const teamComboWins = new Map<string, number>()

    for (const game of games) {
      const teamA = game.team_a_members.map((id: number) => playerIdToUsername[id] || `Player#${id}`)
      const team1 = game.team_1_members.map((id: number) => playerIdToUsername[id] || `Player#${id}`)
      const winnerTeam = game.winning_team === 'team_1' ? team1 : teamA

      // Track winning combos
      const comboKey = [...winnerTeam].sort().join(' + ')
      teamComboWins.set(comboKey, (teamComboWins.get(comboKey) || 0) + 1)

      // Update player stats for each participant
      for (const player of [...teamA, ...team1]) {
        if (!playerStatsMap.has(player)) {
          playerStatsMap.set(player, {
            matches: new Set<number>(),
            gamesPlayed: 0,
            gamesWon: 0,
            offersMade: 0,
            offersAccepted: 0,
            timesSold: 0,
          })
        }

        const stats = playerStatsMap.get(player)
        stats.matches.add(game.match_id)
        stats.gamesPlayed += 1
        if (winnerTeam.includes(player)) stats.gamesWon += 1
      }
    }

    // Process offers
    for (const offer of offersResult.rows) {
      const fromUsername = playerIdToUsername[offer.from_player_id] || `Player#${offer.from_player_id}`
      if (!playerStatsMap.has(fromUsername)) continue
      const stats = playerStatsMap.get(fromUsername)
      stats.offersMade += 1
      if (offer.status === 'accepted') stats.offersAccepted += 1

      // Count timesSold for target player
      const targetUsername = playerIdToUsername[offer.target_player_id] || `Player#${offer.target_player_id}`
      if (!playerStatsMap.has(targetUsername)) continue
      const targetStats = playerStatsMap.get(targetUsername)
      if (offer.status === 'accepted') targetStats.timesSold += 1
    }

    // Convert Set to number for matches and compute percentages
    const playersStatsArray = Array.from(playerStatsMap.entries()).map(([username, stats]) => ({
      username,
      matches: stats.matches.size,
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      gamesWinRate: stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0,
      offersMade: stats.offersMade,
      offersAccepted: stats.offersAccepted,
      offersAcceptedRate: stats.offersMade > 0 ? (stats.offersAccepted / stats.offersMade) * 100 : 0,
      timesSold: stats.timesSold,
      timesSoldRate: stats.gamesPlayed > 0 ? (stats.timesSold / stats.gamesPlayed) * 100 : 0,
    }))

    // Sort winning combos descending
    const topWinningCombos = Array.from(teamComboWins.entries())
      .map(([combo, count]) => ({ combo, wins: count }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10) // top 10 combos

    return NextResponse.json({ players: playersStatsArray, topWinningCombos })
  } catch (error) {
    console.error('[STATS_ERROR]', error)
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 })
  }
}
