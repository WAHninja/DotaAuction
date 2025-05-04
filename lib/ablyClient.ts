import * as Ably from 'ably/promises';

const ably = new Ably.Realtime.Promise({
  key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
});

export default ably;
