'use client'

import { useEffect, useState, useCallback, useContext } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

import { UserContext } from '@/app/context/UserContext'
import MatchHeader from '@/app/components/MatchHeader'
import TeamCard from '@/app/components/TeamCard'
import WinnerBanner from '@/app/components/WinnerBanner'
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm'
import AuctionPhase from '@/app/components/AuctionPhase'
import { useRealtimeMatchListener } from '@/app/hooks/useRealtimeMatchListener'

export default function MatchPage() {
  const { id } = useParams()
  const matchId = Array.isArray(id) ? id[0] : id
  const router = useRouter()
  const { user } = useContext(UserContext)

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null)

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
  useRealtimeMatchListener(matchId, data?.latestGame?.id ?? null, {
    fetchMatchData,
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

  if (!data)
    return <div className="p-6 text-center text-gray-300">Match not found</div>

  /* ---------------- Derived State ---------------- */
  const { match, latestGame, players, currentUserId, games } = data

  const team1 = latestGame?.team_1_members ?? []
  const teamA = latestGame?.team_a_members ?? []

  const getPlayer = (id: number) => players.find((p: any) => p.id === id)

  // ✅ IMPORTANT: correct status strings
  const isAuction = latestGame?.status === 'auction_pending'
  const isInProgress = latestGame?.status === 'in_progress'
  const isFinished = latestGame?.status === 'finished'

  /* ---------------- Render ---------------- */
  return (
    <>
      {latestGame && (
        <MatchHeader
          matchId={matchId}
          latestGame={latestGame}
          matchWinnerId={match.winner_id}
          matchWinnerUsername={
            players.find((p: any) => p.id === match.winner_id)?.username
          }
        />
      )}

      {isFinished && (
        <WinnerBanner
          winnerName={
            players.find((p: any) => p.id === match.winner_id)?.username
          }
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
          offers={data.offers ?? []}
          onRefreshMatch={fetchMatchData}
        />
      )}

      {/* ---------------- Game History ---------------- */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>

        {[...games].reverse().map((game: any) => {
          const isExpanded = expandedGameId === game.gameNumber
          const acceptedOffer = game.offers?.find(
            (o: any) => o.status === 'accepted'
          )

          return (
            <div
              key={game.gameNumber}
              className={`mb-4 p-4 border rounded-lg shadow cursor-pointer ${
                game.gameNumber === latestGame?.gameNumber
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-300 bg-white'
              }`}
              onClick={() =>
                setExpandedGameId(isExpanded ? null : game.gameNumber)
              }
            >
              <h3 className="text-xl font-semibold flex justify-between">
                <span>
                  Game #{game.gameNumber} – {game.status}
                </span>
                <span className="text-sm">
                  {isExpanded ? 'Hide' : 'Show'} details
                </span>
              </h3>

              {!isExpanded && acceptedOffer && (
                <p className="mt-2 text-sm font-medium">
                  {acceptedOffer.fromUsername} traded{' '}
                  {acceptedOffer.targetUsername} for {acceptedOffer.offerAmount}
                  <Image
                    src="/Gold_symbol.webp"
                    alt="Gold"
                    width={16}
                    height={16}
                    className="inline-block ml-1"
                  />
                </p>
              )}

              {isExpanded && (
                <div className="mt-2 text-sm">
                  <strong>Winner:</strong> {game.winningTeam ?? 'N/A'}
                  <br />
                  <strong>Team A:</strong> {game.teamAMembers.join(', ')}
                  <br />
                  <strong>Team 1:</strong> {game.team1Members.join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </section>
    </>
  )
}
