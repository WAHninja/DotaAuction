'use client';

import type { ReactNode } from 'react';

/**
 * Hover/focus tooltip.
 *
 * Downward-facing — avoids clipping inside overflow-x-auto scroll containers.
 * overflow-x-auto promotes overflow: visible to auto on the perpendicular axis,
 * which clips upward-facing tooltips. Pointing down keeps them in-bounds.
 *
 * Shows on group-focus-within as well as group-hover, so keyboard users reach
 * the content too. Pair with aria-describedby on the focusable child.
 */
export default function Tooltip({ id, content, children, align = 'center' }: {
  id: string;
  content: string;
  children: ReactNode;
  align?: 'center' | 'right';
}) {
  const bubblePos = align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  const arrowPos  = align === 'right' ? 'right-4'  : 'left-1/2 -translate-x-1/2';

  return (
    <div className="relative group inline-flex justify-center">
      {children}
      <div
        id={id}
        role="tooltip"
        className={`
          pointer-events-none
          absolute top-full mt-2 z-20 ${bubblePos}
          w-56 px-3 py-2 rounded
          bg-dota-raised border border-dota-border-bright
          font-barlow text-xs text-dota-text-muted leading-snug
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-opacity duration-150
          text-left whitespace-normal
        `}
      >
        <span
          aria-hidden="true"
          className={`absolute bottom-full ${arrowPos} border-4 border-transparent border-b-dota-border-bright`}
        />
        {content}
      </div>
    </div>
  );
}
