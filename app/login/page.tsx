'use client';

import { useState } from 'react';
import Link from 'next/link';
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

        {/* ── Card ─────────────────────────────────────────────────────────────
             frame-ornate gives the four corner brackets + gold edge; the
             crest badge (this card's one hero flourish) carries the coin
             logo, so there's no separate logo block above the card. ─────── */}
        <div className="frame-ornate pt-9 px-4 pb-4 mt-10">
          <span className="fo-corner fo-corner--tl" aria-hidden="true" />
          <span className="fo-corner fo-corner--tr" aria-hidden="true" />
          <span className="fo-corner fo-corner--bl" aria-hidden="true" />
          <span className="fo-corner fo-corner--br" aria-hidden="true" />

          <div className="frame-crest" aria-hidden="true">
            <span className="frame-crest__burst" />
            <img src="/logo.png" alt="" />
          </div>

          <h1 className="font-barlow text-2xl font-bold text-dota-gold tracking-wide text-center mb-1">
            Sign In
          </h1>
          <p className="text-center text-sm text-dota-text-muted mb-5">
            Enter your credentials to continue
          </p>
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
