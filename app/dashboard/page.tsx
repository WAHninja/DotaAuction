import { getSession } from '@/app/session';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import CreateMatchForm from '@/app/components/CreateMatchForm';
import DashboardTabs from '@/app/components/DashboardTabs';
import GameRulesCard from '@/app/components/GameRulesCard';
import HallOfFame from '@/app/components/HallOfFame';
import JitsiPreloader from '@/app/components/JitsiPreloader';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    const [
      ongoingRes,
      completedRes,
    ] = await Promise.all([

      // ── Ongoing matches ──────────────────────────────────────────────────
      // games_count replaces the /api/match/[id]/games-played endpoint.
      // COUNT(*) includes all games for the match (finished + current in-progress),
      // which matches the old endpoint's behaviour exactly.
      db.query(`
        SELECT
          m.id AS match_id,
          m.created_at,
          g.id AS game_id,
          g.status,
          (
            SELECT COUNT(*)::int
            FROM games g2
            WHERE g2.match_id = m.id
          ) AS games_count,
          (
            SELECT ARRAY_AGG(u2.username ORDER BY u2.username)
            FROM UNNEST(g.team_a_members) AS uid
            JOIN users u2 ON u2.id = uid
          ) AS team_a_usernames,
          (
            SELECT ARRAY_AGG(u3.username ORDER BY u3.username)
            FROM UNNEST(g.team_1_members) AS uid
            JOIN users u3 ON u3.id = uid
          ) AS team_1_usernames
        FROM matches m
        JOIN LATERAL (
          SELECT * FROM games g
          WHERE g.match_id = m.id
          ORDER BY g.id DESC
          LIMIT 1
        ) g ON true
        WHERE m.winner_id IS NULL
        ORDER BY m.created_at DESC
      `),

      // ── Completed matches ────────────────────────────────────────────────
      db.query(`
        SELECT
          m.id AS match_id,
          m.created_at,
          m.winner_id,
          u_winner.username AS winner_username,
          g.id AS game_id,
          (
            SELECT ARRAY_AGG(u2.username ORDER BY u2.username)
            FROM UNNEST(g.team_a_members) AS uid
            JOIN users u2 ON u2.id = uid
          ) AS team_a_usernames,
          (
            SELECT ARRAY_AGG(u3.username ORDER BY u3.username)
            FROM UNNEST(g.team_1_members) AS uid
            JOIN users u3 ON u3.id = uid
          ) AS team_1_usernames
        FROM matches m
        JOIN users u_winner ON u_winner.id = m.winner_id
        JOIN LATERAL (
          SELECT * FROM games g
          WHERE g.match_id = m.id
          ORDER BY g.id DESC
          LIMIT 1
        ) g ON true
        WHERE m.winner_id IS NOT NULL
        ORDER BY m.created_at DESC
      `),

    ]);

    // ── Normalise match rows ───────────────────────────────────────────────
    const ongoingMatches   = ongoingRes.rows.map(m => ({ ...m, id: m.match_id }));
    const completedMatches = completedRes.rows.map(m => ({ ...m, id: m.match_id }));

    // ── Shape Hall of Fame records (arrays of up to 3) ─────────────────────


    return (
      <div className="relative min-h-screen animate-fadeIn">
        {/* Preloads the Jitsi script and warms the token cache as soon as the
            dashboard mounts — before the user has clicked Join Voice Chat. */}
        <JitsiPreloader />

        <div className="relative z-10 space-y-6 text-white">

          {/* ── Zone 1: Create Match + Rules (equal columns) ─────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CreateMatchForm currentUserId={session.userId} />
            <GameRulesCard />
          </section>

          {/* ── Zone 2: Hall of Fame (full-width 4-card strip) ───────────── */}
          <HallOfFame />

          {/* ── Zone 3: Match tabs ────────────────────────────────────────── */}
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
