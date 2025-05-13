'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type GameHistoryCardProps = {
  game: any
  index: number
}

export function GameHistoryCard({ game, index }: GameHistoryCardProps) {
  const [open, setOpen] = useState(false)

  const winningTeam = game.winning_team
  const teamA = game.team_a_members
  const team1 = game.team_1_members

  return (
    <Card className="mb-4">
      <div
        className="flex justify-between items-center cursor-pointer px-4 py-2 bg-muted hover:bg-accent"
        onClick={() => setOpen(!open)}
      >
        <div className="font-semibold text-lg">
          Game {index + 1} — Winner: {winningTeam === 'team_a' ? 'Team A' : 'Team 1'}
        </div>
        <Button variant="ghost" size="sm">
          {open ? 'Hide' : 'Show'} Details
        </Button>
      </div>
      {open && (
        <CardContent className="p-4 space-y-4">
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
              {game.offers.map((offer: any) => (
                <li key={offer.id}>
                  {offer.from_username} → {offer.target_username} ({offer.offer_amount}) -{' '}
                  <span className={cn(
                    offer.status === 'accepted' && 'text-green-600',
                    offer.status === 'rejected' && 'text-red-600'
                  )}>
                    {offer.status}
                  </span>
                </li>
              ))}
              {game.offers.length === 0 && <li>No offers made.</li>}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
