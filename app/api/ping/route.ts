import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Lightweight health-check endpoint used by the client-side keep-alive
// component to prevent Render's free tier from spinning down during play.
//
// Expired session cleanup runs here as a fire-and-forget side effect.
// KeepAlive.tsx calls this every 10 minutes during active play, which
// provides a regular sweep cadence with no extra infrastructure — no cron
// job, no separate admin route, no additional auth required.
//
// Why fire-and-forget:
//   The cleanup DELETE is non-critical housekeeping. Awaiting it would add
//   DB latency to every keep-alive ping for no user-visible benefit. If it
//   fails (transient connection issue, etc.) we log the error and move on —
//   the next ping 10 minutes later will try again.
export async function GET() {
  db.query('DELETE FROM sessions WHERE expires_at < NOW()')
    .catch(err => console.error('[PING_SESSION_CLEANUP_ERROR]', err));

  return NextResponse.json({ ok: true, ts: Date.now() });
}
