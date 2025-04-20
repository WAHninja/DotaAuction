import { getSession } from '../../lib/session';
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateMatchFormWrapper from './CreateMatchFormWrapper';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) return redirect('/login');

  // Get current user
  const userResult = await db.query('SELECT username FROM users WHERE id = $1', [session.user_id]);
  const user = userResult.rows[0];

  // Get Ongoing Matches with player usernames
  const ongoingResult = await db.query(
    `
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
    `,
    [session.user_id]
  );

  // Get Completed Matches with winner and players
  const completedResult = await db.query(
    `
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
    `,
    [session.user_id]
  );

  const ongoingMatches = ongoingResult.rows;
  const completedMatches = completedResult.rows;

  return (
    <div className="relative min-h-screen">
  {/* Semi-transparent overlay box */}
  <div className="absolute inset-0 bg-black/60 z-0" />

  {/* Main content layer */}
  <div className="relative z-10 p-6 text-white space-y-10 max-w-6xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* LEFT SIDE: Welcome & Ongoing Matches */}
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user.username}!</h1>
          <p className="text-gray-300">This is your dashboard.</p>
        </div>

        {/* Ongoing Matches */}
        <div>
          <h2 className="text-2xl font-semibold mb-2">🛡️ Ongoing Matches</h2>
          {ongoingMatches.length > 0 ? (
            ongoingMatches.map((match) => (
              <div key={match.id} className="bg-blue-900/80 p-4 rounded-xl space-y-1 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Match #{match.id}</span>
                  <Link href={`/match/${match.id}`}>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">
                      Continue
                    </button>
                  </Link>
                </div>
                <p className="text-sm text-gray-200">Players: {match.players.join(', ')}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No ongoing matches yet.</p>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Create Match Form */}
      <div className="bg-gray-900/90 p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold mb-4">➕ Create a Match</h2>
        <CreateMatchFormWrapper />
      </div>
    </div>

    {/* COMPLETED MATCHES */}
    {completedMatches.length > 0 && (
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-2">🏁 Completed Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedMatches.map((match) => (
            <div key={match.id} className="bg-gray-800/80 p-4 rounded-xl space-y-1 shadow-md">
              <div className="flex justify-between items-center">
                <span>
                  Match #{match.id} - Winner:{' '}
                  <strong>{match.winning_team === 'team_1' ? 'Team 1' : 'Team A'}</strong>
                </span>
                <Link href={`/match/${match.id}`}>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm">
                    View
                  </button>
                </Link>
              </div>
              <p className="text-sm text-gray-300">Players: {match.players.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</div>


  );
}
