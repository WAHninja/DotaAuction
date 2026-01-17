'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

import TeamCard from '@/app/components/TeamCard'
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm'
import AuctionPhase from '@/app/components/AuctionPhase'
import { useGameSnapshot } from '@/app/hooks/useGameSnapshot'

export default function MatchPage() {
  const params = useParams()
  const matchId = params.id
  const snapshot = useGameSnapshot(matchId) // subscribes to Ably 'snapshot'

  if (!snapshot) {
    return <p className="text-center text-lg mt-20">Loading match...</p>
  }

  const {
    gameId,
    gameNumber,
    phase,
    winningTeam,
    team_1_players,
    team_a_players,
    allPlayers,
    offers,
  } = snapshot

  const currentUserId = 1 // TODO: get from context/session

  // Determine phase
  const isSelectingWinner = !winningTeam
  const isAuctionPhase = winningTeam && phase !== 'finished'

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Match #{matchId}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamCard
          name="Team 1"
          logo="/team1_logo.png"
          players={team_1_players}
          teamId="team_1"
          color="from-blue-700 via-blue-600 to-blue-500"
        />
        <TeamCard
          name="Team A"
          logo="/teamA_logo.png"
          players={team_a_players}
          teamId="team_a"
          color="from-red-700 via-red-600 to-red-500"
        />
      </div>

      {isSelectingWinner && (
        <SelectGameWinnerForm gameId={gameId} />
      )}

      {isAuctionPhase && (
        <AuctionPhase
          latestGame={{
            gameId,
            team_1_members: team_1_players.map(p => p.id),
            team_a_members: team_a_players.map(p => p.id),
            winning_team: winningTeam,
            status: phase,
          }}
          players={allPlayers}
          currentUserId={currentUserId}
          gamesPlayed={gameNumber - 1}
          offers={offers}
        />
      )}
    </div>
  )
}
