import { getSession } from '@/app/session';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateMatchFormWrapper from './CreateMatchFormWrapper';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return redirect('/login');

  const userResult = await db.query(
    'SELECT username FROM users WHERE id = $1',
    [session.userId]
  );
  const user = userResult.rows[0];

  const ongoingResult = await db.query(`
  SELECT 
    m.id,
    m.created_at,
    ARRAY_AGG(u.username ORDER BY u.username) AS players
  FROM matches m
  JOIN match_players mp ON mp.match_id = m.id
  JOIN users u ON u.id = mp.user_id
  WHERE mp.user_id = $1 AND m.winning_team IS NULL
  GROUP BY m.id
  ORDER BY m.created_at DESC
`, [session.userId]);

const completedResult = await db.query(`
  SELECT 
    m.id,
    m.created_at,
    m.winning_team,
    ARRAY_AGG(u.username ORDER BY u.username) AS players
  FROM matches m
  JOIN match_players mp ON mp.match_id = m.id
  JOIN users u ON u.id = mp.user_id
  WHERE mp.user_id = $1 AND m.winning_team IS NOT NULL
  GROUP BY m.id
  ORDER BY m.created_at DESC
`, [session.userId]);

  const ongoingMatches = ongoingResult.rows;
  const completedMatches = completedResult.rows;

  return (
    <div className="relative min-h-screen animate-fadeIn">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 z-0" />

      {/* Content */}
      <div className="relative z-10 p-6 text-white space-y-10 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT: Create Match */}
          <div className="flex-1 bg-gray-900/90 p-6 rounded-xl shadow-md space-y-4">
            <h2 className="text-2xl font-semibold mb-2">Create a Match</h2>
            <CreateMatchFormWrapper />
          </div>

          {/* RIGHT: Ongoing Matches */}
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Ongoing Matches</h2>
              {ongoingMatches.length > 0 ? (
                ongoingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-blue-900/80 p-4 rounded-xl space-y-1 shadow-md transform transition-transform duration-200 hover:scale-105"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Match #{match.id}</span>
                      <Link href={/match/${match.id}}>
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
                <p className="text-sm text-gray-400">No ongoing matches yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Completed Matches */}
        {completedMatches.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-2">Completed Matches</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedMatches.map((match) => (
                <div
                  key={match.id}
                  className="bg-gray-800/80 p-4 rounded-xl space-y-1 shadow-md transform transition-transform duration-200 hover:scale-105"
                >
                  <div className="flex justify-between items-center">
                    <span>
                      Match #{match.id} – Winner:{' '}
                      <strong>
                        {match.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
                      </strong>
                    </span>
                    <Link href={/match/${match.id}}>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
