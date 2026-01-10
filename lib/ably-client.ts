// lib/ably-client.ts
import { Realtime } from 'ably';

let ablyClient: Realtime | null = null;

/**
 * Returns a singleton Ably Realtime client.
 * Only initializes in the browser.
 */
export function getAblyClient(): Realtime | null {
  if (typeof window === 'undefined') return null; // Never run on server

  if (!ablyClient) {
    if (!process.env.NEXT_PUBLIC_ABLY_KEY) {
      console.error('⚠️ Ably key not set in NEXT_PUBLIC_ABLY_KEY');
      return null;
    }
    ablyClient = new Realtime({ key: process.env.NEXT_PUBLIC_ABLY_KEY });
    console.log('✅ Ably client initialized');
  }

  return ablyClient;
}
