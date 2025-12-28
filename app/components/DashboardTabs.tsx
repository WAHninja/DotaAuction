'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle, PlayCircle } from 'lucide-react';

// ---------------------
// Types
// ---------------------
type Match = {
  id: number;
  current_game_id?: number;
  team_a_usernames?: string[];
  team_1_usernames?: string[];
  winning_team?: string;
  players?: string[];
};

// ---------------------
// Match Card Component
// ---------------------
function MatchCard({ match, type }: { match: Match; type: 'ongoing' | 'completed' }) {
  const isCompleted = type === 'completed';
  const winner = match.winning_team === 'team_1' ? 'Team 1' : 'Team A';

  return (
    <div
      className={`p-4 rounded-xl shadow-lg border transition-transform duration-300 hover:scale-105 ${
        isCompleted ? 'bg-gray-800/90 border-gray-700' : 'bg-blue-900/90 border-blue-700'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm">Match #{match.id}</span>
        <Link href={`/match/${match.id}`}>
          <button
            className={`px-3 py-1 text-sm rounded-md text-white font-semibold ${
              isCompleted ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isCompleted ? 'View' : 'Continue'}
          </button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {['team_a', 'team_1'].map((teamKey) => {
          const usernames =
            teamKey === 'team_a' ? match.team_a_usernames : match.team_1_usernames;
          const color = teamKey === 'team_a' ? 'blue' : 'red';
          const teamName = teamKey === 'team_a' ? 'Team A' : 'Team 1';
          const isWinner = isCompleted && winner === teamName;

          return (
            <div
              key={teamKey}
              className={`flex-1 p-3 rounded-lg border ${
                isWinner
                  ? `bg-${color}-800/80 border-${color}-400`
                  : `bg-${color}-900/50 border-${color}-700`
              } shadow-sm`}
            >
              <p
                className={`text-xs font-semibold text-${color}-200 mb-2 flex items-center justify-between`}
              >
                {teamName}
                {isWinner && (
                  <span className="text-green-400 text-xs flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Winner
                  </span>
                )}
              </p>

              <div className="flex flex-wrap gap-2">
                {usernames?.map((u) => (
                  <span
                    key={u}
                    className={`bg-${color}-700/80 text-white text-xs px-3 py-1 rounded-full`}
                  >
                    {u}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!isCompleted && match.current_game_id && (
        <p className="text-xs text-gray-300 mt-3 flex items-center gap-1">
          <PlayCircle className="h-4 w-4 text-yellow-300" /> Current Game: #{match.current_game_id}
        </p>
      )}
      {isCompleted && match.players && (
        <p className="text-xs text-gray-400 mt-3">Players: {match.players.join(', ')}</p>
      )}
    </div>
  );
}

// ---------------------
// Load More Button
// ---------------------
function LoadMoreButton({
  onClick,
  loading,
  hidden,
}: {
  onClick: () => void;
  loading: boolean;
  hidden: boolean;
}) {
  if (hidden) return null;
  return (
    <div className="col-span-full text-center mt-4">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-5 w-5" /> Loading...
          </>
        ) : (
          'Load More'
        )}
      </button>
    </div>
  );
}

// ---------------------
// Dashboard Tabs Component
// ---------------------
export default function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'stats'>('ongoing');
  const [ongoingMatches, setOngoingMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [loadingOngoing, setLoadingOngoing] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [ongoingVisible, setOngoingVisible] = useState(5);
  const [completedVisible, setCompletedVisible] = useState(5);

  // Fetch matches from API
  useEffect(() => {
    async function fetchMatches() {
      try {
        const [ongoingRes, completedRes] = await Promise.all([
          fetch('/api/match/ongoing'),
          fetch('/api/match/completed'),
        ]);
        const ongoingData = await ongoingRes.json();
        const completedData = await completedRes.json();
        setOngoingMatches(ongoingData.matches || []);
        setCompletedMatches(completedData.matches || []);
      } catch (e) {
        console.error('Error fetching matches:', e);
      } finally {
        setLoadingOngoing(false);
        setLoadingCompleted(false);
      }
    }
    fetchMatches();
  }, []);

  const loadMore = (type: 'ongoing' | 'completed') => {
    if (type === 'ongoing') setOngoingVisible((prev) => prev + 5);
    else setCompletedVisible((prev) => prev + 5);
  };

  const TabButton = ({ tab }: { tab: 'ongoing' | 'completed' | 'stats' }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-5 py-2 font-semibold rounded-t-lg transition ${
        activeTab === tab
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {tab === 'ongoing' && 'Ongoing'}
      {tab === 'completed' && 'Completed'}
      {tab === 'stats' && 'Stats'}
    </button>
  );

  return (
    <div className="min-h-screen p-6 bg-black text-white space-y-6">
      {/* Tabs */}
      <div className="flex justify-center gap-4 border-b border-gray-600 mb-6">
        {(['ongoing', 'completed', 'stats'] as const).map((tab) => (
          <TabButton key={tab} tab={tab} />
        ))}
      </div>

      {/* Ongoing Matches */}
      {activeTab === 'ongoing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingOngoing ? (
            <p className="text-center text-gray-400 col-span-full">Loading...</p>
          ) : ongoingMatches.length > 0 ? (
            <>
              {ongoingMatches.slice(0, ongoingVisible).map((m) => (
                <MatchCard key={m.id} match={m} type="ongoing" />
              ))}
              <LoadMoreButton
                onClick={() => loadMore('ongoing')}
                loading={false}
                hidden={ongoingVisible >= ongoingMatches.length}
              />
            </>
          ) : (
            <p className="text-center text-gray-400 col-span-full">No ongoing matches.</p>
          )}
        </div>
      )}

      {/* Completed Matches */}
      {activeTab === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingCompleted ? (
            <p className="text-center text-gray-400 col-span-full">Loading...</p>
          ) : completedMatches.length > 0 ? (
            <>
              {completedMatches.slice(0, completedVisible).map((m) => (
                <MatchCard key={m.id} match={m} type="completed" />
              ))}
              <LoadMoreButton
                onClick={() => loadMore('completed')}
                loading={false}
                hidden={completedVisible >= completedMatches.length}
              />
            </>
          ) : (
            <p className="text-center text-gray-400 col-span-full">No completed matches.</p>
          )}
        </div>
      )}

      {/* Stats */}
      {activeTab === 'stats' && (
        <div className="text-center text-gray-400 italic">Coming soon...</div>
      )}
    </div>
  );
}
