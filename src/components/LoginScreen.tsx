import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { AuthMode, loginAdmin, setupInitialPassword } from '../services/appAuth';
import { MASJID_INFO } from '../utils/formatters';

interface LoginScreenProps {
  mode: AuthMode;
  onAuthenticated: () => void;
  onContinueReadOnly: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  mode,
  onAuthenticated,
  onContinueReadOnly,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bannerFailed, setBannerFailed] = useState(false);
  const [emblemFailed, setEmblemFailed] = useState(false);

  const isSetup = mode === 'setup_required';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Sila masukkan kata laluan.');
      return;
    }

    if (isSetup) {
      if (password.length < 8) {
        setError('Kata laluan mestilah sekurang-kurangnya 8 aksara.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Pengesahan kata laluan tidak sepadan.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isSetup) {
        await setupInitialPassword(password);
      } else {
        await loginAdmin(password);
      }
      setPassword('');
      setConfirmPassword('');
      onAuthenticated();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Pengesahan gagal. Sila cuba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-12">
      {/* Left Architectural Showcase Column */}
      <div className="relative hidden overflow-hidden bg-slate-900 lg:col-span-7 lg:flex lg:flex-col lg:justify-between">
        {!bannerFailed ? (
          <img
            src={MASJID_INFO.bannerImage}
            alt="Masjid Muhsinin"
            referrerPolicy="no-referrer"
            onError={() => setBannerFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/35" />

        <div className="relative z-10 p-10">
          <div className="inline-flex items-center gap-3">
            {!emblemFailed ? (
              <img
                src={MASJID_INFO.emblemImage}
                alt="Masjid Muhsinin"
                referrerPolicy="no-referrer"
                onError={() => setEmblemFailed(true)}
                className="h-11 w-11 rounded-lg border border-white/20 bg-white object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-800 text-sm font-bold text-white">
                MM
              </div>
            )}
            <span className="text-lg font-bold tracking-tight text-white">
              {MASJID_INFO.name}
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl p-10">
          <p className="text-xs font-medium tracking-wide text-emerald-300">
            {MASJID_INFO.subtitle}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Sistem Pengurusan Kewangan Telus & Sistematik
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">
            Rekod kutipan derma, perbelanjaan, penyata bulanan PDF, resit rasmi
            penderma, dan penyelarasan awan Google Sheets bagi {MASJID_INFO.name}.
          </p>
          <p className="mt-6 text-xs text-slate-300">
            {MASJID_INFO.address} · Tel {MASJID_INFO.phone}
          </p>
        </div>
      </div>

      {/* Right Authentication Form Column */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-5 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Brand Header */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            {!emblemFailed ? (
              <img
                src={MASJID_INFO.emblemImage}
                alt="Masjid Muhsinin"
                referrerPolicy="no-referrer"
                onError={() => setEmblemFailed(true)}
                className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-xs font-bold text-white">
                MM
              </div>
            )}
            <div>
              <div className="text-base font-bold text-slate-900">
                {MASJID_INFO.name}
              </div>
              <div className="text-xs text-slate-500">{MASJID_INFO.address}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-7 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                {isSetup ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <Lock className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isSetup
                    ? 'Tetapan Kata Laluan Pentadbir'
                    : 'Log Masuk Pentadbir'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isSetup
                    ? 'Tetapan sekali sahaja bagi akses Bendahari & AJK'
                    : 'Akses pengurusan penuh kewangan Masjid Muhsinin'}
                </p>
              </div>
            </div>

            {isSetup && (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs leading-relaxed text-emerald-950">
                Sila tetapkan kata laluan pentadbir anda (contohnya kata laluan rasmi
                masjid) untuk mengaktifkan log masuk. Selepas ditetapkan, borang ini
                akan dikunci secara automatik.
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  {isSetup ? 'Kata Laluan Pentadbir Baharu' : 'Kata Laluan'}
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSetup ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata laluan"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-3.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label={
                      showPassword
                        ? 'Sembunyikan kata laluan'
                        : 'Paparkan kata laluan'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {isSetup && (
                <div>
                  <label
                    htmlFor="admin-password-confirm"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Sahkan Kata Laluan
                  </label>
                  <input
                    id="admin-password-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Masukkan semula kata laluan"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Mengesahkan...'
                  : isSetup
                    ? 'Simpan Kata Laluan & Masuk'
                    : 'Log Masuk'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <button
                type="button"
                onClick={onContinueReadOnly}
                className="text-xs font-medium text-slate-600 transition-colors hover:text-emerald-800 hover:underline"
              >
                Semak Baki Semasa Sahaja (Mod Bacaan Awam)
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            {MASJID_INFO.name} · {MASJID_INFO.address}
          </p>
        </div>
      </div>
    </div>
  );
};
