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

  /* =========================
     Render (UI unchanged)
  ========================= */

  return (
    <div className="bg-gray-900 bg-opacity-70 p-6 rounded-3xl shadow-2xl mt-6 border border-gray-800">
      {/* UI unchanged */}
    </div>
  );
}
