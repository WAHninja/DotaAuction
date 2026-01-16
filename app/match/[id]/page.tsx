'use client'

import { useEffect, useState, useContext } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { UserContext } from '@/app/context/UserContext'
import MatchHeader from '@/app/components/MatchHeader'
import TeamCard from '@/app/components/TeamCard'
import WinnerBanner from '@/app/components/WinnerBanner'
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm'
import AuctionPhase from '@/app/components/AuctionPhase'
import GameHistory from '@/app/components/GameHistory'
import { useGameSnapshot } from '@/app/hooks/useGameSnapshot'

type Player = { id: number; username: string }

export default function MatchPage() {
  const { id } = useParams()
  const matchId = Array.isArray(id) ? id[0] : id
  const router = useRouter()
  const { user } = useContext(UserContext)

  const snapshot = useGameSnapshot(matchId ?? '')
  const [initialSnapshot, setInitialSnapshot] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  /* ---------------- Protect Route ---------------- */
  useEffect(() => {
    if (user === null) router.push('/')
  }, [user, router])

  /* ---------------- Initial HTTP Snapshot ---------------- */
  useEffect(() => {
    if (!user || !matchId || snapshot) return

    fetch(`/api/match/${matchId}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch match')
        return res.json()
      })
      .then(data => setInitialSnapshot(data))
      .catch(err => {
        console.error('❌ Match load error:', err)
        setError(err.message)
      })
  }, [user, matchId, snapshot])

  /* ---------------- Select Source of Truth ---------------- */
  const data = snapshot ?? initialSnapshot

  /* ---------------- Guards ---------------- */
  if (user === undefined) {
    return <div className="p-6 text-center text-gray-300">Loading user…</div>
  }

  if (!user) {
    return <div className="p-6 text-center text-gray-300">Redirecting…</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>
  }

  if (!data) {
    return <div className="p-6 text-center text-gray-300">Loading match…</div>
  }

  /* ---------------- Snapshot Data ---------------- */
  const { match, players = [], games = [], latestGame: latest } = data

  if (!latest) {
    return <div className="p-6 text-center text-gray-300">Match not found</div>
  }

  const gamesPlayed = games.length
  const currentUserId = user.id

  const getPlayer = (id: number): Player =>
    players.find(p => p.id === id) ?? { id, username: `Player#${id}` }

  const team1 = latest.team_1_members?.map(Number) ?? []
  const teamA = latest.team_a_members?.map(Number) ?? []

  const isInProgress = latest.status === 'in progress'
  const isAuction = latest.status === 'auction pending'

  /* ---------------- Render ---------------- */
  return (
    <>
      <MatchHeader
        matchId={matchId!}
        gameNumber={gamesPlayed}
        status={latest.status}
        winningTeam={latest.winning_team ?? undefined}
      />

      {match?.winner_id && (
        <WinnerBanner
          winnerName={
            players.find(p => p.id === match.winner_id)?.username ??
            `Player#${match.winner_id}`
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
      {isInProgress && (
        <SelectGameWinnerForm gameId={latest.id} />
      )}

      {isAuction && (
        <AuctionPhase
          latestGame={{
            ...latest,
            gameId: latest.id,
            team_1_members: team1,
            team_a_members: teamA,
          }}
          players={players}
          currentUserId={currentUserId}
          gamesPlayed={gamesPlayed}
          offers={latest.offers ?? []}
        />
      )}

      {/* ---------------- Game History ---------------- */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Game History
        </h2>
        <GameHistory matchId={matchId!} initialGames={games} />
      </section>
    </>
  )
}
