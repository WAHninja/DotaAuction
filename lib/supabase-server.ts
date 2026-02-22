// lib/supabase-server.ts
//
// Server-side Supabase helper for broadcasting Realtime events.
// Uses the HTTP broadcast endpoint rather than a WebSocket connection —
// API routes are short-lived and a persistent socket per request is wasteful.

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set.');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set.');
}

const BROADCAST_URL =
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
};

/**
 * Broadcast an event to a named Supabase Realtime channel.
 * Drop-in replacement for:
 *   ably.channels.get('channel-name').publish('event-name', payload)
 */
export async function broadcastEvent(
  channel: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const res = await fetch(BROADCAST_URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      messages: [{ topic: channel, event, payload }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Supabase broadcast failed [${res.status}] on channel "${channel}": ${body}`
    );
  }
}
