import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  const room = new URL(req.url).searchParams.get('room');
  if (!room) return Response.json({ error: 'Missing room' }, { status: 400 });

  // Create room if it doesn't exist (safe to call repeatedly — Daily ignores duplicates)
  await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: room,
      privacy: 'private',         // requires a token to join
      properties: {
        enable_chat: false,
        start_video_off: true,    // audio-only by default
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
        user_name: user.username,
        exp: Math.floor(Date.now() / 1000) + 7200, // token valid 2 hours
      },
    }),
  });

  const { token } = await res.json();
  return Response.json({ token });
}
