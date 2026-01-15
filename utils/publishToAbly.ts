// utils/publishToAbly.ts
import { getAblyServer } from '@/lib/ably-server';

/**
 * Publish data to an Ably channel (server-side only)
 * @param channelName - The channel name to publish to
 * @param event - Event name
 * @param data - Payload
 */
export async function publishToAbly(
  channelName: string,
  event: string,
  data: any
) {
  const ablyServerClient = getAblyServer();
  const channel = ablyServerClient.channels.get(channelName);
  await channel.publish(event, data);
}
