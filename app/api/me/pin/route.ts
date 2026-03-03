import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { rateLimit, getIp } from '@/lib/rate-limit';

// 5 attempts per 15 minutes per IP.
// Tighter than login since this is a sensitive account action.
const PIN_CHANGE_RATE_LIMIT = {
  id: 'pin-change',
  limit: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// ── PATCH /api/me/pin ─────────────────────────────────────────────────────────
// Body: { currentPin: string, newPin: string }
// Verifies the current PIN before allowing a change.
export async function PATCH(req: NextRequest) {
  // ---- Rate limit ----------------------------------------------------------
  const ip = getIp(req);
  const result = rateLimit(ip, PIN_CHANGE_RATE_LIMIT);

  if (!result.allowed) {
    const retryAfterSecs = Math.ceil(result.retryAfterMs / 1000);
    return new Response(
      JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSecs),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // ---- Auth ----------------------------------------------------------------
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

  // Fetch the stored hash for this user
  const { rows } = await db.query(
    'SELECT pin FROM users WHERE id = $1',
    [session.userId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // Constant-time comparison against the stored hash
  const pinMatches = await bcrypt.compare(currentPin, rows[0].pin);
  if (!pinMatches) {
    return NextResponse.json(
      { error: 'Current PIN is incorrect.' },
      { status: 403 }
    );
  }

  const hashedNewPin = await bcrypt.hash(newPin, 12);

  await db.query(
    'UPDATE users SET pin = $1 WHERE id = $2',
    [hashedNewPin, session.userId]
  );

  return NextResponse.json({ ok: true });
}
