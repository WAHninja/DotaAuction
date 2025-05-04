import Ably from 'ably';

const getAuthUrl = () => {
  if (typeof window === 'undefined') {
    // On the server (e.g. SSR or API routes), must use absolute URL
    return process.env.NEXT_PUBLIC_SITE_URL + '/api/ably/token';
  }
  // In the browser, relative path is okay
  return '/api/ably/token';
};

const ablyClient = new Ably.Realtime.Promise({
  authUrl: getAuthUrl(),
});

export default ablyClient;
