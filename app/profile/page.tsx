'use client';

import { useState, useEffect, useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, ExternalLink, Unlink, CheckCircle2, AlertCircle, Steam } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import { useRouter } from 'next/navigation';

type SteamProfile = {
  steamId: string;
  personaName: string;
  avatarFull: string;
  profileUrl: string;
};

type LinkState =
  | { status: 'loading' }
  | { status: 'unlinked' }
  | { status: 'linked'; profile: SteamProfile }
  | { status: 'error'; message: string };

// ── Steam icon (inline SVG — lucide doesn't include it) ──────────────────────
function SteamIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.388 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
    </svg>
  );
}

// ── Online/persona state badge ─────────────────────────────────────────────────
function PersonaStateBadge({ state }: { state?: number }) {
  // Steam persona states: 0=offline, 1=online, 2=busy, 3=away, 4=snooze, 5=looking to trade, 6=looking to play
  const isOnline = state !== undefined && state > 0;
  return (
    <span className={`inline-flex items-center gap-1.5 font-barlow text-xs font-semibold px-2 py-0.5 rounded border ${
      isOnline
        ? 'bg-dota-radiant/15 border-dota-radiant/40 text-dota-radiant-light'
        : 'bg-dota-border/30 border-dota-border text-dota-text-dim'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-dota-radiant' : 'bg-dota-text-dim'}`} />
      {isOnline ? 'Online' : 'Offline'}
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
            unoptimized // external URL — bypass Next.js image optimisation
          />
        </div>
        {/* Steam watermark on avatar */}
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

      {/* Unlink button */}
      <button
        onClick={onUnlink}
        disabled={unlinking}
        className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 text-dota-dire-light border-dota-dire-border hover:bg-dota-dire/10 shrink-0"
      >
        {unlinking
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Unlink className="w-3.5 h-3.5" />
        }
        {unlinking ? 'Unlinking…' : 'Unlink'}
      </button>
    </div>
  );
}

// ── How to find your Steam ID helper ─────────────────────────────────────────
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, loading: authLoading } = useContext(UserContext);
  const router = useRouter();

  const [linkState, setLinkState] = useState<LinkState>({ status: 'loading' });
  const [inputValue, setInputValue]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [unlinking, setUnlinking]     = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // Load current steam link state
  useEffect(() => {
    if (!user) return;
    fetch('/api/me/steam')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setLinkState({ status: 'error', message: data.error });
        } else if (data.linked) {
          setLinkState({ status: 'linked', profile: data.profile });
        } else {
          setLinkState({ status: 'unlinked' });
        }
      })
      .catch(() => setLinkState({ status: 'error', message: 'Failed to load Steam profile.' }));
  }, [user]);

  // ── Link Steam ID ──────────────────────────────────────────────────────────
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/me/steam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId: inputValue.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to link Steam account.');
        return;
      }

      setLinkState({ status: 'linked', profile: data.profile });
      setInputValue('');
      setSuccessMsg(`Linked to ${data.profile.personaName}!`);
    } catch {
      setFormError('Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Unlink ─────────────────────────────────────────────────────────────────
  const handleUnlink = async () => {
    setUnlinking(true);
    setSuccessMsg(null);
    try {
      await fetch('/api/me/steam', { method: 'DELETE' });
      setLinkState({ status: 'unlinked' });
      setSuccessMsg('Steam account unlinked.');
    } catch {
      setFormError('Failed to unlink. Please try again.');
    } finally {
      setUnlinking(false);
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────
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
        <h1 className="font-cinzel text-4xl font-black text-dota-gold text-glow-gold">
          Profile
        </h1>
        <div className="divider-gold w-40 mx-auto" />
      </div>

      {/* ── Account info panel ───────────────────────────────────────────── */}
      <div className="panel p-6 space-y-4">
        <h2 className="font-cinzel text-lg font-bold text-dota-text">
          Account
        </h2>
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
              Link your Steam profile to track heroes, KDA, and net worth from your Dota matches
            </p>
          </div>
        </div>

        <div className="divider" />

        {/* Success message */}
        {successMsg && (
          <div className="flex items-center gap-2 font-barlow text-sm text-dota-radiant-light bg-dota-radiant/10 border border-dota-radiant/30 rounded px-4 py-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Loading */}
        {linkState.status === 'loading' && (
          <div className="flex items-center gap-3 py-4 justify-center font-barlow text-dota-text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading Steam profile…
          </div>
        )}

        {/* Error state */}
        {linkState.status === 'error' && (
          <div className="flex items-start gap-2 font-barlow text-sm text-dota-dire-light bg-dota-dire-subtle border border-dota-dire-border rounded px-4 py-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {linkState.message}
          </div>
        )}

        {/* Linked */}
        {linkState.status === 'linked' && (
          <LinkedProfileCard
            profile={linkState.profile}
            onUnlink={handleUnlink}
            unlinking={unlinking}
          />
        )}

        {/* Unlinked — show link form */}
        {(linkState.status === 'unlinked' || linkState.status === 'error') && (
          <div className="space-y-4">

            <form onSubmit={handleLink} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="steam-id" className="stat-label block">
                  Steam64 ID
                </label>
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

              {formError && (
                <p className="flex items-start gap-2 font-barlow text-sm text-dota-dire-light bg-dota-dire-subtle border border-dota-dire-border rounded px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {formError}
                </p>
              )}
            </form>

            <HowToFindSteamId />
          </div>
        )}

        {/* What this unlocks */}
        {linkState.status !== 'linked' && (
          <div className="panel-sunken rounded-lg p-4 space-y-2">
            <p className="stat-label">What linking unlocks</p>
            <ul className="space-y-1.5">
              {[
                'Hero tracking — see which heroes you played each game',
                'KDA stats — kills, deaths, and assists per game',
                'Net worth tracking alongside your gold earnings',
                'Automatic player matching when your Dota lobby posts stats',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 font-barlow text-sm text-dota-text-muted">
                  <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-dota-gold/50" />
                  {item}
                </li>
              ))}
            </ul>
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
