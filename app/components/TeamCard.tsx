import Image from 'next/image';
import PlayerAvatar from '@/app/components/PlayerAvatar';
import type { Player } from '@/types';

// Extend the shared Player type locally — steam_avatar comes from the DB
// but isn't in the base type yet since not all endpoints return it.
type PlayerWithAvatar = Player & { steam_avatar?: string | null };

type TeamCardProps = {
  name: string;
  logo: string;
  players: PlayerWithAvatar[];
  teamId: string;
  faction: 'radiant' | 'dire';
  currentUserId?: number;
  // When true, the player list heading changes to make it clear the gold
  // values represent the end-of-match snapshot, not a mid-game state.
  matchFinished?: boolean;
};

export default function TeamCard({
  name,
  logo,
  players,
  teamId,
  faction,
  currentUserId,
  matchFinished = false,
}: TeamCardProps) {
  const isRadiant = faction === 'radiant';

  const nameColour  = isRadiant ? 'text-dota-radiant-light' : 'text-dota-dire-light';
  const youBg       = isRadiant ? 'bg-dota-radiant/15 border border-dota-radiant/40' : 'bg-dota-dire/15 border border-dota-dire/40';
  const youText     = isRadiant ? 'text-dota-radiant-light' : 'text-dota-dire-light';

  return (
    <div className={isRadiant ? 'team-radiant-panel p-6 rounded-xl shadow-panel' : 'team-dire-panel p-6 rounded-xl shadow-panel'}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <Image
          src={logo}
          alt={`${name} logo`}
          width={64}
          height={64}
          priority
          sizes="64px"
          className="object-contain"
        />
        <h2 className={`font-cinzel text-2xl font-bold ${nameColour}`}>{name}</h2>
      </div>

      <div className="divider mb-3" />

      {/*
        When the match is finished, label the gold column so it's clear these
        are end-of-match standings rather than mid-game values. The label sits
        between the divider and the player list, styled as a stat-label so it
        reads as metadata rather than content.
      */}
      {matchFinished && (
        <p className="stat-label text-center mb-3">
          Final gold standings
        </p>
      )}

      {/* ── Player list ────────────────────────────────────────────────────── */}
      <ul className="space-y-2">
        {players.map((p) => {
          const isYou = currentUserId !== undefined && p.id === currentUserId;
          return (
            <li
              key={`${teamId}-${p.id}`}
              className={`flex justify-between items-center rounded px-3 py-1.5 transition-colors ${
                isYou ? youBg : 'hover:bg-white/5'
              }`}
            >
              {/* Avatar + name */}
              <span className={`font-barlow font-semibold flex items-center gap-2.5 min-w-0 ${isYou ? youText : 'text-dota-text'}`}>
                <PlayerAvatar
                  username={p.username || '?'}
                  steamAvatar={p.steam_avatar}
                  size={28}
                />
                <span className="truncate">{p.username || 'Unknown'}</span>
              </span>

              {/* Gold */}
              <span className="font-barlow font-bold tabular-nums text-dota-gold flex items-center gap-1 shrink-0 ml-2">
                {p.gold ?? 0}
                <Image
                  src="/Gold_symbol.webp"
                  alt="Gold"
                  width={14}
                  height={14}
                  sizes="14px"
                  className="inline-block"
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
