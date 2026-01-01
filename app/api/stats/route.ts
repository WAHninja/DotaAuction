import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  try {
    const matchesResult = await db.query('SELECT id FROM matches')
    const matchIds = matchesResult.rows.map((m: { id: number }) => m.id)

    if (matchIds.length === 0) {
      return NextResponse.json({ players: [], topWinningCombos: [] })
    }

    const gamesResult = await db.query(
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
      `,
      [matchIds]
    )

    const usersResult = await db.query(
      `SELECT id, username FROM users`
    )

    const offersResult = await db.query(
      `
      SELECT from_player_id, target_player_id, status
      FROM offers
      WHERE game_id = ANY($1)
      `,
      [gamesResult.rows.map((g: any) => g.game_id)]
    )

    return NextResponse.json({
      players: [],
      topWinningCombos: [],
    })
  } catch (error) {
    console.error('STATS ERROR', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
