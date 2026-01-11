// app/api/match/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/app/session'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    const currentUserId = session?.userId || null

    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()
    const matchId = parseInt(id || '', 10)

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 })
    }

    /* ---------------- Match ---------------- */
    const matchRes = await db.query(
      `SELECT * FROM Matches WHERE id = $1`,
      [matchId]
    )

    if (matchRes.rowCount === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const match = matchRes.rows[0]

    /* ---------------- Players ---------------- */
    const playersRes = await db.query(
      `SELECT u.id, u.username, mp.gold
       FROM match_players mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.match_id = $1`,
      [matchId]
    )
    const players = playersRes.rows

    /* ---------------- Games ---------------- */
    const gamesRes = await db.query(
      `SELECT * FROM Games WHERE match_id = $1 ORDER BY id ASC`,
      [matchId]
    )
    const games = gamesRes.rows
    const latestGame = games.at(-1) || null

    const gameIds = games.map(g => g.id)
    let offers: any[] = []
    let playerStats: any[] = []

    if (gameIds.length > 0) {
      /* ---------------- Offers for all games ---------------- */
      const offersRes = await db.query(
        `SELECT id, from_player_id, target_player_id, offer_amount, status, game_id
         FROM Offers
         WHERE game_id = ANY($1::int[])
         ORDER BY created_at ASC`,
        [gameIds]
      )
      offers = offersRes.rows

      /* ---------------- Player stats for all games ---------------- */
      const statsRes = await db.query(
        `SELECT id, player_id, gold_change, reason, team_id, game_id
         FROM PlayerStats
         WHERE game_id = ANY($1::int[])
         ORDER BY id ASC`,
        [gameIds]
      )
      playerStats = statsRes.rows
    }

    /* ---------------- Attach offers and stats to each game ---------------- */
    const gamesWithDetails = games.map(game => ({
      ...game,
      offers: offers.filter(o => o.game_id === game.id),
      playerStats: playerStats.filter(s => s.game_id === game.id),
    }))

    /* ---------------- Response ---------------- */
    return NextResponse.json({
      match,
      players,
      games: gamesWithDetails,
      latestGame,
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
