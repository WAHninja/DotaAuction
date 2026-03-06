'use client';

import { useState } from 'react';

type Props = {
  // Previously typed as (newUsername: string) => void — the parameter was
  // never used by any caller. Simplified to () => void so TypeScript enforces
  // that callers don't accidentally rely on receiving a value.
  onSuccess: () => void;
};

export default function ChangeUsernameForm({ onSuccess }: Props) {
  const [value, setValue]   = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');

    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 32) {
      setError('Username must be between 2 and 32 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/me/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to update username.');
        return;
      }

      setValue('');
      onSuccess();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="New username"
        maxLength={32}
        disabled={loading}
        className="input-field w-full"
      />
      {error && <p className="text-dota-error text-sm">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading || value.trim().length === 0}
        className="btn-primary w-full"
      >
        {loading ? 'Saving…' : 'Save username'}
      </button>
    </div>
  );
}
