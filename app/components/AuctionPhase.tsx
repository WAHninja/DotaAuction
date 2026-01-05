'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { publishToMatchChannel } from '@/utils/publishToMatchChannel';

/* =========================
   Types
======================== */

type Player = {
  id: number;
  username: string;
};

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
  onRefreshMatch,
}: AuctionPhaseProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState('');

  /** Animation control */
  const [revealAnimation, setRevealAnimation] = useState(false);
  const hasRevealedRef = useRef(false);

  /* ---------------- Teams ---------------- */
  const team1 = latestGame.team_1_members || [];
  const teamA = latestGame.team_a_members || [];
  const winningTeam = latestGame.winning_team;

  const winningTeamMembers =
    winningTeam === 'team_1' ? team1 : teamA;

  const isWinner = winningTeamMembers.includes(currentUserId);
  const isLoser = winningTeam ? !isWinner : false;

  const offerCandidates = winningTeamMembers.filter(
    (id) => id !== currentUserId
  );

  /* ---------------- Offer Rules ---------------- */
  const minOfferAmount = 250 + gamesPlayed * 200;
  const maxOfferAmount = 2000 + gamesPlayed * 500;

  const getPlayer = (id: number) =>
    players.find((p) => p.id === id);

  /* ---------------- Fetch Offers ---------------- */
  const fetchOffers = async (gameId: number) => {
    try {
      const res = await fetch(`/api/game/offers?id=${gameId}`);
      const data = await res.json();
      setOffers(data.offers || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    }
  };

  useEffect(() => {
    fetchOffers(latestGame.id);
  }, [latestGame.id]);

  /* ---------------- Offer State ---------------- */
  const alreadySubmittedOffer = offers.some(
    (o) => o.from_player_id === currentUserId
  );

  const alreadyAcceptedOffer = offers.find(
    (o) =>
      o.status === 'accepted' &&
      o.target_player_id === currentUserId
  );

  /** 🔐 Viewer-agnostic reveal condition */
  const expectedOfferCount = winningTeamMembers.length;
  const submittedOfferCount = offers.filter((o) =>
    winningTeamMembers.includes(o.from_player_id)
  ).length;

  const allOffersSubmitted =
    submittedOfferCount === expectedOfferCount;

  /* ---------------- Reveal Animation Trigger ---------------- */
  useEffect(() => {
    if (allOffersSubmitted && !hasRevealedRef.current) {
      hasRevealedRef.current = true;
      setRevealAnimation(true);

      const timer = setTimeout(() => {
        setRevealAnimation(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [allOffersSubmitted]);

  /* ---------------- Submit Offer ---------------- */
  const handleSubmitOffer = async () => {
    if (alreadySubmittedOffer) return;

    const parsedAmount = Number(offerAmount);
    if (
      !selectedPlayer ||
      isNaN(parsedAmount) ||
      parsedAmount < minOfferAmount ||
      parsedAmount > maxOfferAmount
    ) {
      return alert(
        `Select a teammate and enter an offer between ${minOfferAmount}-${maxOfferAmount}`
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/game/${latestGame.id}/submit-offer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_player_id: currentUserId,
            target_player_id: Number(selectedPlayer),
            offer_amount: parsedAmount,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedPlayer('');
      setOfferAmount('');
      setMessage('✅ Offer submitted!');
      fetchOffers(latestGame.id);

      // ✅ Notify other users via Ably
      await publishToMatchChannel(latestGame.id, 'new-offer', {
        gameId: latestGame.id,
      });

      onRefreshMatch?.();
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
      const res = await fetch(
        `/api/game/${latestGame.id}/accept-offer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offerId }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage('✅ Offer accepted!');
      fetchOffers(latestGame.id);

      // ✅ Notify other users via Ably
      await publishToMatchChannel(latestGame.id, 'offer-accepted', {
        gameId: latestGame.id,
      });

      onRefreshMatch?.();
    } catch (err: any) {
      setMessage(err.message || 'Failed to accept offer');
    } finally {
      setAccepting(false);
    }
  };

  /* =========================
     Render
  ========================= */
  return (
    <div className="bg-gray-900 bg-opacity-70 p-6 rounded-3xl shadow-2xl mt-6 border border-gray-800">

      <h3 className="text-3xl font-extrabold mb-4 text-center text-red-500 drop-shadow-lg">
        🏛 Auction House
      </h3>

      {/* 🎉 Reveal Banner */}
      {revealAnimation && (
        <div className="mb-6 text-center text-green-400 font-extrabold text-xl animate-pulse">
          💰 Offers Revealed!
        </div>
      )}

      {/* ---------------- Winner Submission ---------------- */}
      {isWinner && !alreadySubmittedOffer && (
        <div className="mb-8">
          <p className="font-semibold mb-3 text-center text-red-400 text-lg">
            Make Your Offer
          </p>

          <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="px-4 py-2 rounded-lg text-black w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-red-500"
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
              className="px-4 py-2 rounded-lg text-black w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-red-500"
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
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg w-full max-w-xs shadow-md hover:shadow-xl transition-all"
            >
              {submitting ? 'Submitting...' : 'Submit Offer'}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Offers Grid ---------------- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => {
          const from = getPlayer(offer.from_player_id);
          const to = getPlayer(offer.target_player_id);

          const showOfferAmount = allOffersSubmitted;
          const canAccept = isLoser && offer.status === 'pending' && !alreadyAcceptedOffer && allOffersSubmitted;

          return (
            <div
              key={offer.id}
              className="bg-gray-800 p-5 rounded-2xl shadow-lg border border-gray-700 hover:scale-105 transition-transform flex flex-col justify-between"
            >

               {/* Gold Offer */}
              <div className={`text-center text-3xl font-bold mb-4 transition-all duration-700 ${showOfferAmount ? 'opacity-100 scale-100 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]' : 'opacity-40 scale-90'}`}>
                {showOfferAmount ? (
                  <div className="flex justify-center items-center gap-1">
                    {offer.offer_amount}
                    <Image src="/Gold_symbol.webp" alt="Gold" width={24} height={24} />
                  </div>
                ) : (
                  <span className="text-gray-500 text-lg">Waiting for all offers...</span>
                )}
              </div>
               
               {/* Offer Maker */}
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 font-semibold">From:</span>
                <span className="text-emerald-400 font-bold">{from?.username}</span>
              </div>

              {/* Target Player */}
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 font-semibold">For:</span>
                <span className="text-cyan-300 font-bold">{to?.username}</span>
              </div>

              {/* Consequence */}
              {showOfferAmount && (
                <div className="text-xs text-gray-400 mb-2">
                  • If accepted, {from?.username} gains {offer.offer_amount} <Image src="/Gold_symbol.webp" alt="Gold" width={14} height={14} <br />
                  • {to?.username} swaps teams
                </div>
              )}

              {/* Accept Button */}
              {canAccept && (
                <button
                  onClick={() => handleAcceptOffer(offer.id)}
                  disabled={accepting}
                  className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition"
                >
                  Accept Offer
                </button>
              )}

              {/* Status */}
              {offer.status !== 'pending' && (
                <div className={`mt-2 text-center font-bold text-lg ${offer.status === 'accepted' ? 'text-green-400' : 'text-red-400'}`}>
                  {offer.status.toUpperCase()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {message && (
        <p className="mt-6 text-center text-red-400 font-medium">
          {message}
        </p>
      )}
    </div>
  );
}
