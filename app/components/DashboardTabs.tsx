'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DashboardTabs({ ongoingMatches, completedMatches }: {
  ongoingMatches: any[];
  completedMatches: any[];
}) {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'stats'>('ongoing');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded-md font-semibold transition ${
            activeTab === 'ongoing' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
          onClick={() => setActiveTab('ongoing')}
        >
          Ongoing Matches
        </button>
        <button
          className={`px-4 py-2 rounded-md font-semibold transition ${
            activeTab === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
          onClick={() => setActiveTab('completed')}
        >
          Completed Matches
        </button>
        <button
          className={`px-4 py-2 rounded-md font-semibold transition ${
            activeTab === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'ongoing' && (
        <div className="space-y-4">
          {ongoingMatches.length > 0 ? (
            ongoingMatches.map((match) => (
              <div
                key={match.id}
                className="bg-blue-900/80 p-4 rounded-xl shadow hover:scale-105 transition-transform"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Match #{match.id}</span>
                  <Link href={`/match/${match.id}`}>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">
                      Continue
                    </button>
                  </Link>
                </div>
                <p className="text-sm text-gray-200">
                  Players: {match.players.join(', ')}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center">No ongoing matches yet.</p>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedMatches.length > 0 ? (
            completedMatches.map((match) => (
              <div
                key={match.id}
                className="bg-gray-800/80 p-4 rounded-xl shadow hover:scale-105 transition-transform"
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
            ))
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
