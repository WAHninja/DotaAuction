import { getSession } from '@/app/session';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateMatchFormWrapper from '@/app/components/CreateMatchFormWrapper';
import DashboardTabs from '@/app/components/DashboardTabs';

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
      WHERE m.id IN (
        SELECT match_id FROM match_players WHERE user_id = $1
      )
      AND m.winner_id IS NULL
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `, [session.userId]);

    const completedResult = await db.query(`
      SELECT 
        m.id,
        m.created_at,
        m.winner_id,
        ARRAY_AGG(u.username ORDER BY u.username) AS players
      FROM matches m
      JOIN match_players mp ON mp.match_id = m.id
      JOIN users u ON u.id = mp.user_id
      WHERE m.id IN (
        SELECT match_id FROM match_players WHERE user_id = $1
      )
      AND m.winner_id IS NOT NULL
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `, [session.userId]);

    const ongoingMatches = ongoingResult.rows;
    const completedMatches = completedResult.rows;

    return (
      <div className="relative min-h-screen animate-fadeIn">
        <div className="relative z-10 p-6 text-white max-w-4xl mx-auto space-y-10">
          <CreateMatchFormWrapper />
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
