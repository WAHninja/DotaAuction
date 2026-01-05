// utils/publishToMatchChannel.ts
import { publishToAbly } from './publishToAbly';

export async function publishToMatchChannel(
  matchId: number,
  event: string,
  data: any
) {
  await publishToAbly(`match-${matchId}-offers`, event, data);
}
