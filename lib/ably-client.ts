// lib/ably-client.ts
'use client';

import { Realtime } from 'ably';

let ablyClient: Realtime | null = null;

export function getAblyClient(): Realtime {
  if (typeof window === 'undefined') {
    throw new Error('❌ getAblyClient() called on server');
  }

  if (!ablyClient) {
    ablyClient = new Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_PUBLIC_KEY!,
    });
    console.log('✅ Ably client initialized (browser)');
  }

  return ablyClient;
}
