'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import type { TeammateSynergy } from '@/types';
import type { AvatarLookup } from '@/lib/stats/select';
import { MIN_GAMES_TOGETHER } from '@/lib/stats/constants';
import PctBadge from '@/app/components/stats/ui/PctBadge';
import RankMedal from '@/app/components/RankMedal';
import PlayerAvatar from '@/app/components/PlayerAvatar';

/**
 * The pairings that win most often together.
 *
 * Replaces Top Winning Combinations. That listed entire team compositions, and
 * with a small player pool most compositions appear once or twice — it was a
 * ranking of coincidences. Pairs recur often enough to reach real sample sizes.
 *
 * Only pairs clearing MIN_GAMES_TOGETHER are listed. Sorted by win rate, with
 * games together as the tie-break so a more established pairing outranks a
 * newer one on the same percentage.
 */
export default function TopDuos({ synergy, avatars }: {
  synergy: TeammateSynergy[];
  /** Synergy rows carry usernames only, so avatars are looked up. */
  avatars: AvatarLookup;
}) {
  const [showAll, setShowAll] = useState(false);

  const qualified = synergy
    .filter(p => p.gamesTogether >= MIN_GAMES_TOGETHER)
    .sort((a, b) => b.winRate - a.winRate || b.gamesTogether - a.gamesTogether);

  const visible = showAll ? qualified : qualified.slice(0, 5);

  return (
    <section className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <Users className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Best Duos</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Win rate when on the same side · min. {MIN_GAMES_TOGETHER} games together
          </p>
        </div>
      </div>

      <div className="p-4">
        {qualified.length === 0 ? (
          <p className="text-center font-barlow text-dota-text-dim py-6">
            No pairing has {MIN_GAMES_TOGETHER} games together yet.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {visible.map((p, i) => (
                <li
                  key={`${p.playerAId}-${p.playerBId}`}
                  className="panel-sunken p-3 flex items-center gap-3"
                >
                  <RankMedal rank={i + 1} size={24} />

                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <PlayerAvatar username={p.playerA} steamAvatar={avatars.get(p.playerA) ?? null} size={22} />
                    <span className="font-barlow font-semibold text-sm text-dota-text truncate">
                      {p.playerA}
                    </span>
                    <span className="text-dota-text-dim text-xs shrink-0">+</span>
                    <PlayerAvatar username={p.playerB} steamAvatar={avatars.get(p.playerB) ?? null} size={22} />
                    <span className="font-barlow font-semibold text-sm text-dota-text truncate">
                      {p.playerB}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-barlow text-xs text-dota-text-dim tabular-nums whitespace-nowrap">
                      {p.winsTogether}W – {p.gamesTogether - p.winsTogether}L
                    </span>
                    <PctBadge success={p.winsTogether} total={p.gamesTogether} />
                  </div>
                </li>
              ))}
            </ul>

            {qualified.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="btn-ghost w-full mt-3 text-xs py-1.5"
              >
                {showAll ? 'Show less' : `Show all ${qualified.length}`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
