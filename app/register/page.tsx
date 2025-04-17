'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('✅ Registered successfully!');
        setUsername('');
        setPin('');
      } else {
        setMessage(`❌ ${data.error || 'Registration failed.'}`);
      }
    } catch (err) {
      setMessage('❌ Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white font-[Cinzel]">
      <div className="bg-[#1e1e1e]/90 border border-[#e05228] shadow-xl rounded-2xl p-8 w-full max-w-md backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-[#e05228] mb-6 text-center drop-shadow-md">
          Dota Auctions Registration
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
              required
              className="w-full bg-[#2c2c2c] border border-gray-600 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e05228] text-white"
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
              required
              className="w-full bg-[#2c2c2c] border border-gray-600 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e05228] text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#e05228] hover:bg-[#ff6b3a] text-white font-semibold py-2 rounded shadow-lg transition-all duration-200"
          >
            Register
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
          Already registered?{' '}
          <Link href="/login" className="text-[#e05228] hover:underline">
            Login here
          </Link>
        </p>
        {message && (
          <p className="mt-4 text-center text-sm text-orange-400">{message}</p>
        )}
      </div>
    </div>
  );
}
