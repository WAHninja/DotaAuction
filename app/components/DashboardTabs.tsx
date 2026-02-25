'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, PlayCircle, Swords, Trophy } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';

const StatsTab = dynamic(() => import('./StatsTab'), { ssr: false });

import type { DashboardMatch as Match } from '@/types';

// =============================================================================
// Types
// =============================================================================

type Tab = 'ongoing' | 'completed' | 'stats';

type GamesPlayedMap = Record<number, number>;

type DashboardTabsProps = {
  ongoingMatches: Match[];
  completedMatches: Match[];
};

// =============================================================================
// Constants
// =============================================================================

const TAB_LABELS: Record<Tab, string> = {
  ongoing:   'Ongoing',
  completed: 'Completed',
  stats:     'Stats',
};

// =============================================================================
// Sub-components — hoisted to module level so React reconciles them correctly
// across re-renders rather than unmounting/remounting on every parent render.
// =============================================================================

// ── TabButton ─────────────────────────────────────────────────────────────────
function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: Tab;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-barlow font-semibold text-sm tracking-widest uppercase px-5 py-2 rounded transition-all ${
        active
          ? 'bg-dota-gold text-dota-base shadow-gold'
          : 'bg-dota-surface border border-dota-border text-dota-text-muted hover:text-dota-text hover:border-dota-border-bright'
      }`}
    >
      {TAB_LABELS[tab]}
    </button>
  );
}

// ── TeamRoster ────────────────────────────────────────────────────────────────
function TeamRoster({
  usernames,
  faction,
}: {
  usernames?: string[];
  faction: 'radiant' | 'dire';
}) {
  if (!usernames?.length) return null;
  const isRadiant = faction === 'radiant';
  return (
    <div className={isRadiant ? 'team-radiant-panel p-2.5 rounded-lg' : 'team-dire-panel p-2.5 rounded-lg'}>
      <p className={`stat-label mb-1.5 ${isRadiant ? 'text-dota-radiant-light' : 'text-dota-dire-light'}`}>
        {isRadiant ? 'Team 1' : 'Team A'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {usernames.map(u => (
          <span
            key={u}
            className={`font-barlow text-xs font-semibold px-2 py-0.5 rounded ${
              isRadiant
                ? 'bg-dota-radiant/20 text-dota-radiant-light border border-dota-radiant/30'
                : 'bg-dota-dire/20 text-dota-dire-light border border-dota-dire/30'
            }`}
          >
            {u}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────────
function MatchCard({
  match,
  isCompleted,
  gamesPlayedMap,
}: {
  match: Match;
  isCompleted: boolean;
  gamesPlayedMap: GamesPlayedMap;
}) {
  const gamesPlayed = gamesPlayedMap[match.id];

  return (
    <div className={`panel p-4 flex flex-col gap-3 hover:border-dota-border-bright transition-colors ${
      !isCompleted ? 'border-dota-gold/30' : ''
    }`}>

      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-barlow font-bold text-dota-text tracking-wide">
            Match #{match.id}
          </p>

          {isCompleted ? (
            <span className="flex items-center gap-1.5 font-barlow text-xs text-dota-gold">
              <CheckCircle className="w-3.5 h-3.5" />
              Winner: {match.winner_username || 'Not recorded'}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-barlow text-xs text-dota-text-muted">
              <PlayCircle className="w-3.5 h-3.5 text-dota-radiant-light" />
              {gamesPlayed === undefined ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                </span>
              ) : (
                <span>Game <strong className="text-dota-text">#{gamesPlayed}</strong></span>
              )}
            </span>
          )}
        </div>

        {/*
          Apply button classes directly to Link (<a>) rather than nesting a
          <button> inside it. Interactive-inside-interactive is invalid HTML
          and produces broken keyboard/screen reader behaviour.
        */}
        <Link
          href={`/match/${match.id}`}
          className={isCompleted
            ? 'btn-secondary text-sm py-1.5 px-3'
            : 'btn-primary text-sm py-1.5 px-3'
          }
        >
          {isCompleted ? 'View' : 'Continue'}
        </Link>
      </div>

      {/* Team rosters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <TeamRoster usernames={match.team_1_usernames} faction="radiant" />
        <TeamRoster usernames={match.team_a_usernames} faction="dire" />
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
// filtered=true  → matches exist but none belong to the current user
// filtered=false → no matches at all
function EmptyState({
  type,
  filtered,
}: {
  type: 'ongoing' | 'completed';
  filtered: boolean;
}) {
  if (filtered) {
    const Icon = type === 'ongoing' ? Swords : Trophy;
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-dota-text-muted">
        <Icon className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-cinzel text-lg font-bold mb-1 text-dota-text-dim">
          No {type === 'ongoing' ? 'ongoing' : 'completed'} matches for you
        </p>
        <p className="font-barlow text-sm">
          Toggle <span className="text-dota-text font-semibold">All Matches</span> above to see every match.
        </p>
      </div>
    );
  }

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-dota-text-muted">
      {type === 'ongoing' ? (
        <>
          <Swords className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-cinzel text-lg font-bold mb-1 text-dota-text-dim">No ongoing matches</p>
          <p className="font-barlow text-sm">Select your players above to start a new match.</p>
        </>
      ) : (
        <>
          <Trophy className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-cinzel text-lg font-bold mb-1 text-dota-text-dim">No completed matches yet</p>
          <p className="font-barlow text-sm">Finished matches will appear here.</p>
        </>
      )}
    </div>
  );
}

// ── MatchGrid ─────────────────────────────────────────────────────────────────
function MatchGrid({
  matches,
  visible,
  onLoadMore,
  type,
  gamesPlayedMap,
  filtered,
}: {
  matches: Match[];
  visible: number;
  onLoadMore: () => void;
  type: 'ongoing' | 'completed';
  gamesPlayedMap: GamesPlayedMap;
  filtered: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {matches.length === 0 ? (
        <EmptyState type={type} filtered={filtered} />
      ) : (
        <>
          {matches.slice(0, visible).map(match => (
            <MatchCard
              key={match.id}
              match={match}
              isCompleted={type === 'completed'}
              gamesPlayedMap={gamesPlayedMap}
            />
          ))}
          {visible < matches.length && (
            <div className="col-span-full flex justify-center mt-2">
              <button onClick={onLoadMore} className="btn-secondary">
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// DashboardTabs
// =============================================================================

export default function DashboardTabs({ ongoingMatches, completedMatches }: DashboardTabsProps) {
  const router = useRouter();
  const { user } = useContext(UserContext);

  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [ongoingVisible, setOngoingVisible] = useState(6);
  const [completedVisible, setCompletedVisible] = useState(6);
  const [gamesPlayedMap, setGamesPlayedMap] = useState<GamesPlayedMap>({});
  // Default to showing only the current user's matches. They can toggle to see all.
  const [myMatchesOnly, setMyMatchesOnly] = useState(true);

  // Track which match IDs have already been fetched so we never issue a
  // second request for the same match even across re-renders.
  const fetchedIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    ongoingMatches.forEach(match => {
      if (fetchedIds.current.has(match.id)) return;
      fetchedIds.current.add(match.id);

      fetch(`/api/match/${match.id}/games-played`)
        .then(res => res.json())
        .then(data => setGamesPlayedMap(prev => ({ ...prev, [match.id]: data.gamesPlayed })))
        .catch(err => console.error(`Failed to fetch games played for match ${match.id}`, err));
    });
  }, [ongoingMatches]);

  // ── Filter ───────────────────────────────────────────────────────────────────
  // A match belongs to the user if their username appears in either team's
  // username list. Falls back to showing all matches if the user isn't loaded yet.
  const isMyMatch = (match: Match): boolean => {
    if (!user?.username) return true;
    return (
      (match.team_1_usernames ?? []).includes(user.username) ||
      (match.team_a_usernames ?? []).includes(user.username)
    );
  };

  const filteredOngoing = useMemo(
    () => myMatchesOnly ? ongoingMatches.filter(isMyMatch) : ongoingMatches,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ongoingMatches, myMatchesOnly, user?.username]
  );

  const filteredCompleted = useMemo(
    () => myMatchesOnly ? completedMatches.filter(isMyMatch) : completedMatches,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completedMatches, myMatchesOnly, user?.username]
  );

  // Reset visible counts when the filter changes so a previously-expanded list
  // doesn't show a lower count than expected after narrowing the results.
  const handleFilterToggle = () => {
    setMyMatchesOnly(v => !v);
    setOngoingVisible(6);
    setCompletedVisible(6);
  };

  // ── Tab switching ────────────────────────────────────────────────────────────
  // router.refresh() re-runs the server component data fetch (ongoingMatches,
  // completedMatches) so the lists reflect any matches that have changed since
  // the page first loaded — without a full navigation or page reload.
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab !== 'stats') {
      router.refresh();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const showFilter = activeTab === 'ongoing' || activeTab === 'completed';

  return (
    <div className="space-y-6">

      {/* Tab bar */}
      <div className="flex justify-center gap-3">
        {(['stats', 'ongoing', 'completed'] as const).map(tab => (
          <TabButton
            key={tab}
            tab={tab}
            active={activeTab === tab}
            onClick={() => handleTabChange(tab)}
          />
        ))}
      </div>

      <div className="divider" />

      {/* Filter toggle — only shown on match tabs */}
      {showFilter && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleFilterToggle}
            className={`flex items-center gap-2 font-barlow text-sm font-semibold px-4 py-1.5 rounded border transition-all ${
              myMatchesOnly
                ? 'bg-dota-gold/15 border-dota-gold/50 text-dota-gold hover:bg-dota-gold/20'
                : 'bg-dota-surface border-dota-border text-dota-text-muted hover:border-dota-border-bright hover:text-dota-text'
            }`}
            aria-pressed={myMatchesOnly}
          >
            {/* Simple pill indicator */}
            <span
              aria-hidden="true"
              className={`inline-block w-7 h-4 rounded-full transition-colors relative ${
                myMatchesOnly ? 'bg-dota-gold' : 'bg-dota-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-dota-base transition-transform ${
                  myMatchesOnly ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
            My matches only
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'ongoing' && (
        <MatchGrid
          matches={filteredOngoing}
          visible={ongoingVisible}
          onLoadMore={() => setOngoingVisible(v => v + 5)}
          type="ongoing"
          gamesPlayedMap={gamesPlayedMap}
          filtered={myMatchesOnly && filteredOngoing.length < ongoingMatches.length}
        />
      )}
      {activeTab === 'completed' && (
        <MatchGrid
          matches={filteredCompleted}
          visible={completedVisible}
          onLoadMore={() => setCompletedVisible(v => v + 5)}
          type="completed"
          gamesPlayedMap={gamesPlayedMap}
          filtered={myMatchesOnly && filteredCompleted.length < completedMatches.length}
        />
      )}

    </div>
  );
}
