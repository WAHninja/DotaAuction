'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Session cookie is set server-side
      router.push('/');
      router.refresh(); // ensures UserProvider re-fetches /api/me
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full p-4 text-white font-[Cinzel]">
      <div className="bg-[#1e1e1e]/90 border border-[#e05228] shadow-xl rounded-2xl p-8 w-full max-w-md backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-[#e05228] mb-6 text-center drop-shadow-md">
          Login
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
              className="w-full bg-[#2c2c2c] border border-gray-600 rounded px-4 py-2
                         focus:outline-none focus:ring-2 focus:ring-[#e05228] text-white
                         disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm mb-1">
              PIN (4+ digits)
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
              pattern="\d{4,}"
              inputMode="numeric"
              required
              className="w-full bg-[#2c2c2c] border border-gray-600 rounded px-4 py-2
                         focus:outline-none focus:ring-2 focus:ring-[#e05228] text-white
                         disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e05228] hover:bg-[#ff6b3a] text-white font-semibold
                       py-2 rounded shadow-lg transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Not registered?{' '}
          <Link href="/register" className="text-[#e05228] hover:underline">
            Register here
          </Link>
        </p>

        {error && (
          <p className="mt-4 text-center text-sm text-orange-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
