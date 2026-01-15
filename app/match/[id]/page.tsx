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

export default function MatchPage() {
  const { id } = useParams()
  const matchId = Array.isArray(id) ? id[0] : id
  const router = useRouter()
  const { user } = useContext(UserContext)

  const [match, setMatch] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ---------------- Protect Route ---------------- */
  useEffect(() => {
    if (user === null) router.push('/')
  }, [user, router])

  /* ---------------- Fetch + Normalize ---------------- */
  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${matchId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch match')

      const json = await res.json()
      console.log('📥 Match refreshed:', json)

      const normalizedGames =
        (json.games ?? []).map((g: any) => ({
          gameId: g.id,
          matchId: g.match_id,
          status: g.status,
          createdAt: g.created_at,
          team1Members: g.team_1_members ?? [],
          teamAMembers: g.team_a_members ?? [],
          winningTeam: g.winning_team,
          offers: g.offers ?? [],
          players: g.players ?? [],
          playerStats: g.player_stats ?? [],
          matchWinner: g.match_winner
        })) ?? []

      setMatch(json.match ?? json)
      setGames(normalizedGames)
    } catch (err: any) {
      console.error('❌ Error fetching match:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [matchId])

  /* ---------------- Initial Load ---------------- */
  useEffect(() => {
    if (!user) return
    fetchMatch()
  }, [user, fetchMatch])

  /* ---------------- Realtime ---------------- */
  const latestGameId = games.length ? games[games.length - 1].gameId : null

  useRealtimeMatchListener(matchId, latestGameId, {
    fetchMatchData: fetchMatch
  })

  /* ---------------- Guards ---------------- */
  if (user === undefined)
    return <div className="p-6 text-center text-gray-300">Loading user...</div>

  if (!user)
    return <div className="p-6 text-center text-gray-300">Redirecting...</div>

  if (loading)
    return <div className="p-6 text-center text-gray-300">Loading match...</div>

  if (error)
    return <div className="p-6 text-center text-red-500">{error}</div>

  if (!match || games.length === 0)
    return <div className="p-6 text-center text-gray-300">Match not found</div>

  /* ---------------- Derived State ---------------- */
  const latestGame = games[games.length - 1]
  const gamesPlayed = games.length

  // ---------------- Map player IDs → full player objects ----------------
  const getPlayerById = (id: number) =>
    match.players?.find((p: any) => p.id === id) ?? { id, username: 'Unknown' }

  const team1Players = latestGame.team1Members.map(getPlayerById)
  const teamAPlayers = latestGame.teamAMembers.map(getPlayerById)

  /* ---------------- Render ---------------- */
  return (
    <>
      <MatchHeader
        matchId={matchId}
        gameNumber={gamesPlayed}
        status={latestGame.status}
        winningTeam={latestGame.winningTeam}
      />

      {latestGame.matchWinner && (
        <WinnerBanner winnerName={latestGame.matchWinner} />
      )}

      {/* ---------------- Teams ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TeamCard
          name="Team 1"
          logo="/Team1.png"
          players={team1Players}
          teamId="team1"
          color="from-lime-900/40 to-lime-800/40"
        />

        <TeamCard
          name="Team A"
          logo="/TeamA.png"
          players={teamAPlayers}
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
          players={match.players} // full list of all players
          currentUserId={user.id}
          gamesPlayed={gamesPlayed}
          offers={latestGame.offers}
          onRefreshMatch={fetchMatch}
        />
      )}

      {/* ---------------- Game History ---------------- */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>

        <GameHistory
          games={[...games]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((g, index) => ({
              gameId: g.gameId,
              gameNumber: index + 1,
              createdAt: g.createdAt,
              teamAMembers: g.teamAMembers.map(getPlayerById),
              team1Members: g.team1Members.map(getPlayerById),
              winningTeam: g.winningTeam,
              offers: g.offers,
              playerStats: g.playerStats,
              highlight: index === 0,
              defaultExpanded: index === 0
            }))}
        />
      </section>
    </>
  )
}
