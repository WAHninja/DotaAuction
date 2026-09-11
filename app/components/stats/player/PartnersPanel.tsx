'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import type { TeammateSynergy } from '@/types';
import { synergyFor } from '@/lib/stats/select';
import { MIN_GAMES_TOGETHER } from '@/lib/stats/constants';
import PctBadge from '@/app/components/stats/ui/PctBadge';
import PlayerAvatar from '@/app/components/PlayerAvatar';

/**
 * This player's record alongside each teammate.
 *
 * The mirror of the head-to-head panel directly below it: one records who they
 * beat, this records who they win with. Presented in the same shape so the pair
 * read as two halves of the same idea rather than two unrelated tables.
 *
 * Ordered by games together rather than by win rate, so established
 * partnerships lead and a 100% record off one shared game doesn't top the list.
 * PctBadge still suppresses the rate below the threshold, and prints the raw
 * fraction alongside when it does show one.
 */
export default function PartnersPanel({ synergy, username }: {
  synergy: TeammateSynergy[];
  username: string;
}) {
  const partners = synergyFor(synergy, username);

  return (
    <section className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <Users className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Partners</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Record when on the same side · rate shown from {MIN_GAMES_TOGETHER} games together
          </p>
        </div>
      </div>

      {partners.length === 0 ? (
        <p className="font-barlow text-sm text-dota-text-dim py-8 text-center">
          No shared games recorded yet.
        </p>
      ) : (
        <table className="w-full font-barlow text-sm" aria-label={`Teammate record for ${username}`}>
          <thead className="bg-dota-deep/60 border-b border-dota-border">
            <tr className="stat-label">
              <th scope="col" className="px-4 py-2.5 text-left">Partner</th>
              <th scope="col" className="px-4 py-2.5 text-center">Together</th>
              <th scope="col" className="px-4 py-2.5 text-center">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {partners.map(p => (
              <tr key={p.partner} className="border-b border-dota-border/25 last:border-0">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/stats/${encodeURIComponent(p.partner)}`}
                    className="flex items-center gap-2 min-w-0 group"
                  >
                    <PlayerAvatar username={p.partner} size={22} />
                    <span className="font-semibold text-dota-text group-hover:text-dota-gold transition-colors truncate">
                      {p.partner}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-center tabular-nums text-dota-text-muted">
                  {p.wins}–{p.losses}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <PctBadge success={p.wins} total={p.games} minGames={MIN_GAMES_TOGETHER} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
