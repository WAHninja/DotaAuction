'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function BodyClassWrapper() {
  const pathname = usePathname();
  const [showVideo, setShowVideo] = useState(false);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    const isAuthPage = pathname === '/register' || pathname === '/login';
    const isMatchPage = pathname.startsWith('/match');

    setShowImage(isAuthPage || isMatchPage);
    setShowVideo(!isAuthPage && !isMatchPage);
  }, [pathname]);

  return (
    <>
      {showImage && (
        <div
          className="fixed inset-0 z-[-1] bg-[url('/bg-smoke.jpg')] bg-cover bg-center bg-no-repeat"
          aria-hidden="true"
        />
      )}
      {showVideo && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover z-[-1]"
        >
          <source src="/header_bg.webm" type="video/webm" />
          Your browser does not support the video tag.
        </video>
      )}
    </>
  );
}
