import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  FileText,
  Receipt,
  Search,
} from 'lucide-react';
import { ActiveTab, Transaction, WorkspaceConnection } from '../types/finance';
import {
  calculateLedgerTotals,
  formatDateMY,
  formatMonthKeyLabel,
  formatRM,
  formatTimestampMY,
  MASJID_INFO,
} from '../utils/formatters';

interface KariahPortalViewProps {
  transactions: Transaction[];
  connection: WorkspaceConnection;
  onSelectReceipt: (tx: Transaction) => void;
  onNavigate: (tab: ActiveTab) => void;
  onOpenNewTransaction: () => void;
}

export const KariahPortalView: React.FC<KariahPortalViewProps> = ({
  transactions,
  connection,
  onSelectReceipt,
  onNavigate,
}) => {
  const [bannerFailed, setBannerFailed] = useState(false);
  const [verifyQuery, setVerifyQuery] = useState('');

  const currentMonthKey = useMemo(() => {
    const months = transactions
      .map((t) => t.date.slice(0, 7))
      .sort((a, b) => b.localeCompare(a));
    return months[0] || new Date().toISOString().slice(0, 7);
  }, [transactions]);

  const overallTotals = useMemo(
    () => calculateLedgerTotals(transactions),
    [transactions]
  );

  const currentMonthTotals = useMemo(() => {
    const monthTx = transactions.filter((t) =>
      t.date.startsWith(currentMonthKey)
    );
    return {
      ...calculateLedgerTotals(monthTx),
      count: monthTx.length,
    };
  }, [transactions, currentMonthKey]);

  const fundBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type === 'masuk') {
        map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
      }
    }
    const items = Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const total = items.reduce((sum, i) => sum + i.amount, 0) || 1;
    return items.map((item) => ({
      ...item,
      share: Math.round((item.amount / total) * 100),
    }));
  }, [transactions]);

  const verifiedResults = useMemo(() => {
    const q = verifyQuery.trim().toLowerCase();
    if (!q) return [];
    return transactions
      .filter(
        (tx) =>
          tx.receiptNo.toLowerCase().includes(q) ||
          tx.partyName.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [transactions, verifyQuery]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
      .slice(0, 8);
  }, [transactions]);

  return (
    <div className="space-y-8">
      {/* Architectural Hero Banner with Real-Time Balance Focal Anchor */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
        {!bannerFailed ? (
          <img
            src={MASJID_INFO.bannerImage}
            alt="Masjid Muhsinin"
            referrerPolicy="no-referrer"
            onError={() => setBannerFailed(true)}
            className="h-[290px] w-full object-cover object-[center_35%] brightness-110 contrast-[1.03] sm:h-[310px]"
          />
        ) : (
          <div className="h-[290px] w-full bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-800 sm:h-[310px]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/35 to-slate-950/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/20" />

        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
            <span>
              {MASJID_INFO.subtitle} · {MASJID_INFO.address}
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              {connection.spreadsheetId
                ? `Disegerak Google Sheets · ${connection.lastSyncedAt ? formatTimestampMY(connection.lastSyncedAt) : 'Aktif'}`
                : 'Paparan Masa Nyata · Sedia Disambung Google Sheets'}
            </span>
          </div>

          <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-xs font-medium tracking-wide text-emerald-300">
                Baki Semasa Tabung Masjid Muhsinin (Masa Nyata)
              </p>
              <div className="mt-2 font-mono text-3xl font-bold tracking-tight tabular-nums text-white sm:text-5xl">
                {formatRM(overallTotals.balance)}
              </div>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-200">
                Semakan terbuka dana infaq, kutipan derma, dan agihan perbelanjaan
                Masjid Muhsinin untuk rujukan telus orang ramai.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:col-span-5 lg:justify-end">
              <button
                type="button"
                onClick={() => onNavigate('laporan')}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
              >
                <FileText className="h-4 w-4" />
                Laporan Bulanan PDF
              </button>
              <button
                type="button"
                onClick={() => onNavigate('buku-tunai')}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Semak Buku Tunai
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column Full-Width KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Jumlah Kutipan Keseluruhan
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-800">
            {formatRM(overallTotals.totalIn)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {transactions.filter((t) => t.type === 'masuk').length} rekod sumbangan · Semua tabung
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Jumlah Perbelanjaan Keseluruhan
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-red-700">
            {formatRM(overallTotals.totalOut)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {transactions.filter((t) => t.type === 'keluar').length} baucar bayaran · Disahkan AJK
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Kutipan {formatMonthKeyLabel(currentMonthKey)}
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {formatRM(currentMonthTotals.totalIn)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Perbelanjaan bulan ini: {formatRM(currentMonthTotals.totalOut)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Akaun Rasmi Sumbangan
          </div>
          <div className="mt-2 font-mono text-lg font-semibold tabular-nums text-slate-900">
            {MASJID_INFO.accountNo}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {MASJID_INFO.bankName} · {MASJID_INFO.name}
          </div>
        </div>
      </section>

      {/* Quick Kariah Receipt Verification & Fund Allocation Split */}
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Quick Verification Search */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Semakan Pantas Resit & Dana
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Masukkan nombor resit (contoh: MM-2026-0010), nama penderma, atau jenis tabung
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={verifyQuery}
              onChange={(e) => setVerifyQuery(e.target.value)}
              placeholder="Cari no. resit MM-2026-..., nama penderma, atau kategori..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-colors focus:border-emerald-700 focus:bg-white focus:outline-none"
            />
          </div>

          {verifyQuery.trim() ? (
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-200">
              {verifiedResults.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Tiada rekod ditemui untuk carian &ldquo;{verifyQuery}&rdquo;.
                </p>
              ) : (
                verifiedResults.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-medium text-slate-800">
                          {tx.receiptNo}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateMY(tx.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{tx.category}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                        {tx.partyName} — {tx.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          tx.type === 'masuk'
                            ? 'text-emerald-800'
                            : 'text-red-700'
                        }`}
                      >
                        {tx.type === 'masuk' ? '+' : '-'}
                        {formatRM(tx.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectReceipt(tx)}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Papar Resit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  01. Ketelusan Penuh
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Setiap sen kutipan derma dan baucar perbelanjaan direkodkan dengan
                  nombor siri berurutan.
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  02. Storan Google Sheets
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Rekod kewangan diselaraskan terus ke Google Sheets dan diarkibkan
                  dalam bentuk PDF di Google Drive.
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  03. Resit & Laporan PDF
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Orang ramai boleh menyemak resit rasmi dan memuat turun penyata
                  bulanan pada bila-bila masa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fund Allocation Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Pecahan Sumber Kutipan
            </h2>
            <span className="text-xs text-slate-500">Kumulatif 2026</span>
          </div>

          <div className="mt-4 space-y-3.5">
            {fundBreakdown.map((item) => (
              <div key={item.category}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-slate-700">
                    {item.category}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-slate-900">
                    {formatRM(item.amount)}{' '}
                    <span className="text-slate-400">({item.share}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-700"
                    style={{ width: `${Math.max(item.share, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Transparent Transactions Table */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Transaksi Terkini Masjid Muhsinin
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              8 rekod keluar masuk terkini yang disahkan dalam buku tunai
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('buku-tunai')}
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline"
          >
            Lihat Semua {transactions.length} Transaksi
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-6 py-3">Tarikh & Rujukan</th>
                <th className="px-4 py-3">Pihak & Keterangan</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Jumlah (RM)</th>
                <th className="px-6 py-3 text-right">Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => {
                const isIn = tx.type === 'masuk';
                return (
                  <tr
                    key={tx.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <div className="font-mono text-xs font-medium text-slate-900">
                        {tx.receiptNo}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {formatDateMY(tx.date)} · {tx.time}
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-3.5">
                      <div className="font-medium text-slate-900">
                        {tx.partyName}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        {tx.description}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="text-xs font-medium text-slate-700">
                        {tx.category}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {tx.paymentMethod}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <div
                        className={`inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums ${
                          isIn ? 'text-emerald-800' : 'text-red-700'
                        }`}
                      >
                        {isIn ? (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        )}
                        {isIn ? '+' : '-'}
                        {formatRM(tx.amount)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectReceipt(tx)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-emerald-800 hover:underline"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        {isIn ? 'Resit' : 'Baucar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
