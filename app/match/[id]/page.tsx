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

  /* ---------------- Fetch Match + History ---------------- */
  const fetchMatchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch main match data
      const resMatch = await fetch(`/api/match/${matchId}`, { cache: 'no-store' })
      if (!resMatch.ok) throw new Error('Failed to fetch match')
      const matchJson = await resMatch.json()

      // Fetch pre-formatted match history
      const resHistory = await fetch(`/api/match/${matchId}/history`, { cache: 'no-store' })
      if (!resHistory.ok) throw new Error('Failed to fetch match history')
      const historyJson = await resHistory.json()

      // Merge history into main data
      const mergedData = {
        ...matchJson,
        games: historyJson.history,
        latestGame: historyJson.history[historyJson.history.length - 1] ?? null
      }

      console.log('📥 Match data & history refreshed:', mergedData)
      setData(mergedData)
      setError(null)
    } catch (err: any) {
      console.error('❌ Error fetching match or history:', err)
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
    data?.latestGame?.id ?? (data?.games?.length ? data.games[data.games.length - 1].id : null)
  useRealtimeMatchListener(matchId, latestGameId, { fetchMatchData })

  /* ---------------- Guards ---------------- */
  if (user === undefined) return <div className="p-6 text-center text-gray-300">Loading user...</div>
  if (!user) return <div className="p-6 text-center text-gray-300">Redirecting...</div>
  if (loading) return <div className="p-6 text-center text-gray-300">Loading match...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!data) return <div className="p-6 text-center text-gray-300">Match not found</div>

  /* ---------------- Derived State ---------------- */
  const { match, players = [], currentUserId, games = [] } = data
  const latestGame = data.latestGame ?? (games.length ? games[games.length - 1] : null)
  const gamesPlayed = games.length

  // Normalize latestGame for AuctionPhase
  const auctionGame = latestGame && {
    id: latestGame.id ?? latestGame.gameId,
    team_1_members: (latestGame.team_1_members ?? []).length
      ? latestGame.team_1_members
      : (latestGame.team1Members ?? []).map((u: string) => players.find(p => p.username === u)?.id ?? 0),
    team_a_members: (latestGame.team_a_members ?? []).length
      ? latestGame.team_a_members
      : (latestGame.teamAMembers ?? []).map((u: string) => players.find(p => p.username === u)?.id ?? 0),
    winning_team: latestGame.winning_team ?? latestGame.winningTeam, // 'team_1' | 'team_a'
    status: latestGame.status,
    offers: latestGame.offers ?? []
  }

  // Support old/new team arrays for team display
  const team1 = latestGame?.team_1_members ?? latestGame?.team1Members ?? []
  const teamA = latestGame?.team_a_members ?? latestGame?.teamAMembers ?? []

  const getPlayer = (idOrUsername: number | string): Player => {
    if (typeof idOrUsername === 'number') {
      return players.find(p => p.id === idOrUsername) || { id: idOrUsername, username: `Player#${idOrUsername}` }
    } else {
      return players.find(p => p.username === idOrUsername) || { id: 0, username: idOrUsername }
    }
  }

  /* ---------------- Status Flags ---------------- */
  const gameStatus = latestGame?.status ?? null
  const isInProgress = gameStatus === 'in progress'
  const isAuction = gameStatus === 'auction pending'

  /* ---------------- Render ---------------- */
  return (
    <>
      {latestGame && (
        <MatchHeader
          matchId={matchId}
          gameNumber={gamesPlayed}
          status={latestGame.status}
          winningTeam={latestGame.winning_team ?? latestGame.winningTeam}
        />
      )}

      {match?.winner_id && (
        <WinnerBanner
          winnerName={players.find(p => p.id === match.winner_id)?.username ?? `Player#${match.winner_id}`}
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
      {isInProgress && latestGame && <SelectGameWinnerForm gameId={latestGame.id ?? latestGame.gameId} />}

      {isAuction && auctionGame && (
        <AuctionPhase
          latestGame={auctionGame}
          players={players}
          currentUserId={currentUserId ?? 0}
          gamesPlayed={gamesPlayed}
          offers={auctionGame.offers.map((o: any) => ({
            id: o.id,
            from_player_id: players.find(p => p.username === o.fromUsername)?.id ?? 0,
            target_player_id: players.find(p => p.username === o.targetUsername)?.id ?? 0,
            offer_amount: o.offerAmount ?? o.offer_amount,
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
            .sort((a, b) => new Date(b.created_at ?? b.createdAt).getTime() - new Date(a.created_at ?? a.createdAt).getTime())
            .map((g: any, index: number) => ({
              gameId: g.id ?? g.gameId,
              gameNumber: index + 1,
              createdAt: g.created_at ?? g.createdAt,
              teamAMembers: (g.team_a_members ?? g.teamAMembers ?? []).map(getPlayer).map(p => p.username),
              team1Members: (g.team_1_members ?? g.team1Members ?? []).map(getPlayer).map(p => p.username),
              winningTeam: g.winning_team ?? g.winningTeam,
              offers: (g.offers ?? []).map((o: any) => ({
                id: o.id,
                fromUsername: o.fromUsername ?? getPlayer(o.from_player_id).username,
                targetUsername: o.targetUsername ?? getPlayer(o.target_player_id).username,
                offerAmount: o.offer_amount ?? o.offerAmount,
                status: o.status
              })),
              playerStats: (g.playerStats ?? []).map((s: any) => ({
                id: s.id,
                username: s.username ?? getPlayer(s.player_id).username,
                goldChange: s.gold_change ?? s.goldChange,
                reason: s.reason,
                teamId: s.team_id === 'team_1' || s.teamId === 'team1' ? 'team1' : 'teamA'
              })),
              highlight: index === 0,
              defaultExpanded: index === 0
            }))}
        />
      </section>
    </>
  )
}
