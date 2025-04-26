'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function BodyClassWrapper() {
  const pathname = usePathname();
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const isAuthPage = pathname === '/register' || pathname === '/login';
    const isMatchPage = pathname.startsWith('/match');

    const body = document.body;
    body.className = ''; // clear existing classes

    if (isAuthPage) {
      setShowVideo(false);
      body.classList.add('bg-[url("/bg-smoke.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    } else if (isMatchPage) {
      setShowVideo(false);
      body.classList.add('bg-[url("/LastSupper.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    } else {
      setShowVideo(true);
    }
  }, [pathname]);

  return (
    <>
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
