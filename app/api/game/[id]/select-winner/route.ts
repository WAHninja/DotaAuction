import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import ably from '@/lib/ably-server'

type TeamId = 'team_1' | 'team_a'

export async function POST(req: NextRequest) {
  const client = await db.connect()
  let transactionStarted = false

  try {
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
    transactionStarted = true

    const gameRes = await client.query(
      'SELECT * FROM games WHERE id = $1 FOR UPDATE',
      [gameId]
    )
    if (gameRes.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const game = gameRes.rows[0]

    if (game.winning_team) {
      return NextResponse.json({ error: 'Winner already submitted' }, { status: 409 })
    }

    if (game.status !== 'in progress') {
      return NextResponse.json({ error: 'Game is not in progress' }, { status: 400 })
    }

    const winningMembers: number[] = game[`${winningTeamId}_members`]
    const losingTeamId: TeamId = winningTeamId === 'team_1' ? 'team_a' : 'team_1'
    const losingMembers: number[] = game[`${losingTeamId}_members`]

    /* ============================
       SINGLE WINNER SHORT-CIRCUIT
    ============================ */
    if (winningMembers.length === 1) {
      const winnerId = winningMembers[0]

      await client.query(
        'UPDATE games SET status = $1, winning_team = $2 WHERE id = $3',
        ['finished', winningTeamId, gameId]
      )

      await client.query(
        'UPDATE matches SET status = $1, winner_id = $2 WHERE id = $3',
        ['finished', winnerId, game.match_id]
      )

      await client.query('COMMIT')
      transactionStarted = false

      // 🔔 Realtime notify
      await ably.channels
        .get(`match-${game.match_id}`)
        .publish('game-winner-selected', {
          gameId,
          winningTeamId,
          finished: true,
        })

      return NextResponse.json({
        success: true,
        message: 'Match finished with single winner.',
      })
    }

    /* ============================
       GOLD CALCULATIONS
    ============================ */
    const losingGoldRes = await client.query(
      'SELECT user_id, gold FROM match_players WHERE match_id = $1 AND user_id = ANY($2)',
      [game.match_id, losingMembers]
    )

    let bonusPool = 0
    const losingGoldMap = new Map<number, number>()

    for (const row of losingGoldRes.rows) {
      losingGoldMap.set(row.user_id, row.gold)
      bonusPool += Math.floor(row.gold * 0.5)
    }

    const perWinnerBonus = Math.floor(bonusPool / winningMembers.length)

    // Move game into auction phase
    await client.query(
      'UPDATE games SET status = $1, winning_team = $2 WHERE id = $3',
      ['auction pending', winningTeamId, gameId]
    )

    // Reward winners
    for (const playerId of winningMembers) {
      const reward = 1000 + perWinnerBonus

      await client.query(
        'UPDATE match_players SET gold = gold + $1 WHERE match_id = $2 AND user_id = $3',
        [reward, game.match_id, playerId]
      )

      await client.query(
        `INSERT INTO game_player_stats
         (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1,$2,$3,$4,'win_reward')`,
        [gameId, playerId, winningTeamId, reward]
      )
    }

    // Penalize losers
    for (const playerId of losingMembers) {
      const penalty = Math.floor((losingGoldMap.get(playerId) ?? 0) * 0.5)

      await client.query(
        'UPDATE match_players SET gold = gold - $1 WHERE match_id = $2 AND user_id = $3',
        [penalty, game.match_id, playerId]
      )

      await client.query(
        `INSERT INTO game_player_stats
         (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1,$2,$3,$4,'loss_penalty')`,
        [gameId, playerId, losingTeamId, -penalty]
      )
    }

    await client.query('COMMIT')
    transactionStarted = false

    // 🔔 Realtime notify (auction starts)
    await ably.channels
      .get(`match-${game.match_id}`)
      .publish('game-winner-selected', {
        gameId,
        winningTeamId,
        status: 'auction pending',
      })

    return NextResponse.json({
      success: true,
      message: 'Winner selected, auction pending.',
    })
  } catch (err) {
    if (transactionStarted) await client.query('ROLLBACK')
    console.error('select-winner error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    client.release()
  }
}
