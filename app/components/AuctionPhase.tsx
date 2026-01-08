'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/* =========================
   Types
======================== */

type Player = { id: number; username: string };

type Offer = {
  id: number;
  from_player_id: number;
  target_player_id: number;
  offer_amount: number;
  status: 'pending' | 'accepted' | 'rejected';
};

type Game = {
  id: number;
  team_1_members: number[];
  team_a_members: number[];
  winning_team: 'team_1' | 'team_a' | null;
  status: string;
};

type AuctionPhaseProps = {
  latestGame: Game;
  players: Player[];
  currentUserId: number;
  gamesPlayed: number;
  offers: Offer[]; // 👈 realtime-driven
  onRefreshMatch?: () => void;
};

/* =========================
   Component
======================== */

export default function AuctionPhase({
  latestGame,
  players,
  currentUserId,
  gamesPlayed,
  offers,
  onRefreshMatch,
}: AuctionPhaseProps) {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState('');
  const [revealAnimation, setRevealAnimation] = useState(false);
  const hasRevealedRef = useRef(false);

  const { id: gameId, team_1_members, team_a_members, winning_team } = latestGame;

  const winningTeamMembers =
    winning_team === 'team_1' ? team_1_members : team_a_members;

  const isWinner = winningTeamMembers.includes(currentUserId);
  const isLoser = winning_team ? !isWinner : false;

  const offerCandidates = winningTeamMembers.filter(
    (id) => id !== currentUserId
  );

  const minOfferAmount = 250 + gamesPlayed * 200;
  const maxOfferAmount = 2000 + gamesPlayed * 500;

  const getPlayer = (id: number) =>
    players.find((p) => p.id === id);

  /* ---------------- Offer State ---------------- */

  const alreadySubmittedOffer = offers.some(
    (o) => o.from_player_id === currentUserId
  );

  const alreadyAcceptedOffer = offers.find(
    (o) => o.status === 'accepted'
  );

  const submittedByWinners = offers.filter((o) =>
    winningTeamMembers.includes(o.from_player_id)
  ).length;

  const allOffersSubmitted =
    winningTeamMembers.length > 0 &&
    submittedByWinners === winningTeamMembers.length;

  const isWaitingForOffers = isLoser && offers.length === 0;

  /* ---------------- Reveal Animation ---------------- */

  useEffect(() => {
    if (allOffersSubmitted && !hasRevealedRef.current) {
      hasRevealedRef.current = true;
      setRevealAnimation(true);
      const timer = setTimeout(() => setRevealAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [allOffersSubmitted]);

  /* ---------------- Submit Offer ---------------- */

  const handleSubmitOffer = async () => {
    if (alreadySubmittedOffer) return;

    const amount = Number(offerAmount);
    if (
      !selectedPlayer ||
      isNaN(amount) ||
      amount < minOfferAmount ||
      amount > maxOfferAmount
    ) {
      alert(
        `Select a teammate and enter an offer between ${minOfferAmount}-${maxOfferAmount}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${gameId}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_player_id: Number(selectedPlayer),
          offer_amount: amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSelectedPlayer('');
      setOfferAmount('');
      setMessage('✅ Offer submitted!');
      onRefreshMatch?.(); // safety fallback
    } catch (err: any) {
      alert(err.message || 'Failed to submit offer');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Accept Offer ---------------- */

  const handleAcceptOffer = async (offerId: number) => {
    if (alreadyAcceptedOffer) return;

    setAccepting(true);
    setMessage('');

    try {
      const res = await fetch(`/api/game/${gameId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage('✅ Offer accepted!');
      onRefreshMatch?.();
    } catch (err: any) {
      setMessage(err.message || 'Failed to accept offer');
    } finally {
      setAccepting(false);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="bg-slate-700 bg-opacity-50 p-6 rounded-3xl shadow-2xl mt-6 border border-gray-600">
      <h3 className="text-3xl font-extrabold mb-6 text-center text-yellow-400 drop-shadow-lg">
        🏛 Auction House
      </h3>

      {/* Winner Submission */}
      {isWinner && !alreadySubmittedOffer && (
        <div className="w-full max-w-md mx-auto mb-8">
          <p className="font-semibold mb-3 text-center text-yellow-300 text-lg">
            Make Your Offer
          </p>
          <p className="text-sm text-gray-300 text-center mb-4">
            Offer must be between{' '}
            <span className="font-bold text-white">{minOfferAmount}</span> and{' '}
            <span className="font-bold text-white">{maxOfferAmount}</span>
            <Image
              src="/Gold_symbol.webp"
              alt="Gold"
              width={18}
              height={18}
              className="inline-block ml-1 align-middle"
            />
          </p>

          <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="px-4 py-2 rounded-lg text-black w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              <option value="">Select Player</option>
              {offerCandidates.map((pid) => {
                const player = getPlayer(pid);
                return <option key={pid} value={pid}>{player?.username || 'Unknown'}</option>;
              })}
            </select>

            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder={`${minOfferAmount}-${maxOfferAmount}`}
              min={minOfferAmount}
              max={maxOfferAmount}
              className="px-4 py-2 rounded-lg text-black w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>

          <div className="mt-4 flex justify-center">
            <button
              onClick={handleSubmitOffer}
              disabled={
                submitting ||
                !selectedPlayer ||
                !offerAmount ||
                Number(offerAmount) < minOfferAmount ||
                Number(offerAmount) > maxOfferAmount
              }
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-2 rounded-lg w-full max-w-xs shadow-md hover:shadow-xl transition-all"
            >
              {submitting ? 'Submitting...' : 'Submit Offer'}
            </button>
          </div>
        </div>
      )}

      {isWinner && alreadySubmittedOffer && (
        <div className="w-full max-w-md mx-auto mb-8 text-center text-yellow-300 font-semibold text-lg drop-shadow">
          ✅ You've already submitted your offer.
        </div>
      )}

      {/* Current Offers */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1">
          <h4 className="text-2xl font-bold text-center mb-6 text-yellow-400 drop-shadow-lg">
            Current Offers
          </h4>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => {
              const from = getPlayer(offer.from_player_id);
              const to = getPlayer(offer.target_player_id);
              const canAccept = isLoser && offer.status === 'pending' && !alreadyAcceptedOffer && allOffersSubmitted;

              return (
                <div
                  key={offer.id}
                  className="bg-gray-800 p-5 rounded-2xl shadow-lg border border-gray-700 flex flex-col justify-between hover:scale-105 transform transition-all duration-200"
                >
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-semibold">From:</span>
                      <span className="text-yellow-300 font-bold text-lg">{from?.username}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-semibold">To:</span>
                      <span className="text-yellow-300 font-bold text-lg">{to?.username}</span>
                    </div>

                    <div className="mt-2 text-gray-300 text-center text-sm">
                      {allOffersSubmitted ? (
                        <>
                          Offer: <span className="font-bold text-yellow-300">{offer.offer_amount}</span>{' '}
                          <Image src="/Gold_symbol.webp" alt="Gold" width={18} height={18} className="inline-block ml-1 align-middle" />
                        </>
                      ) : (
                        'Waiting for all offers...'
                      )}
                    </div>
                  </div>

                  {canAccept && (
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={accepting}
                      className="mt-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-xl transition-all"
                    >
                      {accepting ? 'Accepting...' : 'Accept Offer'}
                    </button>
                  )}

                  {(offer.status === 'accepted' || offer.status === 'rejected') && (
                    <span
                      className={`mt-2 px-3 py-1 rounded font-semibold text-center ${
                        offer.status === 'accepted' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {offer.status === 'accepted' ? 'Accepted' : 'Rejected'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
  return (
    <div className="bg-gray-900 bg-opacity-70 p-6 rounded-3xl shadow-2xl mt-6 border border-gray-800">
      {/* UI unchanged */}
    </div>
  );
}
