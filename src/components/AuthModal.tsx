import React, { useState } from 'react';
import type { CrimeFamily, PlayerProfile } from '../types/game';
import { sound } from '../utils/sound';

export interface AuthAccountPayload {
  token: string;
  account: {
    id: string;
    username: string;
    familyId: string;
    profile: Partial<PlayerProfile> | null;
  };
}

interface AuthModalProps {
  families: CrimeFamily[];
  initialMode?: 'register' | 'login';
  currentUsername?: string;
  isSignedIn: boolean;
  onSuccess: (payload: AuthAccountPayload, isNewRegistration: boolean) => void;
  onSignOut: () => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  families,
  initialMode = 'register',
  currentUsername,
  isSignedIn,
  onSuccess,
  onSignOut,
  onClose,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [familyId, setFamilyId] = useState('gambino');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          ...(mode === 'register' ? { familyId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not authenticate. Please check your details.');
        setSubmitting(false);
        return;
      }
      sound.playVictory();
      onSuccess(data as AuthAccountPayload, mode === 'register');
    } catch {
      setError('Cannot reach the Don BroJim server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[460px] rounded-2xl bg-[#161210]/98 border-2 border-[#b99142]/80 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#261a12] border-b border-amber-500/25">
          <h2 className="font-display text-2xl font-bold text-amber-200 tracking-wide">
            Mobster Account — Don BroJim
          </h2>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="Close Account Modal"
            className="w-9 h-9 flex items-center justify-center text-white text-xl font-bold hover:text-amber-300 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isSignedIn && currentUsername && (
            <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-500/35 flex items-center justify-between gap-2 text-xs">
              <span className="text-emerald-200">
                Signed in as <strong className="text-white">{currentUsername}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onSignOut();
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-200 font-bold cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'register' ? 'bg-[#b99142] text-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              Register New Mobster
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'login' ? 'bg-[#b99142] text-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Mobster Name
              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. TonyV_44"
                className="mt-1 w-full h-11 px-3 rounded-lg bg-black/70 border border-white/20 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-300">
              Password
              <input
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                className="mt-1 w-full h-11 px-3 rounded-lg bg-black/70 border border-white/20 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </label>

            {mode === 'register' && (
              <label className="block text-xs font-semibold text-slate-300">
                Starting Crime Family
                <select
                  value={familyId}
                  onChange={(e) => setFamilyId(e.target.value)}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-zinc-900 border border-white/20 text-sm text-white"
                >
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fullTitle}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {error && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-400/50 text-xs text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-[#b99142] hover:brightness-110 disabled:opacity-50 text-black font-bold text-sm cursor-pointer transition"
            >
              {submitting
                ? 'Connecting...'
                : mode === 'register'
                ? 'Register & Enter Harbor Town'
                : 'Sign In to Don BroJim'}
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Continue Without Signing In (Guest Local Save)
          </button>
        </div>
      </div>
    </div>
  );
};
