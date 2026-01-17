import Ably from 'ably/promises';

if (!process.env.ABLY_SERVER_API_KEY) {
  throw new Error('ABLY_SERVER_API_KEY missing');
}

/**
 * Singleton Ably Rest client for server-side publishing
 */
const ablyServerClient = new Ably.Rest({
  key: process.env.ABLY_SERVER_API_KEY,
});

export type MatchEvent =
  | 'game-created'
  | 'game-updated'
  | 'game-winner-selected'
  | 'offer-submitted'
  | 'offer-accepted';

/**
 * Get the Ably server client
 */
export function getAblyServer() {
  return ablyServerClient;
}

/**
 * Get channels for a match
 */
export function getMatchChannels(matchId: number) {
  return {
    offers: ablyServerClient.channels.get(`match-${matchId}-offers`),
    game: ablyServerClient.channels.get(`match-${matchId}`),
  };
}

/**
 * Publish a typed event
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
