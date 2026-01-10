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
    const ablyClient = getAblyClient()
    if (!matchId || !ablyClient) return

    // ---------------- Channels ----------------
    const matchChannel = ablyClient.channels.get(`match-${matchId}`)
    const offersChannel = latestGameId ? ablyClient.channels.get(`match-${matchId}-offers`) : null

    // ---------------- Handlers ----------------
    const handleMatchChange = () => fetchMatchData()
    const handleAuctionChange = () => fetchMatchData()

    // ---------------- Subscribe ----------------
    matchChannel.subscribe('game-created', handleMatchChange)
    matchChannel.subscribe('game-winner-selected', handleMatchChange)
    matchChannel.subscribe('game-finished', handleMatchChange)

    offersChannel?.subscribe('new-offer', handleAuctionChange)
    offersChannel?.subscribe('offer-accepted', handleAuctionChange)

    // ---------------- Cleanup ----------------
    return () => {
      matchChannel.unsubscribe('game-created', handleMatchChange)
      matchChannel.unsubscribe('game-winner-selected', handleMatchChange)
      matchChannel.unsubscribe('game-finished', handleMatchChange)
      offersChannel?.unsubscribe('new-offer', handleAuctionChange)
      offersChannel?.unsubscribe('offer-accepted', handleAuctionChange)
    }
  }, [matchId, latestGameId, fetchMatchData])
}
