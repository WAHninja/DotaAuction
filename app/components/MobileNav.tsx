'use client';

import Link from 'next/link';

export default function MobileNav({ closeMenu }: { closeMenu: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-gray-900 bg-opacity-95 flex flex-col items-center justify-center space-y-6 text-white">
      <Link href="/dashboard" onClick={closeMenu} className="text-2xl font-bold hover:underline">
        Dashboard
      </Link>
      <Link href="/" onClick={closeMenu} className="text-2xl font-bold hover:underline">
        Home
      </Link>
      {/* Add more links if needed */}
    </div>
  );
}
