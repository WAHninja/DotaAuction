'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function BodyClassWrapper() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;

    // Clear existing background classes first
    body.className = '';

    const isAuthPage = pathname === '/register' || pathname === '/login';
    const isMatchPage = pathname.startsWith('/match'); // match page might have dynamic routes like /match/123

    if (isAuthPage) {
      body.classList.add('bg-[url("/bg-smoke.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    } else if (isMatchPage) {
      body.classList.add('bg-[url("/LastSupper.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    } else {
      body.classList.add('bg-[url("/header_bg.mp4")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    }
  }, [pathname]);

  return null;
}
