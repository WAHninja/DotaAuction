// app/hooks/useFocusTrap.ts
//
// Constrains Tab / Shift+Tab to focusable elements within a container.
// Moves focus into the container when activated, and returns a ref to attach
// to the container element.
//
// Generic so it works on any HTML element (div, aside, section, etc.):
//   const ref = useFocusTrap<HTMLElement>(isOpen);
//   <aside ref={ref}>...</aside>
//
// Extracted from GameRulesCard so it can be shared across the app.
// GameRulesCard's local copy can be replaced with this import.

import { useEffect, useRef, type RefObject } from 'react';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  );
}

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean
): RefObject<T> {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;

    // Move focus into the container on activation.
    // Prefer the first focusable child; fall back to the container itself.
    const focusable = getFocusable(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const els = getFocusable(container);
      if (els.length === 0) return;

      const first = els[0];
      const last  = els[els.length - 1];

      if (e.shiftKey) {
        // Shift+Tab on first element → wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab on last element → wrap to first
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
