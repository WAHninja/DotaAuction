'use client';

import { Coins, Info } from 'lucide-react';
import type { PlayerStats } from '@/types';
import {
  MIN_OFFERS_FOR_STRENGTH,
  MIN_SELECTION_OPPORTUNITIES,
} from '@/lib/stats/constants';
import { pct, formatStrength } from '@/lib/stats/format';
import { GLOSSARY } from '@/lib/stats/glossary';
import { rankOf, leagueAverage, type Rank } from '@/lib/stats/select';
import Tooltip from '@/app/components/stats/ui/Tooltip';
import { ordinal } from '@/app/components/stats/ui/StatWithRank';

/**
 * A player's whole auction standing, both sides of the market in one place.
 *
 * Replaces the separate Economy and Selection panels. The split between them was
 * arbitrary: "how often am I chosen to sell" lived in Selection while "how often
 * am I sold" lived in Economy, yet those are the two ends of one event. A reader
 * had to visit two panels to learn one thing.
 *
 * Framed as the two roles a player plays in the market:
 *
 *   As the goods — what teammates think you are worth, how often they pick you
 *   when they have a choice, how often that ends in a sale.
 *
 *   As the trader — how you price the teammates you sell, whether your offers
 *   are accepted at any price or only when cheap, and how often they land.
 *
 * The gold-controlled selection breakdown that Selection used to show in full
 * moves to a one-line footnote — it is a caveat on the selection figure, not a
 * headline in its own right, and giving it two columns overstated it.
 *
 * Every rate figure here also carries its league rank and average, the same
 * treatment YouCard and the player header already give market value — a bare
 * "55%" says nothing about whether that's good, and the infrastructure for
 * this (lib/stats/select's rankOf/leagueAverage) already existed and was just
 * unused here. Times sold is the one exception: it's a raw count rather than
 * a rate, so ranking it would mostly measure who's played the most, which is
 * why the player header doesn't rank it either.
 */
export default function AuctionPanel({ core, players }: { core: PlayerStats; players: PlayerStats[] }) {
  const name = core.username;

  // Renders nothing for a player who has neither sold nor been sold — four
  // dashes read as failure rather than as "no auction history".
  if (core.offersMade === 0 && core.timesOffered === 0) return null;

  const hasStrengthSample = core.offersMade >= MIN_OFFERS_FOR_STRENGTH;
  const hasSelectionSample = core.selectionOpportunities >= MIN_SELECTION_OPPORTUNITIES;

  // Gold-controlled selection: is the rate driven by opinion or by how
  // expensive this player is to give away? A one-line verdict only.
  const MIN_PER_BUCKET = 5;
  const hasSplit =
    core.selectionRichOpportunities >= MIN_PER_BUCKET &&
    core.selectionPoorOpportunities >= MIN_PER_BUCKET;
  const goldGap =
    pct(core.selectionPoorCount, core.selectionPoorOpportunities) -
    pct(core.selectionRichCount, core.selectionRichOpportunities);

  // ── League context for each rate figure ───────────────────────────────────
  // Each is scoped to players who clear the same sample threshold the figure
  // itself needs before it's shown — otherwise someone with one flattering
  // offer could outrank a player with a genuine track record.

  const strengthQualified = players.filter(
    p => p.offersMade >= MIN_OFFERS_FOR_STRENGTH,
  );
  const marketQualified = strengthQualified.filter(p => p.offerStrengthReceived !== null);
  const marketRank = rankOf(marketQualified, p => p.username === name, p => p.offerStrengthReceived ?? 0);
  const marketAvg  = leagueAverage(marketQualified, p => p.offerStrengthReceived ?? 0);

  const selectionQualified = players.filter(
    p => p.selectionOpportunities >= MIN_SELECTION_OPPORTUNITIES,
  );
  const selectionRank = rankOf(selectionQualified, p => p.username === name, p => pct(p.selectionCount, p.selectionOpportunities));
  const selectionAvg  = leagueAverage(selectionQualified, p => pct(p.selectionCount, p.selectionOpportunities));

  const acceptQualified = strengthQualified;
  const acceptRank = rankOf(acceptQualified, p => p.username === name, p => pct(p.offersAccepted, p.offersMade));
  const acceptAvg  = leagueAverage(acceptQualified, p => pct(p.offersAccepted, p.offersMade));

  const askingQualified = strengthQualified.filter(p => p.offerStrengthMade !== null);
  const askingRank = rankOf(askingQualified, p => p.username === name, p => p.offerStrengthMade ?? 0);
  const askingAvg  = leagueAverage(askingQualified, p => p.offerStrengthMade ?? 0);

  const acceptedAtQualified = strengthQualified.filter(p => p.offerStrengthAccepted !== null);
  const acceptedAtRank = rankOf(acceptedAtQualified, p => p.username === name, p => p.offerStrengthAccepted ?? 0);
  const acceptedAtAvg  = leagueAverage(acceptedAtQualified, p => p.offerStrengthAccepted ?? 0);

  return (
    <section className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <Coins className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Auction</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            How the market treats {name}, and how {name} trades in it
          </p>
        </div>
      </div>

      {/* ── As the goods ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3">
        <p className="stat-label mb-2">Being sold</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Figure
            label="Times sold"
            value={String(core.timesSold)}
            sub={`from ${core.timesOffered} offers received`}
            hint={GLOSSARY.timesSold}
            hintId="au-sold"
          />

          <Figure
            label="Market value"
            value={hasStrengthSample ? formatStrength(core.offerStrengthReceived) : '—'}
            sub={hasStrengthSample ? 'how highly others price you' : `needs ${MIN_OFFERS_FOR_STRENGTH} offers`}
            context={hasStrengthSample ? contextLine(marketRank, marketAvg, formatStrength) : undefined}
            hint={GLOSSARY.marketValue}
            hintId="au-market"
          />

          <Figure
            label="Picked when a choice"
            value={hasSelectionSample ? `${pct(core.selectionCount, core.selectionOpportunities)}%` : '—'}
            sub={
              hasSelectionSample
                ? `${core.selectionCount} of ${core.selectionOpportunities} · ${indexText(core.selectionIndex)}`
                : `needs ${MIN_SELECTION_OPPORTUNITIES} real choices`
            }
            context={hasSelectionSample ? contextLine(selectionRank, selectionAvg, pctText) : undefined}
            hint={GLOSSARY.selection}
            hintId="au-selection"
          />
        </div>

        {/* Gold control on the selection figure — a caveat, not a headline. */}
        {hasSelectionSample && hasSplit && (
          <p className="font-barlow text-[11px] text-dota-text-dim mt-3">
            {goldGap >= 15
              ? `Teammates avoid selling ${name} while ${name} is holding gold, so the figure above is partly about the bank, not their opinion.`
              : goldGap <= -15
                ? `${name} is offered more often as the expensive option — the opposite of what gold alone would predict.`
                : `Gold makes little difference to how often ${name} is picked, so the figure reflects the choice rather than the price.`}
          </p>
        )}
      </div>

      {/* ── As the trader ───────────────────────────────────────────────── */}
      <div className="px-5 pt-2 pb-4 border-t border-dota-border/40">
        <p className="stat-label mb-2 mt-2">Selling teammates</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Figure
            label="Offers accepted"
            value={core.offersMade > 0 ? `${pct(core.offersAccepted, core.offersMade)}%` : '—'}
            sub={core.offersMade > 0 ? `${core.offersAccepted} of ${core.offersMade}` : 'no offers made'}
            // Ranked only once the sample clears the same bar market value and
            // asking price need — below that, a rank off two or three offers
            // would be noise dressed up as a league standing.
            context={hasStrengthSample ? contextLine(acceptRank, acceptAvg, pctText) : undefined}
            hint={GLOSSARY.offerAcceptRate}
            hintId="au-accept"
          />

          <Figure
            label="Asking price"
            value={hasStrengthSample ? formatStrength(core.offerStrengthMade) : '—'}
            sub={hasStrengthSample ? 'how high you price others' : `needs ${MIN_OFFERS_FOR_STRENGTH} offers`}
            context={hasStrengthSample ? contextLine(askingRank, askingAvg, formatStrength) : undefined}
            hint={GLOSSARY.askingPrice}
            hintId="au-asking"
          />

          <Figure
            label="Accepted at"
            value={
              hasStrengthSample && core.offerStrengthAccepted !== null
                ? formatStrength(core.offerStrengthAccepted)
                : '—'
            }
            // The contrast is the whole point, so it is stated inline rather
            // than left for the reader to compute against the tile beside it.
            sub={acceptedContrast(core)}
            context={
              hasStrengthSample && core.offerStrengthAccepted !== null
                ? contextLine(acceptedAtRank, acceptedAtAvg, formatStrength)
                : undefined
            }
            hint={GLOSSARY.acceptedAskingPrice}
            hintId="au-accepted"
          />
        </div>
      </div>
    </section>
  );
}

/** One labelled figure with an explanatory sub-line and a hover definition. */
function Figure({ label, value, sub, context, hint, hintId }: {
  label: string;
  value: string;
  sub: string;
  /** Pre-formatted "3rd of 12 · avg 48%" league-context line, omitted below
   *  sample size. Separate from `sub`, which explains what the number means
   *  rather than where it stands. */
  context?: string;
  hint: string;
  hintId: string;
}) {
  return (
    <div className="min-w-0">
      <Tooltip id={hintId} content={hint}>
        <span
          className="stat-label inline-flex items-center gap-1 cursor-help"
          tabIndex={0}
          aria-describedby={hintId}
        >
          {label}
          <Info className="w-3 h-3 opacity-40 shrink-0" aria-hidden="true" />
        </span>
      </Tooltip>
      <p className="font-barlow text-xl font-bold text-dota-text tabular-nums mt-0.5">{value}</p>
      <p className="font-barlow text-[11px] text-dota-text-dim mt-0.5">{sub}</p>
      {context && (
        <p className="font-barlow text-[11px] text-dota-text-dim/70 tabular-nums">{context}</p>
      )}
    </div>
  );
}

/**
 * "3rd of 12 · avg 48%" — the same rank/average phrasing StatWithRank uses,
 * for panels that need it alongside a sub-line StatWithRank has no room for.
 * Either half is optional so a stat with a rank but no comparable average
 * (or vice versa) still renders the half it has.
 */
function contextLine(rank: Rank | null, avg: number | null, formatAvg: (n: number) => string): string | undefined {
  if (!rank && avg === null) return undefined;
  const parts: string[] = [];
  if (rank) parts.push(`${ordinal(rank.position)} of ${rank.outOf}`);
  if (avg !== null) parts.push(`avg ${formatAvg(avg)}`);
  return parts.join(' · ');
}

/** Formats a pct()-scale number (0–100) the way the panel's percentages read
 *  elsewhere, for use as contextLine's formatAvg on rate figures that are
 *  already percentages rather than offer-strength proportions. */
function pctText(n: number): string {
  return `${Math.round(n)}%`;
}

/** "1.4x expected" / "0.6x expected" — the selection index as a single
 *  reader-facing ratio, replacing a raw "chance 41.2%" the reader had to
 *  divide against the headline percentage themselves to interpret. */
function indexText(index: number | null): string {
  return index === null ? 'no chance baseline yet' : `${index.toFixed(2)}x expected`;
}

/**
 * Whether accepted offers came in below the average ask.
 *
 * The point of showing accepted price beside asking price: a figure well below
 * the ask means the team only backs cheap offers.
 */
function acceptedContrast(core: PlayerStats): string {
  if (core.offerStrengthMade === null || core.offerStrengthAccepted === null) {
    return 'no accepted offers yet';
  }
  const gap = Math.round((core.offerStrengthMade - core.offerStrengthAccepted) * 100);
  if (gap >= 10) return 'accepted well below the ask';
  if (gap <= -10) return 'accepted above the ask';
  return 'accepted near the ask';
}
