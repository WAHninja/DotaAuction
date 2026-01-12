'use client'

import { useEffect, useState, useCallback, useContext } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { UserContext } from '@/app/context/UserContext'
import MatchHeader from '@/app/components/MatchHeader'
import TeamCard from '@/app/components/TeamCard'
import WinnerBanner from '@/app/components/WinnerBanner'
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm'
import AuctionPhase from '@/app/components/AuctionPhase'
import GameHistory from '@/app/components/GameHistory'
import { useRealtimeMatchListener } from '@/app/hooks/useRealtimeMatchListener'

type Player = {
  id: number
  username: string
}

export default function MatchPage() {
  const { id } = useParams()
  const matchId = Array.isArray(id) ? id[0] : id
  const router = useRouter()
  const { user } = useContext(UserContext)

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ---------------- Protect Route ---------------- */
  useEffect(() => {
    if (user === null) router.push('/')
  }, [user, router])

  /* ---------------- Fetch Match History ---------------- */
  const fetchMatchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/history`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch match history')
      const json = await res.json()
      console.log('📥 Match history refreshed:', json)
      setData(json.history)
    } catch (err: any) {
      console.error('❌ Error fetching match history:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [matchId])

  /* ---------------- Initial Load ---------------- */
  useEffect(() => {
    if (user) fetchMatchData()
  }, [user, fetchMatchData])

  /* ---------------- Realtime Listener ---------------- */
  const latestGameId =
    data?.length ? data[data.length - 1].gameId : null
  useRealtimeMatchListener(matchId, latestGameId, { fetchMatchData })

  /* ---------------- Guards ---------------- */
  if (user === undefined) return <div className="p-6 text-center text-gray-300">Loading user...</div>
  if (!user) return <div className="p-6 text-center text-gray-300">Redirecting...</div>
  if (loading) return <div className="p-6 text-center text-gray-300">Loading match...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!data || data.length === 0) return <div className="p-6 text-center text-gray-300">Match not found</div>

  /* ---------------- Derived State ---------------- */
  const games = data
  const latestGame = games[games.length - 1]
  const gamesPlayed = games.length

  const team1 = latestGame?.team1Members ?? []
  const teamA = latestGame?.teamAMembers ?? []

  /* ---------------- Render ---------------- */
  return (
    <>
      {latestGame && (
        <MatchHeader
          matchId={matchId}
          gameNumber={gamesPlayed}
          status={latestGame.status}
          winningTeam={latestGame.winningTeam}
        />
      )}

      {latestGame?.matchWinner && (
        <WinnerBanner winnerName={latestGame.matchWinner} />
      )}

      {/* ---------------- Teams ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TeamCard
          name="Team 1"
          logo="/Team1.png"
          players={team1.map((username: string, idx: number) => ({ id: idx, username }))}
          teamId="team1"
          color="from-lime-900/40 to-lime-800/40"
        />
        <TeamCard
          name="Team A"
          logo="/TeamA.png"
          players={teamA.map((username: string, idx: number) => ({ id: idx, username }))}
          teamId="teamA"
          color="from-red-900/40 to-red-800/40"
        />
      </div>

      {/* ---------------- Phase Controls ---------------- */}
      {latestGame.status === 'in progress' && (
        <SelectGameWinnerForm gameId={latestGame.gameId} />
      )}

      {latestGame.status === 'auction pending' && (
        <AuctionPhase
          latestGame={latestGame}
          players={[]} // adjust if needed
          currentUserId={0} // adjust if needed
          gamesPlayed={gamesPlayed}
          offers={latestGame.offers.map((o: any) => ({
            ...o,
            from_player_id: 0,
            target_player_id: 0,
            offer_amount: o.offerAmount,
            status: o.status
          }))}
          onRefreshMatch={fetchMatchData}
        />
      )}

      {/* ---------------- Game History ---------------- */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>

        <GameHistory
          games={games
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((g: any, index: number) => ({
              gameId: g.gameId,
              gameNumber: g.gameNumber,
              createdAt: g.createdAt,
              teamAMembers: g.teamAMembers,
              team1Members: g.team1Members,
              winningTeam: g.winningTeam,
              offers: g.offers.map((o: any) => ({
                id: o.id,
                fromUsername: o.fromUsername,
                targetUsername: o.targetUsername,
                offerAmount: o.offerAmount,
                status: o.status
              })),
              playerStats: g.playerStats.map((s: any) => ({
                id: s.id,
                username: s.username,
                goldChange: s.goldChange,
                reason: s.reason,
                teamId: s.teamId === 'team_1' ? 'team1' : 'teamA'
              })),
              highlight: index === 0,
              defaultExpanded: index === 0
            }))}
        />
      </section>
    </>
  )
}
