'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = 'https://dotaauction.onrender.com/';
    } else {
      setError(data.error || 'Login failed');
    }
  };

  <div className="min-h-screen flex items-center justify-center p-4 text-white font-[Cinzel]">
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
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#2c2c2c] border border-gray-600 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e05228] text-white"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm mb-1">
              PIN (4+ digits)
            </label>
            <input
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full bg-[#2c2c2c] border border-gray-600 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e05228] text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#e05228] hover:bg-[#ff6b3a] text-white font-semibold py-2 rounded shadow-lg transition-all duration-200"
          >
            Login
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
          Not registered?{' '}
          <Link href="/register" className="text-[#e05228] hover:underline">
            Register here
          </Link>
        </p>
        {message && (
          <p className="mt-4 text-center text-sm text-orange-400">{message}</p>
        )}
      </div>
    </div>
  );
}
