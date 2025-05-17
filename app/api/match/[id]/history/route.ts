// /api/match/[id]/history/route.ts

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { parse } from 'url'

export async function GET(req: NextRequest) {
  try {
    const { pathname } = parse(req.url || '', true)
    const match = pathname?.match(/\/api\/match\/(\d+)\/history/)
    const matchId = match?.[1]

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID not found in URL' }, { status: 400 })
    }

    // Fetch all users in the match
    const userResult = await db.query(
      `
      SELECT u.id, u.username
      FROM users u
      JOIN match_players mp ON u.id = mp.player_id
      WHERE mp.match_id = $1
      `,
      [matchId]
    )
    const playerIdToUsername = Object.fromEntries(userResult.rows.map(u => [u.id, u.username]))

    // Fetch games in the match
    const gameResult = await db.query(
      `
      SELECT 
        g.id AS game_id,
        g.match_id,
        g.team_a_members,
        g.team_1_members,
        g.winning_team,
        g.status,
        g.created_at
      FROM games g
      WHERE g.match_id = $1
      ORDER BY g.id ASC
      `,
      [matchId]
    )

    const games = gameResult.rows
    const gameIds = games.map(g => g.game_id)

    // Fetch offers per game
    const offersResult = await db.query(
      `
      SELECT 
        o.id,
        o.game_id,
        o.from_player_id,
        o.target_player_id,
        o.offer_amount,
        o.status,
        o.created_at,
        u_from.username AS from_username,
        u_target.username AS target_username
      FROM offers o
      JOIN users u_from ON o.from_player_id = u_from.id
      JOIN users u_target ON o.target_player_id = u_target.id
      WHERE o.game_id = ANY($1)
      ORDER BY o.created_at ASC
      `,
      [gameIds]
    )

    const offersByGame = new Map<number, any[]>()
    for (const offer of offersResult.rows) {
      const gameId = offer.game_id
      if (!offersByGame.has(gameId)) offersByGame.set(gameId, [])
      offersByGame.get(gameId)!.push({
        id: offer.id,
        gameId: offer.game_id,
        fromPlayerId: offer.from_player_id,
        targetPlayerId: offer.target_player_id,
        offerAmount: offer.offer_amount,
        status: offer.status,
        createdAt: offer.created_at,
        fromUsername: offer.from_username,
        targetUsername: offer.target_username,
      })
    }

    // Fetch gold changes per game
    const statsResult = await db.query(
      `
      SELECT 
        gps.game_id,
        gps.team_id,
        gps.gold_change,
        gps.reason
      FROM game_player_stats gps
      WHERE gps.game_id = ANY($1)
      ORDER BY gps.game_id, gps.id
      `,
      [gameIds]
    )

    const statsByGame = new Map<number, any[]>()
    for (const row of statsResult.rows) {
      const gameId = row.game_id
      if (!statsByGame.has(gameId)) statsByGame.set(gameId, [])
      statsByGame.get(gameId)!.push({
        teamId: row.team_id,
        goldChange: row.gold_change,
        reason: row.reason,
      })
    }

    // Final combined result
    const history = games.map((game: any) => ({
      gameId: game.game_id,
      matchId: game.match_id,
      createdAt: game.created_at,
      status: game.status,
      winningTeam: game.winning_team,
      teamAMembers: game.team_a_members.map((id: number) => playerIdToUsername[id] || `Player#${id}`),
      team1Members: game.team_1_members.map((id: number) => playerIdToUsername[id] || `Player#${id}`),
      offers: offersByGame.get(game.game_id) || [],
      playerStats: statsByGame.get(game.game_id) || [],
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('[MATCH_HISTORY_ERROR]', error)
    return NextResponse.json({ error: 'Failed to load match history' }, { status: 500 })
  }
}
