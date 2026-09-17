import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { invalidateStatsCache } from '@/lib/stats-cache'

// ── PATCH /api/me/username ────────────────────────────────────────────────────
// Body: { username: string }
// Updates the current user's username after checking it isn't already taken.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let newUsername: string;
  try {
    ({ username: newUsername } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const cleaned = newUsername?.trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 32) {
    return NextResponse.json(
      { error: 'Username must be between 2 and 32 characters.' },
      { status: 400 }
    );
  }

  // Check it isn't already taken by someone else
  const { rows: existing } = await db.query(
    'SELECT id FROM users WHERE username = $1 AND id != $2',
    [cleaned, session.userId]
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'That username is already taken.' },
      { status: 409 }
    );
  }

  await db.query(
    'UPDATE users SET username = $1 WHERE id = $2',
    [cleaned, session.userId]
  );

  // Username is the join key for every relational stat — head-to-head,
  // synergy, records — so a rename makes the whole cached payload wrong.
  invalidateStatsCache('username changed');

  return NextResponse.json({ ok: true, username: cleaned });
}
