// lib/ably-client.ts
import Ably from 'ably';

let ablyClient: Ably.Realtime | null = null;

export function getAblyClient() {
  if (typeof window === 'undefined') return null; // Never create on server

  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      authUrl: '/api/ably/token',
    });
  }

  return ablyClient;
}
