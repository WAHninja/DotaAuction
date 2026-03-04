// app/hooks/useScrolled.ts
//
// Returns true when the window has scrolled past `threshold` pixels.
//
// Default raised to 40px (was 8px). At 8px any incidental touch — especially
// on short pages like /login or /changelog — triggered the header transition,
// causing it to flicker between states. 40px requires a deliberate scroll.
//
// Also calls check() immediately on mount so the header renders in the correct
// state if the page loads already scrolled (browser restore, hash link, etc.).

import { useEffect, useState } from 'react';

export function useScrolled(threshold = 40): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const check = () => setScrolled(window.scrollY > threshold);
    check(); // sync on mount — don't wait for first scroll event
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [threshold]);

  return scrolled;
}
