'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function BodyClassWrapper() {
  const pathname = usePathname();

  useEffect(() => {
    const isRegister = pathname === '/register';

    const body = document.body;
    if (isRegister) {
      body.classList.add('bg-[url("/bg-smoke.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    } else {
      body.classList.remove('bg-[url("/bg-smoke.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    }
  }, [pathname]);

  return null;
}
