// components/PathnameChecker.tsx
import { usePathname } from 'next/navigation';

export default function PathnameChecker() {
  const pathname = usePathname();
  const isRegister = pathname === '/register';

  return (
    <>
      {isRegister ? (
        <div className="hidden">Registering...</div>
      ) : (
        <div className="hidden">Not Registering</div>
      )}
    </>
  );
}
