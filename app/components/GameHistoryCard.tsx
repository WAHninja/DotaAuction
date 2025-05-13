'use client'

import { useState } from 'react'

export type GameHistoryCardProps = {
  game: any
  index: number
  players: any[]
  currentUserId: string
}

export function GameHistoryCard({ game, index }: GameHistoryCardProps) {
  const [open, setOpen] = useState(false)

  const winningTeam = game.winning_team
  const teamA = game.team_a_members
  const team1 = game.team_1_members

  return (
    <div className="border rounded-xl shadow-sm mb-4">
      <div
        className="flex justify-between items-center cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200"
        onClick={() => setOpen(!open)}
      >
        <div className="font-semibold text-lg">
          Game {index + 1} — Winner: {winningTeam === 'team_a' ? 'Team A' : 'Team 1'}
        </div>
        <button className="text-sm text-blue-600 hover:underline">
          {open ? 'Hide' : 'Show'} Details
        </button>
      </div>
      {open && (
        <div className="p-4 space-y-4">
          <div>
            <strong>Team A:</strong>
            <ul className="ml-4 list-disc">
              {teamA.map((playerId: number) => (
                <li key={playerId}>User ID: {playerId}</li>
              ))}
            </ul>
          </div>

          <div>
            <strong>Team 1:</strong>
            <ul className="ml-4 list-disc">
              {team1.map((playerId: number) => (
                <li key={playerId}>User ID: {playerId}</li>
              ))}
            </ul>
          </div>

          <div>
            <strong>Offers:</strong>
            <ul className="ml-4 list-disc">
              {game.offers.length > 0 ? (
                game.offers.map((offer: any) => (
                  <li key={offer.id}>
                    {offer.from_username} → {offer.target_username} ({offer.offer_amount}) —{' '}
                    <span
                      className={
                        offer.status === 'accepted'
                          ? 'text-green-600'
                          : offer.status === 'rejected'
                          ? 'text-red-600'
                          : ''
                      }
                    >
                      {offer.status}
                    </span>
                  </li>
                ))
              ) : (
                <li>No offers made.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
