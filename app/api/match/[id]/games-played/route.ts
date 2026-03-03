import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;
  const matchId = Number(id);

  if (isNaN(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID.' }, { status: 400 });
  }

  // Verify the caller is a participant in this match.
  // Without this check any authenticated user could probe game counts
  // for matches they're not part of.
  const membershipRes = await db.query(
    `SELECT 1 FROM match_players WHERE match_id = $1 AND user_id = $2`,
    [matchId, session.userId]
  );

  if (membershipRes.rows.length === 0) {
    return NextResponse.json({ error: 'Not a participant in this match.' }, { status: 403 });
  }

  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM games WHERE match_id = $1',
      [matchId]
    );

    const gamesPlayed = parseInt(rows[0]?.count || '0', 10);

    return NextResponse.json({ gamesPlayed });
  } catch (err) {
    console.error('Error fetching games played:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
