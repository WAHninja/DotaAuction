import { getSession } from '@/app/session';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import CreateMatchForm from '@/app/components/CreateMatchForm';
import DashboardTabs from '@/app/components/DashboardTabs';
import GameRulesCard from '@/app/components/GameRulesCard';
import HallOfFame from '@/app/components/HallOfFame';
import type { HallOfFameRecord } from '@/types';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    const [
      ongoingRes,
      completedRes,
      mostWinsRes,
      fewestGamesRes,
      biggestGoldUnderdogRes,
      biggestUnderdogRes,
    ] = await Promise.all([

      // ── Ongoing matches ──────────────────────────────────────────────────
      db.query(`
        SELECT
          m.id AS match_id,
          m.created_at,
          g.id AS game_id,
          g.status,
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

      // ── Hall of Fame #1: most match wins ─────────────────────────────────
      db.query(`
        SELECT u.username, COUNT(*) AS wins
        FROM matches m
        JOIN users u ON u.id = m.winner_id
        WHERE m.winner_id IS NOT NULL
        GROUP BY u.id, u.username
        ORDER BY wins DESC
        LIMIT 3
      `),

      // ── Hall of Fame #2: fewest games to win a match ─────────────────────
      //
      // Groups by m.id so the same player can appear multiple times if they
      // hold more than one of the top records — this is intentional.
      db.query(`
        SELECT u.username, COUNT(g.id) AS game_count
        FROM matches m
        JOIN users u ON u.id = m.winner_id
        JOIN games g ON g.match_id = m.id
        WHERE m.winner_id IS NOT NULL
        GROUP BY m.id, u.id, u.username
        ORDER BY game_count ASC
        LIMIT 3
      `),

      // ── Hall of Fame #3: biggest gold underdog win ────────────────────────
      //
      // Finds the match where the winner held the largest gold *deficit*
      // relative to the opposing team's total accumulated gold at the end.
      //
      // gold_diff = winner_team_gold − loser_team_gold
      // A large negative value = winner held much less gold = biggest underdog.
      // Ordered ASC so the largest deficit (most negative) ranks first.
      //
      // Groups by m.id so the same player can hold multiple top-3 records.
      db.query(`
        SELECT
          u.username,
          (
            SELECT COALESCE(SUM(mp.gold), 0)
            FROM UNNEST(
              CASE WHEN g.winning_team = 'team_1'
                THEN g.team_1_members ELSE g.team_a_members END
            ) AS uid
            JOIN match_players mp ON mp.user_id = uid AND mp.match_id = m.id
          ) -
          (
            SELECT COALESCE(SUM(mp.gold), 0)
            FROM UNNEST(
              CASE WHEN g.winning_team = 'team_1'
                THEN g.team_a_members ELSE g.team_1_members END
            ) AS uid
            JOIN match_players mp ON mp.user_id = uid AND mp.match_id = m.id
          ) AS gold_diff
        FROM matches m
        JOIN users u ON u.id = m.winner_id
        JOIN LATERAL (
          SELECT * FROM games g
          WHERE g.match_id = m.id
          ORDER BY g.id DESC
          LIMIT 1
        ) g ON true
        WHERE m.winner_id IS NOT NULL
        ORDER BY gold_diff ASC
        LIMIT 3
      `),

      // ── Hall of Fame #4: biggest underdog win ────────────────────────────
      //
      // Groups by m.id so the same player can hold multiple top-3 records.
      db.query(`
        SELECT
          u.username,
          array_length(
            CASE WHEN g.winning_team = 'team_1'
              THEN g.team_a_members ELSE g.team_1_members END, 1
          ) AS losing_size
        FROM matches m
        JOIN users u ON u.id = m.winner_id
        JOIN LATERAL (
          SELECT * FROM games g
          WHERE g.match_id = m.id
          ORDER BY g.id DESC
          LIMIT 1
        ) g ON true
        WHERE m.winner_id IS NOT NULL
        ORDER BY losing_size DESC
        LIMIT 3
      `),
    ]);

    // ── Normalise match rows ───────────────────────────────────────────────
    const ongoingMatches   = ongoingRes.rows.map(m => ({ ...m, id: m.match_id }));
    const completedMatches = completedRes.rows.map(m => ({ ...m, id: m.match_id }));

    // ── Shape Hall of Fame records (arrays of up to 3) ─────────────────────

    const mostMatchWins: HallOfFameRecord = mostWinsRes.rows.length
      ? mostWinsRes.rows.map(r => ({
          holder: r.username,
          stat: `${r.wins} ${Number(r.wins) === 1 ? 'win' : 'wins'}`,
        }))
      : null;

    const fewestGamesToWin: HallOfFameRecord = fewestGamesRes.rows.length
      ? fewestGamesRes.rows.map(r => ({
          holder: r.username,
          // "Won in N" is immediately self-explanatory as a record —
          // "3 games" reads as a count, not a feat.
          stat: `Won in ${r.game_count}`,
        }))
      : null;

    // gold_diff is negative when the winner held less gold than the loser —
    // i.e. they won despite a gold deficit. We display it signed so a reader
    // can see at a glance how large the disadvantage was.
    const biggestGoldUnderdog: HallOfFameRecord = biggestGoldUnderdogRes.rows.length
      ? biggestGoldUnderdogRes.rows.map(r => {
          const diff = Number(r.gold_diff);
          return {
            holder: r.username,
            stat: `${diff > 0 ? '+' : ''}${diff.toLocaleString()} gold`,
          };
        })
      : null;

    const biggestUnderdogWin: HallOfFameRecord = biggestUnderdogRes.rows.length
      ? biggestUnderdogRes.rows.map(r => ({
          holder: r.username,
          stat: `1v${r.losing_size}`,
        }))
      : null;

    return (
      <div className="relative min-h-screen animate-fadeIn">
        <div className="relative z-10 max-w-5xl mx-auto p-6 space-y-6 text-white">

          {/* ── Zone 1: Create Match + Rules (equal columns) ─────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CreateMatchForm currentUserId={session.userId} />
            <GameRulesCard />
          </section>

          {/* ── Zone 2: Hall of Fame (full-width 4-card strip) ───────────── */}
          <HallOfFame
            mostMatchWins={mostMatchWins}
            fewestGamesToWin={fewestGamesToWin}
            biggestGoldUnderdog={biggestGoldUnderdog}
            biggestUnderdogWin={biggestUnderdogWin}
          />

          {/* ── Zone 3: Match tabs ────────────────────────────────────────── */}
          {/*
            currentUsername pre-selects the signed-in user in the H2H picker
            inside StatsTab. If your session object doesn't have a username
            field, replace session.username with a quick db lookup:
              const { username } = (await db.query(
                'SELECT username FROM users WHERE id = $1', [session.userId]
              )).rows[0]
          */}
          <DashboardTabs
            ongoingMatches={ongoingMatches}
            completedMatches={completedMatches}
            currentUsername={session.username}
          />

        </div>
      </div>
    );

  } catch (error) {
    console.error('Dashboard load error:', error);
    redirect('/login');
  }
}
