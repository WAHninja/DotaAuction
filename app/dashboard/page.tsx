import { getSession } from '@/app/session';
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateMatchFormWrapper from './CreateMatchFormWrapper';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Card, CardContent } from '@/app/components/ui/card';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return redirect('/login');

  const userResult = await db.query(
    'SELECT username FROM users WHERE id = $1',
    [session.userId]
  );
  const user = userResult.rows[0];

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
    [session.userId]
  );

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
    [session.userId]
  );

  const ongoingMatches = ongoingResult.rows;
  const completedMatches = completedResult.rows;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dota Auctions Dashboard</h1>
          <div className="bg-gray-800 p-4 rounded-xl w-full md:w-1/3">
            <h2 className="text-xl font-semibold mb-2">Start New Match</h2>
            <CreateMatchFormWrapper />
          </div>
        </div>

        <Tabs defaultValue="ongoing" className="mt-6">
          <TabsList className="bg-gray-700 text-white rounded-xl">
            <TabsTrigger value="ongoing">Ongoing Matches</TabsTrigger>
            <TabsTrigger value="completed">Completed Matches</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing">
            {ongoingMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {ongoingMatches.map((match) => (
                  <Card key={match.id} className="bg-blue-900/80 text-white">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Match #{match.id}</span>
                        <Link href={`/match/${match.id}`}>
                          <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-sm">
                            Continue
                          </button>
                        </Link>
                      </div>
                      <p className="text-sm text-gray-200">
                        Players: {match.players.join(', ')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 mt-4">No ongoing matches yet.</p>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {completedMatches.map((match) => (
                  <Card key={match.id} className="bg-gray-800/80 text-white">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span>
                          Match #{match.id} – Winner:{' '}
                          <strong>
                            {match.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
                          </strong>
                        </span>
                        <Link href={`/match/${match.id}`}>
                          <button className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded-md text-sm">
                            View
                          </button>
                        </Link>
                      </div>
                      <p className="text-sm text-gray-300">
                        Players: {match.players.join(', ')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 mt-4">No completed matches yet.</p>
            )}
          </TabsContent>

          <TabsContent value="stats">
            <div className="bg-gray-800/70 p-6 rounded-xl mt-4 text-gray-300">
              <p className="italic">Stats section coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
