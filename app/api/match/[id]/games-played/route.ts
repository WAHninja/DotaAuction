import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const matchId = Number(params.id);

  if (isNaN(matchId)) {
    return NextResponse.json({ message: 'Invalid match ID.' }, { status: 400 });
  }

  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM Games WHERE match_id = $1',
      [matchId]
    );

    const gamesPlayed = parseInt(rows[0]?.count || '0', 10);

    return NextResponse.json({ gamesPlayed });
  } catch (err) {
    console.error('Error fetching games played:', err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
