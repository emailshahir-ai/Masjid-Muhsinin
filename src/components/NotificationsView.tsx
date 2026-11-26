import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CheckCheck,
  Mail,
} from 'lucide-react';
import { NotificationItem, NotificationSettings } from '../types/finance';
import { formatRM, formatTimestampMY } from '../utils/formatters';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  settings: NotificationSettings;
  isSignedIn: boolean;
  onUpdateSettings: (next: NotificationSettings) => void;
  onMarkAllRead: () => void;
  onSendSummaryEmail: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  settings,
  isSignedIn,
  onUpdateSettings,
  onMarkAllRead,
  onSendSummaryEmail,
}) => {
  const [filter, setFilter] = useState<'all' | 'masuk' | 'keluar' | 'sistem'>(
    'all'
  );
  const [emailsInput, setEmailsInput] = useState(settings.committeeEmails);
  const [thresholdInput, setThresholdInput] = useState(
    String(settings.largeExpenseThreshold)
  );
  const [savedFeedback, setSavedFeedback] = useState(false);

  const filtered = useMemo(() => {
    return notifications.filter((n) =>
      filter === 'all' ? true : n.type === filter
    );
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedThreshold = parseFloat(thresholdInput);
    onUpdateSettings({
      ...settings,
      committeeEmails: emailsInput.trim(),
      largeExpenseThreshold:
        isNaN(parsedThreshold) || parsedThreshold < 0 ? 1000 : parsedThreshold,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* Left: Live Automatic Notification Feed */}
      <div className="rounded-xl border border-slate-200 bg-white lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Log Notifikasi Automatik Transaksi
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Setiap kutipan masuk dan perbelanjaan keluar dijana notifikasi secara
              automatik · {unreadCount} belum dibaca
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tandakan Semua Dibaca
            </button>
          )}
        </div>

        <div className="border-b border-slate-100 px-6 py-3">
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                ['all', 'Semua'],
                ['masuk', 'Kutipan Masuk'],
                ['keluar', 'Perbelanjaan'],
                ['sistem', 'Sistem & Awan'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilter(val)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === val
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Tiada log notifikasi dalam kategori ini.
            </div>
          ) : (
            filtered.map((item) => {
              const isIn = item.type === 'masuk';
              const isOut = item.type === 'keluar';
              return (
                <div
                  key={item.id}
                  className={`px-6 py-4 transition-colors ${
                    item.read ? 'bg-white' : 'bg-emerald-50/35'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isIn
                            ? 'bg-emerald-50 text-emerald-800'
                            : isOut
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isIn ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : isOut ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {item.message}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          <span>{formatTimestampMY(item.timestamp)}</span>
                          <span aria-hidden="true">·</span>
                          <span>Saluran: {item.channel}</span>
                          {item.balanceAfter !== undefined && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums text-slate-600">
                                Baki Selepas: {formatRM(item.balanceAfter)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.amount !== undefined && (
                      <div
                        className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
                          isIn ? 'text-emerald-800' : 'text-red-700'
                        }`}
                      >
                        {isIn ? '+' : '-'}
                        {formatRM(item.amount)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Automatic Alert & Gmail Dispatch Settings */}
      <div className="space-y-6 lg:col-span-4">
        <form
          onSubmit={handleSaveSettings}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <h3 className="text-base font-semibold text-slate-900">
            Tetapan Notifikasi AJK & Bendahari
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Konfigurasikan senarai e-mel Jawatankuasa Masjid Muhsinin untuk
            menerima makluman setiap transaksi masuk dan keluar melalui Gmail.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="committee-emails"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                E-mel Penerima Notifikasi AJK (dipisahkan dengan koma)
              </label>
              <textarea
                id="committee-emails"
                rows={3}
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder="bendahari@masjidmuhsinin.org.my, pengerusi@masjidmuhsinin.org.my"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="expense-threshold"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Had Amaran Perbelanjaan Besar (RM)
              </label>
              <input
                id="expense-threshold"
                type="number"
                min="0"
                step="100"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={settings.promptGmailOnTransaction}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    promptGmailOnTransaction: e.target.checked,
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
              />
              <span>
                Aktifkan cadangan penghantaran e-mel Gmail secara automatik bagi
                setiap transaksi baharu
              </span>
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-900"
            >
              Simpan Tetapan Notifikasi
            </button>

            {savedFeedback && (
              <p className="text-center text-xs font-medium text-emerald-800">
                Tetapan notifikasi telah dikemas kini.
              </p>
            )}
          </div>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Hantar Ringkasan Baki Semasa (Gmail)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Hantar laporan ringkas baki semasa Masjid Muhsinin terus ke peti masuk
            e-mel AJK yang ditetapkan.
          </p>
          <button
            type="button"
            disabled={!isSignedIn || !settings.committeeEmails.trim()}
            onClick={onSendSummaryEmail}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail className="h-4 w-4 text-emerald-800" />
            {isSignedIn
              ? 'Hantar E-mel Ringkasan Baki Sekarang'
              : 'Log Masuk Google untuk Aktifkan Gmail'}
          </button>
        </div>
      </div>
    </div>
  );
};
