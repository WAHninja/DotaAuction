'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import type {
  HistoryGame,
  TierLabel,
  DotaGameStat,
  HistoryOffer,
  HistoryPlayerStat,
  TeamId,
  OfferStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Unified per-player row data — merges all four data sources
// ---------------------------------------------------------------------------

type UnifiedPlayer = {
  username:    string;
  // Dota in-game stats (null for pre-reporting games)
  hero:        string | null;
  kills:       number | null;
  deaths:      number | null;
  assists:     number | null;
  netWorth:    number | null;
  // Gold ledger (sum of all game_player_stats rows for this player)
  goldTotal:   number | null;
  // Auction involvement
  sellerInfo: {
    targetUsername: string;
    amount: number | null;
    tier:   TierLabel | null;
    status: OfferStatus;
  } | null;
};

function buildUnifiedPlayers(
  usernames:   string[],
  dotaStats:   DotaGameStat[],
  playerStats: HistoryPlayerStat[],
  offers:      HistoryOffer[],
): UnifiedPlayer[] {
  const dotaByName = new Map(dotaStats.map(s => [s.username, s]));

  const goldByName = new Map<string, number>();
  for (const s of playerStats) {
    goldByName.set(s.username, (goldByName.get(s.username) ?? 0) + s.goldChange);
  }

  const sellerByName = new Map<string, UnifiedPlayer['sellerInfo']>();
  for (const o of offers) {
    sellerByName.set(o.fromUsername, {
      targetUsername: o.targetUsername,
      amount: o.offerAmount,
      tier:   o.tierLabel,
      status: o.status,
    });
  }

  return usernames.map(name => {
    const d = dotaByName.get(name);
    return {
      username:  name,
      hero:      d?.hero   ?? null,
      kills:     d != null ? d.kills   : null,
      deaths:    d != null ? d.deaths  : null,
      assists:   d != null ? d.assists : null,
      netWorth:  d != null ? d.netWorth: null,
      goldTotal: goldByName.has(name) ? goldByName.get(name)! : null,
      sellerInfo: sellerByName.get(name) ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function GoldIcon() {
  return <Image src="/Gold_symbol.webp" alt="" width={12} height={12} className="inline-block" />;
}

function heroIconUrl(hero: string): string {
  const name = hero.replace(/^npc_dota_hero_/, '');
  return `https://cdn.dota2.com/apps/dota2/images/heroes/${name}_sb.png`;
}

function HeroIcon({ hero }: { hero: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={heroIconUrl(hero)}
      alt={hero.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ')}
      width={59}
      height={33}
      className="rounded object-cover shrink-0"
      style={{ width: 44, height: 25 }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

function formatNW(val: number): string {
  if (val >= 1000) {
    const k = val / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `${val}`;
}

function TierBadge({ tier }: { tier: TierLabel | null }) {
  if (!tier) return null;
  const cls = tier === 'Low' ? 'tier-low' : tier === 'Medium' ? 'tier-medium' : 'tier-high';
  return <span className={`${cls} text-[10px]`}>{tier}</span>;
}

// ---------------------------------------------------------------------------
// Team scoreboard — single unified table per team
// ---------------------------------------------------------------------------

function TeamScoreboard({
  teamId, label, players, isWinner, hasDotaStats, hasAuction,
}: {
  teamId:       TeamId;
  label:        string;
  players:      UnifiedPlayer[];
  isWinner:     boolean;
  hasDotaStats: boolean;
  hasAuction:   boolean;
}) {
  const r = teamId === 'team_1';
  const f = r
    ? { header: 'from-dota-radiant/20', border: 'border-dota-radiant/35', text: 'text-dota-radiant-light', hover: 'hover:bg-dota-radiant/5' }
    : { header: 'from-dota-dire/20',    border: 'border-dota-dire/35',    text: 'text-dota-dire-light',   hover: 'hover:bg-dota-dire/5'    };

  const cols = [
    '1fr',
    hasDotaStats ? '90px' : null,
    hasDotaStats ? '68px' : null,
    '76px',
    hasAuction   ? 'minmax(100px,0.7fr)' : null,
  ].filter(Boolean).join(' ');

  return (
    <div className={`border ${f.border} rounded-lg overflow-hidden`}>

      {/* Header */}
      <div className={`bg-gradient-to-r ${f.header} via-transparent to-transparent flex items-center gap-2.5 px-4 py-2.5 border-b ${f.border}`}>
        <Image src={r ? '/Team1.png' : '/TeamA.png'} alt={label} width={20} height={20} className="object-contain" />
        <span className={`font-cinzel font-bold text-sm tracking-widest ${f.text}`}>{label}</span>
        {isWinner && (
          <span className={`ml-auto flex items-center gap-1.5 font-barlow text-[11px] font-bold px-2.5 py-0.5 rounded border ${f.text} bg-current/10 border-current/30`}
            style={{ color: r ? '#6ab85a' : '#e05040' }}>
            <Trophy className="w-3 h-3" /> WINNER
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="grid gap-x-4 px-4 py-1.5 bg-dota-deep border-b border-dota-border/40"
           style={{ gridTemplateColumns: cols }}>
        <span className="stat-label">PLAYER{hasDotaStats ? ' · HERO' : ''}</span>
        {hasDotaStats && <span className="stat-label text-center">K / D / A</span>}
        {hasDotaStats && <span className="stat-label text-right">NET WORTH</span>}
        <span className="stat-label text-right">GOLD Δ</span>
        {hasAuction && <span className="stat-label">OFFER</span>}
      </div>

      {/* Rows */}
      {players.map((p, i) => (
        <div key={p.username}
          className={`grid gap-x-4 items-center px-4 py-2.5 transition-colors ${f.hover} ${i < players.length - 1 ? `border-b border-dota-border/25` : ''}`}
          style={{ gridTemplateColumns: cols }}
        >
          {/* Player + hero */}
          <div className="flex items-center gap-2 min-w-0">
            {p.hero && <HeroIcon hero={p.hero} />}
            <div className="flex flex-col min-w-0">
              <span className="font-barlow font-semibold text-sm text-dota-text truncate">{p.username}</span>
              {p.hero && (
                <span className="font-barlow text-[11px] text-dota-text-muted truncate capitalize">
                  {p.hero.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>

          {/* K / D / A */}
          {hasDotaStats && (
            <div className="text-center">
              {p.kills !== null
                ? <span className="font-barlow font-semibold text-sm tabular-nums whitespace-nowrap">
                    <span className="text-dota-radiant-light">{p.kills}</span>
                    <span className="text-dota-text-dim mx-0.5">/</span>
                    <span className="text-dota-dire-light">{p.deaths}</span>
                    <span className="text-dota-text-dim mx-0.5">/</span>
                    <span className="text-[#7aaad4]">{p.assists}</span>
                  </span>
                : <span className="text-dota-text-dim text-xs">—</span>
              }
            </div>
          )}

          {/* Net worth */}
          {hasDotaStats && (
            <div className="text-right">
              {p.netWorth !== null
                ? <span className="inline-flex items-center justify-end gap-0.5 font-barlow font-bold text-sm text-dota-gold tabular-nums">
                    {formatNW(p.netWorth)}<GoldIcon />
                  </span>
                : <span className="text-dota-text-dim text-xs block text-right">—</span>
              }
            </div>
          )}

          {/* Gold Δ */}
          <div className="text-right">
            {p.goldTotal !== null
              ? <span className={`inline-flex items-center justify-end gap-0.5 font-barlow font-bold text-sm tabular-nums whitespace-nowrap ${p.goldTotal >= 0 ? 'text-dota-radiant-light' : 'text-dota-dire-light'}`}>
                  {p.goldTotal >= 0 ? '+' : ''}{p.goldTotal.toLocaleString()}<GoldIcon />
                </span>
              : <span className="text-dota-text-dim text-xs block text-right">—</span>
            }
          </div>

          {/* Auction — show this player's offer if they made one */}
          {hasAuction && (
            <div className="min-w-0">
              {p.sellerInfo ? (
                <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${p.sellerInfo.status === 'rejected' ? 'opacity-55' : ''}`}>
                  <span className={`font-barlow text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${
                    p.sellerInfo.status === 'accepted'
                      ? 'text-dota-radiant-light bg-dota-radiant/10 border-dota-radiant/30'
                      : p.sellerInfo.status === 'rejected'
                      ? 'text-dota-dire-light bg-dota-dire/10 border-dota-dire/30'
                      : 'text-dota-text-dim bg-transparent border-dota-border/50'
                  }`}>
                    {p.sellerInfo.status}
                  </span>
                  <span className="font-barlow text-xs text-dota-text-dim shrink-0">→</span>
                  <span className={`font-barlow text-xs font-semibold truncate ${p.sellerInfo.status === 'accepted' ? 'text-dota-info' : 'text-dota-text-muted'}`}>
                    {p.sellerInfo.targetUsername}
                  </span>
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    {p.sellerInfo.amount != null && (
                      <span className="inline-flex items-center gap-0.5 font-barlow font-bold text-xs text-dota-gold tabular-nums">
                        {p.sellerInfo.amount.toLocaleString()}<GoldIcon />
                      </span>
                    )}
                    {p.sellerInfo.tier && <TierBadge tier={p.sellerInfo.tier} />}
                  </span>
                </div>
              ) : (
                <span className="text-dota-text-dim text-xs">—</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Game card
// ---------------------------------------------------------------------------

function GameCard({ game, isFinalGame }: { game: HistoryGame; isFinalGame: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const accepted     = game.offers.find(o => o.status === 'accepted');
  const hasDotaStats = game.dotaStats.length > 0;
  const hasAuction   = game.offers.length > 0;

  const hasWinner     = game.winningTeam !== null;
  const winnerIsTeam1 = game.winningTeam === 'team_1';

  const winningTeamLabel = game.winningTeam === 'team_1' ? 'Team 1' : 'Team A';

  const team1 = (
    <TeamScoreboard key="t1" teamId="team_1" label="Team 1"
      players={buildUnifiedPlayers(game.team1Members, game.dotaStats, game.playerStats, game.offers)}
      isWinner={hasWinner && winnerIsTeam1} hasDotaStats={hasDotaStats} hasAuction={hasAuction} />
  );
  const teamA = (
    <TeamScoreboard key="tA" teamId="team_a" label="Team A"
      players={buildUnifiedPlayers(game.teamAMembers, game.dotaStats, game.playerStats, game.offers)}
      isWinner={hasWinner && !winnerIsTeam1} hasDotaStats={hasDotaStats} hasAuction={hasAuction} />
  );

  return (
    <div className="panel cursor-pointer hover:border-dota-border-bright transition-colors"
         onClick={() => setExpanded(v => !v)}>

      {/* ── Collapsed header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between p-4 gap-4">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-cinzel font-bold text-dota-text">Game #{game.gameNumber}</h3>

            {/* Final game badge — shown regardless of expanded state */}
            {isFinalGame && (
              <span className="badge-gold text-xs py-0.5">Final Game</span>
            )}

            {hasDotaStats && !expanded && (
              <span className="font-barlow text-[9px] font-semibold uppercase tracking-widest text-dota-text-dim border border-dota-border rounded px-1.5 py-0.5">
                K/D/A
              </span>
            )}
          </div>

          {!expanded && (
            <>
              {/*
                Final game: no auction took place, so there is no accepted offer
                to summarise. Instead, show which team clinched the match.
              */}
              {isFinalGame && game.winningTeam && (
                <p className="font-barlow text-sm text-dota-text-muted flex items-center gap-1.5 flex-wrap">
                  <Trophy className="w-3.5 h-3.5 text-dota-gold shrink-0" aria-hidden="true" />
                  <span className="text-dota-gold font-semibold">{winningTeamLabel}</span>
                  clinched the match
                </p>
              )}

              {/* All other games: show the accepted offer summary as before */}
              {!isFinalGame && accepted && (
                <p className="font-barlow text-sm text-dota-text-muted flex items-center gap-1.5 flex-wrap">
                  <span className="text-dota-gold font-semibold">{accepted.fromUsername}</span>
                  sold
                  <span className="text-dota-info font-semibold">{accepted.targetUsername}</span>
                  for
                  {accepted.offerAmount != null
                    ? <span className="inline-flex items-center gap-0.5 font-bold text-dota-gold tabular-nums">
                        {accepted.offerAmount.toLocaleString()}<GoldIcon />
                      </span>
                    : <TierBadge tier={accepted.tierLabel} />
                  }
                </p>
              )}
            </>
          )}
        </div>

        <button
          className="font-barlow text-xs text-dota-text-muted hover:text-dota-text flex items-center gap-1 transition-colors shrink-0"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}>
          {expanded
            ? <><ChevronUp   className="w-3.5 h-3.5" />Hide</>
            : <><ChevronDown className="w-3.5 h-3.5" />Details</>
          }
        </button>
      </div>

      {/* ── Expanded — scoreboard ─────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-dota-border p-4 overflow-x-auto"
             onClick={e => e.stopPropagation()}>

          {/*
            Final game note — explains why gold delta cells all show "—".

            No gold changes are applied when a player wins the match alone:
            the gold totals frozen in match_players reflect each player's
            standing at the START of this game, which is the meaningful
            "going into the final" snapshot. Applying win/loss gold here would
            inflate those totals and misrepresent how close the match actually
            was. See select-winner/route.ts for the full rationale.
          */}
          {isFinalGame && (
            <div className="mb-4 px-3 py-2.5 rounded bg-dota-gold/8 border border-dota-gold/20">
              <p className="font-barlow text-xs text-dota-text-muted leading-relaxed">
                <span className="text-dota-gold font-semibold">Final game — </span>
                gold totals are unchanged. No auction followed this game, so win and
                loss gold was intentionally not distributed. The gold shown in the
                team cards above represents each player's standing at the start of
                this game.
              </p>
            </div>
          )}

          <div className="min-w-[340px] space-y-2">
            {winnerIsTeam1 ? [team1, teamA] : [teamA, team1]}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export default function GameHistory({
  history,
  matchFinished = false,
}: {
  history: HistoryGame[];
  // When true, the component identifies the last game as the "final game"
  // and renders it with a distinct badge and explanatory note about gold.
  matchFinished?: boolean;
}) {
  if (history.length === 0) return null;

  // The final game is the one with the highest gameNumber. Since games are
  // numbered sequentially from 1, this is always history.length (but we
  // compute it rather than assuming, in case history ever arrives non-contiguous).
  const maxGameNumber = Math.max(...history.map(g => g.gameNumber));

  return (
    <section className="mt-12 space-y-4">
      <div className="text-center space-y-2">
        <h2 className="font-cinzel text-3xl font-bold text-dota-gold">Game History</h2>
        <div className="divider-gold w-48 mx-auto" />
      </div>
      <div className="space-y-3">
        {[...history].reverse().map(game => (
          <GameCard
            key={game.gameNumber}
            game={game}
            isFinalGame={matchFinished && game.gameNumber === maxGameNumber}
          />
        ))}
      </div>
    </section>
  );
}
