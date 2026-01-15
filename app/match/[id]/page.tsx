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

type Player = { id: number; username: string }

export default function MatchPage() {
  const { id } = useParams()
  const matchId = Array.isArray(id) ? id[0] : id
  const router = useRouter()
  const { user } = useContext(UserContext)

  const [data, setData] = useState<any>(null)
  const [auctionGame, setAuctionGame] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ---------------- Protect Route ---------------- */
  useEffect(() => {
    if (user === null) router.push('/')
  }, [user, router])

  /* ---------------- Fetch Match + History ---------------- */
  const fetchMatchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const resMatch = await fetch(`/api/match/${matchId}`, { cache: 'no-store' })
      if (!resMatch.ok) throw new Error('Failed to fetch match')
      const matchJson = await resMatch.json()

      const resHistory = await fetch(`/api/match/${matchId}/history`, { cache: 'no-store' })
      if (!resHistory.ok) throw new Error('Failed to fetch match history')
      const historyJson = await resHistory.json()

      const games = historyJson.history ?? []
      const latestGame = games[games.length - 1] ?? null

      console.log('[MATCH_FETCH] matchJson:', matchJson)
      console.log('[MATCH_FETCH] latestGame:', latestGame)

      setData({
        ...matchJson,
        games,
        latestGame,
      })

      // Set AuctionPhase state using numeric IDs
      if (latestGame) {
        setAuctionGame({
          ...latestGame,
          team_1_members: latestGame.team_1_members?.map(Number) ?? [],
          team_a_members: latestGame.team_a_members?.map(Number) ?? [],
          offers: latestGame.offers ?? [],
        })
      }

      setError(null)
    } catch (err: any) {
      console.error('❌ Error fetching match or history:', err)
      setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [matchId])

  /* ---------------- Initial Load ---------------- */
  useEffect(() => {
    if (user && matchId) fetchMatchData()
  }, [user, matchId, fetchMatchData])

  /* ---------------- Realtime Listener ---------------- */
  const latestGameId = auctionGame?.id ?? null
  useRealtimeMatchListener(matchId ?? '', latestGameId, {
    fetchMatchData: () => fetchMatchData(true),
    setData,
  })

  /* ---------------- Guards ---------------- */
  if (user === undefined) return <div className="p-6 text-center text-gray-300">Loading user…</div>
  if (!user) return <div className="p-6 text-center text-gray-300">Redirecting…</div>
  if (loading) return <div className="p-6 text-center text-gray-300">Loading match…</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!data) return <div className="p-6 text-center text-gray-300">Match not found</div>

  /* ---------------- Derived State ---------------- */
  const { match, players = [], games = [] } = data
  const latest = auctionGame ?? data.latestGame ?? games[games.length - 1] ?? null
  const gamesPlayed = games.length

  // 🔑 Use logged-in user for currentUserId
  const currentUserIdResolved = user?.id ?? 0

  const getPlayer = (idOrUsername: number | string): Player => {
    if (typeof idOrUsername === 'number') {
      return players.find(p => p.id === idOrUsername) ?? { id: idOrUsername, username: `Player#${idOrUsername}` }
    }
    return players.find(p => p.username === idOrUsername) ?? { id: 0, username: idOrUsername }
  }

  // Ensure numeric arrays for AuctionPhase
  const team1 = latest?.team_1_members?.map(Number) ?? []
  const teamA = latest?.team_a_members?.map(Number) ?? []

  const gameStatus = latest?.status ?? null
  const isInProgress = gameStatus === 'in progress'
  const isAuction = gameStatus === 'auction pending'

  // 🔎 Debug logs
  console.log('[MATCH_RENDER] latestGame:', latest)
  console.log('[MATCH_RENDER] isAuction:', isAuction)
  console.log('[MATCH_RENDER] currentUserId:', currentUserIdResolved)
  console.log('[MATCH_RENDER] team1:', team1, 'teamA:', teamA)
  console.log('[MATCH_RENDER] auctionGame.offers:', latest?.offers)

  /* ---------------- Render ---------------- */
  return (
    <>
      {latest && (
        <MatchHeader
          matchId={matchId!}
          gameNumber={gamesPlayed}
          status={latest.status}
          winningTeam={latest.winning_team ?? latest.winningTeam}
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
      {isInProgress && latest && <SelectGameWinnerForm gameId={latest.id} />}

      {isAuction && latest && (
        <>
  <AuctionPhase
    latestGame={{ ...latest, team_1_members: team1, team_a_members: teamA }}
    players={players}
    currentUserId={currentUserIdResolved}
    gamesPlayed={gamesPlayed}
    offers={latest.offers ?? []}
  />
  <div className="text-white p-4 border border-red-500">
    Debug: AuctionPhase should be above
  </div>
</>


      )}

      {/* ---------------- Game History ---------------- */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>
        <GameHistory matchId={matchId!} initialGames={games} />
      </section>
    </>
  )
}
