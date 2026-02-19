'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
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
        credentials: 'include',
        body: JSON.stringify({ username, pin }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full py-12 px-4">
      <div className="w-full max-w-sm">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <Image src="/logo.png" alt="Defence of the Auctions" width={80} height={27} />
          <h1 className="font-cinzel text-2xl font-bold text-dota-gold tracking-wide">
            Sign In
          </h1>
          <div className="divider-gold w-32" />
        </div>

        {/* ── Card ─────────────────────────────────────────────────────────── */}
        <div className="panel p-8">
          <form onSubmit={handleLogin} className="space-y-5">

            <div className="space-y-1.5">
              <label htmlFor="username" className="stat-label block">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
                autoComplete="username"
                className="input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pin" className="stat-label block">
                PIN
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
                autoComplete="current-password"
                className="input"
              />
            </div>

            {error && (
              <p className="font-barlow text-sm text-dota-dire-light bg-dota-dire-subtle border border-dota-dire-border rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* ── Footer link ──────────────────────────────────────────────────── */}
        <p className="mt-5 text-center font-barlow text-sm text-dota-text-muted">
          No account?{' '}
          <Link href="/register" className="text-dota-gold hover:text-dota-gold-light font-semibold">
            Register here
          </Link>
        </p>

      </div>
    </div>
  );
}
