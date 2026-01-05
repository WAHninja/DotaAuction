// lib/ably-server.ts
import Ably from 'ably/promises';

const ablyServerClient = new Ably.Rest({
  key: process.env.ABLY_SERVER_API_KEY!, // full API key for server-side only
});

export default ablyServerClient;
