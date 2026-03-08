import { NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';
import { getSession } from '@/app/session';
import db from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const room = new URL(req.url).searchParams.get('room');
    if (!room) return NextResponse.json({ error: 'Missing room' }, { status: 400 });

    // ---- Validate env vars are present ------------------------------------
    const appId  = process.env.JAAS_APP_ID;
    const keyId  = process.env.JAAS_API_KEY_ID;
    const rawKey = process.env.JAAS_PRIVATE_KEY;

    if (!appId)  { console.error('[JAAS] Missing JAAS_APP_ID');       return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }); }
    if (!keyId)  { console.error('[JAAS] Missing JAAS_API_KEY_ID');   return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }); }
    if (!rawKey) { console.error('[JAAS] Missing JAAS_PRIVATE_KEY');   return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }); }

    // ---- Fetch display name -----------------------------------------------
    const { rows } = await db.query(
      'SELECT username FROM users WHERE id = $1',
      [session.userId]
    );
    const username: string = rows[0]?.username ?? `Player#${session.userId}`;

    // ---- Parse private key ------------------------------------------------
    // Render stores multiline env vars with literal \n — normalise all variants:
    //   "\\n"  → from Render env var input
    //   "\n"   → already a real newline (local .env.local)
    //   " "    → some copy-paste tools replace newlines with spaces
    let pem = rawKey
      .replace(/\\n/g, '\n')   // literal backslash-n → real newline
      .trim();

    // If the PEM header and body got collapsed onto one line (no newlines at all),
    // reformat it: split on the header/footer boundaries and re-wrap body at 64 chars.
    if (!pem.includes('\n')) {
      const match = pem.match(
        /^(-----BEGIN [^-]+-----)([A-Za-z0-9+/=]+)(-----END [^-]+-----)$/
      );
      if (match) {
        const body = match[2].replace(/.{64}/g, '$&\n');
        pem = `${match[1]}\n${body}\n${match[3]}`;
      }
    }

    let privateKey: CryptoKey;
    try {
      privateKey = await importPKCS8(pem, 'RS256');
    } catch (keyErr) {
      console.error('[JAAS] Failed to import private key:', keyErr);
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // ---- Sign JWT ---------------------------------------------------------
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      aud: 'jitsi',
      iss: 'chat',
      sub: appId,
      room: '*',
      context: {
        user: {
          id:        String(session.userId),
          name:      username,
          moderator: 'false',
          avatar:    '',
          email:     '',
        },
        features: {
          recording:       'false',
          livestreaming:   'false',
          transcription:   'false',
          'outbound-call': 'false',
        },
      },
    })
      .setProtectedHeader({ alg: 'RS256', kid: `${appId}/${keyId}` })
      .setIssuedAt(now)
      .setNotBefore(now - 10)
      .setExpirationTime(now + 7200)
      .sign(privateKey);

    return NextResponse.json({ token });

  } catch (err) {
    console.error('[JAAS] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
