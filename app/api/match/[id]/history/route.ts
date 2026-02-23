import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/app/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { id: matchId } = await params
    if (!matchId || isNaN(Number(matchId))) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 })
    }

    // Fetch all users in the match
    const userResult = await db.query(
      `SELECT u.id, u.username
       FROM users u
       JOIN match_players mp ON u.id = mp.user_id
       WHERE mp.match_id = $1`,
      [matchId]
    )
    const playerIdToUsername = Object.fromEntries(userResult.rows.map(u => [u.id, u.username]))

    // Fetch games in the match
    const gameResult = await db.query(
      `SELECT
        g.id AS game_id,
        g.match_id,
        g.team_a_members,
        g.team_1_members,
        g.winning_team,
        g.status,
        g.created_at
       FROM games g
       WHERE g.match_id = $1
       ORDER BY g.id ASC`,
      [matchId]
    )

    const games = gameResult.rows
    const gameIds = games.map(g => g.game_id)

    if (gameIds.length === 0) {
      return NextResponse.json({ history: [] })
    }

    // Fetch offers per game.
    // Strip offer_amount for any offer that is still pending — the exact value
    // must not be transmitted to clients until the offer is resolved, even
    // through the history endpoint.
    const offersResult = await db.query(
      `SELECT
        o.id,
        o.game_id,
        o.from_player_id,
        o.target_player_id,
        o.offer_amount,
        o.tier_label,
        o.status,
        o.created_at,
        u_from.username  AS from_username,
        u_target.username AS target_username
       FROM offers o
       JOIN users u_from   ON o.from_player_id   = u_from.id
       JOIN users u_target ON o.target_player_id = u_target.id
       WHERE o.game_id = ANY($1)
       ORDER BY o.created_at ASC`,
      [gameIds]
    )

    const offersByGame = new Map<number, any[]>()
    for (const offer of offersResult.rows) {
      const gameId = offer.game_id
      if (!offersByGame.has(gameId)) offersByGame.set(gameId, [])
      offersByGame.get(gameId)!.push({
        id:             offer.id,
        gameId:         offer.game_id,
        fromPlayerId:   offer.from_player_id,
        targetPlayerId: offer.target_player_id,
        offerAmount:    offer.status === 'pending' ? null : offer.offer_amount,
        tierLabel:      offer.tier_label,
        status:         offer.status,
        createdAt:      offer.created_at,
        fromUsername:   offer.from_username,
        targetUsername: offer.target_username,
      })
    }

    // Fetch gold changes per game
    const statsResult = await db.query(
      `SELECT
        gps.id,
        gps.game_id,
        gps.player_id,
        u.username,
        gps.gold_change,
        gps.reason
       FROM game_player_stats gps
       JOIN users u ON gps.player_id = u.id
       WHERE gps.game_id = ANY($1)
       ORDER BY gps.game_id, gps.id`,
      [gameIds]
    )

    const statsByGame = new Map<number, any[]>()
    for (const row of statsResult.rows) {
      const gameId = row.game_id
      if (!statsByGame.has(gameId)) statsByGame.set(gameId, [])
      statsByGame.get(gameId)!.push({
        id:         row.id,
        playerId:   row.player_id,
        username:   row.username,
        goldChange: row.gold_change,
        reason:     row.reason,
      })
    }

    const history = games.map((game: any, index: number) => ({
      gameNumber:   index + 1,
      gameId:       game.game_id,
      matchId:      game.match_id,
      createdAt:    game.created_at,
      status:       game.status,
      winningTeam:  game.winning_team,
      teamAMembers: game.team_a_members.map((id: number) => playerIdToUsername[id] || `Player#${id}`),
      team1Members: game.team_1_members.map((id: number) => playerIdToUsername[id] || `Player#${id}`),
      offers:       offersByGame.get(game.game_id) || [],
      playerStats:  statsByGame.get(game.game_id) || [],
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('[MATCH_HISTORY_ERROR]', error)
    return NextResponse.json({ error: 'Failed to load match history' }, { status: 500 })
  }
}
