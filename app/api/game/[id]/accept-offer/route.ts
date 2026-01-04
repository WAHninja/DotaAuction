import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import * as Ably from 'ably/promises';

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const matchId = params.id;
  if (!matchId) {
    return NextResponse.json({ message: 'Missing match ID.' }, { status: 400 });
  }

  const { offerId } = await req.json();
  const session = await getSession();
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });

  try {
    const { rows: gameRows } = await db.query(
      'SELECT * FROM Games WHERE match_id = $1 ORDER BY id DESC LIMIT 1',
      [matchId]
    );
    if (gameRows.length === 0) return NextResponse.json({ message: 'Game not found.' }, { status: 404 });
    const game = gameRows[0];

    const teamA = game.team_a_members;
    const team1 = game.team_1_members;
    const winningTeam = game.winning_team;
    const losingTeam = winningTeam === 'team_a' ? team1 : teamA;

    if (!losingTeam.includes(userId)) {
      return NextResponse.json({ message: 'You are not on the losing team.' }, { status: 403 });
    }

    const { rows: offerRows } = await db.query(
      'SELECT * FROM Offers WHERE id = $1 AND game_id = $2 AND status = $3',
      [offerId, game.id, 'pending']
    );
    if (offerRows.length === 0)
      return NextResponse.json({ message: 'Offer not found or already accepted.' }, { status: 404 });
    const offer = offerRows[0];

    const { from_player_id, target_player_id, offer_amount } = offer;

    await db.query('BEGIN');

    await db.query('UPDATE Offers SET status = $1 WHERE id = $2', ['accepted', offerId]);
    await db.query(
      'UPDATE Offers SET status = $1 WHERE game_id = $2 AND id != $3 AND status = $4',
      ['rejected', game.id, offerId, 'pending']
    );

    await db.query(
      'UPDATE match_players SET gold = gold + $1 WHERE user_id = $2 AND match_id = $3',
      [offer_amount, from_player_id, game.match_id]
    );

    await db.query(
      `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
       VALUES ($1, $2, $3, $4, 'offer_gain')`,
      [game.id, from_player_id, winningTeam, offer_amount]
    );

    await db.query('UPDATE Games SET status = $1 WHERE id = $2', ['finished', game.id]);

    const newTeamA = [...teamA];
    const newTeam1 = [...team1];

    if (teamA.includes(target_player_id)) {
      newTeamA.splice(newTeamA.indexOf(target_player_id), 1);
      newTeam1.push(target_player_id);
    } else if (team1.includes(target_player_id)) {
      newTeam1.splice(newTeam1.indexOf(target_player_id), 1);
      newTeamA.push(target_player_id);
    }

    const { rows: newGameRows } = await db.query(
      `INSERT INTO Games (match_id, team_a_members, team_1_members, status)
       VALUES ($1, $2, $3, 'in progress')
       RETURNING *`,
      [game.match_id, newTeamA, newTeam1]
    );

    await db.query('COMMIT');

    await ably.channels.get(`match-${matchId}-offers`).publish('offer-accepted', {
      acceptedOffer: offer,
      newGame: newGameRows[0],
    });

    return NextResponse.json({ message: 'Offer accepted and new game started.', newGame: newGameRows[0] });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
