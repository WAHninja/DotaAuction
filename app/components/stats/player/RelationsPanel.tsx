'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Users } from 'lucide-react';
import type { TeammateSynergy, HeadToHead } from '@/types';
import { synergyFor, headToHeadFor, type AvatarLookup } from '@/lib/stats/select';
import { MIN_GAMES_FOR_RATE, MIN_GAMES_TOGETHER } from '@/lib/stats/constants';
import PctBadge from '@/app/components/stats/ui/PctBadge';
import PlayerAvatar from '@/app/components/PlayerAvatar';

/**
 * This player's record with, and against, everyone else.
 *
 * Replaces two adjacent panels — Partners and Head-to-Head — that were
 * near-identical three-column tables of name, record and win rate. They were
 * built to read as two halves of one question and instead read as one table
 * accidentally rendered twice. Tabbing them makes the relationship explicit
 * rather than something the reader has to infer from adjacency, and halves the
 * vertical space the pair occupied.
 *
 * The two sides keep different thresholds because they mean different things.
 * Teammates share every game on a five-a-side whether or not they interact, so
 * pairs accumulate games faster than they accumulate meaning and need a higher
 * bar than an opposed matchup does.
 */

type Tab = 'with' | 'against';

export default function RelationsPanel({ synergy, headToHead, username, avatars }: {
  synergy: TeammateSynergy[];
  headToHead: HeadToHead[];
  username: string;
  /** Relational stats carry usernames only, so avatars are looked up. */
  avatars: AvatarLookup;
}) {
  const partners  = synergyFor(synergy, username);
  const opponents = headToHeadFor(headToHead, username);

  // Open on whichever side has data, so a player with only opposed games does
  // not land on an empty tab and conclude the panel is broken.
  const [tab, setTab] = useState<Tab>(partners.length > 0 ? 'with' : 'against');

  // Nothing on either side: the page-level notice already explains why, so
  // rendering an empty shell here would just repeat it.
  if (partners.length === 0 && opponents.length === 0) return null;

  const rows = tab === 'with'
    ? partners.map(p => ({
        name: p.partner, wins: p.wins, losses: p.losses, games: p.games,
        min: MIN_GAMES_TOGETHER,
      }))
    : opponents.map(o => ({
        name: o.opponent, wins: o.wins, losses: o.losses, games: o.games,
        min: MIN_GAMES_FOR_RATE,
      }));

  return (
    <section className="panel overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3 flex-wrap">
        <Users className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Teammates &amp; Rivals</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            {tab === 'with'
              ? 'Record when on the same side'
              : 'Record when on opposing sides'}
          </p>
        </div>

        <div className="ml-auto flex gap-1 shrink-0" role="tablist" aria-label="Relationship">
          <TabButton active={tab === 'with'}    onClick={() => setTab('with')}    label="With" />
          <TabButton active={tab === 'against'} onClick={() => setTab('against')} label="Against" />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="font-barlow text-sm text-dota-text-dim py-8 text-center flex-1 flex items-center justify-center">
          {tab === 'with' ? 'No shared games yet.' : 'No opposed games yet.'}
        </p>
      ) : (
        <table
          className="w-full font-barlow text-sm"
          aria-label={`${username} ${tab === 'with' ? 'with teammates' : 'against opponents'}`}
        >
          <thead className="bg-dota-deep/60 border-b border-dota-border">
            <tr className="stat-label">
              <th scope="col" className="px-4 py-2.5 text-left">Player</th>
              <th scope="col" className="px-4 py-2.5 text-center">Record</th>
              <th scope="col" className="px-4 py-2.5 text-center">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name} className="border-b border-dota-border/25 last:border-0">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/stats/${encodeURIComponent(r.name)}`}
                    className="flex items-center gap-2 min-w-0 group"
                  >
                    <PlayerAvatar
                      username={r.name}
                      steamAvatar={avatars.get(r.name) ?? null}
                      size={22}
                    />
                    <span className="font-semibold text-dota-text group-hover:text-dota-gold transition-colors truncate">
                      {r.name}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-center tabular-nums text-dota-text-muted">
                  {r.wins}–{r.losses}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <PctBadge success={r.wins} total={r.games} minGames={r.min} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function TabButton({ active, onClick, label }: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`
        font-barlow text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-dota-gold
        ${active
          ? 'bg-dota-gold/15 text-dota-gold border border-dota-gold/40'
          : 'text-dota-text-muted hover:text-dota-text border border-transparent'}
      `}
    >
      {label}
    </button>
  );
}
