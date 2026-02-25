import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

const STEAM_API_KEY = process.env.STEAM_API_KEY;

// ── Fetch a Steam profile by 64-bit Steam ID ──────────────────────────────────
async function fetchSteamProfile(steamId: string): Promise<{
  steamId: string;
  personaName: string;
  avatarFull: string;
  profileUrl: string;
  personaState: number;
} | null> {
  if (!STEAM_API_KEY) {
    throw new Error('STEAM_API_KEY environment variable is not set.');
  }

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const data = await res.json();
  const player = data?.response?.players?.[0];
  if (!player) return null;

  return {
    steamId:      player.steamid,
    personaName:  player.personaname,
    avatarFull:   player.avatarfull,
    profileUrl:   player.profileurl,
    personaState: player.personastate as number, // 0=offline, 1=online, 2=busy, 3=away, 4=snooze
  };
}

// ── GET /api/me/steam ─────────────────────────────────────────────────────────
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { rows } = await db.query(
    'SELECT steam_id FROM users WHERE id = $1',
    [session.userId]
  );

  const steamId: bigint | null = rows[0]?.steam_id ?? null;

  if (!steamId) {
    return NextResponse.json({ linked: false });
  }

  try {
    const profile = await fetchSteamProfile(steamId.toString());
    if (!profile) {
      return NextResponse.json({ linked: false, steamId: steamId.toString() });
    }
    return NextResponse.json({ linked: true, profile });
  } catch (err) {
    console.error('[STEAM_GET_ERROR]', err);
    return NextResponse.json({ error: 'Failed to fetch Steam profile.' }, { status: 500 });
  }
}

// ── POST /api/me/steam ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let rawSteamId: string;
  try {
    ({ steamId: rawSteamId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const cleaned = rawSteamId?.toString().trim().replace(/\D/g, '');
  if (!cleaned || cleaned.length < 15 || cleaned.length > 20) {
    return NextResponse.json(
      { error: 'Invalid Steam ID. It should be a 17-digit number (e.g. 76561198012345678).' },
      { status: 400 }
    );
  }

  let profile: Awaited<ReturnType<typeof fetchSteamProfile>>;
  try {
    profile = await fetchSteamProfile(cleaned);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json(
      { error: 'Steam ID not found. Make sure your profile is public and the ID is correct.' },
      { status: 404 }
    );
  }

  const { rows: existing } = await db.query(
    'SELECT id FROM users WHERE steam_id = $1 AND id != $2',
    [BigInt(cleaned), session.userId]
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'This Steam account is already linked to another player.' },
      { status: 409 }
    );
  }

  await db.query(
    'UPDATE users SET steam_id = $1 WHERE id = $2',
    [BigInt(cleaned), session.userId]
  );

  return NextResponse.json({ ok: true, profile });
}

// ── DELETE /api/me/steam ──────────────────────────────────────────────────────
export async function DELETE() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  await db.query('UPDATE users SET steam_id = NULL WHERE id = $1', [session.userId]);
  return NextResponse.json({ ok: true });
}
