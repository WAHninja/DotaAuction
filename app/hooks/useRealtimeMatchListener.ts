import { useEffect, useRef } from 'react'
import { getAblyClient } from '@/lib/ably-client'

type Callbacks = {
  fetchMatchData: () => Promise<void> | void
}

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  { fetchMatchData }: Callbacks
) {
  const hasSubscribedRef = useRef(false)

  /* ---------------- Match-level events ---------------- */
  useEffect(() => {
    if (!matchId || hasSubscribedRef.current) return

    const ably = getAblyClient()
    const channel = ably.channels.get(`match-${matchId}`)

    const onGameCreated = async (data?: any) => {
      console.log('📡 game-created', data)
      await fetchMatchData()
    }

    const onGameWinnerSelected = async (data?: any) => {
      console.log('📡 game-winner-selected', data)
      await fetchMatchData()
    }

    const onGameFinished = async (data?: any) => {
      console.log('📡 game-finished', data)
      await fetchMatchData()
    }

    const onNewGame = async (data?: any) => {
      console.log('📡 new-game', data)
      await fetchMatchData()
    }

    channel.subscribe('game-created', onGameCreated)
    channel.subscribe('game-winner-selected', onGameWinnerSelected)
    channel.subscribe('game-finished', onGameFinished)
    channel.subscribe('new-game', onNewGame)

    hasSubscribedRef.current = true

    return () => {
      channel.unsubscribe('game-created', onGameCreated)
      channel.unsubscribe('game-winner-selected', onGameWinnerSelected)
      channel.unsubscribe('game-finished', onGameFinished)
      channel.unsubscribe('new-game', onNewGame)
      hasSubscribedRef.current = false
    }
  }, [matchId, fetchMatchData])

  /* ---------------- Auction events ---------------- */
  useEffect(() => {
    if (!matchId || !latestGameId) return

    const ably = getAblyClient()
    const channel = ably.channels.get(`match-${matchId}-offers`)

    const onNewOffer = async (data?: any) => {
      console.log('📡 new-offer', data)
      await fetchMatchData()
    }

    const onOfferAccepted = async (data?: any) => {
      console.log('📡 offer-accepted', data)
      await fetchMatchData()
    }

    channel.subscribe('new-offer', onNewOffer)
    channel.subscribe('offer-accepted', onOfferAccepted)

    return () => {
      channel.unsubscribe('new-offer', onNewOffer)
      channel.unsubscribe('offer-accepted', onOfferAccepted)
    }
  }, [matchId, latestGameId, fetchMatchData])
}
