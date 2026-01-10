// lib/ably-client.ts
'use client'

import Ably from 'ably'

const ablyClient: Ably.Realtime | null =
  typeof window !== 'undefined'
    ? new Ably.Realtime({
        authUrl: '/api/ably/token', // always client-side
      })
    : null

export default ablyClient
