// app/hooks/useScrolled.ts
//
// Returns true when the window has scrolled past `threshold` pixels.
//
// Two things the inline version in MobileResponsiveHeader got wrong:
//   1. No initial sync — if the page loads already scrolled (hash link,
//      browser restore) `scrolled` would stay false until the next event.
//   2. The logic was inlined in the component, coupling scroll state to
//      nav render cycles.

import { useEffect, useState } from 'react';

export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const check = () => setScrolled(window.scrollY > threshold);
    check(); // sync immediately on mount
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [threshold]);

  return scrolled;
}
