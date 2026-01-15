'use client'

import { Realtime } from 'ably'

let ablyClient: Realtime | null = null

export function getAblyClient(): Realtime {
  if (typeof window === 'undefined') {
    throw new Error('❌ getAblyClient() called on server')
  }

  if (!ablyClient) {
    ablyClient = new Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_PUBLIC_KEY!,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Ably client initialized (singleton)')
    }
  }

  return ablyClient
}
