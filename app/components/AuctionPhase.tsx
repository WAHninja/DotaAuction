'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/* =========================
   Types
========================= */

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
========================= */

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

  const fetchOffers = async () => {
    try {
      const res = await fetch(`/api/game/offers?id=${latestGame.id}`);
      const data = await res.json();
      setOffers(data.offers || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    }
  };

  useEffect(() => {
    fetchOffers();
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
      fetchOffers();
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
      fetchOffers();
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

      {/* ---------------- Offers ---------------- */}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => {
          const from = getPlayer(offer.from_player_id);
          const to = getPlayer(offer.target_player_id);

          const canAccept =
            isLoser &&
            offer.status === 'pending' &&
            !alreadyAcceptedOffer &&
            allOffersSubmitted;

          return (
            <div
              key={offer.id}
              className="bg-gray-800 p-5 rounded-2xl shadow-lg border border-gray-700 hover:scale-105 transition-transform"
            >
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">From:</span>
                <span className="text-cyan-300 font-bold">
                  {from?.username}
                </span>
              </div>

              <div className="flex justify-between mb-4">
                <span className="text-gray-400">For:</span>
                <span className="text-cyan-300 font-bold">
                  {to?.username}
                </span>
              </div>

              <div
                className={`text-center text-sm transition-all duration-700 ${
                  allOffersSubmitted
                    ? 'opacity-100 scale-100'
                    : 'opacity-40'
                }`}
              >
                {allOffersSubmitted ? (
                  <div className="flex justify-center items-center gap-1 text-red-400 font-bold text-lg">
                    {offer.offer_amount}
                    <Image
                      src="/Gold_symbol.webp"
                      alt="Gold"
                      width={18}
                      height={18}
                    />
                  </div>
                ) : (
                  <span className="text-gray-500">
                    Waiting for all offers...
                  </span>
                )}
              </div>

              {canAccept && (
                <button
                  onClick={() => handleAcceptOffer(offer.id)}
                  disabled={accepting}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition"
                >
                  Accept Offer
                </button>
              )}

              {offer.status !== 'pending' && (
                <div
                  className={`mt-3 text-center font-bold ${
                    offer.status === 'accepted'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
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
