import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/app/session'
import ablyServerClient from '@/lib/ably-server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const client = await db.connect()
  let transactionStarted = false

  try {
    /* =========================
       PARAMS
    ========================= */
    const gameId = Number(params.id)
    if (!Number.isInteger(gameId)) {
      return new Response(JSON.stringify({ message: 'Invalid game ID.' }), { status: 400 })
    }

    const { offerId } = await req.json()
    if (!Number.isInteger(Number(offerId))) {
      return new Response(JSON.stringify({ message: 'Invalid offer ID.' }), { status: 400 })
    }

    /* =========================
       AUTH
    ========================= */
    const session = await getSession()
    const userId = session?.userId

    if (!userId) {
      return new Response(JSON.stringify({ message: 'Not authenticated.' }), { status: 401 })
    }

    /* =========================
       GAME
    ========================= */
    const gameRes = await client.query(
      'SELECT * FROM games WHERE id = $1 LIMIT 1',
      [gameId]
    )

    if (gameRes.rows.length === 0) {
      return new Response(JSON.stringify({ message: 'Game not found.' }), { status: 404 })
    }

    const game = gameRes.rows[0]

    const teamA: number[] = game.team_a_members
    const team1: number[] = game.team_1_members
    const winningTeam = game.winning_team
    const losingTeam = winningTeam === 'team_a' ? team1 : teamA

    if (!losingTeam.includes(userId)) {
      return new Response(
        JSON.stringify({ message: 'Only losing team members can accept offers.' }),
        { status: 403 }
      )
    }

    /* =========================
       OFFER
    ========================= */
    const offerRes = await client.query(
      `SELECT * FROM offers
       WHERE id = $1 AND game_id = $2 AND status = 'pending'`,
      [offerId, gameId]
    )

    if (offerRes.rows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Offer not found or already processed.' }),
        { status: 404 }
      )
    }

    const offer = offerRes.rows[0]
    const { from_player_id, target_player_id, offer_amount } = offer

    /* =========================
       TRANSACTION
    ========================= */
    await client.query('BEGIN')
    transactionStarted = true

    // Accept offer
    await client.query(
      'UPDATE offers SET status = $1 WHERE id = $2',
      ['accepted', offerId]
    )

    // Reject others
    await client.query(
      `UPDATE offers
       SET status = 'rejected'
       WHERE game_id = $1 AND id != $2 AND status = 'pending'`,
      [gameId, offerId]
    )

    // Award gold
    await client.query(
      'UPDATE match_players SET gold = gold + $1 WHERE user_id = $2 AND match_id = $3',
      [offer_amount, from_player_id, game.match_id]
    )

    // Stats
    await client.query(
      `INSERT INTO game_player_stats
       (game_id, player_id, team_id, gold_change, reason)
       VALUES ($1, $2, $3, $4, 'offer_gain')`,
      [gameId, from_player_id, winningTeam, offer_amount]
    )

    // Finish game
    await client.query(
      'UPDATE games SET status = $1 WHERE id = $2',
      ['finished', gameId]
    )

    /* =========================
       NEXT GAME
    ========================= */
    const newTeamA = [...teamA]
    const newTeam1 = [...team1]

    if (newTeamA.includes(target_player_id)) {
      newTeamA.splice(newTeamA.indexOf(target_player_id), 1)
      newTeam1.push(target_player_id)
    } else {
      newTeam1.splice(newTeam1.indexOf(target_player_id), 1)
      newTeamA.push(target_player_id)
    }

    const newGameRes = await client.query(
      `INSERT INTO games (match_id, team_a_members, team_1_members, status)
       VALUES ($1, $2, $3, 'in progress')
       RETURNING *`,
      [game.match_id, newTeamA, newTeam1]
    )

    await client.query('COMMIT')
    transactionStarted = false

    /* =========================
       🔔 ABLY (POST-COMMIT)
    ========================= */
    try {
      await ablyServerClient.channels
        .get(`match-${game.match_id}-offers`)
        .publish('offer-accepted', {
          gameId,
          offerId,
          acceptedBy: userId,
          newGameId: newGameRes.rows[0].id,
        })
    } catch (ablyErr) {
      console.error('Ably publish failed:', ablyErr)
    }

    return new Response(
      JSON.stringify({
        acceptedOffer: offer,
        newGame: newGameRes.rows[0],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    if (transactionStarted) {
      await client.query('ROLLBACK')
    }

    console.error('Error accepting offer:', err)
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 })
  } finally {
    client.release()
  }
}
