'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { fetchPublish } from '@/utils/fetchPublish';

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

  const hasRevealedRef = useRef(false);

  /* ---------------- Game Data ---------------- */
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
    (o) => o.status === 'accepted'
  );

  const isWaitingForOffers = isLoser && offers.length === 0;
  const canAcceptOffer =
    isLoser && offers.length > 0 && !alreadyAcceptedOffer;

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
      return alert(
        `Select a teammate and enter an offer between ${minOfferAmount}-${maxOfferAmount}`
      );
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
    <div className="bg-gray-900 bg-opacity-70 p-6 rounded-3xl shadow-2xl mt-6 border border-gray-800">

      {/* ================= WINNING TEAM ================= */}
      {isWinner && (
        <>
          <h3 className="text-lg font-bold text-green-400 mb-4">
            Submit an offer
          </h3>

          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="w-full mb-3 p-2 rounded bg-gray-800"
          >
            <option value="">Select teammate</option>
            {offerCandidates.map((id) => (
              <option key={id} value={id}>
                {getPlayer(id)?.username}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            placeholder={`Gold (${minOfferAmount}-${maxOfferAmount})`}
            className="w-full mb-3 p-2 rounded bg-gray-800"
          />

          <button
            disabled={submitting || alreadySubmittedOffer}
            onClick={handleSubmitOffer}
            className="w-full bg-green-600 hover:bg-green-500 p-2 rounded"
          >
            Submit Offer
          </button>
        </>
      )}

      {/* ================= LOSER – WAITING ================= */}
      {isWaitingForOffers && (
        <p className="text-gray-400 italic text-center">
          Waiting for the winning team to submit offers…
        </p>
      )}

      {/* ================= LOSER – ACCEPT OFFER ================= */}
      {canAcceptOffer && (
        <>
          <h3 className="text-lg font-bold text-red-400 mb-4">
            Choose an offer to accept
          </h3>

          <div className="space-y-3">
            {offers.map((offer) => {
              const fromPlayer = getPlayer(offer.from_player_id);

              return (
                <div
                  key={offer.id}
                  className="flex items-center justify-between bg-gray-800 p-3 rounded-lg"
                >
                  <span className="text-gray-200">
                    {fromPlayer?.username}
                  </span>

                  <button
                    disabled={accepting}
                    onClick={() => handleAcceptOffer(offer.id)}
                    className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm"
                  >
                    Accept
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ================= ACCEPTED ================= */}
      {alreadyAcceptedOffer && (
        <p className="text-green-400 font-semibold text-center">
          ✅ Offer accepted. Waiting for next game…
        </p>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-gray-300">
          {message}
        </p>
      )}
    </div>
  );
}
