'use client';

import { useEffect, useState } from 'react';

export default function GameRulesCard() {
  const [showGoldHelp, setShowGoldHelp] = useState(false);
  const [showOfferHelp, setShowOfferHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowGoldHelp(false);
        setShowOfferHelp(false);
      }
    };

    if (showGoldHelp || showOfferHelp) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showGoldHelp, showOfferHelp]);

  return (
    <>
      <div className="p-5 bg-slate-700/60 rounded-xl border border-slate-500 shadow-md max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-yellow-400 text-center mb-4">
          Match Rules
        </h2>

        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-200">
          <li>
            Matches require <strong>4 or more players</strong>.
          </li>

          <li>
            Once a game is completed, <strong>select the winning team</strong>.
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                All players of the losing team lose{' '}
                <strong>half of their current gold</strong>.
              </li>
              <li>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span>
                    All winning team members receive{' '}
                    <strong>1000 gold</strong> plus a share of{' '}
                    <strong>half of the losing team's total gold</strong>.
                  </span>
                  <button
                    onClick={() => setShowGoldHelp(true)}
                    className="shrink-0 w-6 h-6 text-xs font-bold text-yellow-400 border border-yellow-400 rounded-full flex items-center justify-center hover:bg-yellow-400 hover:text-black transition"
                    aria-label="Gold calculation help"
                  >
                    ?
                  </button>
                </div>
              </li>
            </ul>
          </li>

          <li>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span>
                Each player on the winning team submits{' '}
                <strong>a secret gold offer</strong> to sell one of their{' '}
                <strong>own teammates</strong> to the losing team.
              </span>
              <button
                onClick={() => setShowOfferHelp(true)}
                className="shrink-0 w-6 h-6 text-xs font-bold text-yellow-400 border border-yellow-400 rounded-full flex items-center justify-center hover:bg-yellow-400 hover:text-black transition"
                aria-label="Offer submission help"
              >
                ?
              </button>
            </div>
          </li>

          <li>
            The losing team reviews all offers, but only sees each offer as{' '}
            <strong>Low</strong>, <strong>Medium</strong>, or <strong>High</strong> —
            not the exact amount.
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                The losing team <strong>accepts one offer</strong>. The exact
                gold amount is revealed only after accepting.
              </li>
              <li>
                The player who made the accepted offer{' '}
                <strong>receives the gold</strong>.
              </li>
              <li>
                The player who was offered is{' '}
                <strong>moved to the losing team</strong>.
              </li>
            </ul>
          </li>

          <li>
            The match ends when a player wins a game while{' '}
            <strong>on a team by themselves</strong>.
          </li>
        </ul>
      </div>

      {/* ===== Gold Help Modal ===== */}
      {showGoldHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowGoldHelp(false)}
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-xl max-w-md w-full p-6 text-white shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              Gold Distribution Explained
            </h3>

            <div className="space-y-4 text-sm text-slate-200 leading-relaxed">
              <p>
                When a game ends, the winning team earns gold in{' '}
                <strong>two steps</strong>:
              </p>

              <ul className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Base reward:</strong> Each winning player
                  receives <strong>1000 gold</strong>.
                </li>
                <li>
                  <strong>Shared bonus:</strong> Half of the losing
                  team's remaining gold is split evenly among the
                  winning team.
                </li>
              </ul>

              <div className="bg-slate-900/60 p-3 rounded-md border border-slate-700">
                <p className="font-semibold mb-1">Example</p>
                <p>Losing team total gold: <strong>4000</strong></p>
                <p>Half of total: <strong>2000</strong></p>
                <p>Winning team size: <strong>4 players</strong></p>
                <p className="mt-2">
                  Each winner receives: 1000 + (2000 ÷ 4) ={' '}
                  <strong>1500 gold</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGoldHelp(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg"
              aria-label="Close gold help modal"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ===== Offer Help Modal ===== */}
      {showOfferHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowOfferHelp(false)}
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-xl max-w-md w-full p-6 text-white shadow-xl relative overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              Offers Explained
            </h3>

            <div className="space-y-5 text-sm text-slate-200 leading-relaxed">

              {/* How offers work */}
              <div>
                <p className="font-semibold text-white mb-2">How it works</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Each player on the winning team picks a teammate to
                    sell and names a gold price. If their offer is
                    accepted, <strong>they receive that gold</strong> and
                    the offered player moves to the losing team.
                  </li>
                  <li>
                    The gold amount must fall within the allowed range for
                    the current game. The range increases each game —
                    minimum goes up by 200, maximum by 500.
                  </li>
                </ul>
              </div>

              {/* Range examples */}
              <div className="bg-slate-900/60 p-3 rounded-md border border-slate-700">
                <p className="font-semibold mb-2">Range examples</p>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Game 1</span>
                    <span className="font-medium">250 – 2,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Game 3</span>
                    <span className="font-medium">650 – 3,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Game 7</span>
                    <span className="font-medium">1,450 – 5,000</span>
                  </div>
                </div>
              </div>

              {/* Tier visibility */}
              <div>
                <p className="font-semibold text-white mb-2">Hidden amounts</p>
                <p className="mb-3">
                  Both teams do <strong>not</strong> see exact offer
                  amounts. Instead, each offer is shown as one of three tiers:
                </p>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-3 bg-slate-900/40 px-3 py-2 rounded-lg">
                    <span className="px-3 py-0.5 rounded-full text-sm font-bold border bg-blue-500/20 text-blue-300 border-blue-500/40">Low</span>
                    <span className="text-slate-300">Lower end of the range</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/40 px-3 py-2 rounded-lg">
                    <span className="px-3 py-0.5 rounded-full text-sm font-bold border bg-yellow-500/20 text-yellow-300 border-yellow-500/40">Medium</span>
                    <span className="text-slate-300">Middle of the range</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/40 px-3 py-2 rounded-lg">
                    <span className="px-3 py-0.5 rounded-full text-sm font-bold border bg-red-500/20 text-red-300 border-red-500/40">High</span>
                    <span className="text-slate-300">Upper end of the range</span>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 text-yellow-200 text-xs leading-relaxed">
                  <strong>Important:</strong> The tier ranges overlap intentionally.
                  An offer labelled <strong>Low</strong> might actually be worth more
                  than one labelled <strong>Medium</strong>. You can't rank offers by
                  tier alone — you have to weigh up the player being offered too.
                  The exact amount is revealed once you accept.
                </div>
              </div>

            </div>

            <button
              onClick={() => setShowOfferHelp(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg"
              aria-label="Close offer help modal"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
