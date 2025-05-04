import Ably from 'ably';

const getAuthUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.SITE_URL + '/api/ably/token';
  }
  return '/api/ably/token';
};

const ablyClient = new Ably.Realtime.Promise({
  authUrl: getAuthUrl(),
});

export default ablyClient;
