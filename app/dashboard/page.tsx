import { getSession } from '@/app/session';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import CreateMatchFormWrapper from '@/app/components/CreateMatchFormWrapper';
import DashboardTabs from '@/app/components/DashboardTabs';
import GameRulesCard from '@/app/components/GameRulesCard';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    // Current user
    const { rows: [user] } = await db.query(
      `SELECT id, username FROM users WHERE id = $1`,
      [session.userId]
    );

    // ===== Ongoing Matches =====
    const { rows: ongoingMatchesRaw } = await db.query(
      `
      SELECT
        m.id AS match_id,
        m.created_at,

        g.id AS game_id,
        g.status,

        g.team_a_members,
        g.team_1_members,

        -- Team A usernames
        (
          SELECT ARRAY_AGG(u2.username ORDER BY u2.username)
          FROM UNNEST(g.team_a_members) AS uid
          JOIN users u2 ON u2.id = uid
        ) AS team_a_usernames,

        -- Team 1 usernames
        (
          SELECT ARRAY_AGG(u3.username ORDER BY u3.username)
          FROM UNNEST(g.team_1_members) AS uid
          JOIN users u3 ON u3.id = uid
        ) AS team_1_usernames

      FROM matches m
      JOIN LATERAL (
        SELECT *
        FROM games g
        WHERE g.match_id = m.id
        ORDER BY g.id DESC
        LIMIT 1
      ) g ON true

      WHERE EXISTS (
        SELECT 1
        FROM match_players mp
        WHERE mp.match_id = m.id
          AND mp.user_id = $1
      )
      AND m.winner_id IS NULL

      ORDER BY m.created_at DESC
      `,
      [session.userId]
    );

    // ===== Completed Matches =====
    const { rows: completedMatchesRaw } = await db.query(
      `
      SELECT
        m.id AS match_id,
        m.created_at,
        m.winner_id,
        u_winner.username AS winner_username,

        g.id AS game_id,
        g.team_a_members,
        g.team_1_members,

        -- Team A usernames
        (
          SELECT ARRAY_AGG(u2.username ORDER BY u2.username)
          FROM UNNEST(g.team_a_members) AS uid
          JOIN users u2 ON u2.id = uid
        ) AS team_a_usernames,

        -- Team 1 usernames
        (
          SELECT ARRAY_AGG(u3.username ORDER BY u3.username)
          FROM UNNEST(g.team_1_members) AS uid
          JOIN users u3 ON u3.id = uid
        ) AS team_1_usernames

      FROM matches m
      JOIN users u_winner ON u_winner.id = m.winner_id
      JOIN LATERAL (
        SELECT *
        FROM games g
        WHERE g.match_id = m.id
        ORDER BY g.id DESC
        LIMIT 1
      ) g ON true

      WHERE EXISTS (
        SELECT 1
        FROM match_players mp
        WHERE mp.match_id = m.id
          AND mp.user_id = $1
      )
      AND m.winner_id IS NOT NULL

      ORDER BY m.created_at DESC
      `,
      [session.userId]
    );

    // Normalize match_id → id for frontend
    const ongoingMatches = ongoingMatchesRaw.map(m => ({
      ...m,
      id: m.match_id,
    }));

    const completedMatches = completedMatchesRaw.map(m => ({
      ...m,
      id: m.match_id,
    }));

    return (
      <div className="relative min-h-screen animate-fadeIn">
        <div className="relative z-10 max-w-5xl mx-auto p-6 space-y-10 text-white">

          {/* Create Match + Rules */}
          <section className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/2">
              <CreateMatchFormWrapper />
            </div>
            <div className="lg:w-1/2">
              <GameRulesCard />
            </div>
          </section>

          {/* Tabs */}
          <DashboardTabs
            ongoingMatches={ongoingMatches}
            completedMatches={completedMatches}
          />
        </div>
      </div>
    );

  } catch (error) {
    console.error('Dashboard load error:', error);
    redirect('/login');
  }
}
