'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import type { HistoryGame, TierLabel } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: TierLabel | null }) {
  if (!tier) return <span className="text-dota-text-dim text-xs">?</span>;
  const cls =
    tier === 'Low'    ? 'tier-low'    :
    tier === 'Medium' ? 'tier-medium' :
                        'tier-high';
  return <span className={cls}>{tier}</span>;
}

function GoldAmount({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-barlow font-bold text-dota-gold tabular-nums">
      {amount.toLocaleString()}
      <Image src="/Gold_symbol.webp" alt="Gold" width={13} height={13} />
    </span>
  );
}

// ── Zone 1: Result — team panels with winner highlight ────────────────────────

function ResultZone({ game }: { game: HistoryGame }) {
  const winner = game.winningTeam; // 'team_1' | 'team_a' | null

  const TeamPanel = ({
    faction,
    members,
    isWinner,
  }: {
    faction: 'radiant' | 'dire';
    members: string[];
    isWinner: boolean;
  }) => {
    const isRadiant   = faction === 'radiant';
    const label       = isRadiant ? 'Team 1' : 'Team A';
    const labelColour = isRadiant ? 'text-dota-radiant-light' : 'text-dota-dire-light';
    const panelClass  = isRadiant ? 'team-radiant-panel' : 'team-dire-panel';
    const winBorder   = isRadiant ? 'border-dota-radiant shadow-radiant' : 'border-dota-dire shadow-dire';

    return (
      <div className={`${panelClass} rounded-lg p-3 flex flex-col gap-2 transition-all ${isWinner ? winBorder : 'opacity-80'}`}>
        <div className="flex items-center justify-between">
          <p className={`stat-label ${labelColour}`}>{label}</p>
          {isWinner && (
            <span className={`flex items-center gap-1 font-barlow text-xs font-bold ${labelColour}`}>
              <Trophy className="w-3 h-3" /> Winner
            </span>
          )}
        </div>
        <p className="font-barlow text-sm text-dota-text leading-snug">
          {members.join(', ') || '—'}
        </p>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TeamPanel
        faction="radiant"
        members={game.team1Members}
        isWinner={winner === 'team_1'}
      />
      <TeamPanel
        faction="dire"
        members={game.teamAMembers}
        isWinner={winner === 'team_a'}
      />
    </div>
  );
}

// ── Zone 2: Gold Ledger — gains vs losses two-column ─────────────────────────

function LedgerZone({ game }: { game: HistoryGame }) {
  if (game.playerStats.length === 0) return null;

  // Gains = win_reward + offer_accepted + offer_gain
  // Losses = loss_penalty
  const gains  = game.playerStats.filter(s =>
    s.reason === 'win_reward' || s.reason === 'offer_accepted' || s.reason === 'offer_gain'
  );
  const losses = game.playerStats.filter(s => s.reason === 'loss_penalty');

  const ReasonTag = ({ reason }: { reason: string }) => {
    const label =
      reason === 'win_reward'                          ? 'win'     :
      reason === 'loss_penalty'                        ? 'loss'    :
      reason === 'offer_accepted' || reason === 'offer_gain' ? 'auction' :
      reason;
    const cls =
      reason === 'win_reward'    ? 'text-dota-radiant-light bg-dota-radiant/10 border-dota-radiant/20'  :
      reason === 'loss_penalty'  ? 'text-dota-dire-light bg-dota-dire/10 border-dota-dire/20'           :
                                   'text-dota-gold bg-dota-gold/10 border-dota-gold/20';
    return (
      <span className={`font-barlow text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}>
        {label}
      </span>
    );
  };

  return (
    <div>
      <p className="stat-label mb-2.5">Gold Changes</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Gains */}
        <div className="panel-sunken rounded-lg p-3 space-y-2">
          <p className="font-barlow text-xs font-semibold text-dota-radiant-light uppercase tracking-widest mb-1">
            Gains
          </p>
          {gains.length === 0
            ? <p className="font-barlow text-xs text-dota-text-dim">—</p>
            : gains.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-barlow font-semibold text-sm text-dota-text truncate">
                    {s.username ?? `Player #${s.playerId}`}
                  </span>
                  <ReasonTag reason={s.reason} />
                </div>
                <span className="font-barlow font-bold text-sm text-dota-radiant-light tabular-nums shrink-0">
                  +{s.goldChange.toLocaleString()}
                  <Image src="/Gold_symbol.webp" alt="Gold" width={12} height={12} className="inline-block ml-1" />
                </span>
              </div>
            ))
          }
        </div>

        {/* Losses */}
        <div className="panel-sunken rounded-lg p-3 space-y-2">
          <p className="font-barlow text-xs font-semibold text-dota-dire-light uppercase tracking-widest mb-1">
            Losses
          </p>
          {losses.length === 0
            ? <p className="font-barlow text-xs text-dota-text-dim">—</p>
            : losses.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-barlow font-semibold text-sm text-dota-text truncate">
                    {s.username ?? `Player #${s.playerId}`}
                  </span>
                  <ReasonTag reason={s.reason} />
                </div>
                <span className="font-barlow font-bold text-sm text-dota-dire-light tabular-nums shrink-0">
                  {s.goldChange.toLocaleString()}
                  <Image src="/Gold_symbol.webp" alt="Gold" width={12} height={12} className="inline-block ml-1" />
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Zone 3: Auction Recap — offer cards in a grid ────────────────────────────

function AuctionZone({ game }: { game: HistoryGame }) {
  if (game.offers.length === 0) return null;

  return (
    <div>
      <p className="stat-label mb-2.5">Auction</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {game.offers.map(offer => {
          const isAccepted = offer.status === 'accepted';
          const isRejected = offer.status === 'rejected';

          return (
            <div
              key={offer.id}
              className={`panel-raised rounded-lg p-3 flex flex-col gap-2 transition-all ${
                isAccepted ? 'border-dota-radiant shadow-radiant'  :
                isRejected ? 'opacity-45'                          :
                             ''
              }`}
            >
              {/* Status strip */}
              <div className="flex items-center justify-between">
                <span className={`font-barlow text-[10px] font-bold uppercase tracking-widest ${
                  isAccepted ? 'text-dota-radiant-light' :
                  isRejected ? 'text-dota-dire-light'    :
                               'text-dota-text-dim'
                }`}>
                  {offer.status}
                </span>
                {offer.tierLabel && <TierBadge tier={offer.tierLabel} />}
              </div>

              <div className="divider" />

              {/* Seller → Target */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="stat-label">From</span>
                  <span className="font-barlow font-bold text-sm text-dota-gold">
                    {offer.fromUsername}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="stat-label">Selling</span>
                  <span className="font-barlow font-bold text-sm text-dota-info">
                    {offer.targetUsername}
                  </span>
                </div>
              </div>

              {/* Amount */}
              {offer.offerAmount != null && (
                <div className="mt-auto pt-1 border-t border-dota-border">
                  <GoldAmount amount={offer.offerAmount} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Individual game card ──────────────────────────────────────────────────────

function GameCard({ game }: { game: HistoryGame }) {
  const [expanded, setExpanded] = useState(false);
  const accepted = game.offers.find(o => o.status === 'accepted');

  return (
    <div
      className="panel cursor-pointer hover:border-dota-border-bright transition-colors"
      onClick={() => setExpanded(v => !v)}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 gap-4">
        <div className="space-y-0.5 min-w-0">
          <h3 className="font-cinzel font-bold text-dota-text">
            Game #{game.gameNumber}
          </h3>

          {/* Collapsed one-liner */}
          {!expanded && accepted && (
            <p className="font-barlow text-sm text-dota-text-muted flex items-center gap-1.5 flex-wrap">
              <span className="text-dota-gold font-semibold">{accepted.fromUsername}</span>
              <span>sold</span>
              <span className="text-dota-info font-semibold">{accepted.targetUsername}</span>
              <span>for</span>
              {accepted.offerAmount != null
                ? <GoldAmount amount={accepted.offerAmount} />
                : <TierBadge tier={accepted.tierLabel} />
              }
              {accepted.tierLabel && accepted.offerAmount != null && (
                <TierBadge tier={accepted.tierLabel} />
              )}
            </p>
          )}
        </div>

        <button
          className="font-barlow text-xs text-dota-text-muted hover:text-dota-text flex items-center gap-1 transition-colors shrink-0"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
        >
          {expanded
            ? <><ChevronUp   className="w-3.5 h-3.5" /> Hide</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Details</>
          }
        </button>
      </div>

      {/* ── Expanded ───────────────────────────────────────────────────────── */}
      {expanded && (
        <div
          className="border-t border-dota-border p-4 space-y-5"
          onClick={e => e.stopPropagation()}
        >
          <ResultZone  game={game} />
          <LedgerZone  game={game} />
          <AuctionZone game={game} />
        </div>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export default function GameHistory({ history }: { history: HistoryGame[] }) {
  if (history.length === 0) return null;

  return (
    <section className="mt-12 space-y-4">
      <div className="text-center space-y-2">
        <h2 className="font-cinzel text-3xl font-bold text-dota-gold">Game History</h2>
        <div className="divider-gold w-48 mx-auto" />
      </div>

      <div className="space-y-3">
        {[...history].reverse().map(game => (
          <GameCard key={game.gameNumber} game={game} />
        ))}
      </div>
    </section>
  );
}
