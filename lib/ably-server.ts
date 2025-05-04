// lib/ably-server.ts
import Ably from 'ably/promises';

const ablyServerClient = new Ably.Realtime({
  key: process.env.ABLY_SERVER_API_KEY!, // must be a full API key (not token)
});

export default ablyServerClient;
