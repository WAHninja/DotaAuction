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
    <div className="p-6 text-white space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user.username}!</h1>
        <p className="mt-2">This is your dashboard.</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">Create a Match</h2>
        <CreateMatchFormWrapper />
      </div>

      {ongoingMatches.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Ongoing Matches</h2>
          <ul className="space-y-2">
            {ongoingMatches.map((match) => (
              <li
                key={match.id}
                className="bg-gray-800 p-4 rounded-xl shadow space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Match #{match.id}</span>
                  <Link
                    href={`/match/${match.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Continue
                  </Link>
                </div>
                <p className="text-sm text-gray-300">
                  Players: {match.players.join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {completedMatches.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Completed Matches</h2>
          <ul className="space-y-2">
            {completedMatches.map((match) => (
              <li
                key={match.id}
                className="bg-gray-700 p-4 rounded-xl shadow space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span>
                    Match #{match.id} - Winner:{' '}
                    <span className="font-semibold">
                      {match.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
                    </span>
                  </span>
                  <Link
                    href={`/match/${match.id}`}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                  >
                    View
                  </Link>
                </div>
                <p className="text-sm text-gray-300">
                  Players: {match.players.join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
