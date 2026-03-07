import { NextResponse } from 'next/server';
import { getSession } from '@/app/session';
import db from '@/lib/db';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const room = new URL(req.url).searchParams.get('room');
  if (!room) return NextResponse.json({ error: 'Missing room' }, { status: 400 });

  // Fetch username for the Daily meeting token display name
  const { rows } = await db.query(
    'SELECT username FROM users WHERE id = $1',
    [session.userId]
  );
  const username: string = rows[0]?.username ?? `Player#${session.userId}`;

  // Create room if it doesn't exist (safe to call repeatedly — Daily ignores duplicates)
  await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: room,
      privacy: 'private',
      properties: {
        enable_chat: false,
        start_video_off: true,
        exp: Math.floor(Date.now() / 1000) + 86400, // room expires after 24h
      },
    }),
  });

  // Generate a short-lived meeting token for this user
  const res = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: room,
        user_name: username,
        exp: Math.floor(Date.now() / 1000) + 7200, // token valid 2 hours
      },
    }),
  });

  const { token } = await res.json();
  return NextResponse.json({ token });
}
