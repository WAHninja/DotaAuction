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
 * ── The gold confound, and how it is now measured ───────────────────────────
 *
 * A player sitting on a large bank is expensive to hand over. accept-offer
 * credits the sale price to the seller alone, and the sold player keeps their
 * own gold while joining the opposition's roster — so selling a rich teammate
 * hands the other side their pile, and one win condition is crossing 100,000.
 *
 * That gives a low selection rate two readings the headline number cannot tell
 * apart: nobody wants to lose you, or nobody can afford to give you away. Close
 * to opposite compliments.
 *
 * Rather than leave that unresolved, each opportunity is also bucketed by
 * whether the player was among the richer or poorer of the teammates who could
 * have been offered. If the rate collapses when they are the expensive option,
 * gold is doing the explaining. If it holds steady across both, the stat means
 * what it claims and the panel can stop hedging.
 *
 * Bucketing by position within that offer, not by absolute gold: what matters
 * is whether you were the pricey choice *on that occasion*, and everyone is
 * rich by game twelve of a long match.
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

/** gameId -> playerId -> gold held entering that game. */
export type SelectionGoldTimeline = Map<number, Map<number, number>>;

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
  /** Opportunities where this player was among the richer eligible teammates. */
  richOpportunities: number;
  /** How many of those named them. */
  richSelections: number;
  /** Opportunities where they were among the poorer eligible teammates. */
  poorOpportunities: number;
  /** How many of those named them. */
  poorSelections: number;
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
  goldTimeline?: SelectionGoldTimeline,
): Map<number, PlayerSelection> {
  const teamsByGame = new Map<number, number[][]>();
  for (const g of games) {
    teamsByGame.set(g.id, [g.team_1_members ?? [], g.team_a_members ?? []]);
  }

  const acc = new Map<number, {
    opps: number; picks: number; expected: number;
    richOpps: number; richPicks: number;
    poorOpps: number; poorPicks: number;
  }>();
  const bucket = (id: number) => {
    let b = acc.get(id);
    if (!b) {
      b = { opps: 0, picks: 0, expected: 0, richOpps: 0, richPicks: 0, poorOpps: 0, poorPicks: 0 };
      acc.set(id, b);
    }
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

    // Median of the eligible players' banks. With two candidates this is the
    // midpoint, so one is richer and one poorer — exactly the comparison that
    // matters. Players level with the median go in neither bucket rather than
    // being assigned arbitrarily.
    const gold = goldTimeline?.get(offer.game_id);
    const banks = eligible.map(id => Math.max(0, gold?.get(id) ?? 0)).sort((a, b) => a - b);
    const mid = banks.length === 0 ? 0
      : banks.length % 2
        ? banks[(banks.length - 1) / 2]
        : (banks[banks.length / 2 - 1] + banks[banks.length / 2]) / 2;

    const share = 1 / eligible.length;
    for (const id of eligible) {
      const b = bucket(id);
      b.opps += 1;
      b.expected += share;

      if (gold) {
        const own = Math.max(0, gold.get(id) ?? 0);
        if (own > mid) b.richOpps += 1;
        else if (own < mid) b.poorOpps += 1;
      }
    }

    // Guarded rather than assumed: a target outside the offering team would
    // mean corrupt data, and silently counting it would inflate their index.
    if (eligible.includes(offer.target_player_id)) {
      const b = bucket(offer.target_player_id);
      b.picks += 1;

      if (gold) {
        const own = Math.max(0, gold.get(offer.target_player_id) ?? 0);
        if (own > mid) b.richPicks += 1;
        else if (own < mid) b.poorPicks += 1;
      }
    }
  }

  const out = new Map<number, PlayerSelection>();
  for (const [id, b] of acc) {
    out.set(id, {
      opportunities: b.opps,
      selections:    b.picks,
      richOpportunities: b.richOpps,
      richSelections:    b.richPicks,
      poorOpportunities: b.poorOpps,
      poorSelections:    b.poorPicks,
      expected:      +b.expected.toFixed(3),
      index:         b.expected > 0 ? +(b.picks / b.expected).toFixed(3) : null,
    });
  }
  return out;
}
