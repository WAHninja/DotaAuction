// /api/stats/route.ts
import { NextResponse } from 'next/server'
import db from '@/lib/db'

/* =========================
   Types
========================= */

type GameRow = {
  game_id: number
  match_id: number
  team_a_members: number[]
  team_1_members: number[]
  winning_team: 'team_a' | 'team_1'
}

type OfferRow = {
  from_player_id: number | null
  target_player_id: number | null
  status: 'pending' | 'accepted' | 'rejected'
}

type PlayerStatsInternal = {
  matches: Set<number>
  gamesPlayed: number
  gamesWon: number
  offersMade: number
  offersAccepted: number
  timesOffered: number
  timesSold: number
}

/* =========================
   Route
========================= */

export async function GET() {
  try {
    /* -------------------------
       1️⃣ Fetch matches
    ------------------------- */

    const { rows: matches } = await db.query<{ id: number }>(
      `SELECT id FROM matches`
    )

    if (matches.length === 0) {
      return NextResponse.json({ players: [], topWinningCombos: [] })
    }

    const matchIds = matches.map(m => m.id)

    /* -------------------------
       2️⃣ Fetch finished games
    ------------------------- */

    const { rows: games } = await db.query<GameRow>(
      `
      SELECT
        id AS game_id,
        match_id,
        team_a_members,
        team_1_members,
        winning_team
      FROM games
      WHERE match_id = ANY($1)
        AND status = 'finished'
      ORDER BY id ASC
      `,
      [matchIds]
    )

    if (games.length === 0) {
      return NextResponse.json({ players: [], topWinningCombos: [] })
    }

    /* -------------------------
       3️⃣ Fetch users
    ------------------------- */

    const { rows: users } = await db.query<{ id: number; username: string }>(
      `SELECT id, username FROM users`
    )

    const playerIdToUsername = new Map<number, string>()
    for (const user of users) {
      playerIdToUsername.set(user.id, user.username)
    }

    /* -------------------------
       4️⃣ Fetch offers
    ------------------------- */

    const gameIds = games.map(g => g.game_id)

    const { rows: offers } = await db.query<OfferRow>(
      `
      SELECT from_player_id, target_player_id, status
      FROM offers
      WHERE game_id = ANY($1)
      `,
      [gameIds]
    )

    /* -------------------------
       5️⃣ Init stat containers
    ------------------------- */

    const playerStats = new Map<number, PlayerStatsInternal>()
    const teamComboWins = new Map<string, number>()

    const ensurePlayer = (playerId: number) => {
      if (!playerStats.has(playerId)) {
        playerStats.set(playerId, {
          matches: new Set(),
          gamesPlayed: 0,
          gamesWon: 0,
          offersMade: 0,
          offersAccepted: 0,
          timesOffered: 0,
          timesSold: 0,
        })
      }
      return playerStats.get(playerId)!
    }

    /* -------------------------
       6️⃣ Process games
    ------------------------- */

    for (const game of games) {
      const teamA = game.team_a_members
      const team1 = game.team_1_members

      const winningTeam =
        game.winning_team === 'team_1' ? team1 : teamA

      // 🔹 Track winning team combinations
      const comboKey = winningTeam
        .map(id => playerIdToUsername.get(id) ?? `Player#${id}`)
        .sort()
        .join(' + ')

      teamComboWins.set(comboKey, (teamComboWins.get(comboKey) ?? 0) + 1)

      // 🔹 Track player game stats
      const allPlayers = new Set([...teamA, ...team1])

      for (const playerId of allPlayers) {
        const stats = ensurePlayer(playerId)
        stats.matches.add(game.match_id)
        stats.gamesPlayed += 1
        if (winningTeam.includes(playerId)) {
          stats.gamesWon += 1
        }
      }
    }

    /* -------------------------
       7️⃣ Process offers
    ------------------------- */

    for (const offer of offers) {
      if (offer.from_player_id != null) {
        const fromStats = ensurePlayer(offer.from_player_id)
        fromStats.offersMade += 1
        if (offer.status === 'accepted') {
          fromStats.offersAccepted += 1
        }
      }

      if (offer.target_player_id != null) {
        const targetStats = ensurePlayer(offer.target_player_id)
        targetStats.timesOffered += 1
        if (offer.status === 'accepted') {
          targetStats.timesSold += 1
        }
      }
    }

    /* -------------------------
       8️⃣ Build response
    ------------------------- */

    const players = Array.from(playerStats.entries()).map(
      ([playerId, stats]) => {
        const username =
          playerIdToUsername.get(playerId) ?? `Player#${playerId}`

        return {
          username,
          matches: stats.matches.size,
          gamesPlayed: stats.gamesPlayed,
          gamesWon: stats.gamesWon,
          gamesWinRate:
            stats.gamesPlayed > 0
              ? +(stats.gamesWon / stats.gamesPlayed * 100).toFixed(1)
              : 0,

          offersMade: stats.offersMade,
          offersAccepted: stats.offersAccepted,
          offersAcceptedRate:
            stats.offersMade > 0
              ? +(stats.offersAccepted / stats.offersMade * 100).toFixed(1)
              : 0,

          timesOffered: stats.timesOffered,
          timesSold: stats.timesSold,
          timesSoldRate:
            stats.timesOffered > 0
              ? +(stats.timesSold / stats.timesOffered * 100).toFixed(1)
              : 0,
        }
      }
    )

    const topWinningCombos = Array.from(teamComboWins.entries())
      .map(([combo, wins]) => ({ combo, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)

    return NextResponse.json({ players, topWinningCombos })
  } catch (error) {
    console.error('[STATS_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to compute stats' },
      { status: 500 }
    )
  }
}
