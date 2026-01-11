'use client'

import { useEffect, useState, useCallback, useContext } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { UserContext } from '@/app/context/UserContext'
import MatchHeader from '@/app/components/MatchHeader'
import TeamCard from '@/app/components/TeamCard'
import WinnerBanner from '@/app/components/WinnerBanner'
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm'
import AuctionPhase from '@/app/components/AuctionPhase'
import GameHistoryTimeline from '@/app/components/GameHistoryTimeline'
import { useRealtimeMatchListener } from '@/app/hooks/useRealtimeMatchListener'

type Player = {
  id: number
  username: string
}

type ApiOffer = {
  id: number
  fromUsername: string
  targetUsername: string
  offerAmount: number
  status: 'pending' | 'accepted' | 'rejected'
  game_id: number
}

type AuctionOffer = {
  id: number
  from_player_id: number
  target_player_id: number
  offer_amount: number
  status: 'pending' | 'accepted' | 'rejected'
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

  /* ---------------- Fetch Match ---------------- */
  const fetchMatchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${matchId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch match')

      const json = await res.json()
      console.log('📥 Match data refreshed:', json)
      setData(json)
    } catch (err: any) {
      console.error('❌ Error fetching match:', err)
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
  useRealtimeMatchListener(
    matchId,
    data?.latestGame?.id ?? data?.games?.[data.games.length - 1]?.id ?? null,
    { fetchMatchData, setData }
  )

  /* ---------------- Guards ---------------- */
  if (user === undefined)
    return <div className="p-6 text-center text-gray-300">Loading user...</div>

  if (!user)
    return <div className="p-6 text-center text-gray-300">Redirecting...</div>

  if (loading)
    return <div className="p-6 text-center text-gray-300">Loading match...</div>

  if (error)
    return <div className="p-6 text-center text-red-500">{error}</div>

  if (!data)
    return <div className="p-6 text-center text-gray-300">Match not found</div>

  /* ---------------- Derived State ---------------- */
  const { match, players, currentUserId, games } = data
  const latestGame = games?.[games.length - 1] ?? null

  const team1 = latestGame?.team_1_members ?? []
  const teamA = latestGame?.team_a_members ?? []

  const getPlayer = (id: number) => players.find((p: Player) => p.id === id)

  /* ---------------- Status Flags ---------------- */
  const isAuction = latestGame?.status === 'auction pending'
  const isInProgress = latestGame?.status === 'in progress'

  /* ---------------- Render ---------------- */
  return (
    <>
      {latestGame && (
        <MatchHeader
          matchId={matchId}
          latestGame={latestGame}
          matchWinnerId={match.winner_id}
          matchWinnerUsername={players.find((p) => p.id === match.winner_id)?.username}
        />
      )}

      {match?.winner_id && (
        <WinnerBanner
          winnerName={players.find((p) => p.id === match.winner_id)?.username}
        />
      )}

      {/* ---------------- Teams ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TeamCard
          name="Team 1"
          logo="/Team1.png"
          players={team1.map(getPlayer)}
          teamId="team1"
          color="from-lime-900/40 to-lime-800/40"
        />
        <TeamCard
          name="Team A"
          logo="/TeamA.png"
          players={teamA.map(getPlayer)}
          teamId="teamA"
          color="from-red-900/40 to-red-800/40"
        />
      </div>

      {/* ---------------- Phase Controls ---------------- */}
      {isInProgress && <SelectGameWinnerForm gameId={latestGame.id} />}

      {isAuction && (
        <AuctionPhase
          latestGame={latestGame}
          players={players}
          currentUserId={currentUserId}
          gamesPlayed={games.length}
          offers={(data.offers ?? []).filter((o: ApiOffer) => o.game_id === latestGame.id)
            .map((o: ApiOffer): AuctionOffer => ({
              id: o.id,
              from_player_id: players.find(p => p.username === o.fromUsername)?.id ?? 0,
              target_player_id: players.find(p => p.username === o.targetUsername)?.id ?? 0,
              offer_amount: o.offerAmount,
              status: o.status
            }))
          }
          onRefreshMatch={fetchMatchData}
        />
      )}

      {/* ---------------- Game History ---------------- */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>

        <GameHistoryTimeline
          games={games
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((g: any, index: number) => ({
              gameId: g.id,
              createdAt: g.created_at,
              teamAMembers: g.team_a_members.map(getPlayer).map((p: any) => p.username),
              team1Members: g.team_1_members.map(getPlayer).map((p: any) => p.username),
              winningTeam: g.winning_team,
              offers: (data.offers ?? []).filter((o: any) => o.game_id === g.id).map((o: any) => ({
                id: o.id,
                from_username: o.fromUsername,
                target_username: o.targetUsername,
                offer_amount: o.offerAmount,
                status: o.status
              })),
              playerStats: g.player_stats?.map((s: any) => ({
                id: s.id,
                playerId: s.player_id,
                username: players.find((p: any) => p.id === s.player_id)?.username ?? `Player#${s.player_id}`,
                goldChange: s.gold_change,
                reason: s.reason
              })) ?? [],
              highlight: index === 0 // ✅ latest game at top is highlighted
            }))
          }
        />
      </section>
    </>
  )
}
