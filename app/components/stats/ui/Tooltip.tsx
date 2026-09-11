'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Hover/focus tooltip, rendered into document.body.
 *
 * The portal is the whole point. Every surface these sit on — .panel,
 * .panel-sunken, the table wrappers — sets clip-path for the chamfered corners,
 * and clip-path clips absolutely positioned descendants regardless of z-index
 * or overflow. globals.css says so in as many words at the top of the file.
 * A bubble rendered inside the tile could not escape the tile, so a long
 * explanation was simply cut off mid-sentence.
 *
 * Positioned with position: fixed against the trigger's viewport rect, then
 * clamped to the viewport so a tooltip on a right-hand tile does not run off
 * the edge of the screen. Because the bubble no longer shares a stacking or
 * clipping context with the trigger, none of the surrounding layout can affect
 * it.
 *
 * Trade-off accepted: fixed positioning does not follow the page, so the
 * tooltip closes on scroll rather than drifting away from what it describes.
 */

/** Matches the w-56 bubble below. Needed in JS to clamp before paint. */
const BUBBLE_WIDTH = 224;
const GAP = 8;

export default function Tooltip({ id, content, children, align = 'center' }: {
  id: string;
  content: string;
  children: ReactNode;
  /** Preferred horizontal anchor. Viewport clamping overrides it near an edge. */
  align?: 'center' | 'right';
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Portals need document, which does not exist during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const preferred = align === 'right'
      ? r.right - BUBBLE_WIDTH
      : r.left + r.width / 2 - BUBBLE_WIDTH / 2;

    const left = Math.max(
      GAP,
      Math.min(preferred, window.innerWidth - BUBBLE_WIDTH - GAP),
    );

    setPos({ top: r.bottom + GAP, left });
  }, [align]);

  const hide = useCallback(() => setPos(null), []);

  // Fixed coordinates go stale the moment anything moves, and a tooltip
  // hovering over unrelated content is worse than no tooltip. Capture phase so
  // scrolling inside the table wrapper counts, not just the window.
  useEffect(() => {
    if (pos === null) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [pos, hide]);

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={place}
        onMouseLeave={hide}
        onFocus={place}
        onBlur={hide}
      >
        {children}
      </span>

      {mounted && pos !== null && createPortal(
        <div
          id={id}
          role="tooltip"
          style={{ top: pos.top, left: pos.left, width: BUBBLE_WIDTH }}
          className="
            pointer-events-none fixed z-[100]
            px-3 py-2 rounded
            bg-dota-raised border border-dota-border-bright
            font-barlow text-xs text-dota-text-muted leading-snug
            text-left whitespace-normal shadow-lg
          "
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}
