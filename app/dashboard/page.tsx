import { getSession } from '@/app/session';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import CreateMatchForm from '@/app/components/CreateMatchForm';
import DashboardTabs from '@/app/components/DashboardTabs';
import GameRulesCard from '@/app/components/GameRulesCard';
import HallOfFame from '@/app/components/HallOfFame';
import type { HallOfFameRecord } from '@/app/components/HallOfFame';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    const [
      ongoingRes,
      completedRes,
      mostWinsRes,
      fewestGamesRes,
      closestGoldRes,
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
        LIMIT 1
      `),

      // ── Hall of Fame #2: fewest games to win a match ─────────────────────
      db.query(`
        SELECT u.username, COUNT(g.id) AS game_count
        FROM matches m
        JOIN users u ON u.id = m.winner_id
        JOIN games g ON g.match_id = m.id
        WHERE m.winner_id IS NOT NULL
        GROUP BY m.id, u.id, u.username
        ORDER BY game_count ASC
        LIMIT 1
      `),

      // ── Hall of Fame #3: closest gold victory ────────────────────────────
      // Uses the final game of each completed match. Sums match_players.gold
      // for every member of the winning team and every member of the losing
      // team, then takes the absolute difference. The smallest difference
      // across all completed matches is the "closest" win by gold.
      db.query(`
        SELECT
          u.username,
          ABS(
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
            )
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
        LIMIT 1
      `),

      // ── Hall of Fame #4: biggest underdog win ────────────────────────────
      // The match winner is always a solo player in the final game, so
      // winning_size is always 1. The underdog factor is simply how many
      // players were on the opposing team in that final game. Holder is the
      // match winner's username.
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
        LIMIT 1
      `),
    ]);

    // ── Normalise match rows ───────────────────────────────────────────────
    const ongoingMatches   = ongoingRes.rows.map(m => ({ ...m, id: m.match_id }));
    const completedMatches = completedRes.rows.map(m => ({ ...m, id: m.match_id }));

    // ── Shape Hall of Fame records ─────────────────────────────────────────
    const mostMatchWins: HallOfFameRecord = mostWinsRes.rows[0]
      ? {
          holder: mostWinsRes.rows[0].username,
          stat:   `${mostWinsRes.rows[0].wins} ${Number(mostWinsRes.rows[0].wins) === 1 ? 'win' : 'wins'}`,
          detail: 'Most match victories across all time',
        }
      : null;

    const fewestGamesToWin: HallOfFameRecord = fewestGamesRes.rows[0]
      ? {
          holder: fewestGamesRes.rows[0].username,
          stat:   `${fewestGamesRes.rows[0].game_count} ${Number(fewestGamesRes.rows[0].game_count) === 1 ? 'game' : 'games'}`,
          detail: 'Fewest games needed to win a match',
        }
      : null;

    const closestGoldWin: HallOfFameRecord = closestGoldRes.rows[0]
      ? {
          holder: closestGoldRes.rows[0].username,
          stat:   `${Number(closestGoldRes.rows[0].gold_diff).toLocaleString()} gold`,
          detail: 'Smallest total gold gap between teams in the final game',
        }
      : null;

    const biggestUnderdogWin: HallOfFameRecord = biggestUnderdogRes.rows[0]
      ? {
          holder: biggestUnderdogRes.rows[0].username,
          stat:   `1v${biggestUnderdogRes.rows[0].losing_size}`,
          detail: `Defeated a team of ${biggestUnderdogRes.rows[0].losing_size} to win the match`,
        }
      : null;

    return (
      <div className="relative min-h-screen animate-fadeIn">
        <div className="relative z-10 max-w-5xl mx-auto p-6 space-y-10 text-white">

          {/* Create Match + Rules + Hall of Fame */}
          <section className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/2">
              <CreateMatchForm />
            </div>
            <div className="lg:w-1/2 flex flex-col gap-6">
              <GameRulesCard />
              <HallOfFame
                mostMatchWins={mostMatchWins}
                fewestGamesToWin={fewestGamesToWin}
                closestGoldWin={closestGoldWin}
                biggestUnderdogWin={biggestUnderdogWin}
              />
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
