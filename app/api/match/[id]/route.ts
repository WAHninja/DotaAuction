import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

function safeParseArray(value: any): number[] {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || '[]'); }
  catch { console.error('Failed to parse array:', value); return []; }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const currentUserId = session.userId;
    const { id } = await params;
    const matchId = Number(id);
    if (isNaN(matchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

    const matchRes = await db.query(`SELECT * FROM Matches WHERE id = $1`, [matchId]);
    if (matchRes.rowCount === 0) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    const match = matchRes.rows[0];

    // Include steam_avatar so TeamCard can show player avatars without an
    // extra fetch or Steam API call.
    const playersRes = await db.query(
      `SELECT u.id, u.username, mp.gold, u.steam_avatar
       FROM match_players mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.match_id = $1`,
      [matchId]
    );
    const players = playersRes.rows;

    const gamesRes = await db.query(
      `SELECT * FROM Games WHERE match_id = $1 ORDER BY id ASC`,
      [matchId]
    );
    const games = gamesRes.rows;
    const latestGame = games.at(-1) ? { ...games.at(-1)!, gameNumber: games.length } : null;

    let offers: any[] = [];
    if (latestGame?.status === 'auction pending') {
      const offersRes = await db.query(`SELECT * FROM Offers WHERE game_id = $1`, [latestGame.id]);
      offers = offersRes.rows.map((offer) => ({
        ...offer,
        offer_amount: offer.status === 'pending' ? null : offer.offer_amount,
      }));
    }

    return NextResponse.json({ match, players, games, latestGame, offers, currentUserId });
  } catch (error) {
    console.error('API error in match/[id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
