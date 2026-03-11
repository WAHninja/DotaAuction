import type { ReactNode } from 'react';

export const metadata = {
  title: 'Whiteboard · Defence of the Auctions',
};

export default function WhiteboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        /* Hide the site header and footer on the whiteboard page so
           the canvas can use the full viewport */
        body > div > header,
        body > div > footer,
        footer {
          display: none !important;
        }
      `}</style>
      {children}
    </>
  );
}
