// app/api/changelog/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/app/session';
import db from '@/lib/db';

// GET — return all patch notes and whether the user has unseen entries
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [notesResult, userResult] = await Promise.all([
    db.query(
      `SELECT id, version, title, content, released_at
       FROM patch_notes
       ORDER BY released_at DESC`
    ),
    db.query(
      `SELECT last_seen_changelog FROM users WHERE id = $1`,
      [session.userId]
    ),
  ]);

  const lastSeen: Date | null = userResult.rows[0]?.last_seen_changelog ?? null;
  const latest: Date | null   = notesResult.rows[0]?.released_at ?? null;
  // latest must exist before we can have anything unseen.
  // The old expression (!lastSeen || ...) returned true whenever lastSeen
  // was null — including when there are zero patch notes in the DB.
  const hasUnseen             = !!latest && (!lastSeen || latest > lastSeen);

  return NextResponse.json({
    notes: notesResult.rows,
    hasUnseen,
    lastSeen,
  });
}

// POST — mark changelog as seen for the current user
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.query(
    `UPDATE users SET last_seen_changelog = NOW() WHERE id = $1`,
    [session.userId]
  );

  return NextResponse.json({ ok: true });
}
