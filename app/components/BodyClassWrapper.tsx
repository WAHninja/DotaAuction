'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function BodyClassWrapper() {
  const pathname = usePathname();
  const [showStaticBg, setShowStaticBg] = useState(false);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    const isAuthPage = pathname === '/register' || pathname === '/login';
    const isMatchPage = pathname.startsWith('/match');

    setShowImage(isAuthPage || isMatchPage);
    setShowStaticBg(!isAuthPage && !isMatchPage);
  }, [pathname]);

  return (
    <>
      {showImage && (
        <div
          className="fixed inset-0 z-[-1] bg-[url('/bg-smoke.jpg')] bg-cover bg-center bg-no-repeat"
          aria-hidden="true"
        />
      )}
      {showStaticBg && (
        <div
          className="fixed inset-0 z-[-1] bg-[url('/b33a11afdff2ef2e1d7502b8d2df0fe9d1efd593.jpg')] bg-cover bg-center bg-no-repeat"
          aria-hidden="true"
        />
      )}
    </>
  );
}
