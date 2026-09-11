/**
 * Recent form — each player's last N results, most recent last.
 *
 * The first time-aware figure in the app. Everything else is an all-time
 * aggregate, which means a player who has improved sharply looks identical to
 * one who peaked a year ago, and a recurring group has no reason to check the
 * page between sessions because nothing they see will have visibly moved.
 *
 * Deliberately raw results rather than a recent win rate. "W L W W L" shows
 * both the rate and the shape of it — three wins in a row reads differently
 * from three wins scattered through a slump — and at a sample this small a
 * percentage would imply a precision the data does not support.
 */

export type FormGameRow = {
  id: number;
  team_1_members: number[];
  team_a_members: number[];
  winning_team: 'team_1' | 'team_a' | null;
};

export type FormResult = 'W' | 'L';

/** How many recent games to keep per player. */
export const FORM_LENGTH = 10;

/**
 * Per-player recent results, keyed by player id.
 *
 * Games are sorted by id here rather than relying on the caller's ordering.
 * Form is the one stat where order *is* the value, so it should not depend on
 * a query's ORDER BY clause surviving a future edit.
 *
 * Games with no recorded winner are skipped: they are neither a win nor a loss,
 * and inserting them as losses would punish players for abandoned games.
 */
export function computeRecentForm(
  games: FormGameRow[],
  limit: number = FORM_LENGTH,
): Map<number, FormResult[]> {
  const ordered = [...games].sort((a, b) => a.id - b.id);
  const out = new Map<number, FormResult[]>();

  const push = (id: number, result: FormResult) => {
    const list = out.get(id);
    if (list) list.push(result);
    else out.set(id, [result]);
  };

  for (const game of ordered) {
    if (game.winning_team === null) continue;

    for (const id of game.team_1_members ?? []) {
      push(id, game.winning_team === 'team_1' ? 'W' : 'L');
    }
    for (const id of game.team_a_members ?? []) {
      push(id, game.winning_team === 'team_a' ? 'W' : 'L');
    }
  }

  // Trim to the most recent `limit`, preserving chronological order so the
  // rightmost entry is the latest game — the convention every football table
  // uses, and the one readers will assume regardless of what we choose.
  for (const [id, list] of out) {
    if (list.length > limit) out.set(id, list.slice(-limit));
  }

  return out;
}
