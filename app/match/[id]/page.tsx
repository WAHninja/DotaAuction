'use client'

import { useEffect, useState, useCallback, useContext } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { UserContext } from '@/app/context/UserContext'

type Player = { id: number; username: string }
type Offer = {
  id: number
  from_player_id: number
  target_player_id: number
  offer_amount: number
  status: 'pending' | 'accepted' | 'rejected'
}

export default function MatchPageDebug() {
  const { id } = useParams()
  const matchId = Array.isArray(id) ? id[0] : id
  const router = useRouter()
  const { user } = useContext(UserContext)

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [matchRes, historyRes] = await Promise.all([
        fetch(`/api/match/${matchId}`, { cache: 'no-store' }),
        fetch(`/api/match/${matchId}/history`, { cache: 'no-store' }),
      ])

      if (!matchRes.ok) throw new Error('Failed to fetch match')
      if (!historyRes.ok) throw new Error('Failed to fetch match history')

      const matchJson = await matchRes.json()
      const historyJson = await historyRes.json()

      setData({
        ...matchJson,
        games: historyJson.history ?? [],
        latestGame: historyJson.history?.[historyJson.history.length - 1] ?? null,
      })
      setError(null)
    } catch (err: any) {
      console.error('❌ Error fetching match or history:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [matchId, user])

  useEffect(() => {
    if (user && matchId) fetchMatchData()
  }, [user, matchId, fetchMatchData])

  useEffect(() => {
    if (!data) return

    console.groupCollapsed('🟢 Match Page Debug Logs')

    const { match, players = [], games = [], latestGame } = data
    console.log('Current user:', user)
    console.log('Match object:', match)
    console.log('Players array:', players)
    console.log('Games array:', games)
    console.log('Latest game:', latestGame)
    console.log('Offers in latest game:', latestGame?.offers ?? [])

    if (latestGame) {
      const team1 = latestGame.team_1_members?.map(Number) ?? []
      const teamA = latestGame.team_a_members?.map(Number) ?? []
      const currentUserId = user?.id ?? 0

      console.log('Team 1 members:', team1)
      console.log('Team A members:', teamA)
      console.log('Winning team:', latestGame.winning_team)

      const winningTeamMembers =
        latestGame.winning_team === 'team_1'
          ? team1
          : latestGame.winning_team === 'team_a'
          ? teamA
          : []

      const isWinner = winningTeamMembers.includes(currentUserId)
      const isLoser = !isWinner && winningTeamMembers.length > 0

      // Auction logic derived state
      const offerCandidates = winningTeamMembers.filter((id) => id !== currentUserId)
      const alreadySubmittedOffer = (latestGame.offers ?? []).some(
        (o: Offer) => o.from_player_id === currentUserId
      )
      const submittedOfferCount = (latestGame.offers ?? []).filter((o: Offer) =>
        winningTeamMembers.includes(o.from_player_id)
      ).length
      const allOffersSubmitted =
        winningTeamMembers.length > 0 && submittedOfferCount === winningTeamMembers.length
      const isWaitingForOffers = isLoser && !allOffersSubmitted

      console.log('Winning team members:', winningTeamMembers)
      console.log('Is current user winner?', isWinner)
      console.log('Is current user loser?', isLoser)
      console.log('Offer candidates (winning team minus self):', offerCandidates)
      console.log('Has current user already submitted an offer?', alreadySubmittedOffer)
      console.log('Submitted offer count:', submittedOfferCount)
      console.log('All offers submitted?', allOffersSubmitted)
      console.log('Is waiting for offers message shown?', isWaitingForOffers)
    }

    console.groupEnd()
  }, [data, user])

  if (!user) return <div className="p-6 text-gray-300">Loading user…</div>
  if (loading) return <div className="p-6 text-gray-300">Loading match data…</div>
  if (error) return <div className="p-6 text-red-500">{error}</div>
  if (!data) return <div className="p-6 text-gray-300">No data found</div>

  return (
    <div className="p-6 text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Match Page Debug</h1>
      <p>All debug information is being logged to the console.</p>
    </div>
  )
}
