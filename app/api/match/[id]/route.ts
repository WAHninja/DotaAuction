import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/app/session'

export async function GET(req: NextRequest) {
  try {
    /* ---------------- Session ---------------- */
    const session = await getSession()
    const currentUserId = session?.userId ?? null

    /* ---------------- Params ---------------- */
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()
    const matchId = Number(id)

    if (!Number.isInteger(matchId)) {
      return NextResponse.json(
        { error: 'Invalid match ID' },
        { status: 400 }
      )
    }

    /* ---------------- Match ---------------- */
    const matchRes = await db.query(
      `SELECT * FROM matches WHERE id = $1`,
      [matchId]
    )

    if (matchRes.rowCount === 0) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    const match = matchRes.rows[0]

    /* ---------------- Players ---------------- */
    const playersRes = await db.query(
      `
      SELECT
        u.id,
        u.username,
        mp.gold
      FROM match_players mp
      JOIN users u ON u.id = mp.user_id
      WHERE mp.match_id = $1
      ORDER BY u.username ASC
      `,
      [matchId]
    )

    const players = playersRes.rows

    /* ---------------- Games + Player Stats ---------------- */
    const gamesRes = await db.query(
      `
      SELECT
        g.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', gps.id,
              'player_id', gps.player_id,
              'team_id', gps.team_id,
              'gold_change', gps.gold_change,
              'reason', gps.reason,
              'created_at', gps.created_at
            )
          ) FILTER (WHERE gps.id IS NOT NULL),
          '[]'
        ) AS playerStats
      FROM games g
      LEFT JOIN game_player_stats gps
        ON gps.game_id = g.id
      WHERE g.match_id = $1
      GROUP BY g.id
      ORDER BY g.id ASC
      `,
      [matchId]
    )

    const games = gamesRes.rows
    const latestGame = games.at(-1) ?? null

    /* ---------------- Offers (auction only) ---------------- */
    let offers: any[] = []

    if (latestGame?.status === 'auction pending') {
      const offersRes = await db.query(
        `
        SELECT
          id,
          from_player_id,
          target_player_id,
          offer_amount,
          status,
          created_at
        FROM offers
        WHERE game_id = $1
        ORDER BY created_at ASC
        `,
        [latestGame.id]
      )

      offers = offersRes.rows
    }

    /* ---------------- Response ---------------- */
    return NextResponse.json({
      match,
      players,
      games,
      latestGame,
      offers,
      currentUserId,
    })
  } catch (error) {
    console.error('API error in match/[id]:', error)

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
