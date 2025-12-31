'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1️⃣ Register
      const registerRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(registerData.error || 'Registration failed');
      }

      // 2️⃣ Auto-login
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ✅ include cookie
        body: JSON.stringify({ username, pin }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.error || 'Login failed after registration');
      }

      // 3️⃣ Hard redirect so UserProvider refreshes immediately
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full p-4 text-white font-[Cinzel]">
      <div className="bg-[#1e1e1e]/90 border border-[#e05228] shadow-xl rounded-2xl p-8 w-full max-w-md backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-[#e05228] mb-6 text-center drop-shadow-md">
          Register
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              inputMode="numeric"
              pattern="\d{4,}"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
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
            {loading ? 'Registering…' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already registered?{' '}
          <Link href="/login" className="text-[#e05228] hover:underline">
            Login here
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
