import { getSession } from '@/app/session';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateMatchFormWrapper from '@/app/components/CreateMatchFormWrapper';
import Button from '@/app/components/Button'; // Adjust the path based on your folder structure
import Card from '@/app/components/card';
import Tabs from '@/app/components/tabs';


export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return redirect('/login');

  try {
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [session.userId]);
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
    <div className="min-h-screen bg-[#1c1c1c] text-white p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center text-yellow-300">Dota Auctions Dashboard</h1>

      {/* Start Match */}
      <div className="flex justify-center">
        <Button className="bg-red-700 hover:bg-red-600 text-white px-6 py-2 rounded-xl shadow-md">
          + Start New Match
        </Button>
      </div>

      {/* Tabs for Ongoing, Completed, Stats */}
      <Tabs defaultValue="ongoing" className="w-full">
        <TabsList className="flex justify-center bg-gray-800 rounded-xl mb-4">
          <TabsTrigger value="ongoing" className="text-yellow-200">Ongoing Matches</TabsTrigger>
          <TabsTrigger value="completed" className="text-green-300">Completed Matches</TabsTrigger>
          <TabsTrigger value="stats" className="text-blue-300">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((id) => (
              <Card key={id} className="bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-lg">Match #{id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Players: Player1, Player2, Player3, Player4</p>
                  <Button className="mt-2 bg-yellow-600 hover:bg-yellow-500">View Match</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[4, 5].map((id) => (
              <Card key={id} className="bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-lg">Match #{id} - Winner: Team A</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Players: Player5, Player6, Player7, Player8</p>
                  <Button className="mt-2 bg-green-600 hover:bg-green-500">View Summary</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="bg-gray-900">
            <CardHeader>
              <CardTitle className="text-lg">Match Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>Total Matches Played: 10</li>
                <li>Top Player: Player1 (12000 gold)</li>
                <li>Most Wins: Player3 (5 wins)</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
  } catch (error) {
    console.error("Error fetching data:", error);
    return redirect('/login');
  }
}
