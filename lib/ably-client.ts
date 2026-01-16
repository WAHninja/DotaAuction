'use client';

import { Realtime } from 'ably';

let ablyClient: Realtime | null = null;

/**
 * Returns a singleton Ably Realtime client for the browser.
 * Throws if called on the server.
 */
export function getAblyClient(): Realtime {
  if (typeof window === 'undefined') {
    throw new Error('❌ getAblyClient() called on server');
  }

  if (!ablyClient) {
    ablyClient = new Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_PUBLIC_KEY!,
    });
  }

  return ablyClient;
}

/**
 * Utility to get a match-specific channel in the browser
 */
export function getMatchChannels(matchId: number) {
  const client = getAblyClient();
  return {
    offers: client.channels.get(`match-${matchId}-offers`),
    game: client.channels.get(`match-${matchId}`),
  };
}
