// utils/publishToAbly.ts
import ablyServerClient from '@/lib/ably-server';

export async function publishToAbly(
  channelName: string,
  event: string,
  data: any
) {
  const channel = ablyServerClient.channels.get(channelName);
  await channel.publish(event, data);
}
