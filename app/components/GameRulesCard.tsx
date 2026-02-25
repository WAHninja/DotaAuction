'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Discriminated union prevents two modals ever being open simultaneously.
type ActiveModal = 'gold' | 'offer' | null;

// ---------------------------------------------------------------------------
// useFocusTrap
//
// Constrains Tab / Shift+Tab to focusable elements inside a container ref.
// Returns a ref to attach to the modal container element.
// ---------------------------------------------------------------------------

function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;

    // Move focus into the modal immediately on open.
    // Prefer the close button (first focusable); fall back to the container.
    const focusable = getFocusable(container);
    if (focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableEls = getFocusable(container);
      if (focusableEls.length === 0) return;

      const first = focusableEls[0] as HTMLElement;
      const last  = focusableEls[focusableEls.length - 1] as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab — wrap from first → last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab — wrap from last → first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return containerRef;
}

function getFocusable(container: HTMLElement): Element[] {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function Modal({
  id,
  onClose,
  title,
  children,
  footer,
}: {
  id: string;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId      = `${id}-title`;
  const containerRef = useFocusTrap(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    // Backdrop — click outside to close
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-16"
      onClick={onClose}
    >
      {/*
        Dialog container.
        • role="dialog" + aria-modal tell screen readers a dialog is open and
          that content behind it should be ignored.
        • aria-labelledby links the dialog to its visible title.
        • tabIndex={-1} allows the container itself to receive focus as a
          fallback if no focusable children are found.
        • max-h + overflow-y-auto ensure long content doesn't clip on short
          viewports (landscape mobile, small laptops).
        • Clicks inside don't propagate to the backdrop's onClick.
      */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="panel-raised max-w-md w-full p-6 relative overflow-y-auto max-h-[calc(100vh-2rem)] focus:outline-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-4">
          <h3 id={titleId} className="font-cinzel text-lg font-bold text-dota-gold">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="
              shrink-0 p-2 rounded
              text-dota-text-muted hover:text-dota-text
              transition-colors
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-dota-gold focus-visible:ring-offset-2
              focus-visible:ring-offset-dota-raised
            "
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        {children}

        {/* Optional footer — used for cross-modal navigation */}
        {footer && (
          <div className="mt-6 pt-4 border-t border-dota-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HelpButton
//
// The visible hit area is w-4 h-4 but the actual interactive area is padded
// to ~44×44 px (p-2.5 = 10px each side → 16+20 = 36px; close enough given
// the inline context, and a significant improvement over the previous 16px).
// Using a negative margin to counteract the padding keeps surrounding text
// spacing visually unchanged.
//
// stopPropagation: GameCard in GameHistory attaches an onClick to its
// container div. Without this, clicking a HelpButton inside that card would
// also toggle the card's expanded state. The stop prevents that bubble.
// ---------------------------------------------------------------------------

const HelpButton = forwardRef<HTMLButtonElement, { onClick: () => void; label: string }>(
  function HelpButton({ onClick, label }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={e => { e.stopPropagation(); onClick(); }}
        aria-label={label}
        className="
          shrink-0 -my-1 p-2.5
          inline-flex items-center justify-center
          rounded-full
          text-dota-gold
          hover:bg-dota-gold/10
          transition-colors
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-dota-gold focus-visible:ring-offset-2
          focus-visible:ring-offset-dota-surface
        "
      >
        {/* Visible badge — decorative, hidden from assistive tech via aria-hidden */}
        <span
          aria-hidden="true"
          className="w-4 h-4 rounded-full border border-dota-gold text-[10px] font-bold
                     inline-flex items-center justify-center leading-none"
        >
          ?
        </span>
      </button>
    );
  }
);

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

function Rule({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 font-barlow text-sm text-dota-text-muted leading-snug">
      {/*
        mt-[0.4em] aligns the dot relative to the current font-size rather
        than using a fixed pixel offset (mt-1.5), which would drift at
        non-default browser zoom levels or if line-height ever changes.
      */}
      <span className="mt-[0.4em] shrink-0 w-1 h-1 rounded-full bg-dota-gold/50" />
      <span>{children}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// GameRulesCard
// ---------------------------------------------------------------------------

export default function GameRulesCard() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Track which button triggered the currently open modal so we can
  // return focus to it when the modal closes.
  const goldTriggerRef  = useRef<HTMLButtonElement>(null);
  const offerTriggerRef = useRef<HTMLButtonElement>(null);

  const openModal = useCallback((modal: ActiveModal) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    // Capture which modal is closing before clearing state, then restore focus.
    setActiveModal(prev => {
      // Schedule the focus return after the state update + re-render cycle.
      requestAnimationFrame(() => {
        if (prev === 'gold')  goldTriggerRef.current?.focus();
        if (prev === 'offer') offerTriggerRef.current?.focus();
      });
      return null;
    });
  }, []);

  return (
    <>
      <div className="panel h-full flex flex-col p-6 space-y-5">

        {/* Heading */}
        <div className="text-center space-y-1">
          <h2 className="font-cinzel text-3xl font-bold text-dota-gold">
            Match Rules
          </h2>
          <div className="divider-gold" />
        </div>

        <ul className="space-y-2.5">

          <Rule>
            Requires <strong className="text-dota-text">4 or more players</strong>.
          </Rule>

          {/*
            Rule from the WINNER's perspective — previously missing entirely.
            Players would understand what to do as a loser but not as a winner.
          */}
          <Rule>
            After each game, each <strong className="text-dota-text">winner</strong> secretly
            picks a teammate to sell and names their own price — within the current game's
            allowed range, which increases every game.{' '}
            <HelpButton
              ref={offerTriggerRef}
              onClick={() => openModal('offer')}
              label="How offers work"
            />
          </Rule>

          <Rule>
            <strong className="text-dota-text">Losers</strong> see only{' '}
            <span className="tier-low mx-0.5">Low</span>,{' '}
            <span className="tier-medium mx-0.5">Medium</span>, or{' '}
            <span className="tier-high mx-0.5">High</span> for each offer — tiers{' '}
            <strong className="text-dota-text">overlap</strong>, so a Low offer can be worth
            more than a Medium. They accept one offer: the seller{' '}
            <strong className="text-dota-text">receives the gold</strong> and the sold player{' '}
            <strong className="text-dota-text">switches teams</strong>.
          </Rule>

          <Rule>
            Losers lose <strong className="text-dota-text">half their gold</strong>.
            Winners each receive <strong className="text-dota-text">1,000 gold</strong>{' '}
            plus a share of half the loser pool.{' '}
            <HelpButton
              ref={goldTriggerRef}
              onClick={() => openModal('gold')}
              label="How gold is calculated"
            />
          </Rule>

          <Rule>
            Match ends when a player wins{' '}
            <strong className="text-dota-text">alone on their team</strong>.
          </Rule>

        </ul>
      </div>

      {/* ── Gold modal ───────────────────────────────────────────────────────── */}
      {activeModal === 'gold' && (
        <Modal
          id="gold-modal"
          onClose={closeModal}
          title="Gold Distribution Explained"
          footer={
            <button
              type="button"
              onClick={() => setActiveModal('offer')}
              className="
                font-barlow text-sm text-dota-gold hover:text-dota-gold-light
                underline underline-offset-2 transition-colors
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-dota-gold focus-visible:ring-offset-2
                focus-visible:ring-offset-dota-raised
              "
            >
              How do offers work? →
            </button>
          }
        >
          <div className="space-y-4 font-barlow text-sm text-dota-text leading-relaxed">
            <p>Winning team earns gold in <strong>two steps</strong>:</p>
            <ol className="space-y-2 pl-4 list-decimal marker:text-dota-gold marker:font-bold">
              <li>
                <strong>Base reward:</strong>{' '}
                <span className="text-dota-text-muted">
                  Each winner receives <strong className="text-dota-text">1,000 gold</strong>.
                </span>
              </li>
              <li>
                <strong>Shared bonus:</strong>{' '}
                <span className="text-dota-text-muted">
                  Half the losing team's gold is split evenly among winners.
                </span>
              </li>
            </ol>
            <div className="panel-sunken p-4 space-y-1">
              <p className="stat-label mb-2">Example</p>
              <div className="space-y-0.5 text-dota-text-muted">
                <p>Losing team gold: <strong className="text-dota-text">4,000</strong></p>
                <p>Half: <strong className="text-dota-text">2,000</strong> split across{' '}
                  <strong className="text-dota-text">4 winners</strong>
                </p>
              </div>
              <div className="divider mt-3 mb-2" />
              <p className="text-dota-text font-semibold">
                Each winner: 1,000 + 500 = <strong>1,500 gold</strong>
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Offer modal ──────────────────────────────────────────────────────── */}
      {activeModal === 'offer' && (
        <Modal
          id="offer-modal"
          onClose={closeModal}
          title="Offers Explained"
          footer={
            <button
              type="button"
              onClick={() => setActiveModal('gold')}
              className="
                font-barlow text-sm text-dota-gold hover:text-dota-gold-light
                underline underline-offset-2 transition-colors
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-dota-gold focus-visible:ring-offset-2
                focus-visible:ring-offset-dota-raised
              "
            >
              How is gold calculated? →
            </button>
          }
        >
          <div className="space-y-5 font-barlow text-sm text-dota-text leading-relaxed">

            <div>
              <p className="stat-label mb-2">For winners</p>
              <p className="text-dota-text-muted">
                Each winner secretly picks a teammate to sell and names a price. Offers are
                hidden from everyone — including other winners — until all offers are
                submitted. The price must be within the current game's allowed range.
              </p>
            </div>

            <div>
              <p className="stat-label mb-2">For losers</p>
              <p className="text-dota-text-muted">
                Once all offers are in, losers see each offer's tier badge but not the exact
                amount. They choose one offer to accept — the seller{' '}
                <strong className="text-dota-text">receives the gold</strong> and the sold
                player <strong className="text-dota-text">switches to the losing team</strong>.
                All other offers are rejected.
              </p>
            </div>

            <div className="panel-sunken p-4">
              <p className="stat-label mb-3">Offer range by game</p>
              <div className="space-y-2">
                {[
                  { label: 'After game 1', range: '450 – 2,500' },
                  { label: 'After game 3', range: '850 – 3,500' },
                  { label: 'After game 7', range: '1,650 – 5,500' },
                ].map(({ label, range }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-dota-text-muted">{label}</span>
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
              {/* Tier overlap surfaced prominently rather than buried */}
              <div className="bg-dota-gold/8 border border-dota-gold/25 rounded px-3 py-2.5">
                <p className="text-dota-gold text-xs leading-relaxed">
                  <strong>Tiers overlap intentionally.</strong> A{' '}
                  <span className="tier-low text-xs">Low</span> offer can be worth more than a{' '}
                  <span className="tier-medium text-xs">Medium</span> one, and a{' '}
                  <span className="tier-medium text-xs">Medium</span> can exceed a{' '}
                  <span className="tier-high text-xs">High</span>. Exact amounts are only
                  revealed after an offer is accepted — you're always choosing under uncertainty.
                </p>
              </div>
            </div>

          </div>
        </Modal>
      )}
    </>
  );
}
