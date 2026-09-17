/**
 * Teammate synergy — how often each pair of players wins when on the same side.
 *
 * The natural companion to head-to-head. In a league where rosters reshuffle
 * through trades every match, "who do I win with" is at least as interesting as
 * "who do I beat", and it was previously unanswerable: the app tracked players
 * against each other but never alongside each other.
 *
 * This also replaces Top Winning Combinations, which listed whole team
 * compositions. With a small player pool most full compositions appear once or
 * twice, so that list was mostly coincidences. Pairs recur far more often, so
 * they reach usable sample sizes while answering a sharper question.
 *
 * Both sides of every finished game are counted, not just the winners. A pair's
 * win rate needs its losses as the denominator; tallying only wins would rank
 * whoever simply played most.
 */

export type SynergyGameRow = {
  team_1_members: number[];
  team_a_members: number[];
  winning_team: 'team_1' | 'team_a' | null;
};

export type SynergyPair = {
  playerAId: number;
  playerBId: number;
  gamesTogether: number;
  winsTogether: number;
};

/**
 * Stable key for an unordered pair.
 *
 * Sorted numerically so (3, 7) and (7, 3) collapse to one bucket. Without that
 * every pair would be tallied twice under two keys, halving both counts and
 * leaving win rates intact but sample sizes wrong — a failure that looks
 * plausible enough to go unnoticed.
 */
function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function computeSynergy(games: SynergyGameRow[]): SynergyPair[] {
  const acc = new Map<string, { a: number; b: number; games: number; wins: number }>();

  for (const game of games) {
    // A game with no recorded winner contributes nothing: it cannot be counted
    // as a loss without misrepresenting it, and counting it as a game played
    // with no possible win would drag every pair's rate down.
    if (game.winning_team === null) continue;

    const sides: [number[], boolean][] = [
      [game.team_1_members ?? [], game.winning_team === 'team_1'],
      [game.team_a_members ?? [], game.winning_team === 'team_a'],
    ];

    for (const [members, won] of sides) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const a = members[i];
          const b = members[j];
          if (a === b) continue;

          const key = pairKey(a, b);
          let entry = acc.get(key);
          if (!entry) {
            entry = { a: Math.min(a, b), b: Math.max(a, b), games: 0, wins: 0 };
            acc.set(key, entry);
          }
          entry.games += 1;
          if (won) entry.wins += 1;
        }
      }
    }
  }

  return Array.from(acc.values()).map(e => ({
    playerAId:     e.a,
    playerBId:     e.b,
    gamesTogether: e.games,
    winsTogether:  e.wins,
  }));
}
