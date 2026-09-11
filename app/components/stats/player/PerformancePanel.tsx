'use client';

import { Swords } from 'lucide-react';
import type { PlayerDotaStat } from '@/types';
import { heroIconUrl, heroDisplayName } from '@/lib/stats/format';

/**
 * A player's Dota averages, plus their single best recorded game.
 *
 * Shows the components of KDA rather than KDA itself — the composite sits in
 * the ranked strip at the top of the page with its league rank, and repeating
 * it here was one of three places the same number appeared.
 *
 * Renders nothing when no Dota game has ever been reported for this player.
 * A panel of zeroes would claim they average no kills, which is a different
 * statement from having no data — and the standings table makes the same
 * distinction with an em-dash rather than 0.00.
 */
export default function PerformancePanel({ dota }: { dota: PlayerDotaStat | null }) {
  if (!dota) return null;

  const averages: { label: string; value: string; tone?: string }[] = [
    { label: 'Kills',   value: dota.avgKills.toFixed(1) },
    { label: 'Deaths',  value: dota.avgDeaths.toFixed(1) },
    { label: 'Assists', value: dota.avgAssists.toFixed(1) },
  ];

  return (
    <section className="panel overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <Swords className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Performance</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Averaged across {dota.games} reported {dota.games === 1 ? 'game' : 'games'}
          </p>
        </div>
      </div>

      <div className="p-5 flex flex-1 flex-wrap items-center gap-6">
        {/* The composite KDA figure lives in the ranked strip at the top of the
            page, with its league rank alongside. This panel shows the three
            numbers it is made of — the breakdown, not the headline again. */}
        <div className="flex gap-5">
          {averages.map(a => (
            <div key={a.label}>
              <p className="stat-label">{a.label}</p>
              <p className={`font-barlow text-2xl font-bold tabular-nums ${a.tone ?? 'text-dota-text'}`}>
                {a.value}
              </p>
            </div>
          ))}
        </div>

        {dota.topKillsHero && (
          <div className="flex items-center gap-3 ml-auto panel-sunken px-4 py-2.5">
            {/* Plain <img>: the CDN host is cdn.cloudflare.steamstatic.com and
                next.config.js allows '*.steamstatic.com', whose single wildcard
                matches one subdomain label only. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroIconUrl(dota.topKillsHero)}
              alt=""
              width={44}
              height={25}
              className="rounded object-cover shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
            <div>
              <p className="stat-label">Best game</p>
              <p className="font-barlow text-sm font-bold text-dota-gold tabular-nums">
                {dota.topKills} kills
                <span className="text-dota-text-muted font-normal">
                  {' '}on {heroDisplayName(dota.topKillsHero)}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
