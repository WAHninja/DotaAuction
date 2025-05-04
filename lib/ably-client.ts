import Ably from 'ably';

const ablyClient = new Ably.Realtime.Promise({
  authUrl: '/api/ably/token', // Secure token-based auth
});

export default ablyClient;
