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

/**
 * Broadcast without letting a failure fail the caller.
 *
 * Use this for anything sent after a COMMIT. A broadcast is a courtesy — it
 * tells other browsers to refresh — whereas the transaction it follows has
 * already changed the world. Letting the courtesy throw meant a Supabase blip
 * turned a completed trade into a 500, the caller's catch rolled back a
 * transaction that no longer existed, and the user was told their accepted
 * offer had failed. Retrying then produced "offer already accepted", so the UI
 * disagreed with the database until a refresh.
 *
 * The consequence of swallowing it is that other clients miss a live update and
 * see the change on their next load. That is a far smaller problem than telling
 * someone their trade failed when it succeeded.
 */
export async function broadcastEventSafe(
  channel: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await broadcastEvent(channel, event, payload);
  } catch (err) {
    console.error(`[BROADCAST_FAILED] ${channel}/${event}`, err);
  }
}
