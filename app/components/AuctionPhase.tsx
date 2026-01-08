'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'

/* =========================
   Types
========================= */

type Player = {
  id: number
  username: string
}

type Offer = {
  id: number
  from_player_id: number
  target_player_id: number
  offer_amount: number
  status: 'pending' | 'accepted' | 'rejected'
}

type Game = {
  id: number
  team_1_members: number[]
  team_a_members: number[]
  winning_team: 'team_1' | 'team_a' | null
  status: string
}

type AuctionPhaseProps = {
  latestGame: Game
  players: Player[]
  currentUserId: number
  gamesPlayed: number
  offers: Offer[]
  onRefreshMatch?: () => void
}

/* =========================
   Component
========================= */

export default function AuctionPhase({
  latestGame,
  players,
  currentUserId,
  gamesPlayed,
  offers,
  onRefreshMatch,
}: AuctionPhaseProps) {
  /* ---------------- Local UI State ---------------- */

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [offerAmount, setOfferAmount] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [message, setMessage] = useState('')
  const [showReveal, setShowReveal] = useState(false)

  const hasRevealedRef = useRef(false)

  /* ---------------- Game Context ---------------- */

  const {
    id: gameId,
    team_1_members,
    team_a_members,
    winning_team,
  } = latestGame

  const winningTeamMembers = useMemo(() => {
    if (winning_team === 'team_1') return team_1_members
    if (winning_team === 'team_a') return team_a_members
    return []
  }, [winning_team, team_1_members, team_a_members])

  if (!winning_team) return null

  const isWinner = winningTeamMembers.includes(currentUserId)
  const isLoser = !isWinner

  /* ---------------- Offer Rules ---------------- */

  const minOfferAmount = 250 + gamesPlayed * 200
  const maxOfferAmount = 2000 + gamesPlayed * 500

  const getPlayerName = (id: number) =>
    players.find((p) => p.id === id)?.username ?? 'Unknown'

  const offerCandidates = winningTeamMembers.filter(
    (id) => id !== currentUserId
  )

  /* ---------------- Offer State ---------------- */

  const alreadySubmittedOffer = offers.some(
    (o) => o.from_player_id === currentUserId
  )

  const acceptedOffer = offers.find((o) => o.status === 'accepted')

  const submittedOfferCount = offers.filter((o) =>
    winningTeamMembers.includes(o.from_player_id)
  ).length

  const allOffersSubmitted =
    winningTeamMembers.length > 0 &&
    submittedOfferCount === winningTeamMembers.length

  const isWaitingForOffers = isLoser && offers.length === 0

  /* ---------------- Reveal Animation ---------------- */

  useEffect(() => {
    hasRevealedRef.current = false
  }, [gameId])

  useEffect(() => {
    if (allOffersSubmitted && !hasRevealedRef.current) {
      hasRevealedRef.current = true
      setShowReveal(true)

      const timer = setTimeout(() => {
        setShowReveal(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [allOffersSubmitted])

  /* ---------------- Submit Offer ---------------- */

  const handleSubmitOffer = async () => {
    if (alreadySubmittedOffer || selectedPlayerId === null) return

    if (
      offerAmount === '' ||
      offerAmount < minOfferAmount ||
      offerAmount > maxOfferAmount
    ) {
      alert(
        `Offer must be between ${minOfferAmount} and ${maxOfferAmount}`
      )
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`/api/game/${gameId}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_player_id: selectedPlayerId,
          offer_amount: offerAmount,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      setSelectedPlayerId(null)
      setOfferAmount('')
      setMessage('✅ Offer submitted')
      onRefreshMatch?.()
    } catch (err: any) {
      alert(err.message || 'Failed to submit offer')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- Accept Offer ---------------- */

  const handleAcceptOffer = async (offerId: number) => {
    if (acceptedOffer) return

    setAccepting(true)
    setMessage('')

    try {
      const res = await fetch(`/api/game/${gameId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      setMessage('✅ Offer accepted')
      onRefreshMatch?.()
    } catch (err: any) {
      setMessage(err.message || 'Failed to accept offer')
    } finally {
      setAccepting(false)
    }
  }

  /* =========================
     Render
  ========================= */

  return (
    <div className="bg-slate-800/70 p-6 rounded-3xl border border-slate-700 shadow-2xl mt-6">

      <h3 className="text-3xl font-extrabold mb-6 text-center text-yellow-400">
        🏛 Auction House
      </h3>

      {showReveal && (
        <div className="text-center mb-6 text-green-400 font-bold animate-pulse">
          💰 Offers Revealed!
        </div>
      )}

      {/* ---------------- Winner Submission ---------------- */}
      {isWinner && !alreadySubmittedOffer && (
        <div className="max-w-md mx-auto mb-10">

          <p className="text-center text-yellow-300 font-semibold mb-4">
            Make Your Offer
          </p>

          <select
            value={selectedPlayerId ?? ''}
            onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
            className="w-full mb-3 px-4 py-2 rounded text-black"
          >
            <option value="">Select Player</option>
            {offerCandidates.map((id) => (
              <option key={id} value={id}>
                {getPlayerName(id)}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={offerAmount}
            onChange={(e) => setOfferAmount(Number(e.target.value))}
            min={minOfferAmount}
            max={maxOfferAmount}
            placeholder={`${minOfferAmount} - ${maxOfferAmount}`}
            className="w-full mb-4 px-4 py-2 rounded text-black"
          />

          <button
            onClick={handleSubmitOffer}
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded"
          >
            {submitting ? 'Submitting…' : 'Submit Offer'}
          </button>
        </div>
      )}

      {isWaitingForOffers && (
        <p className="text-center text-gray-300">
          Waiting for the winning team to submit offers…
        </p>
      )}

      {/* ---------------- Offers ---------------- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => {
          const canAccept =
            isLoser &&
            offer.status === 'pending' &&
            allOffersSubmitted &&
            !acceptedOffer &&
            !accepting

          return (
            <div
              key={offer.id}
              className="bg-gray-900 p-5 rounded-2xl border border-gray-700 shadow-lg"
            >
              <div className="mb-2 text-sm text-gray-400">
                From: <span className="text-yellow-300 font-bold">
                  {getPlayerName(offer.from_player_id)}
                </span>
              </div>

              <div className="mb-4 text-sm text-gray-400">
                For: <span className="text-yellow-300 font-bold">
                  {getPlayerName(offer.target_player_id)}
                </span>
              </div>

              <div className="text-center mb-4">
                {allOffersSubmitted ? (
                  <span className="text-yellow-300 font-bold text-lg flex justify-center gap-1">
                    {offer.offer_amount}
                    <Image src="/Gold_symbol.webp" alt="Gold" width={18} height={18} />
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">
                    Waiting for all offers…
                  </span>
                )}
              </div>

              {canAccept && (
                <button
                  onClick={() => handleAcceptOffer(offer.id)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
                >
                  Accept Offer
                </button>
              )}

              {offer.status !== 'pending' && (
                <div
                  className={`mt-3 text-center font-bold ${
                    offer.status === 'accepted'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {offer.status.toUpperCase()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {message && (
        <p className="mt-6 text-center text-yellow-300 font-semibold">
          {message}
        </p>
      )}
    </div>
  )
}
