'use client';

import { Coins, Info } from 'lucide-react';
import type { PlayerStats } from '@/types';
import {
  MIN_OFFERS_FOR_STRENGTH,
  MIN_SELECTION_OPPORTUNITIES,
} from '@/lib/stats/constants';
import { pct, formatStrength } from '@/lib/stats/format';
import { GLOSSARY } from '@/lib/stats/glossary';
import Tooltip from '@/app/components/stats/ui/Tooltip';

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
 */
export default function AuctionPanel({ core }: { core: PlayerStats }) {
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
            label="Market value"
            value={hasStrengthSample ? formatStrength(core.offerStrengthReceived) : '—'}
            sub={hasStrengthSample ? 'how highly others price you' : `needs ${MIN_OFFERS_FOR_STRENGTH} offers`}
            hint={GLOSSARY.marketValue}
            hintId="au-market"
          />

          <Figure
            label="Picked when a choice"
            value={hasSelectionSample ? `${pct(core.selectionCount, core.selectionOpportunities)}%` : '—'}
            sub={
              hasSelectionSample
                ? `${core.selectionCount} of ${core.selectionOpportunities} · chance ${pct(core.selectionExpected, core.selectionOpportunities)}%`
                : `needs ${MIN_SELECTION_OPPORTUNITIES} real choices`
            }
            hint={GLOSSARY.selection}
            hintId="au-selection"
          />

          <Figure
            label="Times sold"
            value={String(core.timesSold)}
            sub={`from ${core.timesOffered} offers received`}
            hint={GLOSSARY.timesSold}
            hintId="au-sold"
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
            hint={GLOSSARY.offerAcceptRate}
            hintId="au-accept"
          />

          <Figure
            label="Asking price"
            value={hasStrengthSample ? formatStrength(core.offerStrengthMade) : '—'}
            sub={hasStrengthSample ? 'how high you price others' : `needs ${MIN_OFFERS_FOR_STRENGTH} offers`}
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
            hint={GLOSSARY.acceptedAskingPrice}
            hintId="au-accepted"
          />
        </div>
      </div>
    </section>
  );
}

/** One labelled figure with an explanatory sub-line and a hover definition. */
function Figure({ label, value, sub, hint, hintId }: {
  label: string;
  value: string;
  sub: string;
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
    </div>
  );
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
