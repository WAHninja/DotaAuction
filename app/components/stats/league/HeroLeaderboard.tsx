'use client';

import { useMemo, useState } from 'react';
import { Shield } from 'lucide-react';
import type { HeroStat } from '@/types';
import { MIN_PICKS_FOR_RATE } from '@/lib/stats/constants';
import { pctColour, kdaColour, heroIconUrl, heroDisplayName } from '@/lib/stats/format';
import SortableTh, { SortIcon } from '@/app/components/stats/ui/SortableTh';

/**
 * Every hero picked across finished games, ranked.
 *
 * Hero-owned rather than player-owned, so it belongs to the league view and has
 * no place on a player page. Moved here verbatim from the dashboard stats tab
 * during its retirement — the markup is unchanged; what moved with it is the
 * sort state, which previously lived in the enclosing DotaStatsTab.
 *
 * Note the win rate is the win rate of the team that picked the hero, not of
 * any individual on it, and the API nulls it below MIN_PICKS_FOR_RATE picks.
 */

type HeroSortKey =
  | 'hero'
  | 'picks'
  | 'winRate'
  | 'avgKills'
  | 'avgDeaths'
  | 'avgAssists'
  | 'avgKda'
  | 'topKills';

export default function HeroLeaderboard({ heroStats }: { heroStats: HeroStat[] }) {
  const [heroSortKey, setHeroSortKey] = useState<HeroSortKey>('picks');
  const [heroSortDir, setHeroSortDir] = useState<'asc' | 'desc'>('desc');

  function handleHeroSort(key: HeroSortKey) {
    if (heroSortKey === key) {
      setHeroSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setHeroSortKey(key);
      // Hero names read naturally A–Z; every metric is more useful best-first.
      setHeroSortDir(key === 'hero' ? 'asc' : 'desc');
    }
  }

  const sortedHeroes = useMemo(() => {
    return [...heroStats].sort((a, b) => {
      if (heroSortKey === 'hero') {
        const cmp = heroDisplayName(a.hero).localeCompare(heroDisplayName(b.hero));
        return heroSortDir === 'asc' ? cmp : -cmp;
      }

      // Heroes below the pick threshold have winRate null — no value rather
      // than a value of zero — so they sort last in both directions instead of
      // topping an ascending sort as though they were the worst performers.
      if (heroSortKey === 'winRate') {
        if (a.winRate === null && b.winRate === null) return 0;
        if (a.winRate === null) return 1;
        if (b.winRate === null) return -1;
        return heroSortDir === 'asc' ? a.winRate - b.winRate : b.winRate - a.winRate;
      }

      const aVal = a[heroSortKey] as number;
      const bVal = b[heroSortKey] as number;
      return heroSortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [heroStats, heroSortKey, heroSortDir]);

  if (heroStats.length === 0) return null;

  return (
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
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-dota-surface to-transparent z-10 lg:hidden"
          />
          <div className="overflow-x-auto">
            <table className="min-w-full font-barlow text-sm text-dota-text">
              <thead>
                <tr className="bg-dota-deep border-b border-dota-border">

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

                  <SortableTh
                    colKey="picks" label="Picks" sortKey={heroSortKey} sortDir={heroSortDir}
                    onSort={handleHeroSort}
                    tooltip="Number of times this hero has been picked across all finished games."
                    tooltipId="hero-col-picks"
                  />
                  <SortableTh
                    colKey="winRate" label="Win Rate" sublabel={`min. ${MIN_PICKS_FOR_RATE} picks`}
                    sortKey={heroSortKey} sortDir={heroSortDir} onSort={handleHeroSort}
                    tooltip={`Win rate of this hero's team. Only shown when the hero has been picked ${MIN_PICKS_FOR_RATE}+ times to avoid small-sample noise.`}
                    tooltipId="hero-col-winrate"
                  />
                  <SortableTh
                    colKey="avgKda" label="Avg KDA" sortKey={heroSortKey} sortDir={heroSortDir}
                    onSort={handleHeroSort}
                    tooltip="Average KDA ratio across all games on this hero — (kills + assists) / max(deaths, 1)."
                    tooltipId="hero-col-kda"
                  />
                  <SortableTh
                    colKey="avgKills" label="Avg K" sortKey={heroSortKey} sortDir={heroSortDir}
                    onSort={handleHeroSort}
                    tooltip="Average kills per game on this hero."
                    tooltipId="hero-col-kills"
                  />
                  <SortableTh
                    colKey="avgDeaths" label="Avg D" sortKey={heroSortKey} sortDir={heroSortDir}
                    onSort={handleHeroSort}
                    tooltip="Average deaths per game on this hero."
                    tooltipId="hero-col-deaths"
                  />
                  <SortableTh
                    colKey="avgAssists" label="Avg A" sortKey={heroSortKey} sortDir={heroSortDir}
                    onSort={handleHeroSort}
                    tooltip="Average assists per game on this hero."
                    tooltipId="hero-col-assists"
                  />
                  <SortableTh
                    colKey="topKills" label="Top Kills" sublabel="best game" sortKey={heroSortKey} sortDir={heroSortDir}
                    onSort={handleHeroSort}
                    tooltip="Most kills ever recorded on this hero in a single game, and who did it."
                    tooltipId="hero-col-topkills"
                  />
                </tr>
              </thead>

              <tbody>
                {sortedHeroes.map(hero => (
                  <tr
                    key={hero.hero}
                    className="border-b border-dota-border/50 hover:bg-dota-overlay/40 transition-colors"
                  >
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

                    <td className="px-3 py-2.5 text-center">
                      <span className="font-barlow font-semibold tabular-nums text-dota-text">
                        {hero.picks}
                      </span>
                    </td>

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

                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-barlow font-bold tabular-nums text-sm ${kdaColour(hero.avgKda)}`}>
                        {hero.avgKda.toFixed(2)}
                      </span>
                    </td>

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

                    {/* Top kills — best single-game performance + who did it */}
                    <td className="px-3 py-2.5 text-center">
                      {hero.topKills > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-barlow font-bold tabular-nums text-sm text-dota-gold">
                            {hero.topKills}
                          </span>
                          {hero.topKillsPlayer && (
                            <span className="font-barlow text-[10px] text-dota-text-dim truncate max-w-[100px]">
                              {hero.topKillsPlayer}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-dota-text-dim text-xs">—</span>
                      )}
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
            {' '}Top Kills shows the best single-game kill count on this hero and who achieved it.
          </p>
        </div>
      </div>
  );
}
