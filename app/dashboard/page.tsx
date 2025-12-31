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
    /* ===============================
       Shared SQL: Latest Game Per Match
    =============================== */
    const latestGameJoin = `
      JOIN LATERAL (
        SELECT *
        FROM games g
        WHERE g.match_id = m.id
        ORDER BY g.id DESC
        LIMIT 1
      ) g ON true
    `;

    /* ===============================
       Shared SQL: Team Username Mapping
    =============================== */
    const teamUsernameSelect = `
      (
        SELECT ARRAY_AGG(u2.username ORDER BY u2.username)
        FROM UNNEST(g.team_a_members) AS id
        JOIN users u2 ON u2.id = id
      ) AS team_a_usernames,

      (
        SELECT ARRAY_AGG(u3.username ORDER BY u3.username)
        FROM UNNEST(g.team_1_members) AS id
        JOIN users u3 ON u3.id = id
      ) AS team_1_usernames
    `;

    /* ===============================
       Ongoing Matches
    =============================== */
    const ongoingResult = await db.query(
      `
      SELECT
        m.id,
        m.created_at,
        ${teamUsernameSelect}

      FROM matches m
      ${latestGameJoin}

      WHERE m.id IN (
        SELECT match_id FROM match_players WHERE user_id = $1
      )
      AND m.winner_id IS NULL

      ORDER BY m.created_at DESC
      `,
      [session.userId]
    );

    /* ===============================
       Completed Matches
    =============================== */
    const completedResult = await db.query(
      `
      SELECT
        m.id,
        m.created_at,
        m.winner_id,
        wu.username AS winner_username,
        ${teamUsernameSelect}

      FROM matches m
      ${latestGameJoin}
      LEFT JOIN users wu ON wu.id = m.winner_id

      WHERE m.id IN (
        SELECT match_id FROM match_players WHERE user_id = $1
      )
      AND m.winner_id IS NOT NULL

      ORDER BY m.created_at DESC
      `,
      [session.userId]
    );

    return (
      <div className="relative min-h-screen animate-fadeIn">
        <div className="relative z-10 max-w-5xl mx-auto p-6 space-y-10 text-white">

          {/* ===== Create Match + Rules ===== */}
          <section className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/2">
              <CreateMatchFormWrapper />
            </div>
            <div className="lg:w-1/2">
              <GameRulesCard />
            </div>
          </section>

          {/* ===== Matches ===== */}
          <DashboardTabs
            ongoingMatches={ongoingResult.rows}
            completedMatches={completedResult.rows}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Dashboard load error:', error);
    redirect('/login');
  }
}
