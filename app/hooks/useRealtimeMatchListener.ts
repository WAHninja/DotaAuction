import { useEffect } from 'react'
import ablyClient from '@/lib/ably-client'

type Callbacks = {
  fetchMatchData: () => void
}

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  { fetchMatchData }: Callbacks
) {
  useEffect(() => {
    if (!matchId || !ablyClient) return

    const matchChannel = ablyClient.channels.get(`match-${matchId}`)

    // Offers channel should ALWAYS be recreated when latestGameId changes
    const offersChannel = latestGameId
      ? ablyClient.channels.get(`match-${matchId}-offers`)
      : null

    /* =========================
       Match-level Events
    ========================= */

    const handleMatchChange = () => {
      // Single source of truth
      fetchMatchData()
    }

    matchChannel.subscribe('game-created', handleMatchChange)
    matchChannel.subscribe('game-winner-selected', handleMatchChange)
    matchChannel.subscribe('game-finished', handleMatchChange)

    /* =========================
       Auction-level Events
    ========================= */

    const handleAuctionChange = () => {
      // Covers:
      // - new offer
      // - offer accepted
      // - next game creation
      fetchMatchData()
    }

    offersChannel?.subscribe('new-offer', handleAuctionChange)
    offersChannel?.subscribe('offer-accepted', handleAuctionChange)

    /* =========================
       Cleanup
    ========================= */

    return () => {
      matchChannel.unsubscribe('game-created', handleMatchChange)
      matchChannel.unsubscribe('game-winner-selected', handleMatchChange)
      matchChannel.unsubscribe('game-finished', handleMatchChange)

      offersChannel?.unsubscribe('new-offer', handleAuctionChange)
      offersChannel?.unsubscribe('offer-accepted', handleAuctionChange)
    }
  }, [matchId, latestGameId, fetchMatchData])
}
