import { NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';
import { getSession } from '@/app/session';
import db from '@/lib/db';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const room = new URL(req.url).searchParams.get('room');
  if (!room) return NextResponse.json({ error: 'Missing room' }, { status: 400 });

  // Fetch display name for the meeting token
  const { rows } = await db.query(
    'SELECT username FROM users WHERE id = $1',
    [session.userId]
  );
  const username: string = rows[0]?.username ?? `Player#${session.userId}`;

  const appId    = process.env.JAAS_APP_ID!;
  const keyId    = process.env.JAAS_API_KEY_ID!;
  // The private key stored in .env.local — PEM format, newlines as \n
  const rawKey   = process.env.JAAS_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const privateKey = await importPKCS8(rawKey, 'RS256');

  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    aud: 'jitsi',
    iss: 'chat',
    sub: appId,
    room: '*',           // wildcard — lets the same token work for room switches
    context: {
      user: {
        id:        String(session.userId),
        name:      username,
        moderator: 'false',
        avatar:    '',
        email:     '',
      },
      features: {
        recording:        'false',
        livestreaming:    'false',
        transcription:    'false',
        'outbound-call':  'false',
      },
    },
  })
    .setProtectedHeader({ alg: 'RS256', kid: `${appId}/${keyId}` })
    .setIssuedAt(now)
    .setNotBefore(now - 10)   // small leeway for clock skew
    .setExpirationTime(now + 7200) // 2 hours
    .sign(privateKey);

  return NextResponse.json({ token });
}
