// lib/ably-server.ts
import Ably from 'ably/promises';

if (!process.env.ABLY_SERVER_API_KEY) {
  throw new Error('ABLY_SERVER_API_KEY missing');
}

const ablyServerClient = new Ably.Rest({
  key: process.env.ABLY_SERVER_API_KEY,
});

export default ablyServerClient;
