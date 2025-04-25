import { getSession } from '@/app/session';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateMatchFormWrapper from '@/app/components/CreateMatchFormWrapper';

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

    import DashboardTabs from '@/app/components/DashboardTabs';

return (
  <div className="relative min-h-screen animate-fadeIn">
    <div className="absolute inset-0 bg-black/60 z-0" />
    <div className="relative z-10 p-6 text-white max-w-4xl mx-auto space-y-10">

      {/* Create Match Section */}
      <div className="bg-gray-900/90 p-6 rounded-xl shadow-md">
        <h1 className="text-3xl font-bold mb-4 text-center">Create a New Match</h1>
        <CreateMatchFormWrapper />
      </div>

      {/* Tabs */}
      <DashboardTabs
        ongoingMatches={ongoingMatches}
        completedMatches={completedMatches}
      />
    </div>
  </div>
);
  } catch (error) {
    console.error("Error fetching data:", error);
    return redirect('/login');
  }
}
