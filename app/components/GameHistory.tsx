'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { HistoryGame, TierLabel } from '@/types';

// ---- Tier badge -----------------------------------------------------------
const TIER_STYLES: Record<NonNullable<TierLabel>, string> = {
  Low:    'bg-blue-500/20 text-blue-300',
  Medium: 'bg-yellow-500/20 text-yellow-300',
  High:   'bg-red-500/20 text-red-300',
};

function TierBadge({ tier }: { tier: TierLabel | null }) {
  if (!tier) return <span className="text-slate-400">?</span>;
  return (
    <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${TIER_STYLES[tier]}`}>
      {tier}
    </span>
  );
}

// ---- Gold icon ------------------------------------------------------------
function Gold({ amount }: { amount: number }) {
  return (
    <>
      {amount}
      <Image
        src="/Gold_symbol.webp"
        alt="Gold"
        width={16}
        height={16}
        className="inline-block ml-1 align-middle"
      />
    </>
  );
}

// ---- Single game card -----------------------------------------------------
function GameCard({ game }: { game: HistoryGame }) {
  const [expanded, setExpanded] = useState(false);
  const acceptedOffer = game.offers.find((o) => o.status === 'accepted');

  return (
    <div
      className="mb-4 p-4 border border-slate-700 rounded-lg shadow bg-slate-800/60 cursor-pointer hover:bg-slate-800/80 transition-colors"
      onClick={() => setExpanded((v) => !v)}
    >
      <h3 className="text-xl font-semibold flex justify-between items-center">
        <span>Game #{game.gameNumber} – {game.status}</span>
        <button
          className="text-sm text-slate-400 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          {expanded ? 'Hide' : 'Show'} details
        </button>
      </h3>

      {/* Collapsed summary */}
      {!expanded && acceptedOffer && (
        <p className="mt-2 text-sm font-medium text-slate-300 flex items-center gap-1 flex-wrap">
          <span>{acceptedOffer.fromUsername} traded {acceptedOffer.targetUsername} for</span>
          {acceptedOffer.offerAmount != null ? (
            <Gold amount={acceptedOffer.offerAmount} />
          ) : (
            <TierBadge tier={acceptedOffer.tierLabel} />
          )}
          {acceptedOffer.tierLabel && acceptedOffer.offerAmount != null && (
            <TierBadge tier={acceptedOffer.tierLabel} />
          )}
        </p>
      )}

      {/* Expanded detail */}
      {expanded && (
        <>
          <div className="mt-2 text-sm text-slate-300">
            <strong className="text-white">Winner:</strong> {game.winningTeam || 'N/A'}<br />
            <strong className="text-white">Team A:</strong> {game.teamAMembers.join(', ')}<br />
            <strong className="text-white">Team 1:</strong> {game.team1Members.join(', ')}
          </div>

          {game.playerStats.length > 0 && (
            <div className="mt-4">
              <h4 className="font-bold text-white mb-2">Gold changes:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {game.playerStats
                  .filter((s) => s.reason === 'win_reward')
                  .map((stat) => (
                    <li key={stat.id}>
                      {stat.username ?? `Player#${stat.playerId}`}:
                      <span className="text-green-400 font-semibold ml-1">+{stat.goldChange}</span>
                      <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                      <span className="text-slate-400 ml-2">(win reward)</span>
                    </li>
                  ))}
                {game.playerStats
                  .filter((s) => s.reason === 'loss_penalty')
                  .map((stat) => (
                    <li key={stat.id}>
                      {stat.username ?? `Player#${stat.playerId}`}:
                      <span className="text-red-400 font-semibold ml-1">{stat.goldChange}</span>
                      <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                      <span className="text-slate-400 ml-2">(loss penalty)</span>
                    </li>
                  ))}
                {game.playerStats
                  .filter((s) => s.reason === 'offer_accepted' || s.reason === 'offer_gain')
                  .map((stat) => (
                    <li key={stat.id}>
                      {stat.username ?? `Player#${stat.playerId}`}:
                      <span className="text-blue-400 font-semibold ml-1">+{stat.goldChange}</span>
                      <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                      <span className="text-slate-400 ml-2">(offer accepted)</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {game.offers.length > 0 && (
            <div className="mt-4">
              <h4 className="font-bold text-white mb-2">Offers:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {game.offers.map((offer) => (
                  <li key={offer.id}>
                    {offer.fromUsername} offered {offer.targetUsername} for{' '}
                    {offer.offerAmount != null ? (
                      <>
                        <Gold amount={offer.offerAmount} />
                        {offer.tierLabel && (
                          <> (<TierBadge tier={offer.tierLabel} />)</>
                        )}
                      </>
                    ) : (
                      <TierBadge tier={offer.tierLabel} />
                    )}
                    {' '}(
                    <span className={`font-semibold ${
                      offer.status === 'accepted' ? 'text-green-400' :
                      offer.status === 'rejected' ? 'text-red-400' :
                      'text-slate-400'
                    }`}>
                      {offer.status}
                    </span>)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- Public component -----------------------------------------------------
export default function GameHistory({ history }: { history: HistoryGame[] }) {
  if (history.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>
      {[...history].reverse().map((game) => (
        <GameCard key={game.gameNumber} game={game} />
      ))}
    </section>
  );
}
