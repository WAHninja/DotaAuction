'use client';

import { useState, useEffect, useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, ExternalLink, Unlink, CheckCircle2, AlertCircle, Pencil, KeyRound, Eye, EyeOff } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import { useRouter } from 'next/navigation';

type SteamProfile = {
  steamId: string;
  personaName: string;
  avatarFull: string;
  profileUrl: string;
  personaState: number;
};

type LinkState =
  | { status: 'loading' }
  | { status: 'unlinked' }
  | { status: 'linked'; profile: SteamProfile }
  | { status: 'error'; message: string };

// ── Steam icon ────────────────────────────────────────────────────────────────
function SteamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.388 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
    </svg>
  );
}

// ── Persona state badge ───────────────────────────────────────────────────────
// Steam persona states: 0=offline, 1=online, 2=busy, 3=away, 4=snooze
function PersonaStateBadge({ state }: { state: number }) {
  const isOnline = state > 0;
  const label = state === 1 ? 'Online' : state === 2 ? 'Busy' : state === 3 ? 'Away' : state === 4 ? 'Snooze' : 'Offline';
  return (
    <span className={`inline-flex items-center gap-1.5 font-barlow text-xs font-semibold px-2 py-0.5 rounded border ${
      isOnline
        ? 'bg-dota-radiant/15 border-dota-radiant/40 text-dota-radiant-light'
        : 'bg-dota-border/30 border-dota-border text-dota-text-dim'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-dota-radiant' : 'bg-dota-text-dim'}`} />
      {label}
    </span>
  );
}

// ── Steam profile card (linked state) ────────────────────────────────────────
function LinkedProfileCard({
  profile,
  onUnlink,
  unlinking,
}: {
  profile: SteamProfile;
  onUnlink: () => void;
  unlinking: boolean;
}) {
  return (
    <div className="panel-raised p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-dota-gold/40 shadow-gold">
          <Image
            src={profile.avatarFull}
            alt={`${profile.personaName}'s Steam avatar`}
            width={80}
            height={80}
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-dota-surface border border-dota-border flex items-center justify-center">
          <SteamIcon className="w-3 h-3 text-dota-text-muted" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-cinzel font-bold text-xl text-dota-text truncate">
            {profile.personaName}
          </span>
          <PersonaStateBadge state={profile.personaState} />
          <span className="flex items-center gap-1 badge-radiant text-xs py-0.5">
            <CheckCircle2 className="w-3 h-3" />
            Linked
          </span>
        </div>
        <p className="font-barlow text-xs text-dota-text-dim tabular-nums">
          Steam ID: {profile.steamId}
        </p>
        <a
          href={profile.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-barlow text-xs text-dota-gold hover:text-dota-gold-light transition-colors"
        >
          View Steam profile <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Unlink */}
      <button
        onClick={onUnlink}
        disabled={unlinking}
        className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 text-dota-dire-light border-dota-dire-border hover:bg-dota-dire/10 shrink-0"
      >
        {unlinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
        {unlinking ? 'Unlinking…' : 'Unlink'}
      </button>
    </div>
  );
}

// ── How to find Steam ID ──────────────────────────────────────────────────────
function HowToFindSteamId() {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel-sunken rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 font-barlow text-sm font-semibold text-dota-text-muted hover:text-dota-text transition-colors"
      >
        <span>How do I find my Steam ID?</span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 font-barlow text-sm text-dota-text-muted border-t border-dota-border">
          <ol className="space-y-2 mt-3">
            {[
              <>Open Steam and go to your <strong className="text-dota-text">Profile</strong></>,
              <>In your browser URL bar, look for a URL like <code className="text-dota-gold bg-dota-deep px-1 rounded text-xs">steamcommunity.com/profiles/76561198XXXXXXXXX</code></>,
              <>The 17-digit number at the end is your <strong className="text-dota-text">Steam64 ID</strong></>,
              <>If your URL shows a custom name, open Steam → Settings → Interface → Display Steam URL address bar, then check your profile again</>,
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-dota-gold/20 border border-dota-gold/30 text-dota-gold text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-dota-text-dim pt-1">
            Alternatively, visit{' '}
            <a href="https://steamid.io" target="_blank" rel="noopener noreferrer" className="text-dota-gold hover:underline">
              steamid.io
            </a>
            {' '}and enter your Steam profile URL.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Inline feedback message ───────────────────────────────────────────────────
function Feedback({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`flex items-start gap-2 font-barlow text-sm rounded px-3 py-2.5 border ${
      type === 'success'
        ? 'text-dota-radiant-light bg-dota-radiant/10 border-dota-radiant/30'
        : 'text-dota-dire-light bg-dota-dire/10 border-dota-dire-border'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      }
      {message}
    </div>
  );
}

// ── Change username form ──────────────────────────────────────────────────────
function ChangeUsernameForm({ currentUsername, onSuccess }: { currentUsername: string; onSuccess: (u: string) => void }) {
  const [value, setValue]       = useState(currentUsername);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const isDirty = value.trim() !== currentUsername;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/me/username', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update username.'); return; }
      setSuccess(`Username updated to "${data.username}".`);
      onSuccess(data.username);
    } catch {
      setError('Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="new-username" className="stat-label block">New username</label>
        <div className="flex gap-2">
          <input
            id="new-username"
            type="text"
            value={value}
            onChange={e => { setValue(e.target.value); setError(null); setSuccess(null); }}
            className="input flex-1"
            disabled={submitting}
            maxLength={32}
          />
          <button
            type="submit"
            disabled={submitting || !isDirty || !value.trim()}
            className="btn-primary shrink-0"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save'}
          </button>
        </div>
      </div>
      {error   && <Feedback type="error"   message={error} />}
      {success && <Feedback type="success" message={success} />}
    </form>
  );
}

// ── Change PIN form ───────────────────────────────────────────────────────────
function ChangePinForm() {
  const [currentPin, setCurrentPin]   = useState('');
  const [newPin, setNewPin]           = useState('');
  const [confirmPin, setConfirmPin]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPin !== confirmPin) { setError('New PINs do not match.'); return; }
    if (!/^\d{4,}$/.test(newPin)) { setError('New PIN must be at least 4 digits.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/me/pin', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update PIN.'); return; }
      setSuccess('PIN updated successfully.');
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
    } catch {
      setError('Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Current PIN */}
      <div className="space-y-1.5">
        <label htmlFor="current-pin" className="stat-label block">Current PIN</label>
        <div className="relative">
          <input
            id="current-pin"
            type={showCurrent ? 'text' : 'password'}
            inputMode="numeric"
            value={currentPin}
            onChange={e => { setCurrentPin(e.target.value); setError(null); }}
            className="input pr-10"
            disabled={submitting}
            maxLength={20}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dota-text-dim hover:text-dota-text transition-colors"
            aria-label={showCurrent ? 'Hide PIN' : 'Show PIN'}
          >
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* New PIN */}
      <div className="space-y-1.5">
        <label htmlFor="new-pin" className="stat-label block">New PIN</label>
        <div className="relative">
          <input
            id="new-pin"
            type={showNew ? 'text' : 'password'}
            inputMode="numeric"
            value={newPin}
            onChange={e => { setNewPin(e.target.value); setError(null); }}
            className="input pr-10"
            disabled={submitting}
            maxLength={20}
            placeholder="4+ digits"
          />
          <button
            type="button"
            onClick={() => setShowNew(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dota-text-dim hover:text-dota-text transition-colors"
            aria-label={showNew ? 'Hide PIN' : 'Show PIN'}
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm new PIN */}
      <div className="space-y-1.5">
        <label htmlFor="confirm-pin" className="stat-label block">Confirm new PIN</label>
        <input
          id="confirm-pin"
          type="password"
          inputMode="numeric"
          value={confirmPin}
          onChange={e => { setConfirmPin(e.target.value); setError(null); }}
          className={`input ${confirmPin && confirmPin !== newPin ? 'border-dota-dire-border focus:border-dota-dire' : ''}`}
          disabled={submitting}
          maxLength={20}
          placeholder="Repeat new PIN"
        />
        {confirmPin && confirmPin !== newPin && (
          <p className="font-barlow text-xs text-dota-dire-light">PINs do not match</p>
        )}
      </div>

      {error   && <Feedback type="error"   message={error} />}
      {success && <Feedback type="success" message={success} />}

      <button
        type="submit"
        disabled={submitting || !currentPin || !newPin || newPin !== confirmPin}
        className="btn-primary"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update PIN'}
      </button>
    </form>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function CollapsibleSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel-sunken rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 font-barlow font-semibold text-sm text-dota-text-muted hover:text-dota-text transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </span>
        <span className={`transition-transform text-dota-text-dim ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-dota-border pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useContext(UserContext);
  const router = useRouter();

  const [linkState, setLinkState]   = useState<LinkState>({ status: 'loading' });
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unlinking, setUnlinking]   = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // Load Steam state
  useEffect(() => {
    if (!user) return;
    fetch('/api/me/steam', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.error)        setLinkState({ status: 'error', message: data.error });
        else if (data.linked)  setLinkState({ status: 'linked', profile: data.profile });
        else                   setLinkState({ status: 'unlinked' });
      })
      .catch(() => setLinkState({ status: 'error', message: 'Failed to load Steam profile.' }));
  }, [user]);

  // ── Link ──────────────────────────────────────────────────────────────────
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/me/steam', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId: inputValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to link Steam account.'); return; }
      setLinkState({ status: 'linked', profile: data.profile });
      setInputValue('');
      setSuccessMsg(`Linked to ${data.profile.personaName}!`);
    } catch {
      setFormError('Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Unlink ────────────────────────────────────────────────────────────────
  const handleUnlink = async () => {
    setUnlinking(true);
    setSuccessMsg(null);
    try {
      await fetch('/api/me/steam', { method: 'DELETE', credentials: 'include' });
      setLinkState({ status: 'unlinked' });
      setSuccessMsg('Steam account unlinked.');
    } catch {
      setFormError('Failed to unlink. Please try again.');
    } finally {
      setUnlinking(false);
    }
  };

  // ── Username update ───────────────────────────────────────────────────────
  const handleUsernameSuccess = async (newUsername: string) => {
    // Refresh the UserContext so the header updates immediately
    await refreshUser();
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-dota-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn py-4">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <h1 className="font-cinzel text-4xl font-black text-dota-gold text-glow-gold">Profile</h1>
        <div className="divider-gold w-40 mx-auto" />
      </div>

      {/* ── Account panel ────────────────────────────────────────────────── */}
      <div className="panel p-6 space-y-5">
        <h2 className="font-cinzel text-lg font-bold text-dota-text">Account</h2>

        {/* Current info summary */}
        <div className="panel-sunken rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="stat-label mb-0.5">Username</p>
            <p className="font-barlow font-bold text-dota-gold text-lg">{user.username}</p>
          </div>
          <div className="text-right">
            <p className="stat-label mb-0.5">Player ID</p>
            <p className="font-barlow font-semibold text-dota-text-muted tabular-nums">#{user.id}</p>
          </div>
        </div>

        {/* Change username */}
        <CollapsibleSection icon={Pencil} title="Change username">
          <ChangeUsernameForm
            currentUsername={user.username}
            onSuccess={handleUsernameSuccess}
          />
        </CollapsibleSection>

        {/* Change PIN */}
        <CollapsibleSection icon={KeyRound} title="Change PIN">
          <ChangePinForm />
        </CollapsibleSection>
      </div>

      {/* ── Steam panel ──────────────────────────────────────────────────── */}
      <div className="panel p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1b2838] border border-[#2a475e] flex items-center justify-center shrink-0">
            <SteamIcon className="w-4 h-4 text-[#66c0f4]" />
          </div>
          <div>
            <h2 className="font-cinzel text-lg font-bold text-dota-text">Steam Account</h2>
            <p className="font-barlow text-xs text-dota-text-muted">
              Link your Steam profile to display your avatar and online status
            </p>
          </div>
        </div>

        <div className="divider" />

        {/* Global success message (link/unlink) */}
        {successMsg && <Feedback type="success" message={successMsg} />}

        {/* Loading */}
        {linkState.status === 'loading' && (
          <div className="flex items-center gap-3 py-4 justify-center font-barlow text-dota-text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading Steam profile…
          </div>
        )}

        {/* Error */}
        {linkState.status === 'error' && (
          <Feedback type="error" message={linkState.message} />
        )}

        {/* Linked */}
        {linkState.status === 'linked' && (
          <LinkedProfileCard
            profile={linkState.profile}
            onUnlink={handleUnlink}
            unlinking={unlinking}
          />
        )}

        {/* Unlinked — show form */}
        {(linkState.status === 'unlinked' || linkState.status === 'error') && (
          <div className="space-y-4">
            <form onSubmit={handleLink} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="steam-id" className="stat-label block">Steam64 ID</label>
                <div className="flex gap-2">
                  <input
                    id="steam-id"
                    type="text"
                    value={inputValue}
                    onChange={e => { setInputValue(e.target.value); setFormError(null); }}
                    placeholder="e.g. 76561198012345678"
                    className="input flex-1 tabular-nums"
                    disabled={submitting}
                    inputMode="numeric"
                    maxLength={20}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !inputValue.trim()}
                    className="btn-primary shrink-0"
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                      : 'Link Account'
                    }
                  </button>
                </div>
              </div>
              {formError && <Feedback type="error" message={formError} />}
            </form>
            <HowToFindSteamId />
          </div>
        )}
      </div>

      {/* ── Back link ────────────────────────────────────────────────────── */}
      <div className="text-center">
        <Link href="/" className="font-barlow text-sm text-dota-text-muted hover:text-dota-gold transition-colors">
          ← Back to Dashboard
        </Link>
      </div>

    </div>
  );
}
