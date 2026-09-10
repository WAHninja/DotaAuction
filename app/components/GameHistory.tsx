'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Trophy, Calendar } from 'lucide-react';
import GoldIcon from '@/app/components/GoldIcon';
import PlayerAvatar from '@/app/components/PlayerAvatar';
import type {
  Player,
  HistoryGame,
  TierLabel,
  DotaGameStat,
  HistoryOffer,
  HistoryPlayerStat,
  TeamId,
  OfferStatus,
} from '@/types';

// Maps username -> steam avatar URL. History identifies players by username
// (the API returns names, not ids), while avatars live on the Player records
// held by the match page, so the two are joined by name at render time.
export type AvatarLookup = Map<string, string | null>;

type UnifiedPlayer = {
  username:    string;
  steamAvatar: string | null;
  hero:        string | null;
  kills:       number | null;
  deaths:      number | null;
  assists:     number | null;
  netWorth:    number | null;
  goldTotal:   number | null;
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
  avatars:     AvatarLookup,
): UnifiedPlayer[] {
  const dotaByName = new Map(dotaStats.map(s => [s.username, s]));

  const goldByName = new Map<string, number>();
  for (const s of playerStats) {
    goldByName.set(s.username, (goldByName.get(s.username) ?? 0) + s.goldChange);
  }

  // Accepted offer takes priority over pending/rejected if duplicates exist.
  // In normal operation there should only ever be one offer per player per game,
  // but this guards against inconsistent data silently swapping the displayed offer.
  const sellerByName = new Map<string, UnifiedPlayer['sellerInfo']>();
  for (const o of offers) {
    const existing = sellerByName.get(o.fromUsername);
    if (!existing || o.status === 'accepted') {
      sellerByName.set(o.fromUsername, {
        targetUsername: o.targetUsername,
        amount: o.offerAmount,
        tier:   o.tierLabel,
        status: o.status,
      });
    }
  }

  return usernames.map(name => {
    const d = dotaByName.get(name);
    return {
      username:  name,
      // Missing entries are fine — PlayerAvatar falls back to a coloured
      // initial derived from the username, which is stable per player.
      steamAvatar: avatars.get(name) ?? null,
      hero:      d?.hero    ?? null,
      kills:     d != null  ? d.kills    : null,
      deaths:    d != null  ? d.deaths   : null,
      assists:   d != null  ? d.assists  : null,
      netWorth:  d != null  ? d.netWorth : null,
      goldTotal: goldByName.has(name) ? goldByName.get(name)! : null,
      sellerInfo: sellerByName.get(name) ?? null,
    };
  });
}

function heroIconUrl(hero: string): string {
  const name = hero.replace(/^npc_dota_hero_/, '');
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${name}_sb.png`;
}

function HeroIcon({ hero }: { hero: string }) {
  // Hiding the element on error collapsed the row's leading column, so every
  // failed portrait shifted that player's name left and broke alignment with
  // the rows around it. Swapping to visibility keeps the box in the layout.
  //
  // Still a raw <img> rather than next/image: the CDN host is
  // cdn.cloudflare.steamstatic.com, and next.config.js allows
  // '*.steamstatic.com', whose single wildcard matches one subdomain label
  // only. Switching to next/image needs '**.steamstatic.com' there first.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={heroIconUrl(hero)}
      alt={hero.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ')}
      width={44}
      height={25}
      className="rounded object-cover shrink-0"
      style={{ width: 44, height: 25 }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
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

// Formats a game's played date and time for the card header.
//
// Time is included because games within a single match usually share a date —
// three cards all reading "9 Sept" convey nothing, whereas the time separates
// them and shows the pacing of the match. The date is kept because a match can
// be played across days. Full date + year remains on the title tooltip.
function formatGameDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatGameDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function TierBadge({ tier }: { tier: TierLabel | null }) {
  if (!tier) return null;
  const cls = tier === 'Low' ? 'tier-low' : tier === 'Medium' ? 'tier-medium' : 'tier-high';
  return <span className={cls}>{tier}</span>;
}

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
  // Offers are submitted by one side only, so a game-level hasAuction rendered
  // an entirely empty column on the other team's board — roughly a quarter of
  // the table width showing nothing but em-dashes. Narrow it to "does anyone on
  // THIS team have an offer". The caller's game-level flag is still respected
  // as an outer gate so the column can be suppressed globally.
  const teamHasAuction = hasAuction && players.some(p => p.sellerInfo !== null);
  const r = teamId === 'team_1';
  const f = r
    ? { header: 'from-dota-radiant/20', border: 'border-dota-radiant/35', text: 'text-dota-radiant-light', hover: 'hover:bg-dota-radiant/5' }
    : { header: 'from-dota-dire/20',    border: 'border-dota-dire/35',    text: 'text-dota-dire-light',   hover: 'hover:bg-dota-dire/5'    };

  // Memoised so the gridTemplateColumns string isn't reconstructed on every render.
  // hasDotaStats and hasAuction are stable within a single game card render.
  const cols = useMemo(() => [
    '1fr',
    hasDotaStats ? '90px' : null,
    hasDotaStats ? '68px' : null,
    '76px',
    teamHasAuction ? 'minmax(100px,0.7fr)' : null,
  ].filter(Boolean).join(' '), [hasDotaStats, teamHasAuction]);

  return (
    <div className={`border ${f.border} rounded-lg overflow-hidden`}>

      {/* Header */}
      <div className={`bg-gradient-to-r ${f.header} via-transparent to-transparent flex items-center gap-2.5 px-4 py-2.5 border-b ${f.border}`}>
        {/* Logo doubled from 20×20 to 40×40 */}
        <Image src={r ? '/Team1.png' : '/TeamA.png'} alt={label} width={40} height={40} className="object-contain" />
        <span className={`font-cinzel font-bold text-sm tracking-widest ${f.text}`}>{label}</span>
        {isWinner && (
          <span
            className={`ml-auto flex items-center gap-1.5 font-barlow text-[11px] font-bold px-2.5 py-0.5 rounded border ${f.text} bg-current/10 border-current/30`}
            style={{ color: r ? '#6ab85a' : '#e05040' }}
          >
            <Trophy className="w-3 h-3" /> WINNER
          </span>
        )}
      </div>

      {/* Column headers */}
      <div
        className="grid gap-x-4 px-4 py-1.5 bg-dota-deep border-b border-dota-border/40"
        style={{ gridTemplateColumns: cols }}
      >
        <span className="stat-label">PLAYER{hasDotaStats ? ' · HERO' : ''}</span>
        {hasDotaStats && <span className="stat-label text-center">K / D / A</span>}
        {hasDotaStats && <span className="stat-label text-right">NET WORTH</span>}
        <span className="stat-label text-right">GOLD CHANGE</span>
        {/* "OFFER SUBMITTED" clarifies this shows what the player offered outbound,
            not what was offered for them. */}
        {teamHasAuction && <span className="stat-label">OFFER SUBMITTED</span>}
      </div>

      {/* Rows */}
      {players.map((p, i) => (
        <div
          key={p.username}
          className={`grid gap-x-4 items-center px-4 py-2.5 transition-colors ${f.hover} ${i < players.length - 1 ? `border-b border-dota-border/25` : ''}`}
          style={{ gridTemplateColumns: cols }}
        >
          {/* Player + hero.
              Avatar first: it identifies the person, which is what you scan a
              team block for. The hero portrait answers a different question and
              stays next to the hero name it labels. */}
          <div className="flex items-center gap-2 min-w-0">
            <PlayerAvatar
              username={p.username}
              steamAvatar={p.steamAvatar}
              size={26}
            />
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

          {/* K / D / A — aria-label gives screen readers meaningful context
              instead of reading out bare numbers with no labels */}
          {hasDotaStats && (
            <div className="text-center">
              {p.kills !== null
                ? (
                  <span
                    className="font-barlow font-semibold text-sm tabular-nums whitespace-nowrap"
                    aria-label={`${p.kills} kills, ${p.deaths} deaths, ${p.assists} assists`}
                  >
                    <span className="text-dota-radiant-light" aria-hidden="true">{p.kills}</span>
                    <span className="text-dota-text-dim mx-0.5" aria-hidden="true">/</span>
                    <span className="text-dota-dire-light" aria-hidden="true">{p.deaths}</span>
                    <span className="text-dota-text-dim mx-0.5" aria-hidden="true">/</span>
                    <span className="text-[#7aaad4]" aria-hidden="true">{p.assists}</span>
                  </span>
                )
                : <span className="text-dota-text-dim text-xs">—</span>
              }
            </div>
          )}

          {/* Net worth */}
          {hasDotaStats && (
            <div className="text-right">
              {p.netWorth !== null
                ? (
                  <span className="inline-flex items-center justify-end gap-0.5 font-barlow font-bold text-sm text-dota-gold tabular-nums">
                    {formatNW(p.netWorth)}<GoldIcon size={12} />
                  </span>
                )
                : <span className="text-dota-text-dim text-xs block text-right">—</span>
              }
            </div>
          )}

          {/* Gold Δ */}
          <div className="text-right">
            {p.goldTotal !== null
              ? (
                <span className={`inline-flex items-center justify-end gap-0.5 font-barlow font-bold text-sm tabular-nums whitespace-nowrap ${p.goldTotal >= 0 ? 'text-dota-radiant-light' : 'text-dota-dire-light'}`}>
                  {p.goldTotal >= 0 ? '+' : ''}{p.goldTotal.toLocaleString()}<GoldIcon size={12} />
                </span>
              )
              : <span className="text-dota-text-dim text-xs block text-right">—</span>
            }
          </div>

          {/* Offer submitted by this player — shows who they tried to sell and for how much */}
          {teamHasAuction && (
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
                        {p.sellerInfo.amount.toLocaleString()}<GoldIcon size={12} />
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

function GameCard({
  game,
  isFinalGame,
  avatars,
  defaultExpanded = false,
}: {
  game: HistoryGame;
  isFinalGame: boolean;
  avatars: AvatarLookup;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const accepted     = game.offers.find(o => o.status === 'accepted');
  const hasDotaStats = game.dotaStats.length > 0;
  const hasAuction   = game.offers.length > 0;

  const hasWinner     = game.winningTeam !== null;
  const winnerIsTeam1 = game.winningTeam === 'team_1';
  const winningTeamLabel = game.winningTeam === 'team_1' ? 'Team 1' : 'Team A';

  // Prefer finishedAt (when the game actually concluded) for display; fall
  // back to createdAt for games finished before the column existed, or for
  // games still in progress where createdAt is the only timestamp available.
  // Games with neither relevant date (shouldn't happen, but defensive) simply
  // omit the date pill rather than showing something misleading.
  // Only finished games reach this component (see the filter in GameHistory),
  // so finishedAt is the correct timestamp and there is no in-progress case to
  // fall back to. Legacy rows predating the finished_at column have null here
  // and simply render without a date rather than showing a misleading one.
  const displayDate = game.finishedAt;

  const team1 = (
    <TeamScoreboard key="t1" teamId="team_1" label="Team 1"
      players={buildUnifiedPlayers(game.team1Members, game.dotaStats, game.playerStats, game.offers, avatars)}
      isWinner={hasWinner && winnerIsTeam1} hasDotaStats={hasDotaStats} hasAuction={hasAuction} />
  );
  const teamA = (
    <TeamScoreboard key="tA" teamId="team_a" label="Team A"
      players={buildUnifiedPlayers(game.teamAMembers, game.dotaStats, game.playerStats, game.offers, avatars)}
      isWinner={hasWinner && !winnerIsTeam1} hasDotaStats={hasDotaStats} hasAuction={hasAuction} />
  );

  return (
    <div className="panel">

      {/* ── Header — a single <button> owns expand/collapse.
           Previously the outer panel div had onClick, a nested button had
           onClick + stopPropagation, and the expanded body had stopPropagation
           to prevent collapse on click. Consolidating into one button removes
           all three workarounds and gives aria-expanded for free. ─────────── */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="w-full text-left flex items-start justify-between p-4 gap-4 hover:bg-dota-overlay/30 transition-colors rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold focus-visible:ring-inset"
      >
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-cinzel font-bold text-dota-text">Game #{game.gameNumber}</h3>

            {isFinalGame && (
              <span className="badge-gold text-xs py-0.5">Final Game</span>
            )}

            {/* Who won, in the header rather than the prose line below.
                The prose only rendered for the final game or for a game with an
                accepted offer, so an ordinary game with no trade showed nothing
                at all — the single most important fact about a game required
                expanding the card to find. This renders for every game that has
                a winner, which also keeps collapsed cards a consistent height. */}
            {hasWinner && (
              <span
                className={`flex items-center gap-1 font-barlow text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  winnerIsTeam1
                    ? 'text-dota-radiant-light bg-dota-radiant/10 border-dota-radiant/30'
                    : 'text-dota-dire-light bg-dota-dire/10 border-dota-dire/30'
                }`}
              >
                <Trophy className="w-3 h-3 shrink-0" aria-hidden="true" />
                {winningTeamLabel}
              </span>
            )}

            {/* Date pill — sits next to the game number/badge so it reads as
                metadata about the game itself, not buried in the prose line
                below. title gives the full date+time on hover for precision. */}
            {displayDate && (
              <span
                className="flex items-center gap-1 font-barlow text-[11px] text-dota-text-dim"
                title={formatGameDateTime(displayDate)}
              >
                <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
                {formatGameDate(displayDate)}
              </span>
            )}
          </div>

          {!expanded && (
            <>
              {/* The winner chip above already names the team, so this line
                  carries only what the chip can't: that it ended the match and
                  that no auction followed. */}
              {isFinalGame && game.winningTeam && (
                <p className="font-barlow text-sm text-dota-text-muted flex items-center gap-1.5 flex-wrap">
                  Clinched the match
                  <span className="text-dota-text-dim text-xs">· No auction followed</span>
                </p>
              )}

              {!isFinalGame && accepted && (
                <p className="font-barlow text-sm text-dota-text-muted flex items-center gap-1.5 flex-wrap">
                  <span className="text-dota-gold font-semibold">{accepted.fromUsername}</span>
                  sold
                  <span className="text-dota-info font-semibold">{accepted.targetUsername}</span>
                  for
                  {accepted.offerAmount != null
                    ? (
                      <span className="inline-flex items-center gap-0.5 font-bold text-dota-gold tabular-nums">
                        {accepted.offerAmount.toLocaleString()}<GoldIcon size={12} />
                      </span>
                    )
                    : <TierBadge tier={accepted.tierLabel} />
                  }
                </p>
              )}
            </>
          )}
        </div>

        <span className="font-barlow text-xs text-dota-text-muted hover:text-dota-text flex items-center gap-1 transition-colors shrink-0 pt-0.5">
          {expanded
            ? <><ChevronUp   className="w-3.5 h-3.5" />Hide</>
            : <><ChevronDown className="w-3.5 h-3.5" />Details</>
          }
        </span>
      </button>

      {/* ── Expanded — scoreboard.
           No stopPropagation needed since the button above is a sibling,
           not an ancestor of this content. ──────────────────────────────── */}
      {expanded && (
        <div className="border-t border-dota-border p-4 overflow-x-auto">

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

export default function GameHistory({
  history,
  players = [],
  matchFinished = false,
}: {
  history: HistoryGame[];
  // Optional so the component still renders standalone; without it every row
  // simply uses PlayerAvatar's coloured-initial fallback rather than breaking.
  players?: Player[];
  matchFinished?: boolean;
}) {
  // history arrives ordered ASC by game id from the API — the last element
  // is always the highest game number, so no need to spread into Math.max.
  // Computed from the unfiltered list so the "Final Game" badge still lands on
  // the right card regardless of what the filter below removes.
  const maxGameNumber = history.length > 0 ? history[history.length - 1].gameNumber : 0;

  // Built once for the whole section rather than per row. Every game card
  // rebuilds its player list on render, and a linear find() per player per game
  // would be O(games x players x roster) for data that never changes.
  const avatars = useMemo<AvatarLookup>(
    () => new Map(players.map(p => [p.username, p.steam_avatar ?? null])),
    [players],
  );

  // The in-progress game is excluded. Everything it would show — the live
  // scoreboard, the current auction, each side's gold — is already rendered at
  // the top of the match page, so its card is an empty shell: no winner, no
  // gold changes, no resolved offers. It appears here once it finishes.
  //
  // 'auction pending' is filtered too: the result is known but the gold hasn't
  // moved yet, so the card would show a winner beside a column of zeroes while
  // the live Auction House above shows the real state.
  //
  // Reversed for newest-first. Memoised to avoid allocating on every render.
  const visibleHistory = useMemo(
    () => history.filter(g => g.status === 'finished').reverse(),
    [history],
  );

  // Not `history.length === 0` — a match whose only game is still in progress
  // filters down to nothing, and the heading with an empty list below it reads
  // as a bug rather than as "nothing has finished yet".
  if (visibleHistory.length === 0) return null;

  // Series score. The heading alone answers "what games happened"; this answers
  // "who is winning", which is usually the actual question. Counts finished
  // games only, so it agrees with the cards listed beneath it.
  const team1Wins = visibleHistory.filter(g => g.winningTeam === 'team_1').length;
  const teamAWins = visibleHistory.filter(g => g.winningTeam === 'team_a').length;
  const leader    = team1Wins === teamAWins ? null : team1Wins > teamAWins ? 'Team 1' : 'Team A';
  const scoreline = `${Math.max(team1Wins, teamAWins)}–${Math.min(team1Wins, teamAWins)}`;

  return (
    <section className="mt-12 space-y-4">
      <div className="text-center space-y-2">
        <h2 className="font-cinzel text-3xl font-bold text-dota-gold">Game History</h2>
        <div className="divider-gold w-48 mx-auto" />
        <p className="font-barlow text-sm text-dota-text-muted">
          {leader === null
            ? <>Series level at <span className="font-bold text-dota-text tabular-nums">{team1Wins}–{teamAWins}</span></>
            : (
              <>
                <span className={`font-bold ${leader === 'Team 1' ? 'text-dota-radiant-light' : 'text-dota-dire-light'}`}>
                  {leader}
                </span>
                {' '}{matchFinished ? 'won' : 'leads'}{' '}
                <span className="font-bold text-dota-text tabular-nums">{scoreline}</span>
              </>
            )
          }
        </p>
      </div>
      <div className="space-y-3">
        {visibleHistory.map((game, i) => (
          <GameCard
            key={game.gameNumber}
            game={game}
            isFinalGame={matchFinished && game.gameNumber === maxGameNumber}
            avatars={avatars}
            // Newest game open on arrival — the one people came to read.
            defaultExpanded={i === 0}
          />
        ))}
      </div>
    </section>
  );
}
