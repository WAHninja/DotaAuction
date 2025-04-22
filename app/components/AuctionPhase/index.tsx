// components/AuctionPhase/index.tsx

'use client';

import { useEffect, useState } from 'react';
import WinnerForm from './WinnerForm';
import OfferList from './OfferList';

export default function AuctionPhase({ game, currentUserId }: {
  game: any;
  currentUserId: number;
}) {
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const winningTeam = game.winning_team_id;
  const teamA = game.team_a_members;
  const team1 = game.team_1_members;
  const isWinner = (winningTeam === 'team_a' ? teamA : team1).includes(currentUserId);
  const isLoser = (winningTeam === 'team_a' ? team1 : teamA).includes(currentUserId);

  useEffect(() => {
    const fetchOffers = async () => {
      setIsLoading(true);
      const res = await fetch(`/api/game/${game.match_id}/offers`);
      const data = await res.json();
      setOffers(data.offers || []);
      setIsLoading(false);
    };
    fetchOffers();
  }, [game.match_id]);

  return (
    <div className="p-4 rounded-xl border shadow-md bg-white space-y-4">
      <h2 className="text-xl font-bold text-center">🎯 Auction Phase</h2>
      <p className="text-sm text-center text-gray-500">
        This game’s status is <strong>Auction pending</strong>
      </p>

      {isWinner && (
        <WinnerForm
          gameId={game.id}
          teamMembers={winningTeam === 'team_a' ? teamA : team1}
          currentUserId={currentUserId}
          onOfferSubmitted={(newOffer) => setOffers((prev) => [...prev, newOffer])}
        />
      )}

      <OfferList
        offers={offers}
        currentUserId={currentUserId}
        game={game}
        isLoser={isLoser}
        onOfferAccepted={(offerId) => {
          setOffers((prev) =>
            prev.map((offer) =>
              offer.id === offerId ? { ...offer, status: 'accepted' } : offer
            )
          );
        }}
      />
    </div>
  );
}
