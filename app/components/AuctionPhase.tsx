'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { fetchPublish } from '@/utils/fetchPublish'; // <-- updated import

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

  const [revealAnimation, setRevealAnimation] = useState(false);
  const hasRevealedRef = useRef(false);

  /* ---------------- Destructure Game ---------------- */
  const {
    id: gameId,
    team_1_members,
    team_a_members,
    winning_team,
  } = latestGame;

  const winningTeamMembers =
    winning_team === 'team_1' ? team_1_members : team_a_members;

  const isWinner = winningTeamMembers.includes(currentUserId);
  const isLoser = winning_team ? !isWinner : false;

  const offerCandidates = winningTeamMembers.filter(
    (id) => id !== currentUserId
  );

   // ✅ DEBUGGING LOGS
  console.log('AuctionPhase debug:');
  console.log('currentUserId:', currentUserId);
  console.log('latestGame:', latestGame);
  console.log('winning_team:', winning_team);
  console.log('teamA:', team_a_members);
  console.log('team1:', team_1_members);
  console.log('offers:', offers);
  console.log('winningTeamMembers:', winningTeamMembers);
  console.log('isWinner:', isWinner);
  console.log('offerCandidates:', offerCandidates);
   
  /* ---------------- Offer Rules ---------------- */
  const minOfferAmount = 250 + gamesPlayed * 200;
  const maxOfferAmount = 2000 + gamesPlayed * 500;

  const getPlayer = (id: number) => players.find((p) => p.id === id);

  /* ---------------- Fetch Offers ---------------- */
  const fetchOffers = async () => {
    try {
      const res = await fetch(`/api/game/offers?id=${gameId}`);
      const data = await res.json();
      setOffers(data.offers || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [gameId]);

  /* ---------------- Offer State ---------------- */
  const alreadySubmittedOffer = offers.some(
    (o) => o.from_player_id === currentUserId
  );

  const alreadyAcceptedOffer = offers.find(
    (o) => o.status === 'accepted' && o.target_player_id === currentUserId
  );

  const allOffersSubmitted =
    offers.filter((o) => winningTeamMembers.includes(o.from_player_id))
      .length === winningTeamMembers.length;

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
    if (!selectedPlayer || isNaN(amount) || amount < minOfferAmount || amount > maxOfferAmount) {
      return alert(`Select a teammate and enter an offer between ${minOfferAmount}-${maxOfferAmount}`);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${gameId}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_player_id: currentUserId,
          target_player_id: Number(selectedPlayer),
          offer_amount: amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedPlayer('');
      setOfferAmount('');
      setMessage('✅ Offer submitted!');
      fetchOffers();

      // Notify all clients via Ably using frontend-safe fetchPublish
      await fetchPublish(gameId, 'new-offer', { gameId });

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
      const res = await fetch(`/api/game/${gameId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage('✅ Offer accepted!');
      fetchOffers();

      // Notify all clients via Ably using frontend-safe fetchPublish
      await fetchPublish(gameId, 'offer-accepted', { gameId });

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
    // ... rest of the JSX remains unchanged
    <div className="bg-gray-900 bg-opacity-70 p-6 rounded-3xl shadow-2xl mt-6 border border-gray-800">
      {/* ... all JSX code here stays the same */}
    </div>
  );
}
