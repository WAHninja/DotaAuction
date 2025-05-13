// /api/match/[id]/history/route.ts

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id

  try {
    const games = await db.query(`
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
    `, [matchId])

    const gameIds = games.rows.map((g: any) => g.game_id)
    const offersResult = await db.query(`
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
    `, [gameIds])

    const offersByGame = new Map()
    for (const offer of offersResult.rows) {
      const gameId = offer.game_id
      if (!offersByGame.has(gameId)) offersByGame.set(gameId, [])
      offersByGame.get(gameId).push(offer)
    }

    const history = games.rows.map((game: any) => ({
      ...game,
      offers: offersByGame.get(game.game_id) || [],
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load match history' }, { status: 500 })
  }
}
