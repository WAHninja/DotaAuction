'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import Image from 'next/image'

type Player = { id: number; username: string }

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
  status: string
}

type Props = {
  latestGame?: Game
  players?: Player[]
  currentUserId?: number
  gamesPlayed?: number
  offers?: Offer[]
}

export default function AuctionPhase({
  latestGame = {
    gameId: 0,
    team_1_members: [],
    team_a_members: [],
    winning_team: null,
    status: 'in progress',
  },
  players = [],
  currentUserId = 0,
  gamesPlayed = 0,
  offers = [],
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null // prevent SSR render

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [offerAmount, setOfferAmount] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [message, setMessage] = useState('')
  const [showReveal, setShowReveal] = useState(false)

  const hasRevealedRef = useRef(false)

  const { gameId, team_1_members, team_a_members, winning_team } = latestGame

  /* ---------------- Derived State ---------------- */
  const winningTeamMembers = useMemo(() => {
    const t = (winning_team ?? '').toLowerCase()
    if (t === 'team_1' || t === 'team1') return team_1_members
    if (t === 'team_a' || t === 'teama') return team_a_members
    return []
  }, [winning_team, team_1_members, team_a_members])

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

  /* ---------------- Reveal Animation ---------------- */
  useEffect(() => {
    hasRevealedRef.current = false
  }, [gameId])

  useEffect(() => {
    if (allOffersSubmitted && !hasRevealedRef.current) {
      hasRevealedRef.current = true
      setShowReveal(true)
      const t = setTimeout(() => setShowReveal(false), 2000)
      return () => clearTimeout(t)
    }
  }, [allOffersSubmitted])

  /* ---------------- Actions ---------------- */
  const handleSubmitOffer = async () => {
    if (alreadySubmittedOffer || selectedPlayerId === null) return
    if (
      offerAmount === '' ||
      offerAmount < minOfferAmount ||
      offerAmount > maxOfferAmount
    ) {
      alert(`Offer must be between ${minOfferAmount} and ${maxOfferAmount}`)
      return
    }

    setSubmitting(true)
    setMessage('')

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
    } catch (err: any) {
      alert(err.message || 'Failed to submit offer')
    } finally {
      setSubmitting(false)
    }
  }

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
    } catch (err: any) {
      setMessage(err.message || 'Failed to accept offer')
    } finally {
      setAccepting(false)
    }
  }

  /* ========================= Render ========================= */
  return (
    <div className="bg-slate-800/70 p-6 rounded-3xl border border-slate-700 shadow-2xl mt-6">
      {/* ... same render code as before ... */}
      {/* all the JSX remains unchanged */}
    </div>
  )
}
