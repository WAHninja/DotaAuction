// lib/ably.ts
import Ably from "ably/promises";

let ablyServer: Ably.Types.RealtimePromise | null = null;

export function getAblyServer(): Ably.Types.RealtimePromise {
  if (ablyServer) return ablyServer;

  const key = process.env.ABLY_API_KEY;
  if (!key) throw new Error("ABLY_API_KEY environment variable is missing.");

  ablyServer = new Ably.Realtime.Promise(key);
  return ablyServer;
}

/**
 * Publish an event to a match channel
 */
export async function publishMatchEvent(matchId: number, eventName: string, payload: any) {
  const ably = getAblyServer();
  await ably.channels.get(`match-${matchId}`).publish(eventName, payload);
}
