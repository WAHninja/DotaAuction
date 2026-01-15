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

/**
 * Get the Ably server client for publishing events.
 */
export function getAblyServer() {
  return ablyServerClient;
}

/**
 * Utility to get a match-specific channel for publishing
 */
export function getMatchChannels(matchId: number) {
  return {
    offers: ablyServerClient.channels.get(`match-${matchId}-offers`),
    game: ablyServerClient.channels.get(`match-${matchId}`),
  };
}
