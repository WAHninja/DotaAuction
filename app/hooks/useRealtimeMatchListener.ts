import { useEffect } from 'react'
import { getAblyClient } from '@/lib/ably-client'

type Callbacks = {
  fetchMatchData: () => void
}

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  { fetchMatchData }: Callbacks
) {
  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return

    const ablyClient = getAblyClient()
    if (!matchId || !ablyClient) return

    console.log('🔔 Subscribing to Ably channels', { matchId, latestGameId })

    // ---------------- Channels ----------------
    const matchChannel = ablyClient.channels.get(`match-${matchId}`)
    const offersChannel = latestGameId
      ? ablyClient.channels.get(`match-${matchId}-offers`)
      : null

    // ---------------- Handlers ----------------
    const handleMatchChange = () => {
      console.log('📡 Ably event received: match change')
      fetchMatchData()
    }

    const handleAuctionChange = () => {
      console.log('📡 Ably event received: auction change')
      fetchMatchData()
    }

    // ---------------- Subscribe ----------------
    matchChannel.subscribe('game-created', handleMatchChange)
    matchChannel.subscribe('game-winner-selected', handleMatchChange)
    matchChannel.subscribe('game-finished', handleMatchChange)

    offersChannel?.subscribe('new-offer', handleAuctionChange)
    offersChannel?.subscribe('offer-accepted', handleAuctionChange)

    // ---------------- Cleanup ----------------
    return () => {
      console.log('🔔 Unsubscribing from Ably channels', { matchId, latestGameId })
      matchChannel.unsubscribe('game-created', handleMatchChange)
      matchChannel.unsubscribe('game-winner-selected', handleMatchChange)
      matchChannel.unsubscribe('game-finished', handleMatchChange)
      offersChannel?.unsubscribe('new-offer', handleAuctionChange)
      offersChannel?.unsubscribe('offer-accepted', handleAuctionChange)
    }
  }, [matchId, latestGameId, fetchMatchData])
}
