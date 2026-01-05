// lib/publishToMatchChannel.ts (SERVER ONLY)
import { ablyServer } from "@/lib/ably-server"; // <-- server-only import

export async function publishToMatchChannel(
  matchId: number,
  event: string,
  data: any
) {
  const channel = ablyServer.channels.get(`match-${matchId}-offers`);
  await channel.publish(event, data);
}
