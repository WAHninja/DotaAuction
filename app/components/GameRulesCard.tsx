'use client';

import { useState } from 'react';

export default function GameRulesCard() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <div className="p-5 bg-slate-700/60 rounded-xl border border-slate-500 shadow-md">
        <h2 className="text-xl font-semibold mb-3 text-white">
          Game Rules
        </h2>

        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-200">
          <li>
            Create a match with <strong>4 or more players</strong>.
          </li>

          <li>
            When a team loses a game, each losing player loses
            <strong> half of their current gold</strong>.
          </li>

          <li>
            Each player on the winning team submits
            <strong> one gold offer</strong>.
          </li>

          <li>
            The losing team reviews all offers and
            <strong> accepts one</strong>.
          </li>

          <li className="flex items-start gap-2">
            <span>
              All winning team members receive
              <strong> 1000 gold</strong> plus a share of
              <strong> half of the losing team’s total gold</strong>.
            </span>

            {/* Help button */}
            <button
              onClick={() => setShowHelp(true)}
              className="mt-0.5 text-xs font-bold text-yellow-400 border border-yellow-400 rounded-full w-5 h-5 flex items-center justify-center hover:bg-yellow-400 hover:text-black transition"
              aria-label="Gold calculation help"
            >
              ?
            </button>
          </li>

          <li>
            The match ends when a player wins while
            <strong> on a team by themselves</strong>.
          </li>
        </ul>
      </div>

      {/* ===== Help Modal ===== */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-xl max-w-md w-full p-6 text-white shadow-xl relative">

            <h3 className="text-lg font-semibold mb-4">
              Gold Distribution Explained
            </h3>

            <div className="space-y-4 text-sm text-slate-200">
              <p>
                When a game ends, the winning team earns gold in
                <strong> two steps</strong>:
              </p>

              <ul className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Base reward:</strong><br />
                  Each winning player receives <strong>1000 gold</strong>.
                </li>

                <li>
                  <strong>Shared bonus:</strong><br />
                  Half of the losing team’s remaining gold is calculated
                  and split evenly among the winning team.
                </li>
              </ul>

              <div className="bg-slate-900/60 p-3 rounded-md border border-slate-700">
                <p className="font-semibold mb-1">Example</p>

                <p>
                  Losing team total gold: <strong>4000</strong><br />
                  Half of total: <strong>2000</strong><br />
                  Winning team size: <strong>4 players</strong>
                </p>

                <p className="mt-2">
                  Each winner receives:<br />
                  <strong>1000 + (2000 ÷ 4) = 1500 gold</strong>
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg"
              aria-label="Close help modal"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
