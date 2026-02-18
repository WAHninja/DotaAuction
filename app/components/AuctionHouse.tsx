'use client';

import { useState } from 'react';
import Image from 'next/image';

type Player = {
  id: number;
  username: string;
  gold: number;
};

type Offer = {
  id: number;
  from_player_id: number;
  target_player_id: number;
  offer_amount: number;
  status: 'pending' | 'accepted' | 'rejected';
};

type AuctionHouseProps = {
  matchId: string;
  latestGame: {
    id: number;
    winning_team: 'team_1' | 'team_a';
    team_1_members: number[];
    team_a_members: number[];
  };
  players: Player[];
  currentUserId: number;
  offers: Offer[];
  gamesPlayed: number;
  onOfferSubmitted: () => void;
  onOfferAccepted: () => void;
};

export default function AuctionHouse({
  matchId,
  latestGame,
  players,
  currentUserId,
  offers,
  gamesPlayed,
  onOfferSubmitted,
  onOfferAccepted,
}: AuctionHouseProps) {
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const { winning_team: winningTeam, team_1_members: team1, team_a_members: teamA } = latestGame;

  const isWinner = winningTeam === 'team_1'
    ? team1.includes(currentUserId)
    : teamA.includes(currentUserId);
  const isLoser = !isWinner;

  const myWinningTeam = winningTeam === 'team_1' ? team1 : teamA;
  const offerCandidates = myWinningTeam.filter((id) => id !== currentUserId);

  const alreadySubmittedOffer = offers.some((o) => o.from_player_id === currentUserId);
  const alreadyAcceptedOffer = offers.some((o) => o.status === 'accepted');
  const allOffersSubmitted = myWinningTeam.every((pid) =>
    offers.some((o) => o.from_player_id === pid)
  );

  const minOffer = 250 + gamesPlayed * 200;
  const maxOffer = 2000 + gamesPlayed * 500;

  const getPlayer = (id: number) => players.find((p) => p.id === id);

  // ---------- Submit offer --------------------------------------------------
  const handleSubmitOffer = async () => {
    setSubmitError(null);
    const parsed = parseInt(offerAmount, 10);

    if (!selectedPlayer) {
      setSubmitError('Please select a player.');
      return;
    }
    if (isNaN(parsed) || parsed < minOffer || parsed > maxOffer) {
      setSubmitError(`Amount must be between ${minOffer} and ${maxOffer}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${latestGame.id}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_player_id: parseInt(selectedPlayer),
          offer_amount: parsed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.message || 'Failed to submit offer.');
        return;
      }

      setOfferAmount('');
      setSelectedPlayer('');
      onOfferSubmitted();
    } catch {
      setSubmitError('Server error submitting offer.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Accept offer --------------------------------------------------
  const handleAcceptOffer = async (offerId: number) => {
    setAcceptError(null);
    setAccepting(true);

    try {
      const res = await fetch(`/api/game/${latestGame.id}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAcceptError(data.message || 'Failed to accept offer.');
        return;
      }

      onOfferAccepted();
    } catch {
      setAcceptError('Server error accepting offer.');
    } finally {
      setAccepting(false);
    }
  };

  // ---------- Render --------------------------------------------------------
  return (
    <div className="bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg mb-8">
      <h3 className="text-2xl font-bold mb-4 text-center">Auction House</h3>

      {/* --- Winner: submit offer form --- */}
      {isWinner && !alreadySubmittedOffer && (
        <div className="w-full max-w-md mx-auto mb-6">
          <p className="font-semibold mb-2 text-center">Make an Offer:</p>
          <p className="text-sm text-gray-300 text-center mb-4">
            Amount must be between{' '}
            <span className="font-semibold text-white">{minOffer}</span> and{' '}
            <span className="font-semibold text-white">{maxOffer}</span>
            <Image
              src="/Gold_symbol.webp"
              alt="Gold"
              width={16}
              height={16}
              className="inline-block ml-1 align-middle"
            />
          </p>

          <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="px-3 py-2 rounded-lg text-black w-full max-w-xs"
            >
              <option value="">Select Player</option>
              {offerCandidates.map((pid) => {
                const player = getPlayer(pid);
                return (
                  <option key={pid} value={pid}>
                    {player?.username ?? `Player #${pid}`}
                  </option>
                );
              })}
            </select>

            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder={`${minOffer}–${maxOffer}`}
              min={minOffer}
              max={maxOffer}
              className="px-3 py-2 rounded-lg text-black w-full max-w-xs"
            />
          </div>

          {submitError && (
            <p className="mt-2 text-sm text-red-400 text-center">{submitError}</p>
          )}

          <div className="mt-4 flex justify-center">
            <button
              onClick={handleSubmitOffer}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full max-w-xs disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Offer'}
            </button>
          </div>
        </div>
      )}

      {isWinner && alreadySubmittedOffer && (
        <p className="w-full max-w-md mx-auto mb-6 text-center text-yellow-300 font-semibold">
          ✅ You've already submitted your offer.
        </p>
      )}

      {/* --- Offer cards --- */}
      <div>
        <h4 className="text-xl font-bold text-center mb-4">Current Offers</h4>

        {offers.length === 0 ? (
          <p className="text-center text-gray-400">No offers submitted yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => {
              const from = getPlayer(offer.from_player_id);
              const to = getPlayer(offer.target_player_id);

              // Losers can accept only when all offers are in and none accepted yet
              const canAccept =
                isLoser &&
                offer.status === 'pending' &&
                !alreadyAcceptedOffer &&
                allOffersSubmitted;

              return (
                <div
                  key={offer.id}
                  className={`bg-gray-800 p-4 rounded-2xl shadow-lg border flex flex-col justify-between h-full ${
                    offer.status === 'accepted'
                      ? 'border-green-500'
                      : offer.status === 'rejected'
                      ? 'border-red-800 opacity-60'
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex gap-2">
                      <span className="text-gray-400">From</span>
                      <span className="font-semibold text-yellow-300">
                        {from?.username ?? `Player #${offer.from_player_id}`}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-gray-400">For</span>
                      <span className="font-semibold text-blue-300">
                        {to?.username ?? `Player #${offer.target_player_id}`}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-gray-300">
                      {allOffersSubmitted ? (
                        <span className="flex items-center gap-1">
                          Offer: {offer.offer_amount}
                          <Image
                            src="/Gold_symbol.webp"
                            alt="Gold"
                            width={16}
                            height={16}
                          />
                        </span>
                      ) : (
                        'Waiting for all offers…'
                      )}
                    </div>

                    {offer.status !== 'pending' && (
                      <span
                        className={`text-xs font-semibold uppercase mt-1 ${
                          offer.status === 'accepted' ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {offer.status}
                      </span>
                    )}
                  </div>

                  {canAccept && (
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={accepting}
                      className="mt-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {accepting ? 'Accepting...' : 'Accept Offer'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {acceptError && (
          <p className="mt-3 text-sm text-red-400 text-center">{acceptError}</p>
        )}
      </div>
    </div>
  );
}
