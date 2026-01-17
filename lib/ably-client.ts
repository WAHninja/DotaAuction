'use client';

import { Realtime } from 'ably';

let ablyClient: Realtime | null = null;

export type MatchEvent =
  | 'game-created'
  | 'game-updated'
  | 'game-winner-selected'
  | 'offer-submitted'
  | 'offer-accepted';

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
 * Returns channels for a specific match
 */
export function getMatchChannels(matchId: number) {
  const client = getAblyClient();
  return {
    offers: client.channels.get(`match-${matchId}-offers`),
    game: client.channels.get(`match-${matchId}`),
  };
}

/**
 * Publish a typed event to a channel
 */
export async function publishToMatchChannel(
  matchId: number,
  channelType: 'offers' | 'game',
  event: MatchEvent,
  data: any
) {
  const channels = getMatchChannels(matchId);
  const channel = channels[channelType];
  await channel.publish(event, data);
}
