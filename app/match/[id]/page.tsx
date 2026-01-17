'use client'

import { useParams } from 'next/navigation'
import { useGameSnapshot } from '@/app/hooks/useGameSnapshot'
import TeamCard from '@/app/components/TeamCard'
import PhaseControls from '@/app/components/PhaseControls'

export default function MatchPage() {
  const params = useParams()
  const matchId = Array.isArray(params.id) ? params.id[0] : params.id

  // Subscribe to Ably snapshot for this match
  const snapshot = useGameSnapshot(matchId)

  if (!snapshot) {
    return <p className="text-center text-lg mt-20">Loading match…</p>
  }

  const { team1 = [], teamA = [], players = [], games = [], offers = [] } = snapshot
  const latestGame = games[games.length - 1] ?? null
  const currentUserId = 1 // replace with actual current user ID from context/session
  const gamesPlayed = games.length - 1

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <TeamCard
          name="Team 1"
          logo="/team1-logo.png"
          players={team1.map(id => players.find(p => p.id === id) || { id })}
          teamId={1}
          color="from-blue-700 via-blue-600 to-blue-500"
        />
        <TeamCard
          name="Team A"
          logo="/teama-logo.png"
          players={teamA.map(id => players.find(p => p.id === id) || { id })}
          teamId={2}
          color="from-red-700 via-red-600 to-red-500"
        />
      </div>

      <PhaseControls
        matchId={matchId}
        latestGame={latestGame}
        players={players}
        currentUserId={currentUserId}
        gamesPlayed={gamesPlayed}
        offers={offers}
      />
    </div>
  )
}
