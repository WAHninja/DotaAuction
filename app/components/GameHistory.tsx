'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import type { HistoryGame, TierLabel } from '@/types';

// ── Tier badge — delegates to globals CSS classes ─────────────────────────────
function TierBadge({ tier }: { tier: TierLabel | null }) {
  if (!tier) return <span className="text-dota-text-dim text-xs">?</span>;
  const cls =
    tier === 'Low'    ? 'tier-low'    :
    tier === 'Medium' ? 'tier-medium' :
                        'tier-high';
  return <span className={cls}>{tier}</span>;
}

// ── Gold icon helper ──────────────────────────────────────────────────────────
function Gold({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-barlow font-bold text-dota-gold tabular-nums">
      {amount}
      <Image src="/Gold_symbol.webp" alt="Gold" width={14} height={14} className="inline-block" />
    </span>
  );
}

// ── Gold change row ───────────────────────────────────────────────────────────
function GoldChange({ username, change, reason }: { username: string; change: number; reason: string }) {
  const isPositive  = change > 0;
  const colour      = isPositive ? 'text-dota-radiant-light' : 'text-dota-dire-light';
  const reasonLabel =
    reason === 'win_reward'                         ? 'win reward'      :
    reason === 'loss_penalty'                       ? 'loss penalty'    :
    reason === 'offer_accepted' || reason === 'offer_gain' ? 'offer accepted' :
    reason;

  return (
    <li className="flex items-center gap-2 font-barlow text-sm">
      <span className="text-dota-text">{username}</span>
      <span className={`font-semibold ${colour}`}>
        {isPositive ? '+' : ''}{change}
      </span>
      <Image src="/Gold_symbol.webp" alt="Gold" width={12} height={12} className="inline-block" />
      <span className="text-dota-text-dim text-xs">({reasonLabel})</span>
    </li>
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
      {/* ── Card header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4">
        <div className="space-y-0.5">
          <h3 className="font-cinzel font-bold text-dota-text">
            Game #{game.gameNumber}
          </h3>

          {/* Collapsed summary */}
          {!expanded && accepted && (
            <p className="font-barlow text-sm text-dota-text-muted flex items-center gap-1.5 flex-wrap">
              <span className="text-dota-gold font-semibold">{accepted.fromUsername}</span>
              <span>traded</span>
              <span className="text-dota-info font-semibold">{accepted.targetUsername}</span>
              <span>for</span>
              {accepted.offerAmount != null
                ? <Gold amount={accepted.offerAmount} />
                : <TierBadge tier={accepted.tierLabel} />
              }
              {accepted.tierLabel && accepted.offerAmount != null && (
                <TierBadge tier={accepted.tierLabel} />
              )}
            </p>
          )}
        </div>

        <button
          className="font-barlow text-xs text-dota-text-muted hover:text-dota-text flex items-center gap-1 transition-colors shrink-0 ml-4"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
        >
          {expanded ? (
            <><ChevronUp className="w-4 h-4" /> Hide</>
          ) : (
            <><ChevronDown className="w-4 h-4" /> Details</>
          )}
        </button>
      </div>

      {/* ── Expanded content ───────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-dota-border px-4 pb-4 pt-4 space-y-5" onClick={e => e.stopPropagation()}>

          {/* Teams */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="team-radiant-panel p-3 rounded-lg">
              <p className="stat-label text-dota-radiant-light mb-1.5">Team 1</p>
              <p className="font-barlow text-sm text-dota-text">{game.team1Members.join(', ') || '—'}</p>
            </div>
            <div className="team-dire-panel p-3 rounded-lg">
              <p className="stat-label text-dota-dire-light mb-1.5">Team A</p>
              <p className="font-barlow text-sm text-dota-text">{game.teamAMembers.join(', ') || '—'}</p>
            </div>
          </div>

          {/* Winner */}
          {game.winningTeam && (
            <p className="font-barlow text-sm text-dota-text-muted">
              Winner:{' '}
              <span className="font-semibold text-dota-radiant-light">
                {game.winningTeam === 'team_1' ? 'Team 1' : 'Team A'}
              </span>
            </p>
          )}

          {/* Gold changes */}
          {game.playerStats.length > 0 && (
            <div>
              <p className="stat-label mb-2">Gold changes</p>
              <ul className="space-y-1.5">
                {['win_reward', 'loss_penalty', 'offer_accepted', 'offer_gain']
                  .flatMap(reason =>
                    game.playerStats
                      .filter(s => s.reason === reason)
                      .map(stat => (
                        <GoldChange
                          key={stat.id}
                          username={stat.username ?? `Player #${stat.playerId}`}
                          change={stat.goldChange}
                          reason={stat.reason}
                        />
                      ))
                  )
                }
              </ul>
            </div>
          )}

          {/* Offers */}
          {game.offers.length > 0 && (
            <div>
              <p className="stat-label mb-2">Offers</p>
              <ul className="space-y-2">
                {game.offers.map(offer => {
                  const isAccepted = offer.status === 'accepted';
                  const isRejected = offer.status === 'rejected';
                  return (
                    <li key={offer.id} className="font-barlow text-sm flex items-center gap-2 flex-wrap">
                      {isAccepted
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-dota-radiant-light shrink-0" />
                        : isRejected
                        ? <XCircle className="w-3.5 h-3.5 text-dota-dire-light shrink-0" />
                        : <span className="w-3.5 h-3.5 shrink-0" />
                      }
                      <span className="text-dota-gold font-semibold">{offer.fromUsername}</span>
                      <span className="text-dota-text-muted">offered</span>
                      <span className="text-dota-info font-semibold">{offer.targetUsername}</span>
                      <span className="text-dota-text-muted">for</span>
                      {offer.offerAmount != null ? (
                        <><Gold amount={offer.offerAmount} />{offer.tierLabel && <TierBadge tier={offer.tierLabel} />}</>
                      ) : (
                        <TierBadge tier={offer.tierLabel} />
                      )}
                      <span className={`text-xs font-semibold uppercase ${
                        isAccepted ? 'text-dota-radiant-light' :
                        isRejected ? 'text-dota-dire-light'    :
                                     'text-dota-text-dim'
                      }`}>
                        {offer.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
