import Ably from 'ably';

const getAuthUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.SITE_URL + '/api/ably/token';
  }
  return '/api/ably/token';
};

let ablyClient: any = null;

if (typeof window !== 'undefined') {
  const Ably = require('ably');
  ablyClient = new Ably.Realtime.Promise({
    authUrl: '/api/ably/token',
  });
}

export default ablyClient;
