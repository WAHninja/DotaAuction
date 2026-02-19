import Ably from 'ably/promises';

// Single shared Ably REST client for all server-side route handlers.
// Using REST (not Realtime) on the server is correct — we only need to
// publish events, not maintain a persistent connection.
//
// All server code must use ABLY_API_KEY. ABLY_SERVER_API_KEY was a mistake
// in the old lib/ably-server.ts and has been removed.

if (!process.env.ABLY_API_KEY) {
  throw new Error('ABLY_API_KEY environment variable is not set.');
}

const ablyServer = new Ably.Rest(process.env.ABLY_API_KEY);

export default ablyServer;
