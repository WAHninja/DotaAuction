import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function BodyClassWrapper() {
  const pathname = usePathname();

  useEffect(() => {
    const isAuthPage = pathname === '/register' || pathname === '/login';

    const body = document.body;
    if (isAuthPage) {
      body.classList.add('bg-[url("/bg-smoke.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    } else {
      body.classList.add('bg-[url("/LastSupper.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    }
  }, [pathname]);

  return null;
}
