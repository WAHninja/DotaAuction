/**
 * Selection rate — how often a player is chosen to be sold when their team
 * actually had a choice.
 *
 * The raw "times offered" count this replaces was close to meaningless, because
 * every member of the winning team must submit an offer naming a teammate. On a
 * two-player team there is exactly one legal target, so the offer carries no
 * information at all — it records that a rule was followed, not that anyone
 * formed a judgement.
 *
 * Two corrections follow from that:
 *
 *   Only offers from teams of three or more are counted, since those are the
 *   only ones where an alternative existed.
 *
 *   The result is expressed against chance rather than as a raw count. On a
 *   three-player team the offerer picks between two teammates, so being chosen
 *   half the time is unremarkable. Team sizes vary between and within matches,
 *   so the baseline is accumulated per opportunity (1/eligible) rather than
 *   assumed — a flat "50%" would misread anyone who played mostly on four- or
 *   five-player sides.
 *
 * A known confound, not corrected here: a player holding a lot of gold is
 * expensive to hand over, since the gold travels with them to the other team
 * next game. Being passed over may reflect a large bank rather than a low
 * opinion. game_player_stats carries per-game gold_change, so a running total
 * at offer time is derivable if this is ever worth controlling for.
 */

export type GameTeams = {
  id: number;
  team_1_members: number[];
  team_a_members: number[];
};

export type SelectionOfferRow = {
  game_id: number;
  from_player_id: number;
  target_player_id: number;
};

export type PlayerSelection = {
  /** Discretionary offers where this player was an available target. */
  opportunities: number;
  /** How many of those actually named them. */
  selections: number;
  /**
   * How many selections pure chance would have produced, given the team sizes
   * involved. Accumulated as 1/eligible per opportunity rather than assumed,
   * because team sizes vary — the baseline on a three-player side is 50% and on
   * a five-player side 25%.
   *
   * Exposed so the UI can put a real percentage beside the actual one. It was
   * previously used only to derive the index and then discarded, which left the
   * panel with nothing to show but an abstract multiplier.
   */
  expected: number;
  /**
   * Selections divided by the number expected from chance alone.
   *
   * 1.0 means exactly as often as random choice, 2.0 means twice as often,
   * 0 means never chosen despite being available. null when they have never
   * been in a discretionary situation — distinct from never being picked.
   */
  index: number | null;
};

/**
 * Per-player selection stats, keyed by player id.
 *
 * Offers on games not present in `games` are skipped: without the team rosters
 * there is no way to know whether a choice existed.
 */
export function computeSelectionRate(
  games: GameTeams[],
  offers: SelectionOfferRow[],
): Map<number, PlayerSelection> {
  const teamsByGame = new Map<number, number[][]>();
  for (const g of games) {
    teamsByGame.set(g.id, [g.team_1_members ?? [], g.team_a_members ?? []]);
  }

  const acc = new Map<number, { opps: number; picks: number; expected: number }>();
  const bucket = (id: number) => {
    let b = acc.get(id);
    if (!b) { b = { opps: 0, picks: 0, expected: 0 }; acc.set(id, b); }
    return b;
  };

  for (const offer of offers) {
    const teams = teamsByGame.get(offer.game_id);
    if (!teams) continue;

    const team = teams.find(t => t.includes(offer.from_player_id));
    if (!team) continue;

    // Eligible targets are the offerer's teammates — you cannot offer yourself.
    const eligible = team.filter(id => id !== offer.from_player_id);

    // Fewer than two options means the offer was forced. Skipping these is the
    // entire point: they would otherwise dominate the numbers on two-player
    // teams, where everyone is offered every single game.
    if (eligible.length < 2) continue;

    const share = 1 / eligible.length;
    for (const id of eligible) {
      const b = bucket(id);
      b.opps += 1;
      b.expected += share;
    }

    // Guarded rather than assumed: a target outside the offering team would
    // mean corrupt data, and silently counting it would inflate their index.
    if (eligible.includes(offer.target_player_id)) {
      bucket(offer.target_player_id).picks += 1;
    }
  }

  const out = new Map<number, PlayerSelection>();
  for (const [id, b] of acc) {
    out.set(id, {
      opportunities: b.opps,
      selections:    b.picks,
      expected:      +b.expected.toFixed(3),
      index:         b.expected > 0 ? +(b.picks / b.expected).toFixed(3) : null,
    });
  }
  return out;
}
