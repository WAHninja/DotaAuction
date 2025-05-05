// utils/publishToMatchChannel.ts
import { ablyServer } from "@/lib/ably";

export async function publishToMatchChannel(
  matchId: number,
  event: string,
  data: any
) {
  const channel = ablyServer.channels.get(`match-${matchId}`);
  await channel.publish(event, data);
}
