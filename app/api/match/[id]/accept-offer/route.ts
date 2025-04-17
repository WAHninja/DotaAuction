import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest, { params }: any) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = parseInt(context.params.id);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const { offerId } = await req.json();
    if (!offerId) {
      return NextResponse.json({ error: 'Missing offerId' }, { status: 400 });
    }

    const offerRes = await db.query(`SELECT * FROM Offers WHERE id = $1`, [offerId]);
    if (offerRes.rows.length === 0) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const offer = offerRes.rows[0];
    if (offer.target_player_id !== session.user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.query(`UPDATE Offers SET status = 'accepted' WHERE id = $1`, [offerId]);
    await db.query(
      `UPDATE Offers SET status = 'rejected' WHERE game_id = $1 AND target_player_id = $2 AND id != $3`,
      [offer.game_id, session.user_id, offerId]
    );
    await db.query(
      `UPDATE MatchPlayers SET gold = gold - $1 WHERE player_id = $2 AND match_id = $3`,
      [offer.offer_amount, offer.from_user_id, matchId]
    );

    const gameRes = await db.query(`SELECT * FROM Games WHERE id = $1`, [offer.game_id]);
    if (gameRes.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = gameRes.rows[0];
    let team1 = game.team_1_members;
    let teamA = game.team_a_members;

    let newTeam1 = team1;
    let newTeamA = teamA;

    if (team1.includes(offer.target_player_id)) {
      newTeam1 = team1.filter((id: number) => id !== offer.target_player_id);
      newTeamA = [...teamA, offer.target_player_id];
    } else if (teamA.includes(offer.target_player_id)) {
      newTeamA = teamA.filter((id: number) => id !== offer.target_player_id);
      newTeam1 = [...team1, offer.target_player_id];
    }

    await db.query(
      `UPDATE Games SET team_1_members = $1, team_a_members = $2 WHERE id = $3`,
      [newTeam1, newTeamA, offer.game_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
