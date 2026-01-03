import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import Ably from 'ably/promises'

type TeamId = 'team_1' | 'team_a'

export async function POST(req: NextRequest) {
  const client = await db.connect()

  try {
    /* =============================
       Parse & Validate Input
    ============================== */
    const url = new URL(req.url)
    const gameId = Number(url.pathname.split('/')[3])

    if (!Number.isInteger(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 })
    }

    const { winningTeamId }: { winningTeamId: TeamId } = await req.json()

    if (!['team_1', 'team_a'].includes(winningTeamId)) {
      return NextResponse.json({ error: 'Invalid winningTeamId' }, { status: 400 })
    }

    await client.query('BEGIN')

    /* =============================
       Lock Game Row (Prevents races)
    ============================== */
    const gameRes = await client.query(
      `SELECT * FROM games WHERE id = $1 FOR UPDATE`,
      [gameId]
    )

    if (gameRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const game = gameRes.rows[0]

    /* =============================
       Idempotency Guard
    ============================== */
    if (game.winning_team) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Winner already submitted for this game' },
        { status: 409 }
      )
    }

    if (game.status !== 'in progress') {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Game is not in progress' },
        { status: 400 }
      )
    }

    const winningMembers: number[] = game[`${winningTeamId}_members`]
    const losingTeamId: TeamId =
      winningTeamId === 'team_1' ? 'team_a' : 'team_1'
    const losingMembers: number[] = game[`${losingTeamId}_members`]

    /* =============================
       Single Winner Shortcut
    ============================== */
    if (winningMembers.length === 1) {
      const winnerId = winningMembers[0]

      await client.query(
        `UPDATE games
         SET status = 'finished', winning_team = $1
         WHERE id = $2`,
        [winningTeamId, gameId]
      )

      await client.query(
        `UPDATE matches
         SET status = 'finished', winner_id = $1
         WHERE id = $2`,
        [winnerId, game.match_id]
      )

      await client.query('COMMIT')
      await publishAbly(game.match_id, {
        gameId,
        matchId: game.match_id,
        winnerId,
      })

      return NextResponse.json({
        success: true,
        message: 'Match finished with single winner.',
      })
    }

    /* =============================
       Calculate Losing Gold (Once)
    ============================== */
    const losingGoldRes = await client.query(
      `SELECT user_id, gold
       FROM match_players
       WHERE match_id = $1 AND user_id = ANY($2)`,
      [game.match_id, losingMembers]
    )

    const losingGoldMap = new Map<number, number>()
    let bonusPool = 0

    for (const row of losingGoldRes.rows) {
      losingGoldMap.set(row.user_id, row.gold)
      bonusPool += Math.floor(row.gold * 0.5)
    }

    const perWinnerBonus = Math.floor(bonusPool / winningMembers.length)

    /* =============================
       Update Game State
    ============================== */
    await client.query(
      `UPDATE games
       SET status = 'auction pending', winning_team = $1
       WHERE id = $2`,
      [winningTeamId, gameId]
    )

    /* =============================
       Reward Winners
    ============================== */
    for (const playerId of winningMembers) {
      const reward = 1000 + perWinnerBonus

      await client.query(
        `UPDATE match_players
         SET gold = gold + $1
         WHERE match_id = $2 AND user_id = $3`,
        [reward, game.match_id, playerId]
      )

      await client.query(
        `INSERT INTO game_player_stats
         (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1, $2, $3, $4, 'win_reward')`,
        [gameId, playerId, winningTeamId, reward]
      )
    }

    /* =============================
       Penalise Losers
    ============================== */
    for (const playerId of losingMembers) {
      const originalGold = losingGoldMap.get(playerId) ?? 0
      const penalty = Math.floor(originalGold * 0.5)

      await client.query(
        `UPDATE match_players
         SET gold = gold - $1
         WHERE match_id = $2 AND user_id = $3`,
        [penalty, game.match_id, playerId]
      )

      await client.query(
        `INSERT INTO game_player_stats
         (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1, $2, $3, $4, 'loss_penalty')`,
        [gameId, playerId, losingTeamId, -penalty]
      )
    }

    await client.query('COMMIT')

    /* =============================
       Notify Clients
    ============================== */
    await publishAbly(game.match_id, {
      gameId,
      matchId: game.match_id,
    })

    return NextResponse.json({
      success: true,
      message: 'Winner selected, auction pending.',
    })

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('select-winner error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

/* =============================
   Ably Helper
============================= */
async function publishAbly(matchId: number, payload: any) {
  const ably = new Ably.Rest(process.env.ABLY_API_KEY!)
  const channel = ably.channels.get(`match-${matchId}`)
  await channel.publish('game-winner-selected', payload)
}
