'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

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
  latestGame?: Game
  players?: Player[]
  currentUserId?: number
  gamesPlayed?: number
  offers?: Offer[]
}

export default function PhaseControls({
  latestGame,
  players = [],
  currentUserId = 0,
  gamesPlayed = 0,
  offers = [],
}: Props) {
  const [selectedTeam, setSelectedTeam] = useState<'team_1' | 'team_a' | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!latestGame) return null
  const { gameId, team_1_members, team_a_members, winning_team, status } =
    latestGame

  /* ------------------ Derived state ------------------ */
  const winningTeamMembers = (winning_team ?? '').toLowerCase() === 'team_1'
    ? team_1_members
    : winning_team?.toLowerCase() === 'team_a'
    ? team_a_members
    : []

  const isWinner = winningTeamMembers.includes(currentUserId)
  const isLoser = !isWinner

  const minOfferAmount = 250 + gamesPlayed * 200
  const maxOfferAmount = 2000 + gamesPlayed * 500

  const getPlayerName = (id: number) =>
    players.find(p => p.id === id)?.username ?? `Player#${id}`

  const offerCandidates = winningTeamMembers.filter(id => id !== currentUserId)

  const alreadySubmittedOffer = offers.some(
    o => o.from_player_id === currentUserId
  )

  const acceptedOffer = offers.find(o => o.status === 'accepted')

  const submittedOfferCount = offers.filter(o =>
    winningTeamMembers.includes(o.from_player_id)
  ).length

  const allOffersSubmitted =
    winningTeamMembers.length > 0 &&
    submittedOfferCount === winningTeamMembers.length

  const isWaitingForOffers = isLoser && !allOffersSubmitted

  /* ------------------ Actions ------------------ */
  const handleSubmitWinner = async () => {
    if (!selectedTeam) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/game/${gameId}/select-winner`, {
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
    if (alreadySubmittedOffer) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/game/${gameId}/submit-offer`, {
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
    if (acceptedOffer) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/game/${gameId}/accept-offer`, {
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

  /* ------------------ Render based on phase ------------------ */
  if (status === 'in progress') {
    return (
      <div className="bg-slate-600 p-6 rounded-xl text-center text-white">
        <p>Game in progress. Waiting for winner selection...</p>
      </div>
    )
  }

  if (status === 'auction pending') {
    // Winning team submits offers, losing team accepts
    return (
      <div className="bg-slate-800/70 p-6 rounded-3xl border border-slate-700 shadow-2xl mt-6">
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

        {isLoser && isWaitingForOffers && (
          <div>
            <p>Waiting for winning team to submit offers...</p>
          </div>
        )}

        {isLoser && !isWaitingForOffers && acceptedOffer === undefined && (
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
