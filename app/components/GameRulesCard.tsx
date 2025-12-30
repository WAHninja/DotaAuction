'use client';

import { useEffect, useState } from 'react';

export default function GameRulesCard() {
  const [showGoldHelp, setShowGoldHelp] = useState(false);
  const [showOfferHelp, setShowOfferHelp] = useState(false);

  // Close modals on ESC key
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
                    <strong>half of the losing team’s total gold</strong>.
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
                <strong>a gold offer</strong> to sell one of their{' '}
                <strong>own players</strong>.
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
            The losing team reviews all offers and{' '}
            <strong>accepts one</strong>.
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                The player whose offer was accepted{' '}
                <strong>receives</strong> the gold amount.
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
                  team’s remaining gold is split evenly among the
                  winning team.
                </li>
              </ul>

              <div className="bg-slate-900/60 p-3 rounded-md border border-slate-700">
                <p className="font-semibold mb-1"><strong>Example</strong></p>
                <p>Losing team total gold: <strong>4000</strong></p>
                <p>Half of total: <strong>2000</strong></p>
                <p>Winning team size: <strong>4 players</strong></p>
                <p className="mt-2">
                  <strong>Each winner receives:</strong> 1000 +
                  (2000 ÷ 4) = <strong>1500 gold</strong>
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
            className="bg-slate-800 border border-slate-600 rounded-xl max-w-md w-full p-6 text-white shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              Offers Explained
            </h3>

            <div className="space-y-4 text-sm text-slate-200 leading-relaxed">
              <p>During the auction phase:</p>

              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Each player on the winning team submits one offer.
                </li>

                <li>
                  The offer sets a gold amount you’ll receive for
                  selling one of your team’s players.
                </li>

                <li>
                  Pick a gold amount within the allowed range for
                  this game.
                  <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li>Offer range increases each game.</li>
                    <li>Minimum increases by 200 each game.</li>
                    <li>Maximum increases by 500 each game.</li>
                  </ul>
                </li>

                <li>
                  The losing team reviews all offers and accepts one.
                </li>
              </ul>

              <div className="bg-slate-900/60 p-3 rounded-md border border-slate-700">
                <p className="font-semibold mb-1"><strong>Example</strong></p>
                <p>
                  Game 1 range: <strong>250 – 2000</strong>
                </p>
                <p>
                  Game 3 range: <strong>650 – 3000</strong>
                </p>
                <p>
                  Game 7 range: <strong>1450 – 5000</strong>
                </p>
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
