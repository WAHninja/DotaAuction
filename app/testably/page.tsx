// app/testably/page.tsx
'use client';

import { useEffect } from 'react';

export default function AblyKeyCheck() {
  useEffect(() => {
    console.log('NEXT_PUBLIC_ABLY_KEY:', process.env.NEXT_PUBLIC_ABLY_KEY);

    if (!process.env.NEXT_PUBLIC_ABLY_KEY) {
      console.warn('Ably key is missing in the browser!');
    }
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Ably Key Debug</h1>
      <p>Check the console to see the value of <code>NEXT_PUBLIC_ABLY_KEY</code>.</p>
    </div>
  );
}
