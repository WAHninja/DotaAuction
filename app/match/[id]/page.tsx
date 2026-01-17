'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import TeamCard from '@/app/components/TeamCard'
import PhaseControls from '@/app/components/PhaseControls'
import { useGameSnapshot } from '@/app/hooks/useGameSnapshot'

export default function MatchPage() {
  const { id: matchId } = useParams()
  const snapshot = useGameSnapshot(matchId ?? '')

  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    // Fetch current user ID once (replace with your auth/session logic)
    fetch('/api/session')
      .then(res => res.json())
      .then(data => setCurrentUserId(data.userId))
      .catch(() => setCurrentUserId(null))
  }, [])

  if (!snapshot || currentUserId === null) {
    return (
      <div className="flex justify-center items-center h-full text-white">
        Loading match data...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        <TeamCard
          name="Team 1"
          logo="/radiant.png"
          players={snapshot.team_1_players ?? []}
          teamId="team_1"
          color="from-green-700 via-green-600 to-green-600"
        />

        <TeamCard
          name="Team A"
          logo="/dire.png"
          players={snapshot.team_a_players ?? []}
          teamId="team_a"
          color="from-red-700 via-red-600 to-red-600"
        />
      </div>

      <PhaseControls
        latestGame={snapshot.latestGame}
        players={snapshot.allPlayers}
        currentUserId={currentUserId}
        gamesPlayed={snapshot.gamesPlayed ?? 0}
        offers={snapshot.latestGame?.offers ?? []}
      />
    </div>
  )
}
