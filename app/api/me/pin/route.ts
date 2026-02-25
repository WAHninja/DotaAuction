import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

// ── PATCH /api/me/pin ─────────────────────────────────────────────────────────
// Body: { currentPin: string, newPin: string }
// Verifies the current PIN before allowing a change.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let currentPin: string, newPin: string;
  try {
    ({ currentPin, newPin } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!currentPin || !newPin) {
    return NextResponse.json(
      { error: 'Current PIN and new PIN are required.' },
      { status: 400 }
    );
  }

  if (!/^\d{4,}$/.test(newPin)) {
    return NextResponse.json(
      { error: 'New PIN must be at least 4 digits.' },
      { status: 400 }
    );
  }

  // Verify the current PIN is correct
  const { rows } = await db.query(
    'SELECT id FROM users WHERE id = $1 AND pin = $2',
    [session.userId, currentPin]
  );
  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'Current PIN is incorrect.' },
      { status: 403 }
    );
  }

  await db.query(
    'UPDATE users SET pin = $1 WHERE id = $2',
    [newPin, session.userId]
  );

  return NextResponse.json({ ok: true });
}
