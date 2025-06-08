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
    ARRAY_AGG(DISTINCT u.username ORDER BY u.username) AS players,
    g.id AS current_game_id,
    g.team_a_members,
    g.team_1_members,
    g.status,

    -- team A usernames
    (
      SELECT ARRAY_AGG(u2.username ORDER BY u2.username)
      FROM UNNEST(g.team_a_members) AS team_a_id
      JOIN users u2 ON u2.id = team_a_id
    ) AS team_a_usernames,

    -- team 1 usernames
    (
      SELECT ARRAY_AGG(u3.username ORDER BY u3.username)
      FROM UNNEST(g.team_1_members) AS team_1_id
      JOIN users u3 ON u3.id = team_1_id
    ) AS team_1_usernames

  FROM matches m
  JOIN match_players mp ON mp.match_id = m.id
  JOIN users u ON u.id = mp.user_id

  JOIN LATERAL (
    SELECT *
    FROM games g
    WHERE g.match_id = m.id
    ORDER BY g.id DESC
    LIMIT 1
  ) g ON true

  WHERE m.id IN (
    SELECT match_id FROM match_players WHERE user_id = $1
  )
  AND m.winner_id IS NULL

  GROUP BY m.id, g.id, g.team_a_members, g.team_1_members, g.status
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
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/2">
              <CreateMatchFormWrapper />
            </div>
            <div className="lg:w-1/2 p-4 bg-slate-600/60 rounded-xl border border-gray-600">
              <h2 className="text-xl font-semibold mb-2">How It Works</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                <li>Create a match by selecting 4 or more players.</li>
                <li>When a team wins a game, the losing players all lose half their current starting gold</li>
                <li>Each player from winning team makes a gold offer to sell one of the winning players</li>
                <li>Losing team accepts one offer, all players in the winning team get 1000 gold plus half the value of the losing teams gold</li>
                <li>The match continues until a player wins when on a team by themselves</li>
              </ul>
            </div>
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
