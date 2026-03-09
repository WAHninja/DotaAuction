// app/whiteboard/layout.tsx
//
// The whiteboard needs to fill the full viewport. The root layout's <main>
// applies max-w-7xl, horizontal padding, and py-8. We override that here
// by wrapping the page in a fragment — the page component itself uses
// `position: fixed` to escape the normal document flow.
//
// This layout inherits the root layout (header, footer, providers) but
// removes the <main> padding so the canvas can touch all four edges.

import type { ReactNode } from 'react';

export const metadata = {
  title: 'Whiteboard · Defence of the Auctions',
};

export default function WhiteboardLayout({ children }: { children: ReactNode }) {
  return (
    // Intentionally a fragment — the root layout already provides <html>,
    // <body>, providers, and the sticky header. We just need to inject the
    // page into the DOM without any extra wrapper element that would affect
    // stacking or overflow.
    // 
    // The page component uses `position: fixed; inset: 0; z-index: 30` so
    // it renders over everything below the header (z-40).
    <>
      {children}
    </>
  );
}
