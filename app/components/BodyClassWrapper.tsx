'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

const AUTH_BG_GRADIENT = `
  radial-gradient(
    ellipse 80% 60% at 50% 110%,
    rgba(200, 169, 81, 0.10) 0%,
    transparent 70%
  )
`.trim();

const MATCH_BG_GRADIENT = `
  radial-gradient(
    ellipse 70% 55% at 0% 100%,
    rgba(74, 155, 60, 0.14) 0%,
    transparent 65%
  ),
  radial-gradient(
    ellipse 70% 55% at 100% 100%,
    rgba(192, 57, 43, 0.14) 0%,
    transparent 65%
  ),
  radial-gradient(
    ellipse 50% 30% at 50% 0%,
    rgba(200, 169, 81, 0.04) 0%,
    transparent 60%
  )
`.trim();

export default function BodyClassWrapper() {
  const pathname = usePathname();

  const isAuthPage  = pathname === '/register' || pathname === '/login';
  const isMatchPage = pathname.startsWith('/match');

  if (isMatchPage) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ backgroundImage: MATCH_BG_GRADIENT }}
      />
    );
  }

  if (isAuthPage) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ backgroundImage: AUTH_BG_GRADIENT }}
      />
    );
  }

  // Dashboard — Next.js <Image fill priority> replaces the CSS background-image.
  // Benefits over url('/dashboard-background.jpg') in a style prop:
  //   • Automatically served as WebP/AVIF (typically 60-80% smaller than JPEG)
  //   • `priority` injects a <link rel="preload"> into <head> so the browser
  //     fetches it during HTML parse, not after CSS evaluation
  //   • Correct cache-control headers via Next.js image pipeline
  //   • No layout shift — fill covers the fixed container immediately
  return (
    <>
      {/* Image layer — z-[-2] sits behind the overlay */}
      <div aria-hidden="true" className="fixed inset-0 z-[-2] pointer-events-none">
        <Image
          src="/dashboard-background.jpg"
          alt=""
          fill
          priority
          quality={85}
          className="object-cover object-center"
        />
      </div>

      {/* Dark overlay — tones the texture down to dota-base range */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ backgroundColor: 'rgba(13, 17, 23, 0.55)' }}
      />
    </>
  );
}
