import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { MASJID_INFO } from '../utils/formatters';

const APP_PASSWORD = 'muhsinin@123';
const AUTH_KEY = 'masjid_muhsinin_auth_v1';

export function isAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function clearAuth() {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

export default function LoginGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      try {
        sessionStorage.setItem(AUTH_KEY, 'true');
      } catch {
        // ignore
      }
      onUnlock();
    } else {
      setError('Kata laluan salah. Sila cuba lagi.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 px-4">
      {/* Decorative background glow */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden="true"
      />

      <div
        className={`relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl transition-transform ${
          shake ? 'animate-[shake_0.4s_ease]' : ''
        }`}
        style={{
          animationName: shake ? 'shake' : undefined,
        }}
      >
        {/* Emblem */}
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={MASJID_INFO.emblemImage}
            alt="Masjid Muhsinin"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
            className="mb-4 h-16 w-16 rounded-xl border border-white/20 object-cover"
          />
          <h1 className="text-xl font-bold tracking-tight text-white">
            {MASJID_INFO.name}
          </h1>
          <p className="mt-1 text-sm text-emerald-200/80">
            Sistem Pengurusan Kewangan
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-medium text-emerald-100/90"
            >
              Kata Laluan
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/70" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoFocus
                autoComplete="current-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Masukkan kata laluan"
                className="w-full rounded-lg border border-white/15 bg-white/10 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-emerald-100/40 transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70 transition-colors hover:text-white"
                aria-label={showPassword ? 'Sembunyi kata laluan' : 'Tunjuk kata laluan'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs font-medium text-red-300">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          >
            <LogIn className="h-4 w-4" />
            Log Masuk
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-emerald-100/50">
          Akses terhad kepada Jawatankuasa Pengurusan Kewangan
        </p>
      </div>
    </div>
  );
}
