'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// ── Modal — anchored near the top of the viewport ─────────────────────────────
function Modal({ onClose, title, children }: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="panel-raised max-w-md w-full p-6 relative overflow-y-auto max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5 gap-4">
          <h3 className="font-cinzel text-lg font-bold text-dota-gold">{title}</h3>
          <button onClick={onClose} aria-label="Close"
            className="shrink-0 p-1 rounded text-dota-text-muted hover:text-dota-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Help button ───────────────────────────────────────────────────────────────
function HelpButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      className="shrink-0 w-4 h-4 rounded-full border border-dota-gold text-dota-gold text-[10px] font-bold
                 inline-flex items-center justify-center hover:bg-dota-gold hover:text-dota-base transition-all"
    >
      ?
    </button>
  );
}

// ── Rule row ──────────────────────────────────────────────────────────────────
function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 font-barlow text-sm text-dota-text-muted leading-snug">
      <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-dota-gold/50" />
      <span>{children}</span>
    </li>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GameRulesCard() {
  const [showGoldHelp, setGold]   = useState(false);
  const [showOfferHelp, setOffer] = useState(false);

  return (
    <>
      <div className="panel max-w-3xl mx-auto overflow-hidden">

        <div className="px-5 py-3.5 border-b border-dota-border">
          <h2 className="font-cinzel text-base font-bold text-dota-gold tracking-wide">
            Match Rules
          </h2>
        </div>

        <div className="px-5 py-4">
          <ul className="space-y-2.5">

            <Rule>
              Requires <strong className="text-dota-text">4 or more players</strong>.
            </Rule>

            <Rule>
              After each game, losers lose <strong className="text-dota-dire-light">half their gold</strong>.
              Winners each receive <strong className="text-dota-radiant-light">1,000 gold</strong> plus
              a share of half the loser pool.{' '}
              <HelpButton onClick={() => setGold(true)} label="Gold calculation help" />
            </Rule>

            <Rule>
              Each winner secretly offers to sell a teammate — naming their own price.{' '}
              <HelpButton onClick={() => setOffer(true)} label="Offer help" />
            </Rule>

            <Rule>
              Losers see only{' '}
              <span className="tier-low mx-0.5">Low</span>,{' '}
              <span className="tier-medium mx-0.5">Medium</span>, or{' '}
              <span className="tier-high mx-0.5">High</span> — they accept one offer,
              the seller <strong className="text-dota-gold">receives the gold</strong>,
              and the sold player <strong className="text-dota-text">switches teams</strong>.
            </Rule>

            <Rule>
              Match ends when a player wins <strong className="text-dota-text">alone on their team</strong>.
            </Rule>

          </ul>
        </div>
      </div>

      {/* ── Gold modal ───────────────────────────────────────────────────────── */}
      {showGoldHelp && (
        <Modal onClose={() => setGold(false)} title="Gold Distribution Explained">
          <div className="space-y-4 font-barlow text-sm text-dota-text leading-relaxed">
            <p>Winning team earns gold in <strong>two steps</strong>:</p>
            <ol className="space-y-2 pl-4 list-decimal marker:text-dota-gold marker:font-bold">
              <li>
                <strong>Base reward:</strong>{' '}
                <span className="text-dota-text-muted">Each winner receives <strong className="text-dota-radiant-light">1,000 gold</strong>.</span>
              </li>
              <li>
                <strong>Shared bonus:</strong>{' '}
                <span className="text-dota-text-muted">Half the losing team's gold is split evenly among winners.</span>
              </li>
            </ol>
            <div className="panel-sunken p-4 space-y-1">
              <p className="stat-label mb-2">Example</p>
              <div className="space-y-0.5 text-dota-text-muted">
                <p>Losing team gold: <strong className="text-dota-text">4,000</strong></p>
                <p>Half: <strong className="text-dota-text">2,000</strong> split across <strong className="text-dota-text">4 winners</strong></p>
              </div>
              <div className="divider mt-3 mb-2" />
              <p className="text-dota-radiant-light font-semibold">
                Each winner: 1,000 + 500 = <strong>1,500 gold</strong>
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Offer modal ──────────────────────────────────────────────────────── */}
      {showOfferHelp && (
        <Modal onClose={() => setOffer(false)} title="Offers Explained">
          <div className="space-y-5 font-barlow text-sm text-dota-text leading-relaxed">

            <div>
              <p className="stat-label mb-2">How it works</p>
              <p className="text-dota-text-muted">
                Each winner picks a teammate to sell and names a price. If accepted,
                the <strong className="text-dota-gold">seller receives the gold</strong> and
                the sold player moves to the losing team. The price must be within the
                current game's allowed range, which increases every game.
              </p>
            </div>

            <div className="panel-sunken p-4">
              <p className="stat-label mb-3">Range by game</p>
              <div className="space-y-2">
                {[
                  { game: 'Game 1', range: '450 – 2,500' },
                  { game: 'Game 3', range: '850 – 3,500' },
                  { game: 'Game 7', range: '1,650 – 5,500' },
                ].map(({ game, range }) => (
                  <div key={game} className="flex justify-between">
                    <span className="text-dota-text-muted">{game}</span>
                    <span className="font-semibold text-dota-text tabular-nums">{range}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="stat-label mb-3">Tier visibility</p>
              <div className="space-y-2 mb-4">
                {[
                  { cls: 'tier-low',    label: 'Low',    desc: 'Lower end of the range' },
                  { cls: 'tier-medium', label: 'Medium', desc: 'Middle of the range' },
                  { cls: 'tier-high',   label: 'High',   desc: 'Upper end of the range' },
                ].map(({ cls, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 panel-sunken px-3 py-2 rounded">
                    <span className={cls}>{label}</span>
                    <span className="text-dota-text-muted text-sm">{desc}</span>
                  </div>
                ))}
              </div>
              <div className="bg-dota-gold/8 border border-dota-gold/25 rounded px-3 py-2.5">
                <p className="text-dota-gold text-xs leading-relaxed">
                  <strong>Important:</strong> Tiers overlap — a <span className="tier-low text-xs">Low</span> offer
                  can be worth more than a <span className="tier-medium text-xs">Medium</span> one.
                  Exact amounts are revealed only after accepting.
                </p>
              </div>
            </div>

          </div>
        </Modal>
      )}
    </>
  );
}
