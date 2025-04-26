'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function DashboardTabs({
  ongoingMatches,
  completedMatches,
}: {
  ongoingMatches: any[];
  completedMatches: any[];
}) {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'stats'>('ongoing');
  const [ongoingVisible, setOngoingVisible] = useState(5);
  const [completedVisible, setCompletedVisible] = useState(5);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const loadMoreOngoing = () => {
    setLoadingOngoing(true);
    setTimeout(() => {
      setOngoingVisible(prev => prev + 5);
      setLoadingOngoing(false);
    }, 500);
  };

  const loadMoreCompleted = () => {
    setLoadingCompleted(true);
    setTimeout(() => {
      setCompletedVisible(prev => prev + 5);
      setLoadingCompleted(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-4">
        {['ongoing', 'completed', 'stats'].map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : tab === 'stats'
                ? 'bg-gray-300 text-gray-600'
                : 'bg-gray-700 text-gray-300'
            }`}
            onClick={() => setActiveTab(tab as 'ongoing' | 'completed' | 'stats')}
          >
            {tab === 'ongoing' && 'Ongoing Matches'}
            {tab === 'completed' && 'Completed Matches'}
            {tab === 'stats' && 'Stats'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'ongoing' && (
        <div className="space-y-4">
          {ongoingMatches.length > 0 ? (
            <>
              {ongoingMatches.slice(0, ongoingVisible).map((match) => (
                <div
                  key={match.id}
                  className="bg-blue-900/80 p-4 rounded-xl shadow hover:scale-105 transition-transform duration-300 ease-in-out"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Match #{match.id}</span>
                    <Link href={`/match/${match.id}`}>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">
                        Continue
                      </button>
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {match.players.map((player: string) => (
                      <span
                        key={player}
                        className="bg-blue-700/60 text-white text-xs font-semibold px-3 py-1 rounded-full"
                      >
                        {player}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {ongoingVisible < ongoingMatches.length && (
                <div className="text-center">
                  <button
                    onClick={loadMoreOngoing}
                    disabled={loadingOngoing}
                    className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingOngoing ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center">No ongoing matches yet.</p>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedMatches.length > 0 ? (
            <>
              {completedMatches.slice(0, completedVisible).map((match) => (
                <div
                  key={match.id}
                  className="bg-gray-800/80 p-4 rounded-xl shadow hover:scale-105 transition-transform duration-300 ease-in-out"
                >
                  <div className="flex justify-between items-center">
                    <span>
                      Match #{match.id} – Winner:{' '}
                      <strong>
                        {match.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
                      </strong>
                    </span>
                    <Link href={`/match/${match.id}`}>
                      <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm">
                        View
                      </button>
                    </Link>
                  </div>
                  <p className="text-sm text-gray-300">
                    Players: {match.players.join(', ')}
                  </p>
                </div>
              ))}
              {completedVisible < completedMatches.length && (
                <div className="text-center col-span-full">
                  <button
                    onClick={loadMoreCompleted}
                    disabled={loadingCompleted}
                    className="mt-4 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingCompleted ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center">No completed matches.</p>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="text-center text-gray-400 italic">Coming soon...</div>
      )}
    </div>
  );
}
