'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { CheckCircle2, Loader2 } from 'lucide-react';
import GoldIcon from '@/app/components/GoldIcon';
import type { Player, Offer } from '@/types';

type AuctionHouseProps = {
  latestGame: {
    id: number;
    winning_team: 'team_1' | 'team_a';
    team_1_members: number[];
    team_a_members: number[];
  };
  players: Player[];
  currentUserId: number;
  offers: Offer[];
  // Number of games fully finished BEFORE the current auction.
  // Game 1 auction → 0, game 2 auction → 1, game N auction → N-1.
  // Pass as: completedGames={data.games.length - 1}
  completedGames: number;
  onOfferSubmitted: (offer: Offer) => void; // was `any` — #11
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
      <GoldIcon size={14} />
    </span>
  );
}

export default function AuctionHouse({
  latestGame,
  players,
  currentUserId,
  offers,
  completedGames: rawCompletedGames,
  onOfferSubmitted,
  onOfferAccepted,
}: AuctionHouseProps) {
  const [offerAmount, setOfferAmount]         = useState('');
  const [selectedPlayer, setSelectedPlayer]   = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [accepting, setAccepting]             = useState(false);
  const [acceptedOfferId, setAcceptedOfferId] = useState<number | null>(null);
  const [submitError, setSubmitError]         = useState<string | null>(null);
  const [acceptError, setAcceptError]         = useState<string | null>(null);

  // ── Derived team / role data ─────────────────────────────────────────────────

  const { winning_team: winningTeam, team_1_members: team1, team_a_members: teamA } = latestGame;

  // Renamed from `myWinTeam` — this is the winning team, not "my" team. (#6)
  const winningTeamMembers = winningTeam === 'team_1' ? team1 : teamA;
  const losingTeamMembers  = winningTeam === 'team_1' ? teamA : team1;

  // Explicit membership checks on both teams so observers/spectators don't
  // accidentally fall through as losers via `!isOnWinningTeam`. (#8, #12)
  const isOnWinningTeam = winningTeamMembers.includes(currentUserId);
  const isOnLosingTeam  = losingTeamMembers.includes(currentUserId);

  // Candidates are winning teammates the current user can offer — i.e. everyone
  // on the winning team except themselves. (#6 — variable renamed for clarity)
  const candidates = winningTeamMembers.filter(id => id !== currentUserId);

  // ── Winner-specific derived state (#9) ──────────────────────────────────────

  // Only meaningful when isOnWinningTeam; computed here to keep JSX readable.
  const alreadySubmitted = offers.some(o => o.from_player_id === currentUserId);

  // ── Shared offer state ───────────────────────────────────────────────────────

  const submittedCount = winningTeamMembers.filter(
    pid => offers.some(o => o.from_player_id === pid)
  ).length;
  const allSubmitted = winningTeamMembers.every(
    pid => offers.some(o => o.from_player_id === pid)
  );
  const hasPending = offers.some(o => o.status === 'pending');

  // ── Offer range ──────────────────────────────────────────────────────────────

  // Guard against negative values if caller passes `data.games.length - 1`
  // before any games exist. (#4)
  const completedGames = Math.max(0, rawCompletedGames);

  // Game 1 auction (completedGames=0): min=450, max=2500
  // Each subsequent game: min += 200, max += 500
  const minOffer = 450 + completedGames * 200;
  const maxOffer = 2500 + completedGames * 500;

  // ── Player lookup — memoised Map avoids O(n) find() in render loops (#10) ───

  const playerById = useMemo(
    () => new Map(players.map(p => [p.id, p])),
    [players]
  );
  const getPlayer = (id: number): Player | undefined => playerById.get(id);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmitOffer = async () => {
    // Guard against double-submit if disabled state is bypassed (#13)
    if (submitting || alreadySubmitted) return;

    setSubmitError(null);
    const parsed = parseInt(offerAmount, 10);

    if (!selectedPlayer) {
      setSubmitError('Please select a player.');
      return;
    }
    if (isNaN(parsed) || parsed < minOffer || parsed > maxOffer) {
      setSubmitError(`Amount must be between ${minOffer.toLocaleString()} and ${maxOffer.toLocaleString()}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${latestGame.id}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_player_id: parseInt(selectedPlayer, 10), // radix added (#3)
          offer_amount: parsed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to submit offer.');
        return;
      }
      setOfferAmount('');
      setSelectedPlayer('');
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
      const res = await fetch(`/api/game/${latestGame.id}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        // 409 = another player accepted first. We still call onOfferAccepted()
        // because the auction is over either way — the loser should be moved
        // on regardless of who triggered the resolution. (#5)
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
          <div className="flex gap-1.5" role="group" aria-label="Offer submission status">
            {winningTeamMembers.map(pid => {
              const hasSubmitted = offers.some(o => o.from_player_id === pid);
              const name = getPlayer(pid)?.username ?? `Player #${pid}`;
              return (
                <span
                  key={pid}
                  // title kept for sighted hover; aria-label for screen readers (#15)
                  title={name}
                  aria-label={`${name}: ${hasSubmitted ? 'submitted' : 'pending'}`}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    hasSubmitted ? 'bg-dota-radiant' : 'bg-dota-border'
                  }`}
                />
              );
            })}
          </div>
          <span className={`font-barlow font-bold text-sm tabular-nums ${
            allSubmitted ? 'text-dota-radiant-light' : 'text-dota-gold'
          }`}>
            {submittedCount} / {winningTeamMembers.length}
          </span>
          {allSubmitted && (
            <span className="flex items-center gap-1 text-dota-radiant-light text-xs font-barlow font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> All in!
            </span>
          )}
        </div>
      </div>

      {/* ── Winner: submit form ─────────────────────────────────────────────── */}
      {isOnWinningTeam && !alreadySubmitted && (
        <div className="relative rounded-lg overflow-hidden">
          {/* Background image */}
          <Image
            src="/match_predictions_bg.png"
            alt=""
            fill
            quality={85}
            className="object-cover object-right pointer-events-none select-none"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, rgba(13,17,23,0.92) 0%, rgba(13,17,23,0.80) 50%, rgba(13,17,23,0.35) 100%)',
            }}
          />

          {/* Form */}
          <div className="relative z-10 max-w-md py-8 px-6 space-y-4">
            <div className="space-y-1">
              <p className="font-cinzel font-bold text-dota-gold text-lg">Make an Offer</p>
              <p className="font-barlow text-sm text-dota-text-muted flex items-center gap-1 flex-wrap">
                Amount between{' '}
                <span className="font-bold text-dota-text">{minOffer.toLocaleString()}</span>
                {' '}–{' '}
                <span className="font-bold text-dota-text">{maxOffer.toLocaleString()}</span>
                <GoldIcon size={14} />
              </p>
              <p className="font-barlow text-xs text-dota-text-dim">
                Details are hidden from everyone until all offers are submitted
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <select
                value={selectedPlayer}
                onChange={e => {
                  setSelectedPlayer(e.target.value);
                  setSubmitError(null); // clear stale error on change (#14)
                }}
                className="input"
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
                onChange={e => {
                  setOfferAmount(e.target.value);
                  setSubmitError(null); // clear stale error on change (#14)
                }}
                onKeyDown={e => e.key === 'Enter' && handleSubmitOffer()} // keyboard submit (#16)
                placeholder={`${minOffer}–${maxOffer}`}
                min={minOffer}
                max={maxOffer}
                className="input"
              />
            </div>

            {/* role="alert" so screen readers announce the error immediately (#17) */}
            {submitError && (
              <p role="alert" className="font-barlow text-sm text-dota-dire-light">
                {submitError}
              </p>
            )}

            <button
              onClick={handleSubmitOffer}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit Offer'}
            </button>
          </div>
        </div>
      )}

      {/* ── Winner: already submitted ───────────────────────────────────────── */}
      {isOnWinningTeam && alreadySubmitted && (
        <p className="text-center font-barlow text-sm font-semibold text-dota-radiant-light flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Your offer is in.
        </p>
      )}

      {/* ── Loser: waiting message ──────────────────────────────────────────── */}
      {isOnLosingTeam && !allSubmitted && (
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

        {!allSubmitted && (
          <p className="text-center font-barlow text-xs text-dota-text-dim mb-4">
            Offer details are revealed once everyone has submitted.
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

              // canAccept uses isOnLosingTeam — explicit membership rather
              // than the old `isLoser = !isWinner` alias. (#8, #12)
              const canAccept  = isOnLosingTeam && isPending && acceptedOfferId === null && allSubmitted;
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
                        {allSubmitted ? (
                          <span className="font-barlow font-semibold text-dota-info">
                            {to?.username ?? `Player #${offer.target_player_id}`}
                          </span>
                        ) : (
                          <span className="font-barlow text-xs text-dota-text-dim italic">
                            Hidden until all offers are in…
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount / tier — hidden for everyone until all submitted */}
                    <div className="flex items-center gap-2">
                      <span className="stat-label w-10">Offer</span>
                      {!allSubmitted ? (
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

        {/* role="alert" so screen readers announce accept errors immediately (#17) */}
        {acceptError && (
          <p role="alert" className="mt-3 font-barlow text-sm text-dota-dire-light text-center">
            {acceptError}
          </p>
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
