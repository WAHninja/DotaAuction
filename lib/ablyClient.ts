import * as Ably from 'ably/promises';

// Use the secret key for server-side interactions
const ably = new Ably.Realtime.Promise({
  key: process.env.ABLY_API_KEY!,  // Secret key for server-side
});

export default ably;
