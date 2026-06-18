'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Zap, Swords, ShoppingCart, ChevronDown as SelectChevron,
  Coins, TrendingUp, Shield,
} from 'lucide-react'
import GoldIcon from '@/app/components/GoldIcon';
import type {
  PlayerStats,
  TeamCombo,
  AcquisitionImpact,
  WinStreak,
  HeadToHead,
  WinTypeStats,
  HeroStat,
  PlayerDotaStat,
} from '@/types';

// =============================================================================
// Constants
// =============================================================================

const MIN_GAMES_FOR_RATE = 3;
const MIN_PICKS_FOR_RATE = 3;

// =============================================================================
// Helpers
// =============================================================================

function pct(success: number, total: number): number {
  return total > 0 ? +(success / total * 100).toFixed(1) : 0;
}

function pctColour(value: number): string {
  if (value >= 60) return 'text-dota-radiant-light bg-dota-radiant/10 border-dota-radiant/30';
  if (value >= 40) return 'text-dota-gold       bg-dota-gold/10       border-dota-gold/30';
  return                  'text-dota-dire-light  bg-dota-dire/10       border-dota-dire/30';
}

function kdaColour(kda: number): string {
  if (kda >= 4) return 'text-dota-gold';
  if (kda >= 2) return 'text-dota-radiant-light';
  return 'text-dota-text-muted';
}

function formatNW(val: number): string {
  if (val >= 1000) {
    const k = val / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `${val}`;
}

function heroIconUrl(hero: string): string {
  const name = hero.replace(/^npc_dota_hero_/, '');
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${name}_sb.png`;
}

function heroDisplayName(hero: string): string {
  return hero
    .replace(/^npc_dota_hero_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// =============================================================================
// Shared sub-components
// =============================================================================

// ── Tooltip ───────────────────────────────────────────────────────────────────
// Downward-facing — avoids clipping inside overflow-x-auto scroll containers.
// overflow-x-auto promotes overflow: visible to auto on the perpendicular axis,
// which clips upward-facing tooltips. Pointing down keeps them in-bounds.
function Tooltip({ id, content, children, align = 'center' }: {
  id: string;
  content: string;
  children: ReactNode;
  align?: 'center' | 'right';
}) {
  const bubblePos = align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  const arrowPos  = align === 'right' ? 'right-4'  : 'left-1/2 -translate-x-1/2';

  return (
    <div className="relative group inline-flex justify-center">
      {children}
      <div
        id={id}
        role="tooltip"
        className={`
          pointer-events-none
          absolute top-full mt-2 z-20 ${bubblePos}
          w-56 px-3 py-2 rounded
          bg-dota-raised border border-dota-border-bright
          font-barlow text-xs text-dota-text-muted leading-snug
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-opacity duration-150
          text-left whitespace-normal
        `}
      >
        <span
          aria-hidden="true"
          className={`absolute bottom-full ${arrowPos} border-4 border-transparent border-b-dota-border-bright`}
        />
        {content}
      </div>
    </div>
  );
}

// ── PctBadge ──────────────────────────────────────────────────────────────────
function PctBadge({ success, total, minGames = 0 }: {
  success: number; total: number; minGames?: number;
}) {
  if (total === 0) return <span className="text-dota-text-dim text-xs">—</span>;
  if (total < minGames) {
    return (
      <span className="text-dota-text-dim text-xs" title={`Need ${minGames} (has ${total})`}>—</span>
    );
  }
  const rate = pct(success, total);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(rate)}`}>
      {rate}%
      <span className="text-[10px] opacity-50 font-normal">{success}/{total}</span>
    </span>
  );
}

// ── SortIcon ──────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 opacity-30" aria-hidden="true" />;
  return dir === 'desc'
    ? <ChevronDown className="w-3 h-3 text-dota-gold" aria-hidden="true" />
    : <ChevronUp   className="w-3 h-3 text-dota-gold" aria-hidden="true" />;
}

// ── RankedList ────────────────────────────────────────────────────────────────
const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

function RankedList({ items, emptyMessage }: {
  items: { name: string; primary: string; sub?: string }[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="font-barlow text-xs text-dota-text-dim py-4 text-center">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={`${item.name}-${i}`} className="panel-sunken px-3 py-2.5 flex items-center gap-3">
          <span className="shrink-0 w-5 text-center text-sm" aria-hidden="true">
            {RANK_EMOJIS[i] ?? `${i + 1}.`}
          </span>
          <span className="font-barlow font-semibold text-sm text-dota-text truncate flex-1 min-w-0">
            {item.name}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-barlow font-bold text-sm text-dota-gold tabular-nums">
              {item.primary}
            </span>
            {item.sub && (
              <span className="font-barlow text-[10px] text-dota-text-dim tabular-nums">
                {item.sub}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── CardHeader ────────────────────────────────────────────────────────────────
function CardHeader({ icon: Icon, iconClass, title, subtitle }: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
      <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} aria-hidden="true" />
      <div>
        <h3 className="font-cinzel text-lg font-bold text-dota-gold">{title}</h3>
        <p className="font-barlow text-xs text-dota-text-muted mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ── SortableThButton ──────────────────────────────────────────────────────────
// Generic sortable <th> used in both Dota tables to avoid repetition.
function SortableThButton<K extends string>({
  colKey, label, sublabel, tooltip, tooltipId, sortKey, sortDir, onSort, align = 'center',
}: {
  colKey: K;
  label: string;
  sublabel?: string;
  tooltip: string;
  tooltipId: string;
  sortKey: K;
  sortDir: 'asc' | 'desc';
  onSort: (key: K) => void;
  align?: 'center' | 'right';
}) {
  const isActive = sortKey === colKey;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-3 ${align === 'right' ? 'text-right' : 'text-center'}`}
    >
      <Tooltip id={tooltipId} content={tooltip} align={align === 'right' ? 'right' : 'center'}>
        <button
          type="button"
          onClick={() => onSort(colKey)}
          aria-describedby={tooltipId}
          className={`
            flex flex-col ${align === 'right' ? 'items-end' : 'items-center'} gap-0.5 mx-auto
            font-barlow font-semibold text-xs whitespace-nowrap transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold
            focus-visible:ring-offset-1 focus-visible:ring-offset-dota-deep rounded
            ${isActive ? 'text-dota-gold' : 'text-dota-text-muted hover:text-dota-text'}
          `}
        >
          <span className="flex items-center gap-1">
            {label}
            <SortIcon active={isActive} dir={sortDir} />
          </span>
          {sublabel && (
            <span className="text-[10px] opacity-40 tracking-normal normal-case font-normal">
              {sublabel}
            </span>
          )}
        </button>
      </Tooltip>
    </th>
  );
}

// =============================================================================
// ── Tab toggle ─────────────────────────────────────────────────────────────────
// =============================================================================

type StatsView = 'match' | 'dota';

function StatsTabToggle({ active, onChange }: {
  active: StatsView;
  onChange: (v: StatsView) => void;
}) {
  return (
    <div className="flex justify-center gap-2" role="tablist" aria-label="Stats view">
      {(['match', 'dota'] as const).map(view => (
        <button
          key={view}
          role="tab"
          aria-selected={active === view}
          onClick={() => onChange(view)}
          className={`
            font-barlow font-semibold text-sm tracking-widest uppercase px-5 py-2 rounded transition-all
            ${active === view
              ? 'bg-dota-gold text-dota-base shadow-gold'
              : 'bg-dota-surface border border-dota-border text-dota-text-muted hover:text-dota-text hover:border-dota-border-bright'
            }
          `}
        >
          {view === 'match' ? 'Match Stats' : 'Dota Stats'}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// ── Dota Stats Tab ─────────────────────────────────────────────────────────────
// =============================================================================

type HeroSortKey =
  | 'hero'
  | 'picks'
  | 'winRate'
  | 'avgKills'
  | 'avgDeaths'
  | 'avgAssists'
  | 'avgKda'
  | 'avgNetWorth';

type PlayerDotaSortKey =
  | 'username'
  | 'games'
  | 'avgKills'
  | 'avgDeaths'
  | 'avgAssists'
  | 'avgKda'
  | 'avgNetWorth';

function DotaStatsTab({
  heroStats,
  playerDotaStats,
}: {
  heroStats: HeroStat[];
  playerDotaStats: PlayerDotaStat[];
}) {
  const [heroSortKey, setHeroSortKey]     = useState<HeroSortKey>('picks');
  const [heroSortDir, setHeroSortDir]     = useState<'asc' | 'desc'>('desc');
  const [playerSortKey, setPlayerSortKey] = useState<PlayerDotaSortKey>('avgKda');
  const [playerSortDir, setPlayerSortDir] = useState<'asc' | 'desc'>('desc');

  function handleHeroSort(key: HeroSortKey) {
    if (heroSortKey === key) {
      setHeroSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setHeroSortKey(key);
      setHeroSortDir(key === 'hero' ? 'asc' : 'desc');
    }
  }

  function handlePlayerSort(key: PlayerDotaSortKey) {
    if (playerSortKey === key) {
      setPlayerSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setPlayerSortKey(key);
      setPlayerSortDir(key === 'username' ? 'asc' : 'desc');
    }
  }

  // ── Sorted hero rows ───────────────────────────────────────────────────────
  const sortedHeroes = useMemo(() => {
    return [...heroStats].sort((a, b) => {
      // Hero name — alphabetical
      if (heroSortKey === 'hero') {
        const cmp = heroDisplayName(a.hero).localeCompare(heroDisplayName(b.hero));
        return heroSortDir === 'asc' ? cmp : -cmp;
      }

      // Win rate — nulls (< MIN_PICKS_FOR_RATE) always sort to the bottom
      if (heroSortKey === 'winRate') {
        if (a.winRate === null && b.winRate === null) return 0;
        if (a.winRate === null) return 1;
        if (b.winRate === null) return -1;
        return heroSortDir === 'asc'
          ? a.winRate - b.winRate
          : b.winRate - a.winRate;
      }

      // All other numeric columns
      const aVal = a[heroSortKey] as number;
      const bVal = b[heroSortKey] as number;
      return heroSortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [heroStats, heroSortKey, heroSortDir]);

  // ── Sorted player rows ─────────────────────────────────────────────────────
  const sortedPlayers = useMemo(() => {
    return [...playerDotaStats].sort((a, b) => {
      if (playerSortKey === 'username') {
        const cmp = a.username.localeCompare(b.username);
        return playerSortDir === 'asc' ? cmp : -cmp;
      }
      const aVal = a[playerSortKey] as number;
      const bVal = b[playerSortKey] as number;
      return playerSortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [playerDotaStats, playerSortKey, playerSortDir]);

  if (heroStats.length === 0 && playerDotaStats.length === 0) {
    return (
      <div className="panel p-12 text-center font-barlow text-dota-text-dim">
        No Dota performance data yet — stats appear once games are reported by the plugin.
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Hero Leaderboard ─────────────────────────────────────────────────── */}
      {heroStats.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-dota-border flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
              <div>
                <h3 className="font-cinzel text-lg font-bold text-dota-gold">Hero Leaderboard</h3>
                <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
                  All heroes picked in finished games · Win rate shown from {MIN_PICKS_FOR_RATE}+ picks
                </p>
              </div>
            </div>
            <span className="font-barlow text-xs text-dota-text-dim self-end pb-0.5">
              {heroStats.length} {heroStats.length === 1 ? 'hero' : 'heroes'} picked
            </span>
          </div>

          <div className="relative">
            {/* Fade hint for horizontal scroll on mobile */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-dota-surface to-transparent z-10 lg:hidden"
            />
            <div className="overflow-x-auto">
              <table className="min-w-full font-barlow text-sm text-dota-text">
                <thead>
                  <tr className="bg-dota-deep border-b border-dota-border">

                    {/* Hero name — left-aligned, manually built to match player table pattern */}
                    <th
                      scope="col"
                      aria-sort={heroSortKey === 'hero' ? (heroSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className="px-3 py-3 text-left"
                    >
                      <button
                        type="button"
                        onClick={() => handleHeroSort('hero')}
                        className={`
                          flex items-center gap-1 font-barlow font-semibold text-xs whitespace-nowrap
                          transition-colors focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-dota-gold focus-visible:ring-offset-1
                          focus-visible:ring-offset-dota-deep rounded
                          ${heroSortKey === 'hero' ? 'text-dota-gold' : 'text-dota-text-muted hover:text-dota-text'}
                        `}
                      >
                        Hero
                        <SortIcon active={heroSortKey === 'hero'} dir={heroSortDir} />
                      </button>
                    </th>

                    <SortableThButton
                      colKey="picks" label="Picks" sortKey={heroSortKey} sortDir={heroSortDir}
                      onSort={handleHeroSort}
                      tooltip="Number of times this hero has been picked across all finished games."
                      tooltipId="hero-col-picks"
                    />
                    <SortableThButton
                      colKey="winRate" label="Win Rate" sublabel={`min. ${MIN_PICKS_FOR_RATE} picks`}
                      sortKey={heroSortKey} sortDir={heroSortDir} onSort={handleHeroSort}
                      tooltip={`Win rate of this hero's team. Only shown when the hero has been picked ${MIN_PICKS_FOR_RATE}+ times to avoid small-sample noise.`}
                      tooltipId="hero-col-winrate"
                    />
                    <SortableThButton
                      colKey="avgKda" label="Avg KDA" sortKey={heroSortKey} sortDir={heroSortDir}
                      onSort={handleHeroSort}
                      tooltip="Average KDA ratio across all games on this hero — (kills + assists) / max(deaths, 1)."
                      tooltipId="hero-col-kda"
                    />
                    <SortableThButton
                      colKey="avgKills" label="Avg K" sortKey={heroSortKey} sortDir={heroSortDir}
                      onSort={handleHeroSort}
                      tooltip="Average kills per game on this hero."
                      tooltipId="hero-col-kills"
                    />
                    <SortableThButton
                      colKey="avgDeaths" label="Avg D" sortKey={heroSortKey} sortDir={heroSortDir}
                      onSort={handleHeroSort}
                      tooltip="Average deaths per game on this hero."
                      tooltipId="hero-col-deaths"
                    />
                    <SortableThButton
                      colKey="avgAssists" label="Avg A" sortKey={heroSortKey} sortDir={heroSortDir}
                      onSort={handleHeroSort}
                      tooltip="Average assists per game on this hero."
                      tooltipId="hero-col-assists"
                    />
                    <SortableThButton
                      colKey="avgNetWorth" label="Avg Net Worth" sortKey={heroSortKey} sortDir={heroSortDir}
                      onSort={handleHeroSort}
                      tooltip="Average in-game net worth (gold) across all games on this hero."
                      tooltipId="hero-col-nw"
                      align="right"
                    />
                  </tr>
                </thead>

                <tbody>
                  {sortedHeroes.map(hero => (
                    <tr
                      key={hero.hero}
                      className="border-b border-dota-border/50 hover:bg-dota-overlay/40 transition-colors"
                    >
                      {/* Hero icon + name */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={heroIconUrl(hero.hero)}
                            alt=""
                            aria-hidden="true"
                            width={44}
                            height={25}
                            className="rounded object-cover shrink-0"
                            style={{ width: 44, height: 25 }}
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                          <span className="font-barlow font-semibold text-sm text-dota-text truncate">
                            {heroDisplayName(hero.hero)}
                          </span>
                        </div>
                      </td>

                      {/* Picks */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-barlow font-semibold tabular-nums text-dota-text">
                          {hero.picks}
                        </span>
                      </td>

                      {/* Win rate — hidden under threshold */}
                      <td className="px-3 py-2.5 text-center">
                        {hero.winRate !== null ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(hero.winRate)}`}>
                            {hero.winRate}%
                            <span className="text-[10px] opacity-50 font-normal">{hero.wins}/{hero.picks}</span>
                          </span>
                        ) : (
                          <span
                            className="text-dota-text-dim text-xs"
                            title={`Need ${MIN_PICKS_FOR_RATE} picks (has ${hero.picks})`}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Avg KDA — coloured by ratio */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-barlow font-bold tabular-nums text-sm ${kdaColour(hero.avgKda)}`}>
                          {hero.avgKda.toFixed(2)}
                        </span>
                      </td>

                      {/* K / D / A individual averages — colour-coded to match GameHistory */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-barlow tabular-nums text-sm text-dota-radiant-light">
                          {hero.avgKills.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-barlow tabular-nums text-sm text-dota-dire-light">
                          {hero.avgDeaths.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-barlow tabular-nums text-sm text-[#7aaad4]">
                          {hero.avgAssists.toFixed(1)}
                        </span>
                      </td>

                      {/* Avg net worth */}
                      <td className="px-3 py-2.5 text-right">
                        <span className="inline-flex items-center justify-end gap-0.5 font-barlow font-bold tabular-nums text-sm text-dota-gold">
                          {formatNW(hero.avgNetWorth)}
                          <GoldIcon size={12} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-5 py-2.5 border-t border-dota-border">
            <p className="font-barlow text-[11px] text-dota-text-dim">
              KDA colour:{' '}
              <span className="text-dota-gold font-semibold">gold ≥ 4</span>
              {' · '}
              <span className="text-dota-radiant-light font-semibold">green ≥ 2</span>
              {' · '}
              <span className="text-dota-text-muted font-semibold">grey below 2</span>.
              {' '}Win rate hidden until {MIN_PICKS_FOR_RATE}+ picks.
              {' '}Win rate reflects the team that picked this hero, not the player's personal outcome.
            </p>
          </div>
        </div>
      )}

      {/* ── Player Performance ───────────────────────────────────────────────── */}
      {playerDotaStats.length > 0 && (
        <div className="panel overflow-hidden">
          <CardHeader
            icon={TrendingUp}
            iconClass="text-dota-radiant-light"
            title="Player Performance"
            subtitle="Average in-game Dota stats across all reported games"
          />

          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-dota-surface to-transparent z-10 lg:hidden"
            />
            <div className="overflow-x-auto">
              <table className="min-w-full font-barlow text-sm text-dota-text">
                <thead>
                  <tr className="bg-dota-deep border-b border-dota-border">

                    {/* Player name */}
                    <th
                      scope="col"
                      aria-sort={playerSortKey === 'username' ? (playerSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className="px-3 py-3 text-left"
                    >
                      <button
                        type="button"
                        onClick={() => handlePlayerSort('username')}
                        className={`
                          flex items-center gap-1 font-barlow font-semibold text-xs whitespace-nowrap
                          transition-colors focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-dota-gold focus-visible:ring-offset-1
                          focus-visible:ring-offset-dota-deep rounded
                          ${playerSortKey === 'username' ? 'text-dota-gold' : 'text-dota-text-muted hover:text-dota-text'}
                        `}
                      >
                        Player
                        <SortIcon active={playerSortKey === 'username'} dir={playerSortDir} />
                      </button>
                    </th>

                    <SortableThButton
                      colKey="games" label="Games" sortKey={playerSortKey} sortDir={playerSortDir}
                      onSort={handlePlayerSort}
                      tooltip="Number of games with Dota stats reported for this player. May be fewer than total games played if the plugin wasn't running."
                      tooltipId="pdota-col-games"
                    />
                    <SortableThButton
                      colKey="avgKda" label="Avg KDA" sortKey={playerSortKey} sortDir={playerSortDir}
                      onSort={handlePlayerSort}
                      tooltip="Average KDA ratio — (kills + assists) / max(deaths, 1). Default sort column."
                      tooltipId="pdota-col-kda"
                    />
                    <SortableThButton
                      colKey="avgKills" label="Avg K" sortKey={playerSortKey} sortDir={playerSortDir}
                      onSort={handlePlayerSort}
                      tooltip="Average kills per game."
                      tooltipId="pdota-col-kills"
                    />
                    <SortableThButton
                      colKey="avgDeaths" label="Avg D" sortKey={playerSortKey} sortDir={playerSortDir}
                      onSort={handlePlayerSort}
                      tooltip="Average deaths per game."
                      tooltipId="pdota-col-deaths"
                    />
                    <SortableThButton
                      colKey="avgAssists" label="Avg A" sortKey={playerSortKey} sortDir={playerSortDir}
                      onSort={handlePlayerSort}
                      tooltip="Average assists per game."
                      tooltipId="pdota-col-assists"
                    />
                    <SortableThButton
                      colKey="avgNetWorth" label="Avg Net Worth" sortKey={playerSortKey} sortDir={playerSortDir}
                      onSort={handlePlayerSort}
                      tooltip="Average in-game net worth (gold) per game. Proxy for farm quality."
                      tooltipId="pdota-col-nw"
                      align="right"
                    />
                  </tr>
                </thead>

                <tbody>
                  {sortedPlayers.map((p, i) => {
                    // Medals only when sorted by KDA descending — the most meaningful ranking
                    const showMedal = playerSortKey === 'avgKda' && playerSortDir === 'desc';
                    return (
                      <tr
                        key={p.username}
                        className={`border-b border-dota-border/50 transition-colors ${showMedal && i === 0 ? 'bg-dota-gold/5 hover:bg-dota-gold/8' : 'hover:bg-dota-overlay/40'}`}
                      >
                        {/* Player name + game count */}
                        <td className="px-3 py-3">
                          <span className={`font-semibold ${showMedal && i === 0 ? 'text-dota-gold' : 'text-dota-text'}`}>
                            {showMedal && i < 3 && (
                              <span className="mr-1.5" aria-hidden="true">{RANK_EMOJIS[i]}</span>
                            )}
                            {p.username}
                          </span>
                          <span className="ml-2 text-[10px] text-dota-text-dim">{p.games}g</span>
                        </td>

                        {/* Games with data */}
                        <td className="px-3 py-3 text-center">
                          <span className="font-barlow font-semibold tabular-nums text-dota-text-muted">
                            {p.games}
                          </span>
                        </td>

                        {/* Avg KDA */}
                        <td className="px-3 py-3 text-center">
                          <span className={`font-barlow font-bold tabular-nums text-sm ${kdaColour(p.avgKda)}`}>
                            {p.avgKda.toFixed(2)}
                          </span>
                        </td>

                        {/* K / D / A */}
                        <td className="px-3 py-3 text-center">
                          <span className="font-barlow tabular-nums text-sm text-dota-radiant-light">
                            {p.avgKills.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-barlow tabular-nums text-sm text-dota-dire-light">
                            {p.avgDeaths.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-barlow tabular-nums text-sm text-[#7aaad4]">
                            {p.avgAssists.toFixed(1)}
                          </span>
                        </td>

                        {/* Avg net worth */}
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex items-center justify-end gap-0.5 font-barlow font-bold tabular-nums text-sm text-dota-gold">
                            {formatNW(p.avgNetWorth)}
                            <GoldIcon size={12} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-5 py-2.5 border-t border-dota-border">
            <p className="font-barlow text-[11px] text-dota-text-dim">
              Only games where the plugin reported stats are included — game count may differ from match history.
              KDA = (kills + assists) / max(deaths, 1).
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

// =============================================================================
// ── Match Stats Tab ─────────────────────────────────────────────────────────────
// =============================================================================

type MatchSortKey =
  | 'username'
  | 'gamesWinRate'
  | 'offerAcceptRate'
  | 'averageOfferValue'
  | 'timesOffered'
  | 'timesSold';

const MATCH_COLUMNS: {
  label: string;
  sublabel?: string;
  key: MatchSortKey;
  tooltip: string;
  tooltipAlign?: 'center' | 'right';
}[] = [
  {
    label: 'Win Rate',
    sublabel: `min. ${MIN_GAMES_FOR_RATE} games`,
    key: 'gamesWinRate',
    tooltip: 'Percentage of games won.',
  },
  {
    label: 'Offers Accepted',
    sublabel: 'as seller',
    key: 'offerAcceptRate',
    tooltip: 'How often offers you submitted were accepted by the losing team.',
  },
  {
    label: 'Avg Bid',
    sublabel: 'when targeted',
    key: 'averageOfferValue',
    tooltip: 'Average gold your own teammates offered when putting you up for sale.',
  },
  {
    label: 'Targeted',
    sublabel: 'times offered',
    key: 'timesOffered',
    tooltip: 'How many times a teammate has put you up for sale in an auction.',
  },
  {
    label: 'Sold',
    sublabel: 'times transferred',
    key: 'timesSold',
    tooltip: 'How many times you have been sold to the other team.',
    tooltipAlign: 'right',
  },
];

type EnrichedPlayer = PlayerStats & {
  gamesWinRate: number;
  offerAcceptRate: number;
};

function MatchStatsTab({
  players,
  combos,
  acquisitionImpact,
  winStreaks,
  headToHead,
  winTypeStats,
}: {
  players: PlayerStats[];
  combos: TeamCombo[];
  acquisitionImpact: AcquisitionImpact[];
  winStreaks: WinStreak[];
  headToHead: HeadToHead[];
  winTypeStats: WinTypeStats[];
}) {
  const [sortKey, setSortKey]             = useState<MatchSortKey>('gamesWinRate');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc');
  const [showAllCombos, setShowAllCombos] = useState(false);
  const [h2hSelected, setH2hSelected]     = useState<string>('');

  const handleSort = (key: MatchSortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'username' ? 'asc' : 'desc');
    }
  };

  const enrichedPlayers = useMemo<EnrichedPlayer[]>(() =>
    players.map(p => ({
      ...p,
      gamesWinRate:    p.gamesPlayed >= MIN_GAMES_FOR_RATE ? pct(p.gamesWon, p.gamesPlayed) : -1,
      offerAcceptRate: pct(p.offersAccepted, p.offersMade),
    })),
    [players]
  );

  const sortedPlayers = useMemo<EnrichedPlayer[]>(() =>
    [...enrichedPlayers].sort((a, b) => {
      const aVal = a[sortKey as keyof EnrichedPlayer];
      const bVal = b[sortKey as keyof EnrichedPlayer];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }),
    [enrichedPlayers, sortKey, sortDir]
  );

  const showMedals    = sortKey === 'gamesWinRate' && sortDir === 'desc';
  const visibleCombos = showAllCombos ? combos : combos.slice(0, 5);

  const h2hPlayers = useMemo<string[]>(() => {
    const names = new Set<string>();
    headToHead.forEach(r => { names.add(r.playerA); names.add(r.playerB); });
    return [...names].sort();
  }, [headToHead]);

  type H2HRow = {
    opponent: string;
    wins: number;
    losses: number;
    totalGames: number;
    winRate: number;
  };

  const h2hRows = useMemo<H2HRow[]>(() => {
    if (!h2hSelected) return [];
    return headToHead
      .filter(r => r.playerA === h2hSelected || r.playerB === h2hSelected)
      .map(r => {
        const isA      = r.playerA === h2hSelected;
        const wins     = isA ? r.playerAWins : r.playerBWins;
        const losses   = isA ? r.playerBWins : r.playerAWins;
        const opponent = isA ? r.playerB : r.playerA;
        return { opponent, wins, losses, totalGames: r.totalGames, winRate: pct(wins, r.totalGames) };
      })
      .sort((a, b) => b.totalGames - a.totalGames || b.winRate - a.winRate);
  }, [headToHead, h2hSelected]);

  const winTypeTotals = useMemo(() =>
    winTypeStats.reduce(
      (acc, row) => ({
        lastStanding:  acc.lastStanding  + row.lastStandingWins,
        goldThreshold: acc.goldThreshold + row.goldThresholdWins,
      }),
      { lastStanding: 0, goldThreshold: 0 }
    ),
    [winTypeStats]
  );

  return (
    <div className="space-y-8">

      {/* ── Player Leaderboard ────────────────────────────────────────────── */}
      <div className="panel overflow-hidden">
        <div className="px-5 py-4 border-b border-dota-border">
          <h3 className="font-cinzel text-lg font-bold text-dota-gold">Player Leaderboard</h3>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Click any column to sort · Medals shown for win rate ranking only
          </p>
        </div>

        <div className="relative">
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-dota-surface to-transparent z-10 lg:hidden" />
          <div className="overflow-x-auto">
            <table className="min-w-full font-barlow text-sm text-dota-text">
              <thead>
                <tr className="bg-dota-deep border-b border-dota-border">
                  <th scope="col" className="px-3 py-3 w-10 text-dota-text-dim font-medium text-xs text-center" aria-label="Rank">#</th>
                  <th
                    scope="col"
                    aria-sort={sortKey === 'username' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="px-3 py-3 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('username')}
                      className={`flex items-center gap-1 font-barlow font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold focus-visible:ring-offset-1 focus-visible:ring-offset-dota-deep rounded ${sortKey === 'username' ? 'text-dota-gold' : 'text-dota-text-muted hover:text-dota-text'}`}
                    >
                      Player
                      <SortIcon active={sortKey === 'username'} dir={sortDir} />
                    </button>
                  </th>
                  {MATCH_COLUMNS.map(col => {
                    const tooltipId = `col-tooltip-${col.key}`;
                    const isActive  = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className="px-3 py-3 text-center"
                      >
                        <Tooltip id={tooltipId} content={col.tooltip} align={col.tooltipAlign}>
                          <button
                            type="button"
                            onClick={() => handleSort(col.key)}
                            aria-describedby={tooltipId}
                            className={`flex flex-col items-center gap-0.5 mx-auto font-barlow font-semibold text-xs whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold focus-visible:ring-offset-1 focus-visible:ring-offset-dota-deep rounded ${isActive ? 'text-dota-gold' : 'text-dota-text-muted hover:text-dota-text'}`}
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              <SortIcon active={isActive} dir={sortDir} />
                            </span>
                            {col.sublabel && (
                              <span className="text-[10px] opacity-40 tracking-normal normal-case font-normal">
                                {col.sublabel}
                              </span>
                            )}
                          </button>
                        </Tooltip>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, i) => (
                  <tr
                    key={p.username}
                    className={`border-b border-dota-border/50 transition-colors ${showMedals && i === 0 ? 'bg-dota-gold/5 hover:bg-dota-gold/8' : 'hover:bg-dota-overlay/40'}`}
                  >
                    <td className="px-3 py-3 text-center text-xs font-bold">
                      {showMedals
                        ? <span className={i === 0 ? 'text-dota-gold' : i === 1 ? 'text-dota-text-muted' : i === 2 ? 'text-amber-600' : 'text-dota-text-dim'}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </span>
                        : <span className="text-dota-text-dim">{i + 1}</span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${showMedals && i === 0 ? 'text-dota-gold' : 'text-dota-text'}`}>
                        {p.username}
                      </span>
                      {p.gamesPlayed > 0 && (
                        <span className="ml-2 text-[10px] text-dota-text-dim">{p.gamesPlayed}g</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <PctBadge success={p.gamesWon} total={p.gamesPlayed} minGames={MIN_GAMES_FOR_RATE} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <PctBadge success={p.offersAccepted} total={p.offersMade} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      {p.timesOffered > 0
                        ? <span className="inline-flex items-center justify-center gap-1 text-dota-gold font-semibold tabular-nums">
                            {p.averageOfferValue.toFixed(0)}<GoldIcon size={13} />
                          </span>
                        : <span className="text-dota-text-dim text-xs">—</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-center">
                      {p.timesOffered > 0
                        ? <span className="font-barlow font-semibold text-dota-text-muted">{p.timesOffered}</span>
                        : <span className="text-dota-text-dim text-xs">—</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-center">
                      {p.timesSold > 0
                        ? <span className="text-dota-info font-semibold">{p.timesSold}</span>
                        : <span className="text-dota-text-dim text-xs">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-5 py-2.5 border-t border-dota-border">
          <p className="font-barlow text-[11px] text-dota-text-dim">
            Avg Bid is the gold teammates offered when selling you. Win Rate requires {MIN_GAMES_FOR_RATE}+ games.
          </p>
        </div>
      </div>

      {/* ── Row 2: Acquisition Impact + Win Streaks ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="panel overflow-hidden">
          <CardHeader
            icon={ShoppingCart}
            iconClass="text-dota-gold"
            title="Acquisition Impact"
            subtitle="Win rate of your new team the game after you're sold · min. 2 sales"
          />
          <div className="p-4">
            <RankedList
              emptyMessage="Need at least 2 sold players to show acquisition impact."
              items={acquisitionImpact.map(p => ({
                name:    p.username,
                primary: `${p.winRate}%`,
                sub:     `${p.winsAfterAcquisition}/${p.totalAcquisitions} games`,
              }))}
            />
            {acquisitionImpact.length > 0 && (
              <p className="font-barlow text-[10px] text-dota-text-dim mt-3 leading-snug">
                Percentage of games won by the team that acquired this player, in the game immediately following the sale.
              </p>
            )}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <CardHeader
            icon={Zap}
            iconClass="text-dota-radiant-light"
            title="Win Streaks"
            subtitle="Longest consecutive winning run within a single match · min. 2"
          />
          <div className="p-4">
            <RankedList
              emptyMessage="No win streaks of 2+ games recorded yet."
              items={winStreaks.map(s => ({
                name:    s.username,
                primary: `${s.longestStreak} in a row`,
                sub:     `match #${s.matchId}`,
              }))}
            />
            {winStreaks.length > 0 && (
              <p className="font-barlow text-[10px] text-dota-text-dim mt-3 leading-snug">
                Longest run of consecutive wins within a single match. Each player's personal best shown.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Win Methods ───────────────────────────────────────────── */}
      {winTypeStats.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-dota-border flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Coins className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
              <div>
                <h3 className="font-cinzel text-lg font-bold text-dota-gold">Win Methods</h3>
                <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
                  How each player's match wins were achieved
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 font-barlow text-xs font-semibold px-2.5 py-1 rounded border bg-dota-radiant/10 border-dota-radiant/30 text-dota-radiant-light">
                <Swords className="w-3 h-3" aria-hidden="true" />
                {winTypeTotals.lastStanding} last standing
              </div>
              <div className="flex items-center gap-1.5 font-barlow text-xs font-semibold px-2.5 py-1 rounded border bg-dota-gold/10 border-dota-gold/30 text-dota-gold">
                <Coins className="w-3 h-3" aria-hidden="true" />
                {winTypeTotals.goldThreshold} gold threshold
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full font-barlow text-sm" aria-label="Win method breakdown by player">
              <thead>
                <tr className="bg-dota-deep border-b border-dota-border">
                  <th scope="col" className="px-5 py-3 text-left font-semibold text-xs text-dota-text-muted uppercase tracking-widest">Player</th>
                  <th scope="col" className="px-5 py-3 text-center font-semibold text-xs text-dota-radiant-light uppercase tracking-widest">
                    <span className="inline-flex items-center gap-1.5"><Swords className="w-3 h-3" aria-hidden="true" />Last Standing</span>
                  </th>
                  <th scope="col" className="px-5 py-3 text-center font-semibold text-xs text-dota-gold uppercase tracking-widest">
                    <span className="inline-flex items-center gap-1.5"><Coins className="w-3 h-3" aria-hidden="true" />Gold Threshold</span>
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold text-xs text-dota-text-muted uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dota-border/50">
                {winTypeStats.map((row, i) => {
                  const total = row.totalWins;
                  const lsPct = total > 0 ? Math.round((row.lastStandingWins  / total) * 100) : 0;
                  const gtPct = total > 0 ? Math.round((row.goldThresholdWins / total) * 100) : 0;
                  return (
                    <tr key={row.username} className={`transition-colors hover:bg-dota-overlay/40 ${i === 0 ? 'bg-dota-gold/5' : ''}`}>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          {i === 0 && <span aria-hidden="true">🥇</span>}
                          {i === 1 && <span aria-hidden="true">🥈</span>}
                          {i === 2 && <span aria-hidden="true">🥉</span>}
                          <span className={`font-semibold ${i === 0 ? 'text-dota-gold' : 'text-dota-text'}`}>{row.username}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {row.lastStandingWins > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-bold tabular-nums text-dota-radiant-light">{row.lastStandingWins}</span>
                            {total > 1 && <span className="text-[10px] text-dota-text-dim tabular-nums">{lsPct}%</span>}
                          </div>
                        ) : <span className="text-dota-text-dim text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {row.goldThresholdWins > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-bold tabular-nums text-dota-gold">{row.goldThresholdWins}</span>
                            {total > 1 && <span className="text-[10px] text-dota-text-dim tabular-nums">{gtPct}%</span>}
                          </div>
                        ) : <span className="text-dota-text-dim text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold tabular-nums text-dota-text">{row.totalWins}</span>
                          {row.lastStandingWins > 0 && row.goldThresholdWins > 0 && (
                            <div className="w-16 h-1 rounded-full overflow-hidden bg-dota-border" aria-hidden="true" title={`${lsPct}% last standing, ${gtPct}% gold threshold`}>
                              <div className="h-full bg-dota-radiant-light rounded-full" style={{ width: `${lsPct}%` }} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-dota-border">
            <p className="font-barlow text-[11px] text-dota-text-dim leading-snug">
              <span className="text-dota-radiant-light font-semibold">Last Standing</span> — won a game as the sole player on their team.{' '}
              <span className="text-dota-gold font-semibold">Gold Threshold</span> — reached 100,000 gold.
              The bar shows the split for players with both types.
            </p>
          </div>
        </div>
      )}

      {/* ── Row 4: Head-to-Head + Top Combinations ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        <div className="panel overflow-hidden">
          <CardHeader
            icon={Swords}
            iconClass="text-dota-dire-light"
            title="Head-to-Head"
            subtitle="Win rate against specific opponents across all games you've faced each other"
          />
          <div className="p-4 space-y-4">
            {headToHead.length === 0 ? (
              <p className="text-center font-barlow text-dota-text-dim py-6">
                No head-to-head data yet — need finished games with opposing players.
              </p>
            ) : (
              <>
                <div className="relative max-w-xs">
                  <select
                    value={h2hSelected}
                    onChange={e => setH2hSelected(e.target.value)}
                    aria-label="Select player to view their head-to-head record"
                    className="input appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">Select a player…</option>
                    {h2hPlayers.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <SelectChevron
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dota-text-muted"
                    aria-hidden="true"
                  />
                </div>

                {!h2hSelected ? (
                  <p className="font-barlow text-sm text-dota-text-dim text-center py-4">
                    Choose a player above to see their record against each opponent.
                  </p>
                ) : h2hRows.length === 0 ? (
                  <p className="font-barlow text-sm text-dota-text-dim text-center py-4">
                    No recorded matchups for {h2hSelected} yet.
                  </p>
                ) : (
                  <div>
                    <table className="w-full font-barlow text-sm" aria-label={`Head-to-head record for ${h2hSelected}`}>
                      <thead>
                        <tr className="border-b border-dota-border text-left">
                          <th scope="col" className="pb-2 pr-4 font-semibold text-xs text-dota-text-muted uppercase tracking-widest">Opponent</th>
                          <th scope="col" className="pb-2 px-3 font-semibold text-xs text-dota-radiant-light uppercase tracking-widest text-center">W</th>
                          <th scope="col" className="pb-2 px-3 font-semibold text-xs text-dota-dire-light uppercase tracking-widest text-center">L</th>
                          <th scope="col" className="pb-2 px-3 font-semibold text-xs text-dota-text-muted uppercase tracking-widest text-center">Games</th>
                          <th scope="col" className="pb-2 pl-3 font-semibold text-xs text-dota-text-muted uppercase tracking-widest text-right">Win Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dota-border/40">
                        {h2hRows.map(row => (
                          <tr key={row.opponent} className="hover:bg-dota-overlay/30 transition-colors">
                            <td className="py-2.5 pr-4 font-semibold text-dota-text">{row.opponent}</td>
                            <td className="py-2.5 px-3 text-center font-bold tabular-nums text-dota-radiant-light">{row.wins}</td>
                            <td className="py-2.5 px-3 text-center font-bold tabular-nums text-dota-dire-light">{row.losses}</td>
                            <td className="py-2.5 px-3 text-center tabular-nums text-dota-text-muted">{row.totalGames}</td>
                            <td className="py-2.5 pl-3 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(row.winRate)}`}>
                                {row.winRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="font-barlow text-[10px] text-dota-text-dim mt-3 leading-snug">
                      Records cover all games where {h2hSelected} and the opponent were on opposing teams, across every match.
                      Sorted by games played — most-played rivalries first.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-dota-border">
            <h3 className="font-cinzel text-lg font-bold text-dota-gold">Top Winning Combinations</h3>
            <p className="font-barlow text-xs text-dota-text-muted mt-0.5">Most frequent winning team compositions</p>
          </div>
          <div className="p-4">
            {combos.length === 0 ? (
              <p className="text-center font-barlow text-dota-text-dim py-6">No completed games yet.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {visibleCombos.map((c, i) => (
                    <li key={c.combo} className="panel-sunken p-3 flex items-center gap-3">
                      <span className="font-barlow text-sm font-bold w-6 text-center shrink-0">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span className="truncate font-barlow font-semibold text-sm text-dota-text flex-1 min-w-0">
                        {c.combo}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-barlow text-xs text-dota-text-dim tabular-nums whitespace-nowrap">
                          {c.wins}W – {c.gamesPlayed - c.wins}L
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(c.winRate)}`}>
                          {c.winRate}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {combos.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCombos(v => !v)}
                    className="btn-ghost w-full mt-3 text-xs py-1.5"
                  >
                    {showAllCombos ? 'Show less' : `Show all ${combos.length}`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// =============================================================================
// ── Root StatsTab ───────────────────────────────────────────────────────────────
// =============================================================================

type StatsTabProps = Record<string, never>;

export default function StatsTab(_props: StatsTabProps) {
  const [players, setPlayers]                   = useState<PlayerStats[]>([]);
  const [combos, setCombos]                     = useState<TeamCombo[]>([]);
  const [acquisitionImpact, setAcquisition]     = useState<AcquisitionImpact[]>([]);
  const [winStreaks, setWinStreaks]             = useState<WinStreak[]>([]);
  const [headToHead, setHeadToHead]             = useState<HeadToHead[]>([]);
  const [winTypeStats, setWinTypeStats]         = useState<WinTypeStats[]>([]);
  const [heroStats, setHeroStats]               = useState<HeroStat[]>([]);
  const [playerDotaStats, setPlayerDotaStats]   = useState<PlayerDotaStat[]>([]);
  const [activeView, setActiveView]             = useState<StatsView>('match');
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ])
      .then(([statsData, meData]) => {
        setPlayers(statsData.players ?? []);
        setCombos(statsData.topWinningCombos ?? []);
        setAcquisition(statsData.acquisitionImpact ?? []);
        setWinStreaks(statsData.winStreaks ?? []);
        setHeadToHead(statsData.headToHead ?? []);
        setWinTypeStats(statsData.winTypeStats ?? []);
        setHeroStats(statsData.heroStats ?? []);
        setPlayerDotaStats(statsData.playerDotaStats ?? []);
        // Pre-select the signed-in user in the H2H picker — passed down to
        // MatchStatsTab via initial state only; the tab manages it internally.
        void meData; // meData used for h2hSelected pre-selection below if needed
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load statistics');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="panel p-8 text-center font-barlow text-dota-text-muted">
        Loading statistics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-8 text-center font-barlow text-dota-dire-light">
        {error}
      </div>
    );
  }

  if (players.length === 0 && heroStats.length === 0) {
    return (
      <div className="panel p-12 text-center font-barlow text-dota-text-dim">
        No player data yet — complete a game to see stats.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Tab toggle — Match Stats / Dota Stats */}
      <StatsTabToggle active={activeView} onChange={setActiveView} />

      <div role="tabpanel" aria-label={activeView === 'match' ? 'Match Stats' : 'Dota Stats'}>
        {activeView === 'match' ? (
          <MatchStatsTab
            players={players}
            combos={combos}
            acquisitionImpact={acquisitionImpact}
            winStreaks={winStreaks}
            headToHead={headToHead}
            winTypeStats={winTypeStats}
          />
        ) : (
          <DotaStatsTab
            heroStats={heroStats}
            playerDotaStats={playerDotaStats}
          />
        )}
      </div>

    </div>
  );
}
