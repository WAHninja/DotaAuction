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
  tier_label: 'Low' | 'Medium' | 'High' | null;
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

/* -----------------------------------------------------------------------
   Tier badge
----------------------------------------------------------------------- */

const TIER_STYLES: Record<string, string> = {
  Low:    'bg-blue-500/20 text-blue-300 border-blue-500/40',
  Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  High:   'bg-red-500/20 text-red-300 border-red-500/40',
}

function TierBadge({ label }: { label: 'Low' | 'Medium' | 'High' }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${TIER_STYLES[label]}`}>
      {label}
    </span>
  )
}

/* ----------------------------------------------------------------------- */

export default function AuctionHouse({
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
  const [acceptedOfferId, setAcceptedOfferId] = useState<number | null>(null);
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
  const allOffersSubmitted = myWinningTeam.every((pid) =>
    offers.some((o) => o.from_player_id === pid)
  );
  const offersSubmittedCount = myWinningTeam.filter((pid) =>
    offers.some((o) => o.from_player_id === pid)
  ).length;

  const minOffer = 250 + gamesPlayed * 200;
  const maxOffer = 2000 + gamesPlayed * 500;

  const getPlayer = (id: number) => players.find((p) => p.id === id);

  // ---------- Submit --------------------------------------------------
  const handleSubmitOffer = async () => {
    setSubmitError(null);
    const parsed = parseInt(offerAmount, 10);

    if (!selectedPlayer) { setSubmitError('Please select a player.'); return; }
    if (isNaN(parsed) || parsed < minOffer || parsed > maxOffer) {
      setSubmitError(`Amount must be between ${minOffer} and ${maxOffer}.`); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${latestGame.id}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_player_id: parseInt(selectedPlayer), offer_amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.message || 'Failed to submit offer.'); return; }
      setOfferAmount(''); setSelectedPlayer('');
      onOfferSubmitted();
    } catch {
      setSubmitError('Server error submitting offer.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Accept --------------------------------------------------
  const handleAcceptOffer = async (offerId: number) => {
    setAcceptError(null);
    if (accepting || acceptedOfferId !== null) return;
    setAcceptedOfferId(offerId);
    setAccepting(true);

    try {
      const res = await fetch(`/api/game/${latestGame.id}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        setAcceptedOfferId(null);
        setAcceptError(data.message || 'Failed to accept offer.');
        return;
      }
      onOfferAccepted();
    } catch {
      setAcceptedOfferId(null);
      setAcceptError('Server error accepting offer.');
    } finally {
      setAccepting(false);
    }
  };

  const hasPendingOffers = offers.some(o => o.status === 'pending');

  // ---------- Render --------------------------------------------------
  return (
    <div className="bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg mb-8">
      <h3 className="text-2xl font-bold mb-4 text-center">Auction House</h3>

      {/* Offer counter */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-600 rounded-xl px-5 py-3">
          <span className="text-sm text-slate-400">Offers submitted:</span>
          <div className="flex gap-1">
            {myWinningTeam.map((pid) => (
              <span
                key={pid}
                className={`w-3 h-3 rounded-full transition-colors ${
                  offers.some((o) => o.from_player_id === pid) ? 'bg-green-400' : 'bg-slate-600'
                }`}
                title={getPlayer(pid)?.username ?? `Player #${pid}`}
              />
            ))}
          </div>
          <span className={`text-sm font-bold ${allOffersSubmitted ? 'text-green-400' : 'text-yellow-300'}`}>
            {offersSubmittedCount} / {myWinningTeam.length}
          </span>
          {allOffersSubmitted && <span className="text-xs text-green-400">— all in!</span>}
        </div>
      </div>

      {/* Winner: submit form */}
      {isWinner && !alreadySubmittedOffer && (
        <div className="w-full max-w-md mx-auto mb-6">
          <p className="font-semibold mb-2 text-center">Make an Offer:</p>
          <p className="text-sm text-gray-300 text-center mb-1">
            Amount must be between{' '}
            <span className="font-semibold text-white">{minOffer}</span> and{' '}
            <span className="font-semibold text-white">{maxOffer}</span>
            <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
          </p>
          <p className="text-xs text-slate-400 text-center mb-4">
            The losing team sees only a <span className="text-white font-medium">Low / Medium / High</span> label —
            not the exact amount — until an offer is accepted.
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
                return <option key={pid} value={pid}>{player?.username ?? `Player #${pid}`}</option>;
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

          {submitError && <p className="mt-2 text-sm text-red-400 text-center">{submitError}</p>}

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

      {isLoser && !allOffersSubmitted && (
        <p className="w-full max-w-md mx-auto mb-6 text-center text-slate-300 text-sm">
          Waiting for all offers to be submitted before you can accept…
        </p>
      )}

      {/* Offer cards */}
      <div>
        <h4 className="text-xl font-bold text-center mb-2">Current Offers</h4>

        {isLoser && allOffersSubmitted && hasPendingOffers && (
          <p className="text-center text-slate-400 text-xs mb-4">
            Exact amounts are hidden. Choose based on the player and tier — the amount is revealed after you accept.
          </p>
        )}

        {offers.length === 0 ? (
          <p className="text-center text-gray-400">No offers submitted yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => {
              const from = getPlayer(offer.from_player_id);
              const to = getPlayer(offer.target_player_id);
              const isAccepted = offer.status === 'accepted';
              const isRejected = offer.status === 'rejected';
              const isPending = offer.status === 'pending';

              const canAccept =
                isLoser && isPending && acceptedOfferId === null && allOffersSubmitted;

              // Winners always see their own exact amount.
              // Everyone sees exact amount once the offer is resolved.
              const showExactAmount = isWinner || !isPending;

              return (
                <div
                  key={offer.id}
                  className={`bg-gray-800 p-4 rounded-2xl shadow-lg border flex flex-col justify-between h-full transition-colors ${
                    isAccepted ? 'border-green-500' :
                    isRejected ? 'border-red-800 opacity-60' :
                    'border-gray-700'
                  }`}
                >
                  <div className="flex flex-col gap-2 mb-4">

                    {/* Seller */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-12">From</span>
                      <span className="font-semibold text-yellow-300">
                        {from?.username ?? `Player #${offer.from_player_id}`}
                      </span>
                    </div>

                    {/* Player being sold */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-12">Selling</span>
                      <span className="font-semibold text-blue-300">
                        {to?.username ?? `Player #${offer.target_player_id}`}
                      </span>
                    </div>

                    {/* Amount or tier */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-12">Offer</span>
                      {!allOffersSubmitted && isLoser ? (
                        <span className="text-slate-500 italic text-xs">Hidden until all offers are in…</span>
                      ) : showExactAmount ? (
                        <span className="font-bold text-white flex items-center gap-1">
                          {offer.offer_amount}
                          <Image src="/Gold_symbol.webp" alt="Gold" width={14} height={14} />
                          {isWinner && isPending && (
                            <span className="text-xs text-slate-400 font-normal ml-1">(your offer)</span>
                          )}
                        </span>
                      ) : (
                        // Loser viewing a pending offer — show tier label only
                        offer.tier_label
                          ? <TierBadge label={offer.tier_label} />
                          : <span className="text-slate-500 italic text-xs">—</span>
                      )}
                    </div>

                    {/* Resolved status */}
                    {!isPending && (
                      <span className={`text-xs font-semibold uppercase mt-1 ${
                        isAccepted ? 'text-green-400' : 'text-red-400'
                      }`}>
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

      {/* Tier legend — shown to losers once all offers are in and pending */}
      {isLoser && allOffersSubmitted && hasPendingOffers && (
        <div className="mt-6 flex justify-center">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-5 py-3 flex flex-wrap items-center justify-center gap-4">
            <span className="text-xs text-slate-400">Tiers:</span>
            {(['Low', 'Medium', 'High'] as const).map(tier => (
              <TierBadge key={tier} label={tier} />
            ))}
            <span className="text-xs text-slate-500">
              Ranges overlap — the same tier can cover different amounts
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
