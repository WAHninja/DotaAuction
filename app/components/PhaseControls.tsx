'use client'

import { useState, useEffect, useMemo } from 'react'
import { getMatchChannels } from '@/lib/ably-client'

type Player = { id: number; username?: string }
type Offer = {
  id: number
  from_player_id: number
  target_player_id: number
  offer_amount: number
  status: 'pending' | 'accepted' | 'rejected'
}
type Game = {
  gameId: number
  team_1_members: number[]
  team_a_members: number[]
  winning_team: string | null
  status: 'in progress' | 'auction pending' | 'finished'
}

interface Props {
  matchId: string
  latestGame?: Game
  players?: Player[]
  currentUserId?: number
  gamesPlayed?: number
  offers?: Offer[]
}

export default function PhaseControls({
  matchId,
  latestGame: initialGame,
  players = [],
  currentUserId = 0,
  gamesPlayed = 0,
  offers: initialOffers = [],
}: Props) {
  const [latestGame, setLatestGame] = useState<Game | undefined>(initialGame)
  const [offers, setOffers] = useState<Offer[]>(initialOffers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<'team_1' | 'team_a' | null>(null)

  // ------------------ Derived state ------------------
  const winningTeamMembers = useMemo(() => {
    const t = latestGame?.winning_team?.toLowerCase()
    if (!latestGame || !t) return []
    return t === 'team_1' ? latestGame.team_1_members : latestGame.team_a_members
  }, [latestGame])

  const isWinner = winningTeamMembers.includes(currentUserId)
  const isLoser = !isWinner

  const minOfferAmount = 250 + gamesPlayed * 200
  const maxOfferAmount = 2000 + gamesPlayed * 500

  const getPlayerName = (id: number) =>
    players.find(p => p.id === id)?.username ?? `Player#${id}`

  const offerCandidates = winningTeamMembers.filter(id => id !== currentUserId)
  const alreadySubmittedOffer = offers.some(o => o.from_player_id === currentUserId)
  const acceptedOffer = offers.find(o => o.status === 'accepted')

  const submittedOfferCount = offers.filter(o =>
    winningTeamMembers.includes(o.from_player_id)
  ).length

  const allOffersSubmitted =
    winningTeamMembers.length > 0 &&
    submittedOfferCount === winningTeamMembers.length

  const isWaitingForOffers = isLoser && !allOffersSubmitted

  // ------------------ Real-time updates ------------------
  useEffect(() => {
    if (!matchId) return
    const { game: matchChannel, offers: offersChannel } = getMatchChannels(Number(matchId))

    // Listen for full snapshot updates
    const snapshotHandler = (msg: any) => {
      if (msg.name !== 'snapshot') return
      const data = msg.data
      setLatestGame(data.games[data.games.length - 1])
      setOffers(data.offers ?? [])
    }

    // Listen for new offers only (optional, more responsive)
    const offerHandler = (msg: any) => {
      if (msg.name !== 'new-offer') return
      const newOffer: Offer = msg.data
      setOffers(prev => [...prev, newOffer])
    }

    matchChannel.subscribe('snapshot', snapshotHandler)
    offersChannel.subscribe('new-offer', offerHandler)

    return () => {
      matchChannel.unsubscribe('snapshot', snapshotHandler)
      offersChannel.unsubscribe('new-offer', offerHandler)
    }
  }, [matchId])

  // ------------------ Actions ------------------
  const handleSubmitWinner = async () => {
    if (!selectedTeam || !latestGame) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/game/${latestGame.gameId}/select-winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winningTeamId: selectedTeam }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit winner')
      }

      setSelectedTeam(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitOffer = async (targetPlayerId: number, amount: number) => {
    if (!latestGame || alreadySubmittedOffer) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/game/${latestGame.gameId}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_player_id: targetPlayerId, offer_amount: amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptOffer = async (offerId: number) => {
    if (!latestGame || acceptedOffer) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/game/${latestGame.gameId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ------------------ Render ------------------
  if (!latestGame) return null

  if (latestGame.status === 'in progress') {
    return (
      <div className="bg-slate-600 p-6 rounded-xl text-center text-white">
        <p>Game in progress. Waiting for winner selection...</p>
      </div>
    )
  }

  if (latestGame.status === 'auction pending') {
    return (
      <div className="bg-slate-800/70 p-6 rounded-3xl border border-slate-700 shadow-2xl mt-6">
        {/* Winning team submits offers */}
        {isWinner && !alreadySubmittedOffer && (
          <div>
            <h3 className="font-semibold text-lg mb-2">Submit an Offer</h3>
            {offerCandidates.map(id => (
              <button
                key={id}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 m-1 rounded"
                onClick={() => handleSubmitOffer(id, minOfferAmount)}
                disabled={loading}
              >
                Offer to {getPlayerName(id)} ({minOfferAmount}–{maxOfferAmount})
              </button>
            ))}
          </div>
        )}

        {/* Losing team waiting */}
        {isLoser && isWaitingForOffers && (
          <div>
            <p>Waiting for winning team to submit offers...</p>
          </div>
        )}

        {/* Losing team accepts */}
        {isLoser && !isWaitingForOffers && !acceptedOffer && (
          <div>
            <h3 className="font-semibold text-lg mb-2">Accept an Offer</h3>
            {offers.map(o => (
              <button
                key={o.id}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 m-1 rounded"
                onClick={() => handleAcceptOffer(o.id)}
                disabled={loading}
              >
                Accept {getPlayerName(o.from_player_id)}'s offer ({o.offer_amount})
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}
