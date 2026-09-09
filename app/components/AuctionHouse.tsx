'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { CheckCircle2, ChevronDown, Loader2, Star } from 'lucide-react';
import GoldIcon from '@/app/components/GoldIcon';
import PlayerAvatar from '@/app/components/PlayerAvatar';
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
  completedGames: number;
  onOfferSubmitted: (offer: Offer) => void;
  onOfferAccepted: () => void;
  // userId -> offerId. Which offer each losing-team member is currently
  // backing — a live, non-binding signal, only ever shown to other losing-team
  // members. Omit / leave empty outside the live (non-finalized) auction.
  selections?: Record<number, number | null>;
  onSelectOffer?: (offerId: number | null) => void;
  // When true, this is the read-only "just resolved" snapshot shown for a
  // short window after an offer was accepted — no submit form, no accept
  // buttons, no selection affordance, just the final outcome.
  finalized?: boolean;
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
// v2 theme: rendered as a recessed in-game counter (.gold-chip), icon on the
// left like the HUD, instead of bare gold text.
function GoldAmount({ amount }: { amount: number }) {
  return (
    <span className="gold-chip">
      <GoldIcon size={13} />
      {amount.toLocaleString()}
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
  selections = {},
  onSelectOffer,
  finalized = false,
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

  const winningTeamMembers = winningTeam === 'team_1' ? team1 : teamA;
  const losingTeamMembers  = winningTeam === 'team_1' ? teamA : team1;

  const isOnWinningTeam = winningTeamMembers.includes(currentUserId);
  const isOnLosingTeam  = losingTeamMembers.includes(currentUserId);

  const candidates = winningTeamMembers.filter(id => id !== currentUserId);

  const alreadySubmitted = offers.some(o => o.from_player_id === currentUserId);

  const submittedCount = winningTeamMembers.filter(
    pid => offers.some(o => o.from_player_id === pid)
  ).length;
  const allSubmitted = winningTeamMembers.every(
    pid => offers.some(o => o.from_player_id === pid)
  );
  const hasPending = offers.some(o => o.status === 'pending');

  // ── Offer range ──────────────────────────────────────────────────────────────

  const completedGames = Math.max(0, rawCompletedGames);
  const minOffer = 450 + completedGames * 200;
  const maxOffer = 2500 + completedGames * 500;

  // ── Player lookup ─────────────────────────────────────────────────────────────

  const playerById = useMemo(
    () => new Map(players.map(p => [p.id, p])),
    [players]
  );
  const getPlayer = (id: number): Player | undefined => playerById.get(id);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmitOffer = async () => {
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
          target_player_id: parseInt(selectedPlayer, 10),
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

  // ── Backing tally ───────────────────────────────────────────────────────────
  //
  // Which offer the losing team is converging on. Computed once here rather
  // than per-card so "most backed" can be decided by comparing offers against
  // each other — a card cannot know it is winning by looking only at itself.
  //
  // A leader is only declared when one offer is strictly ahead. On a tie
  // (the common 1–1 case with two voters) nothing is highlighted, because
  // flagging both as "most backed" tells the team nothing and flagging an
  // arbitrary one of them is actively misleading.
  const leadingOfferId = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const pid of losingTeamMembers) {
      const offerId = selections[pid];
      if (offerId != null) counts[offerId] = (counts[offerId] ?? 0) + 1;
    }
    const max = Math.max(0, ...Object.values(counts));
    const top = Object.keys(counts)
      .filter(id => counts[Number(id)] === max)
      .map(Number);
    return max > 0 && top.length === 1 ? top[0] : null;
  }, [losingTeamMembers, selections]);

  // ── Select (non-binding backing signal) ──────────────────────────────────────
  const handleToggleSelect = (offerId: number) => {
    if (!onSelectOffer) return;
    const alreadySelected = selections[currentUserId] === offerId;
    onSelectOffer(alreadySelected ? null : offerId);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="panel relative p-6 mb-8">
      <div className="space-y-6">

        {/* ── Title ─────────────────────────────────────────────────────────── */}
        <div>
          <h3 className="font-barlow text-2xl sm:text-3xl font-bold uppercase tracking-wider text-dota-gold text-center">
            Auction House
          </h3>
          <div className="divider-gold w-80 max-w-full mx-auto mt-3" />
        </div>

        {/* ── Resolved banner ─────────────────────────────────────────────────── */}
        {finalized && (
          <p className="text-center font-barlow text-sm font-semibold text-dota-gold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Auction resolved — next game underway
          </p>
        )}

        {/* ── Offer counter ───────────────────────────────────────────────────── */}
        {!finalized && (
          <div className="flex justify-center">
            <div className="panel-sunken flex items-center gap-4 px-5 py-3">
              <span className="stat-label">Offers in</span>
              <div className="flex gap-1.5" role="group" aria-label="Offer submission status">
                {winningTeamMembers.map(pid => {
                  const hasSubmitted = offers.some(o => o.from_player_id === pid);
                  const name = getPlayer(pid)?.username ?? `Player #${pid}`;
                  return (
                    <span
                      key={pid}
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
        )}

        {/* ── Winner: submit form ─────────────────────────────────────────────── */}
        {!finalized && isOnWinningTeam && !alreadySubmitted && (
          /*
            Artwork handling — read before changing any of this.

            match_predictions_bg.png is 1440x620 and already carries its own
            alpha fade: the left ~25% is fully transparent, it ramps in across
            the middle, and it softens out at the top and bottom edges. The
            asset is built to dissolve into a dark panel on its own.

            The previous version used `fill` + `object-cover object-right`,
            which broke that in two ways. The panel's height is set by the form
            (~300px) while its width follows the viewport, so its aspect ratio
            swings from roughly 1.9:1 to 3.75:1 — and every ratio past the
            source's own 2.32:1 crops vertically. That crop removes the top and
            bottom fades, so the soft edge becomes a hard cut straight through
            her head, and the exact crop changes with every screen width.

            object-contain fixes both: the whole image is always shown, so the
            built-in fades survive and the composition is identical at every
            width — only the scale changes. Nothing is ever cut off.

            The width cap keeps it off the form. Because object-contain
            letterboxes rather than fills, a right-anchored box wider than the
            form's own column would slide the art under the text at narrow
            widths; 68% leaves the max-w-md form clear down to the md
            breakpoint, below which the art is hidden entirely.
          */
          <div className="relative chamfer overflow-hidden panel-sunken min-h-[300px]">
            <div className="hidden md:block absolute inset-y-0 right-0 w-[68%] pointer-events-none select-none">
              <Image
                src="/match_predictions_bg.png"
                alt=""
                fill
                quality={85}
                sizes="(max-width: 768px) 0px, 60vw"
                className="object-contain object-right"
              />
            </div>
            {/*
              A light scrim only — the asset's own alpha does most of the
              blending. This exists purely to hold text contrast over the faint
              equation glyphs on the left, and stops at 65% so it never dims the
              subject herself. The old version ran to 100% at 0.35 opacity,
              which greyed out the artwork it was sitting on.
            */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to right, rgba(13,17,23,0.70) 0%, rgba(13,17,23,0.30) 45%, transparent 65%)',
              }}
            />

            <div className="relative z-10 max-w-md py-8 px-6 space-y-4">
              <div className="space-y-1">
                <p className="font-barlow font-bold uppercase tracking-wider text-dota-gold text-lg">
                  Make an Offer
                </p>
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
                {/* relative wrapper hosts the chevron, since .select strips
                    the OS arrow with appearance-none. */}
                <div className="relative">
                  <select
                    value={selectedPlayer}
                    onChange={e => {
                      setSelectedPlayer(e.target.value);
                      setSubmitError(null);
                    }}
                    aria-label="Select player to make an offer on"
                    className="select"
                  >
                    <option value="">Select player to offer…</option>
                    {candidates.map(pid => {
                      const p = getPlayer(pid);
                      return <option key={pid} value={pid}>{p?.username ?? `Player #${pid}`}</option>;
                    })}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dota-text-muted"
                    aria-hidden="true"
                  />
                </div>

                <input
                  type="number"
                  value={offerAmount}
                  onChange={e => {
                    setOfferAmount(e.target.value);
                    setSubmitError(null);
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitOffer()}
                  placeholder={`${minOffer}–${maxOffer}`}
                  min={minOffer}
                  max={maxOffer}
                  className="input"
                />
              </div>

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
        {!finalized && isOnWinningTeam && alreadySubmitted && (
          <p className="text-center font-barlow text-sm font-semibold text-dota-radiant-light flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Your offer is in.
          </p>
        )}

        {/* ── Loser: waiting message ──────────────────────────────────────────── */}
        {!finalized && isOnLosingTeam && !allSubmitted && (
          <p className="text-center font-barlow text-sm text-dota-text-muted">
            Waiting for all offers before you can accept…
          </p>
        )}

        {/* ── Loser: silent coordination hint ─────────────────────────────────── */}
        {!finalized && isOnLosingTeam && allSubmitted && hasPending && (
          <p className="text-center font-barlow text-xs text-dota-text-muted">
            Tap the <Star className="w-3 h-3 inline align-text-bottom" /> on an offer to back it.
            Your team sees who&rsquo;s backing what — nobody else does.
          </p>
        )}

        {/* ── Offer cards ────────────────────────────────────────────────────── */}
        <div>
          <h4 className="text-lg text-center text-dota-text mb-1">Current Offers</h4>

          {allSubmitted && hasPending && (
            <p className="text-center font-barlow text-xs text-dota-text-muted mb-4">
              Exact amounts are hidden until an offer is accepted.
            </p>
          )}

          {!allSubmitted && !finalized && (
            <p className="text-center font-barlow text-xs text-dota-text-muted mb-4">
              Offer details are revealed once everyone has submitted.
            </p>
          )}

          {offers.length === 0 ? (
            <p className="text-center font-barlow text-dota-text-muted py-4">No offers submitted yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {offers.map(offer => {
                const from       = getPlayer(offer.from_player_id);
                const to         = getPlayer(offer.target_player_id);
                const isAccepted = offer.status === 'accepted';
                const isRejected = offer.status === 'rejected';
                const isPending  = offer.status === 'pending';

                const canAccept = isOnLosingTeam && isPending && acceptedOfferId === null && allSubmitted && !finalized;
                const canSelect = isOnLosingTeam && isPending && allSubmitted && !finalized && acceptedOfferId === null;
                const showAmount = !isPending;

                const isSelectedByMe = isOnLosingTeam && selections[currentUserId] === offer.id;

                // Includes the current user — previously filtered out, which meant
                // starring an offer gave no feedback in the row itself and the
                // count silently under-reported the team by one. Self is sorted
                // first so you can find yourself without reading every avatar.
                const backers = isOnLosingTeam
                  ? losingTeamMembers
                      .filter(pid => selections[pid] === offer.id)
                      .sort((a, b) => (a === currentUserId ? -1 : b === currentUserId ? 1 : 0))
                  : [];

                const isMostBacked =
                  isOnLosingTeam && !finalized && leadingOfferId === offer.id;

                /* v2 theme: clip-path eats borders and outer box-shadows, so the
                   accepted / selected states are expressed as drop-shadow glows
                   (which follow the chamfered silhouette) instead of the old
                   border-colour + shadow-* utilities. These override the card's
                   default elevation shadow — the glow reads as the elevation. */
                const stateClass =
                  isAccepted     ? 'drop-shadow-[0_0_14px_rgba(74,155,60,0.45)]' :
                  isRejected     ? 'opacity-50'                                   :
                  // Team consensus outranks your own pick: a card you starred
                  // that the team has moved away from should not out-shout the
                  // one they have converged on.
                  isMostBacked   ? 'drop-shadow-[0_0_16px_rgba(200,169,81,0.55)]' :
                  isSelectedByMe ? 'drop-shadow-[0_0_10px_rgba(200,169,81,0.40)]' :
                                   '';

                return (
                  <div
                    key={offer.id}
                    className={`relative panel-raised p-4 flex flex-col justify-between gap-3 transition-all ${stateClass}`}
                  >
                    {/* Pick indicator — separate button so it doesn't nest inside
                        the Accept button below. Only losing-team members see it,
                        and only their own team ever sees who's picked what. */}
                    {canSelect && (
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(offer.id)}
                        aria-pressed={isSelectedByMe}
                        aria-label={isSelectedByMe ? 'Unmark as your pick' : 'Mark as your pick'}
                        title={isSelectedByMe ? 'Unmark as your pick' : "Mark as your pick — only your team sees this"}
                        className={`absolute top-2.5 right-2.5 p-1.5 chamfer-sm transition-colors ${
                          isSelectedByMe
                            ? 'bg-dota-gold/20 text-dota-gold'
                            : 'bg-dota-deep text-dota-text-muted hover:text-dota-gold hover:bg-dota-overlay'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" fill={isSelectedByMe ? 'currentColor' : 'none'} />
                      </button>
                    )}

                    {/* Offer details */}
                    <div className="space-y-2 pr-6">

                      {!isPending && (
                        <div className={isAccepted ? 'badge-radiant self-start' : 'badge-dire self-start'}>
                          {isAccepted ? <CheckCircle2 className="w-3 h-3" /> : null}
                          {offer.status}
                        </div>
                      )}

                      {/* The headline signal. The avatar row below says who is
                          backing what; this says which one is ahead, which is
                          the thing a teammate scanning the grid actually needs. */}
                      {isMostBacked && (
                        <div className="badge-gold self-start">
                          <Star className="w-3 h-3" fill="currentColor" />
                          Most backed
                        </div>
                      )}

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
                            <span className="font-barlow text-xs text-dota-text-muted italic">
                              Hidden until all offers are in…
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="stat-label w-10">Offer</span>
                        {!allSubmitted ? (
                          <span className="font-barlow text-xs text-dota-text-muted italic">
                            Hidden until all offers are in…
                          </span>
                        ) : showAmount ? (
                          offer.offer_amount != null
                            ? <GoldAmount amount={offer.offer_amount} />
                            : <span className="text-dota-text-muted text-xs">—</span>
                        ) : (
                          offer.tier_label
                            ? <TierBadge label={offer.tier_label} />
                            : <span className="text-dota-text-muted text-xs">—</span>
                        )}
                      </div>

                      {/* Who is backing this offer, including you.
                          Rendered inline rather than as a floating badge — the
                          chamfer clip would cut off anything hanging outside the
                          card, and inline it can't collide with the From/Selling
                          rows either. Only losing-team viewers see it. */}
                      {isOnLosingTeam && !finalized && backers.length > 0 && (
                        <div
                          className="flex items-center gap-2 pt-1"
                          role="group"
                          aria-label={`Backing this offer: ${backers
                            .map(pid =>
                              pid === currentUserId
                                ? 'you'
                                : getPlayer(pid)?.username ?? `Player #${pid}`,
                            )
                            .join(', ')}. ${backers.length} of ${losingTeamMembers.length} teammates.`}
                        >
                          <span className="stat-label">Backing</span>
                          <div className="flex -space-x-2">
                            {backers.map(pid => {
                              const p = getPlayer(pid);
                              const isYou = pid === currentUserId;
                              return (
                                <PlayerAvatar
                                  key={pid}
                                  username={p?.username ?? `Player #${pid}`}
                                  steamAvatar={p?.steam_avatar}
                                  size={22}
                                  // Gold ring picks you out of the stack at a
                                  // glance; teammates keep the neutral ring.
                                  className={isYou ? 'ring-2 ring-dota-gold' : 'ring-2 ring-dota-deep'}
                                />
                              );
                            })}
                          </div>
                          {/* Bare avatars don't scale — at five teammates the
                              stack overlaps into an unreadable smear. The count
                              stays legible regardless. */}
                          <span className="font-barlow text-xs font-semibold tabular-nums text-dota-text-muted">
                            {backers.length}/{losingTeamMembers.length}
                          </span>
                        </div>
                      )}
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
            <p role="alert" className="mt-3 font-barlow text-sm text-dota-dire-light text-center">
              {acceptError}
            </p>
          )}
        </div>

        {/* ── Tier legend ─────────────────────────────────────────────────────── */}
        {!finalized && allSubmitted && hasPending && (
          <div className="flex justify-center">
            <div className="panel-sunken flex flex-wrap items-center justify-center gap-4 px-5 py-3">
              <span className="stat-label">Tiers</span>
              {(['Low', 'Medium', 'High'] as const).map(tier => (
                <TierBadge key={tier} label={tier} />
              ))}
              <span className="font-barlow text-xs text-dota-text-muted">
                Ranges overlap — same tier can cover different amounts
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
