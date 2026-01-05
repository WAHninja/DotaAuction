// lib/publishToMatchChannel.ts (SERVER ONLY)
import ablyServerClient from '@/lib/ably-server'; // server-only import

/**
 * Publish data to a match-specific Ably channel.
 * @param matchId - The match ID
 * @param event - The event name to publish
 * @param data - The payload to send
 */
export async function publishToMatchChannel(
  matchId: number,
  event: string,
  data: any
) {
  const channel = ablyServerClient.channels.get(`match-${matchId}-offers`);
  await channel.publish(event, data);
}
