// lib/ably-client.ts
import { Realtime } from 'ably';

let ablyClient: Realtime | null = null;

if (typeof window !== 'undefined') {
  ablyClient = new Realtime({ key: process.env.NEXT_PUBLIC_ABLY_KEY });
}

export default ablyClient;
