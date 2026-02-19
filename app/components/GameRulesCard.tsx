'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// ── Reusable modal shell ──────────────────────────────────────────────────────
function Modal({
  onClose,
  title,
  children,
}: {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="panel-raised max-w-md w-full p-6 relative overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5 gap-4">
          <h3 className="font-cinzel text-lg font-bold text-dota-gold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1 rounded text-dota-text-muted hover:text-dota-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Help trigger — the small "?" circle button ────────────────────────────────
function HelpButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="shrink-0 w-5 h-5 rounded-full border border-dota-gold text-dota-gold text-xs font-bold
                 flex items-center justify-center hover:bg-dota-gold hover:text-dota-base transition-all"
    >
      ?
    </button>
  );
}

// ── Rule list item ────────────────────────────────────────────────────────────
function RuleItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 font-barlow text-sm text-dota-text leading-relaxed">
      <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-dota-gold opacity-60" />
      <span>{children}</span>
    </li>
  );
}

function SubRuleItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 font-barlow text-sm text-dota-text-muted leading-relaxed">
      <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-dota-border-bright" />
      <span>{children}</span>
    </li>
  );
}

export default function GameRulesCard() {
  const [showGoldHelp, setShowGoldHelp] = useState(false);
  const [showOfferHelp, setShowOfferHelp] = useState(false);

  return (
    <>
      <div className="panel p-6 max-w-3xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center mb-5 space-y-1">
          <h2 className="font-cinzel text-3xl font-bold text-dota-gold">Match Rules</h2>
        </div>
        <div className="divider-gold mb-5" />

        {/* ── Rules ──────────────────────────────────────────────────────── */}
        <ul className="space-y-3">

          <RuleItem>
            Matches require <strong className="text-dota-text">4 or more players</strong>.
          </RuleItem>

          <RuleItem>
            Once a game is completed, <strong className="text-dota-text">select the winning team</strong>.
            <ul className="mt-2 ml-3 space-y-2">
              <SubRuleItem>
                All players of the losing team lose <strong className="text-dota-dire-light">half of their current gold</strong>.
              </SubRuleItem>
              <SubRuleItem>
                <span className="flex items-center gap-2 flex-wrap">
                  <span>
                    Winning team members each receive{' '}
                    <strong className="text-dota-radiant-light">1000 gold</strong> plus a share of{' '}
                    <strong className="text-dota-radiant-light">half of the losing team's total gold</strong>.
                  </span>
                  <HelpButton onClick={() => setShowGoldHelp(true)} label="Gold calculation help" />
                </span>
              </SubRuleItem>
            </ul>
          </RuleItem>

          <RuleItem>
            <span className="flex items-center gap-2 flex-wrap">
              <span>
                Each player on the winning team submits a{' '}
                <strong className="text-dota-text">secret gold offer</strong> to sell one of their{' '}
                <strong className="text-dota-text">own teammates</strong> to the losing team.
              </span>
              <HelpButton onClick={() => setShowOfferHelp(true)} label="Offer submission help" />
            </span>
          </RuleItem>

          <RuleItem>
            The losing team sees each offer only as{' '}
            <span className="tier-low mx-0.5">Low</span>,{' '}
            <span className="tier-medium mx-0.5">Medium</span>, or{' '}
            <span className="tier-high mx-0.5">High</span> — not the exact amount.
            <ul className="mt-2 ml-3 space-y-2">
              <SubRuleItem>
                The losing team <strong className="text-dota-text">accepts one offer</strong>. The exact gold amount is revealed only after accepting.
              </SubRuleItem>
              <SubRuleItem>
                The player who made the accepted offer <strong className="text-dota-gold">receives the gold</strong>.
              </SubRuleItem>
              <SubRuleItem>
                The offered player is <strong className="text-dota-text">moved to the losing team</strong>.
              </SubRuleItem>
            </ul>
          </RuleItem>

          <RuleItem>
            The match ends when a player wins a game while{' '}
            <strong className="text-dota-text">on a team by themselves</strong>.
          </RuleItem>

        </ul>
      </div>

      {/* ── Gold Help Modal ─────────────────────────────────────────────────── */}
      {showGoldHelp && (
        <Modal onClose={() => setShowGoldHelp(false)} title="Gold Distribution Explained">
          <div className="space-y-4 font-barlow text-sm text-dota-text leading-relaxed">
            <p>When a game ends, the winning team earns gold in <strong>two steps</strong>:</p>

            <ol className="space-y-2 pl-4 list-decimal marker:text-dota-gold marker:font-bold">
              <li>
                <strong className="text-dota-text">Base reward:</strong>{' '}
                <span className="text-dota-text-muted">Each winning player receives <strong className="text-dota-radiant-light">1000 gold</strong>.</span>
              </li>
              <li>
                <strong className="text-dota-text">Shared bonus:</strong>{' '}
                <span className="text-dota-text-muted">Half of the losing team's remaining gold is split evenly among the winning team.</span>
              </li>
            </ol>

            <div className="panel-sunken p-4 space-y-1">
              <p className="font-semibold text-dota-gold text-xs uppercase tracking-widest mb-2">Example</p>
              <div className="space-y-0.5 text-dota-text-muted">
                <p>Losing team total gold: <strong className="text-dota-text">4,000</strong></p>
                <p>Half of total: <strong className="text-dota-text">2,000</strong></p>
                <p>Winning team size: <strong className="text-dota-text">4 players</strong></p>
              </div>
              <div className="divider mt-3 mb-2" />
              <p className="text-dota-radiant-light font-semibold">
                Each winner receives: 1,000 + (2,000 ÷ 4) = <strong>1,500 gold</strong>
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Offer Help Modal ────────────────────────────────────────────────── */}
      {showOfferHelp && (
        <Modal onClose={() => setShowOfferHelp(false)} title="Offers Explained">
          <div className="space-y-5 font-barlow text-sm text-dota-text leading-relaxed">

            {/* How it works */}
            <div>
              <p className="stat-label mb-2">How it works</p>
              <ul className="space-y-2">
                <SubRuleItem>
                  Each player on the winning team picks a teammate to sell and names a gold price.
                  If their offer is accepted, <strong className="text-dota-gold">they receive that gold</strong> and
                  the offered player moves to the losing team.
                </SubRuleItem>
                <SubRuleItem>
                  The amount must fall within the allowed range for the current game.
                  The range increases each game — minimum goes up by 200, maximum by 500.
                </SubRuleItem>
              </ul>
            </div>

            {/* Range table */}
            <div className="panel-sunken p-4">
              <p className="stat-label mb-3">Range examples</p>
              <div className="space-y-2">
                {[
                  { game: 'Game 1', range: '250 – 2,000' },
                  { game: 'Game 3', range: '650 – 3,000' },
                  { game: 'Game 7', range: '1,450 – 5,000' },
                ].map(({ game, range }) => (
                  <div key={game} className="flex justify-between items-center">
                    <span className="text-dota-text-muted">{game}</span>
                    <span className="font-semibold text-dota-text tabular-nums">{range}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tiers */}
            <div>
              <p className="stat-label mb-3">Hidden amounts</p>
              <p className="text-dota-text-muted mb-3">
                The losing team does <strong className="text-dota-text">not</strong> see exact offer amounts.
                Instead, each offer shows as one of three tiers:
              </p>

              <div className="space-y-2 mb-4">
                {[
                  { cls: 'tier-low',    label: 'Low',    desc: 'Lower end of the range' },
                  { cls: 'tier-medium', label: 'Medium', desc: 'Middle of the range' },
                  { cls: 'tier-high',   label: 'High',   desc: 'Upper end of the range' },
                ].map(({ cls, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 panel-sunken px-3 py-2">
                    <span className={cls}>{label}</span>
                    <span className="text-dota-text-muted text-sm">{desc}</span>
                  </div>
                ))}
              </div>

              {/* Warning callout */}
              <div className="bg-dota-gold/8 border border-dota-gold/25 rounded px-3 py-2.5">
                <p className="text-dota-gold text-xs leading-relaxed">
                  <strong>Important:</strong> Tier ranges overlap intentionally. A{' '}
                  <span className="tier-low text-xs px-1.5 py-0">Low</span> offer might be worth more than a{' '}
                  <span className="tier-medium text-xs px-1.5 py-0">Medium</span> one.
                  You can't rank offers by tier alone — weigh the player too.
                  The exact amount is only revealed after you accept.
                </p>
              </div>
            </div>

          </div>
        </Modal>
      )}
    </>
  );
}
