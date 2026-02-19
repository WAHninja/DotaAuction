'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { Player, Offer } from '@/types';

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
  onOfferSubmitted: (offer: any) => void;
  onOfferAccepted: () => void;
};

// ── Tier badge — delegates to globals CSS classes ────────────────────────────
function TierBadge({ label }: { label: 'Low' | 'Medium' | 'High' }) {
  const cls =
    label === 'Low'    ? 'tier-low'    :
    label === 'Medium' ? 'tier-medium' :
                         'tier-high';
  return <span className={cls}>{label}</span>;
}

// ── Gold amount display ───────────────────────────────────────────────────────
function GoldAmount({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-barlow font-bold text-dota-gold tabular-nums">
      {amount}
      <Image src="/Gold_symbol.webp" alt="Gold" width={14} height={14} />
    </span>
  );
}

export default function AuctionHouse({
  latestGame,
  players,
  currentUserId,
  offers,
  gamesPlayed,
  onOfferSubmitted,
  onOfferAccepted,
}: AuctionHouseProps) {
  const [offerAmount, setOfferAmount]           = useState('');
  const [selectedPlayer, setSelectedPlayer]     = useState('');
  const [submitting, setSubmitting]             = useState(false);
  const [accepting, setAccepting]               = useState(false);
  const [acceptedOfferId, setAcceptedOfferId]   = useState<number | null>(null);
  const [submitError, setSubmitError]           = useState<string | null>(null);
  const [acceptError, setAcceptError]           = useState<string | null>(null);

  const { winning_team: winningTeam, team_1_members: team1, team_a_members: teamA } = latestGame;

  const isWinner   = winningTeam === 'team_1' ? team1.includes(currentUserId) : teamA.includes(currentUserId);
  const isLoser    = !isWinner;
  const myWinTeam  = winningTeam === 'team_1' ? team1 : teamA;
  const candidates = myWinTeam.filter(id => id !== currentUserId);

  const alreadySubmitted    = offers.some(o => o.from_player_id === currentUserId);
  const submittedCount      = myWinTeam.filter(pid => offers.some(o => o.from_player_id === pid)).length;
  const allSubmitted        = myWinTeam.every(pid => offers.some(o => o.from_player_id === pid));
  const hasPending          = offers.some(o => o.status === 'pending');

  const minOffer = 250 + gamesPlayed * 200;
  const maxOffer = 2000 + gamesPlayed * 500;

  const getPlayer = (id: number) => players.find(p => p.id === id);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmitOffer = async () => {
    setSubmitError(null);
    const parsed = parseInt(offerAmount, 10);
    if (!selectedPlayer)                              { setSubmitError('Please select a player.'); return; }
    if (isNaN(parsed) || parsed < minOffer || parsed > maxOffer) {
      setSubmitError(`Amount must be between ${minOffer.toLocaleString()} and ${maxOffer.toLocaleString()}.`); return;
    }
    setSubmitting(true);
    try {
      const res  = await fetch(`/api/game/${latestGame.id}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_player_id: parseInt(selectedPlayer), offer_amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || 'Failed to submit offer.'); return; }
      setOfferAmount(''); setSelectedPlayer('');
      onOfferSubmitted(data.offer);
    } catch {
      setSubmitError('Server error submitting offer.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Accept ──────────────────────────────────────────────────────────────────
  const handleAcceptOffer = async (offerId: number) => {
    setAcceptError(null);
    if (accepting || acceptedOfferId !== null) return;
    setAcceptedOfferId(offerId);
    setAccepting(true);
    try {
      const res  = await fetch(`/api/game/${latestGame.id}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        setAcceptedOfferId(null);
        setAcceptError(data.error || 'Failed to accept offer.');
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="panel p-6 mb-8 space-y-6">

      {/* ── Title ──────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-1">
        <h3 className="font-cinzel text-2xl font-bold text-dota-gold">Auction House</h3>
        <div className="divider-gold w-40 mx-auto" />
      </div>

      {/* ── Offer counter ──────────────────────────────────────────────────── */}
      <div className="flex justify-center">
        <div className="panel-sunken flex items-center gap-4 px-5 py-3 rounded-lg">
          <span className="stat-label">Offers in</span>
          <div className="flex gap-1.5">
            {myWinTeam.map(pid => (
              <span
                key={pid}
                title={getPlayer(pid)?.username ?? `Player #${pid}`}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  offers.some(o => o.from_player_id === pid)
                    ? 'bg-dota-radiant'
                    : 'bg-dota-border'
                }`}
              />
            ))}
          </div>
          <span className={`font-barlow font-bold text-sm tabular-nums ${
            allSubmitted ? 'text-dota-radiant-light' : 'text-dota-gold'
          }`}>
            {submittedCount} / {myWinTeam.length}
          </span>
          {allSubmitted && (
            <span className="flex items-center gap-1 text-dota-radiant-light text-xs font-barlow font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> All in!
            </span>
          )}
        </div>
      </div>

      {/* ── Winner: submit form ─────────────────────────────────────────────── */}
      {isWinner && !alreadySubmitted && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="text-center space-y-1">
            <p className="font-barlow font-semibold text-dota-text">Make an Offer</p>
            <p className="font-barlow text-sm text-dota-text-muted flex items-center justify-center gap-1">
              Amount must be between{' '}
              <span className="font-bold text-dota-text">{minOffer.toLocaleString()}</span>
              {' '}and{' '}
              <span className="font-bold text-dota-text">{maxOffer.toLocaleString()}</span>
              <Image src="/Gold_symbol.webp" alt="Gold" width={14} height={14} className="inline-block" />
            </p>
            <p className="font-barlow text-xs text-dota-text-dim">
              Others see only a tier label until an offer is accepted
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedPlayer}
              onChange={e => setSelectedPlayer(e.target.value)}
              className="input flex-1"
            >
              <option value="">Select player to offer…</option>
              {candidates.map(pid => {
                const p = getPlayer(pid);
                return <option key={pid} value={pid}>{p?.username ?? `Player #${pid}`}</option>;
              })}
            </select>

            <input
              type="number"
              value={offerAmount}
              onChange={e => setOfferAmount(e.target.value)}
              placeholder={`${minOffer}–${maxOffer}`}
              min={minOffer}
              max={maxOffer}
              className="input flex-1"
            />
          </div>

          {submitError && (
            <p className="font-barlow text-sm text-dota-dire-light text-center">{submitError}</p>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleSubmitOffer}
              disabled={submitting}
              className="btn-primary min-w-[160px]"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit Offer'}
            </button>
          </div>
        </div>
      )}

      {/* ── Winner: already submitted ───────────────────────────────────────── */}
      {isWinner && alreadySubmitted && (
        <p className="text-center font-barlow text-sm font-semibold text-dota-radiant-light flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Your offer is in.
        </p>
      )}

      {/* ── Loser: waiting message ──────────────────────────────────────────── */}
      {isLoser && !allSubmitted && (
        <p className="text-center font-barlow text-sm text-dota-text-muted">
          Waiting for all offers before you can accept…
        </p>
      )}

      {/* ── Offer cards ────────────────────────────────────────────────────── */}
      <div>
        <h4 className="font-cinzel text-lg font-bold text-center text-dota-text mb-1">Current Offers</h4>

        {allSubmitted && hasPending && (
          <p className="text-center font-barlow text-xs text-dota-text-dim mb-4">
            Exact amounts are hidden until an offer is accepted.
          </p>
        )}

        {offers.length === 0 ? (
          <p className="text-center font-barlow text-dota-text-dim py-4">No offers submitted yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offers.map(offer => {
              const from       = getPlayer(offer.from_player_id);
              const to         = getPlayer(offer.target_player_id);
              const isAccepted = offer.status === 'accepted';
              const isRejected = offer.status === 'rejected';
              const isPending  = offer.status === 'pending';

              const canAccept  = isLoser && isPending && acceptedOfferId === null && allSubmitted;
              const showAmount = !isPending;

              return (
                <div
                  key={offer.id}
                  className={`panel-raised p-4 flex flex-col justify-between gap-3 transition-all ${
                    isAccepted ? 'border-dota-radiant shadow-radiant' :
                    isRejected ? 'opacity-50'                          :
                                 'border-dota-border'
                  }`}
                >
                  {/* Offer details */}
                  <div className="space-y-2">

                    {/* Status strip — shown once resolved */}
                    {!isPending && (
                      <div className={isAccepted ? 'badge-radiant self-start' : 'badge-dire self-start'}>
                        {isAccepted ? <CheckCircle2 className="w-3 h-3" /> : null}
                        {offer.status}
                      </div>
                    )}

                    {/* From → To */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="stat-label w-10">From</span>
                        <span className="font-barlow font-semibold text-dota-gold">
                          {from?.username ?? `Player #${offer.from_player_id}`}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="stat-label w-10">Selling</span>
                        <span className="font-barlow font-semibold text-dota-info">
                          {to?.username ?? `Player #${offer.target_player_id}`}
                        </span>
                      </div>
                    </div>

                    {/* Amount / tier */}
                    <div className="flex items-center gap-2">
                      <span className="stat-label w-10">Offer</span>
                      {!allSubmitted && isLoser ? (
                        <span className="font-barlow text-xs text-dota-text-dim italic">
                          Hidden until all offers are in…
                        </span>
                      ) : showAmount ? (
                        offer.offer_amount != null
                          ? <GoldAmount amount={offer.offer_amount} />
                          : <span className="text-dota-text-dim text-xs">—</span>
                      ) : (
                        offer.tier_label
                          ? <TierBadge label={offer.tier_label} />
                          : <span className="text-dota-text-dim text-xs">—</span>
                      )}
                    </div>
                  </div>

                  {/* Accept button */}
                  {canAccept && (
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={accepting}
                      className="btn-primary w-full mt-auto"
                    >
                      {accepting && acceptedOfferId === offer.id
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Accepting…</>
                        : 'Accept Offer'
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {acceptError && (
          <p className="mt-3 font-barlow text-sm text-dota-dire-light text-center">{acceptError}</p>
        )}
      </div>

      {/* ── Tier legend ─────────────────────────────────────────────────────── */}
      {allSubmitted && hasPending && (
        <div className="flex justify-center">
          <div className="panel-sunken flex flex-wrap items-center justify-center gap-4 px-5 py-3 rounded-lg">
            <span className="stat-label">Tiers</span>
            {(['Low', 'Medium', 'High'] as const).map(tier => (
              <TierBadge key={tier} label={tier} />
            ))}
            <span className="font-barlow text-xs text-dota-text-dim">
              Ranges overlap — same tier can cover different amounts
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
