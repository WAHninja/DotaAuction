import Image from 'next/image';
import GoldIcon from '@/app/components/GoldIcon';
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

  // Sum gold across all players currently on this team.
  // gold ?? 0 guards against null/undefined in case a player row is missing
  // the field (e.g. a spectator-only view with partial data).
  const teamGoldTotal = players.reduce((sum, p) => sum + (p.gold ?? 0), 0);

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

      {/* ── Team gold total ─────────────────────────────────────────────────
          Shown between the divider and the player list so it's immediately
          visible without scanning individual rows. Uses the same gold colour
          and GoldIcon as every other gold display in the app for consistency.

          The label changes to "Final total" when the match is finished so it
          reads coherently alongside the "Final gold standings" label below.
      ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="stat-label">
          {matchFinished ? 'Final total' : 'Team gold'}
        </span>
        <span className="inline-flex items-center gap-1.5 font-barlow font-bold tabular-nums text-dota-gold text-base">
          {teamGoldTotal.toLocaleString()}
          <GoldIcon size={16} />
        </span>
      </div>

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

              {/* Gold — uses GoldIcon for consistent caching with the rest of the app */}
              <span className="font-barlow font-bold tabular-nums text-dota-gold flex items-center gap-1 shrink-0 ml-2">
                {p.gold ?? 0}
                <GoldIcon size={14} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
