import Ably from 'ably';

const getAuthUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.SITE_URL + '/api/ably/token';
  }
  return '/api/ably/token';
};

let ablyClient: Ably.Realtime | null = null;

if (typeof window !== 'undefined') {
  ablyClient = new Ably.Realtime({
    authUrl: getAuthUrl(),
  });
}

export default ablyClient;
