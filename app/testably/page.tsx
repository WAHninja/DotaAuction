'use client';

import { useEffect } from 'react';

export default function AblyKeyCheck() {
  useEffect(() => {
    console.log('NEXT_PUBLIC_ABLY_KEY:', process.env.NEXT_PUBLIC_ABLY_KEY);

    if (!process.env.NEXT_PUBLIC_ABLY_KEY) {
      console.warn('Ably key is missing in the browser!');
    }
  }, []);

  return null;
}
