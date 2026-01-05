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
  offers?: Offer[]; // ← now comes from parent
};

type AuctionPhaseProps = {
  latestGame: Game;
  players: Player[];
  currentUserId: number;
  gamesPlayed: number;
  onRefreshMatch?: () => void;
  subscribeToGameEvents?: (gameId: number, callback: (event: any) => void) => () => void;
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
  subscribeToGameEvents,
}: AuctionPhaseProps) {
  const [offers, setOffers] = useState<Offer[]>(latestGame.offers || []);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState('');
  const [revealAnimation, setRevealAnimation] = useState(false);
  const hasRevealedRef = useRef(false);

  const { id: gameId, team_1_members, team_a_members, winning_team } = latestGame;

  const winningTeamMembers = winning_team === 'team_1' ? team_1_members : team_a_members;
  const isWinner = winningTeamMembers.includes(currentUserId);
  const isLoser = winning_team ? !isWinner : false;
  const offerCandidates = winningTeamMembers.filter((id) => id !== currentUserId);

  const minOfferAmount = 250 + gamesPlayed * 200;
  const maxOfferAmount = 2000 + gamesPlayed * 500;

  const getPlayer = (id: number) => players.find((p) => p.id === id);

  /* ---------------- Subscribe to Realtime Events ---------------- */
  useEffect(() => {
    if (!subscribeToGameEvents) return;

    const unsubscribe = subscribeToGameEvents(gameId, (event) => {
      if (event.type === 'new-offer' || event.type === 'offer-accepted') {
        setOffers(event.offers || []); // update offers from parent event
        onRefreshMatch?.();
      }
    });

    return unsubscribe;
  }, [gameId, subscribeToGameEvents, onRefreshMatch]);

  /* ---------------- Offer State ---------------- */
  const alreadySubmittedOffer = offers.some((o) => o.from_player_id === currentUserId);
  const alreadyAcceptedOffer = offers.find((o) => o.status === 'accepted');
  const submittedByWinners = offers.filter((o) => winningTeamMembers.includes(o.from_player_id)).length;
  const allOffersSubmitted = winningTeamMembers.length > 0 && submittedByWinners === winningTeamMembers.length;
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
    if (!selectedPlayer || isNaN(amount) || amount < minOfferAmount || amount > maxOfferAmount) {
      return alert(`Select a teammate and enter an offer between ${minOfferAmount}-${maxOfferAmount}`);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${gameId}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_player_id: Number(selectedPlayer), offer_amount: amount }),
      });
      if (!res.ok) throw new Error('Failed to submit offer');

      setSelectedPlayer('');
      setOfferAmount('');
      setMessage('✅ Offer submitted!');
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
      if (!res.ok) throw new Error('Failed to accept offer');

      setMessage('✅ Offer accepted!');
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
      <h3 className="text-3xl font-extrabold mb-4 text-center text-red-500 drop-shadow-lg">🏛 Auction House</h3>

      {isWaitingForOffers && <div className="mb-6 text-center text-gray-400 font-semibold text-lg">⏳ Waiting for the winning team to submit offers…</div>}
      {revealAnimation && <div className="mb-6 text-center text-green-400 font-extrabold text-xl animate-pulse">💰 Offers Revealed!</div>}

      {isWinner && !alreadySubmittedOffer && (
        <div className="mb-8">
          <p className="font-semibold mb-3 text-center text-red-400 text-lg">Make Your Offer</p>
          <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
            <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} className="px-4 py-2 rounded-lg text-black w-full max-w-xs">
              <option value="">Select Player</option>
              {offerCandidates.map((pid) => <option key={pid} value={pid}>{getPlayer(pid)?.username}</option>)}
            </select>
            <input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder={`${minOfferAmount}-${maxOfferAmount}`} className="px-4 py-2 rounded-lg text-black w-full max-w-xs" />
          </div>
          <div className="mt-4 flex justify-center">
            <button onClick={handleSubmitOffer} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg w-full max-w-xs">{submitting ? 'Submitting…' : 'Submit Offer'}</button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => {
          const from = getPlayer(offer.from_player_id);
          const to = getPlayer(offer.target_player_id);
          const canAccept = isLoser && offer.status === 'pending' && !alreadyAcceptedOffer && allOffersSubmitted;

          return (
            <div key={offer.id} className={`relative p-5 rounded-3xl shadow-2xl border
              ${offer.status === 'accepted' ? 'bg-green-900/80 border-green-500' :
                offer.status === 'rejected' ? 'bg-red-900/80 border-red-500' :
                'bg-gradient-to-br from-gray-900/90 to-gray-800/80 border-gray-700'}`}>
              {offer.status !== 'pending' && <div className="absolute top-0 right-0 px-3 py-1 text-sm font-bold bg-green-500 text-white rounded-bl-lg">{offer.status.toUpperCase()}</div>}
              <div className="flex justify-center mb-4">{allOffersSubmitted ? <div className="flex items-center gap-2 text-3xl font-extrabold text-amber-400 animate-gold-glow">{offer.offer_amount}<Image src="/Gold_symbol.webp" alt="Gold" width={28} height={28} /></div> : <span className="text-gray-500">Waiting…</span>}</div>
              <div className="mb-3 text-sm text-gray-300">🧑 <span className="font-bold">{from?.username}</span> → 🎯 <span className="font-bold">{to?.username}</span></div>
              {canAccept && <button onClick={() => handleAcceptOffer(offer.id)} disabled={accepting} className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold">Accept Offer</button>}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes goldGlow {
          0%,100% { text-shadow: 0 0 8px rgba(251,191,36,.6); }
          50% { text-shadow: 0 0 16px rgba(251,191,36,.9); }
        }
        .animate-gold-glow { animation: goldGlow 1.5s ease-in-out infinite; }
      `}</style>

      {message && <p className="mt-6 text-center text-red-400 font-medium">{message}</p>}
    </div>
  );
}
