import React, { useMemo, useState } from 'react';
import { CloudUpload, Download, Printer } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Transaction } from '../types/finance';
import {
  calculateLedgerTotals,
  calculateOpeningBalanceForMonth,
  formatDateMY,
  formatMonthKeyLabel,
  formatRM,
  getAvailableMonths,
  MASJID_INFO,
} from '../utils/formatters';
import { buildMonthlyReportPdf, GeneratedPdfResult } from '../utils/pdfGenerator';

interface MonthlyReportViewProps {
  transactions: Transaction[];
  isSignedIn: boolean;
  onArchiveMonthlyReport: (
    monthKey: string,
    openingBalance: number
  ) => void;
  onPreviewPdf: (pdf: GeneratedPdfResult) => void;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  transactions,
  isSignedIn,
  onArchiveMonthlyReport,
  onPreviewPdf,
}) => {
  const availableMonths = useMemo(
    () => getAvailableMonths(transactions),
    [transactions]
  );

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || 'ALL'
  );

  const effectiveMonth =
    selectedMonth !== 'ALL' && !availableMonths.includes(selectedMonth)
      ? availableMonths[0] || 'ALL'
      : selectedMonth;

  const filteredTx = useMemo(() => {
    const list =
      effectiveMonth === 'ALL'
        ? [...transactions]
        : transactions.filter((tx) => tx.date.startsWith(effectiveMonth));
    return list.sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );
  }, [transactions, effectiveMonth]);

  const openingBalance = useMemo(
    () => calculateOpeningBalanceForMonth(transactions, effectiveMonth),
    [transactions, effectiveMonth]
  );

  const periodTotals = useMemo(
    () => calculateLedgerTotals(filteredTx),
    [filteredTx]
  );

  const closingBalance = openingBalance + periodTotals.balance;

  const monthlyChartData = useMemo(() => {
    const map = new Map<
      string,
      { monthKey: string; label: string; kutipan: number; perbelanjaan: number }
    >();
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7);
      const existing = map.get(key) || {
        monthKey: key,
        label: formatMonthKeyLabel(key).replace(/ \d{4}$/, ''),
        kutipan: 0,
        perbelanjaan: 0,
      };
      if (tx.type === 'masuk') existing.kutipan += tx.amount;
      else existing.perbelanjaan += tx.amount;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );
  }, [transactions]);

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const tx of filteredTx) {
      if (tx.type !== 'masuk') continue;
      const cur = map.get(tx.category) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += tx.amount;
      map.set(tx.category, cur);
    }
    return Array.from(map.entries())
      .map(([category, stat]) => ({ category, ...stat }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTx]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const tx of filteredTx) {
      if (tx.type !== 'keluar') continue;
      const cur = map.get(tx.category) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += tx.amount;
      map.set(tx.category, cur);
    }
    return Array.from(map.entries())
      .map(([category, stat]) => ({ category, ...stat }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTx]);

  const handleDownloadPdf = () => {
    const pdf = buildMonthlyReportPdf(
      effectiveMonth,
      transactions,
      openingBalance
    );
    pdf.save();
    onPreviewPdf(pdf);
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="no-print flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="report-month-select"
            className="text-xs font-semibold text-slate-600"
          >
            Tempoh Penyata:
          </label>
          <select
            id="report-month-select"
            value={effectiveMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-emerald-700 focus:outline-none"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthKeyLabel(m)}
              </option>
            ))}
            <option value="ALL">Keseluruhan Tahun 2026</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-900"
          >
            <Download className="h-4 w-4" />
            Muat Turun Laporan PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Cetak Penyata
          </button>
          {isSignedIn && (
            <button
              type="button"
              onClick={() =>
                onArchiveMonthlyReport(effectiveMonth, openingBalance)
              }
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <CloudUpload className="h-4 w-4" />
              Arkib PDF ke Drive
            </button>
          )}
        </div>
      </div>

      {/* Printable Official Report Container */}
      <div className="print-only-container space-y-6">
        {/* Formal Report Letterhead */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Penyata Kewangan {formatMonthKeyLabel(effectiveMonth)}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {MASJID_INFO.name} · {MASJID_INFO.address} · No. Daftar{' '}
                {MASJID_INFO.registrationNo}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-500">Tarikh Dijana</div>
              <div className="mt-0.5 font-mono text-xs font-medium text-slate-900">
                {formatDateMY(new Date().toISOString().slice(0, 10))}
              </div>
            </div>
          </div>

          {/* 5-Figure Financial Position Strip */}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="border-slate-200 pr-4 lg:border-r">
              <div className="text-xs text-slate-500">Baki Awal Tempoh</div>
              <div className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-slate-900">
                {formatRM(openingBalance)}
              </div>
            </div>
            <div className="border-slate-200 pr-4 lg:border-r">
              <div className="text-xs text-slate-500">Jumlah Kutipan</div>
              <div className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-emerald-800">
                +{formatRM(periodTotals.totalIn)}
              </div>
            </div>
            <div className="border-slate-200 pr-4 lg:border-r">
              <div className="text-xs text-slate-500">Jumlah Perbelanjaan</div>
              <div className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-red-700">
                -{formatRM(periodTotals.totalOut)}
              </div>
            </div>
            <div className="border-slate-200 pr-4 lg:border-r">
              <div className="text-xs text-slate-500">
                {periodTotals.balance >= 0 ? 'Lebihan Bersih' : 'Kurangan Bersih'}
              </div>
              <div
                className={`mt-1.5 font-mono text-lg font-semibold tabular-nums ${
                  periodTotals.balance >= 0
                    ? 'text-emerald-800'
                    : 'text-red-700'
                }`}
              >
                {formatRM(periodTotals.balance)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600">
                Baki Akhir Semasa
              </div>
              <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-slate-900">
                {formatRM(closingBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Cashflow Trend Chart */}
        <div className="no-print rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Aliran Tunai Bulanan (Kutipan vs Perbelanjaan)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Perbandingan jumlah kutipan derma dan perbelanjaan masjid mengikut bulan
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-700" />
                Kutipan Derma
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-red-600" />
                Perbelanjaan
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyChartData}
                margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val: number) =>
                    `RM ${(val / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    formatRM(Number(value) || 0),
                    name === 'kutipan' ? 'Kutipan Derma' : 'Perbelanjaan',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="kutipan"
                  name="kutipan"
                  fill="#047857"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                />
                <Bar
                  dataKey="perbelanjaan"
                  name="perbelanjaan"
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Dual Statement */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Pecahan Kutipan Derma ({formatMonthKeyLabel(effectiveMonth)})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-6 py-2.5 font-semibold">Kategori Kutipan</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Bil.</th>
                    <th className="px-6 py-2.5 text-right font-semibold">Jumlah (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incomeByCategory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-6 text-center text-slate-400"
                      >
                        Tiada rekod kutipan bagi tempoh ini.
                      </td>
                    </tr>
                  ) : (
                    incomeByCategory.map((row) => (
                      <tr key={row.category}>
                        <td className="px-6 py-3 font-medium text-slate-800">
                          {row.category}
                        </td>
                        <td className="px-3 py-3 text-center font-mono tabular-nums text-slate-600">
                          {row.count}
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-semibold tabular-nums text-emerald-800">
                          {formatRM(row.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-6 py-3 text-slate-900">Jumlah Kutipan</td>
                    <td className="px-3 py-3 text-center font-mono tabular-nums text-slate-700">
                      {incomeByCategory.reduce((s, r) => s + r.count, 0)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono tabular-nums text-emerald-900">
                      {formatRM(periodTotals.totalIn)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Pecahan Perbelanjaan ({formatMonthKeyLabel(effectiveMonth)})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-6 py-2.5 font-semibold">Kategori Perbelanjaan</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Bil.</th>
                    <th className="px-6 py-2.5 text-right font-semibold">Jumlah (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenseByCategory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-6 text-center text-slate-400"
                      >
                        Tiada rekod perbelanjaan bagi tempoh ini.
                      </td>
                    </tr>
                  ) : (
                    expenseByCategory.map((row) => (
                      <tr key={row.category}>
                        <td className="px-6 py-3 font-medium text-slate-800">
                          {row.category}
                        </td>
                        <td className="px-3 py-3 text-center font-mono tabular-nums text-slate-600">
                          {row.count}
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-semibold tabular-nums text-red-700">
                          {formatRM(row.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-6 py-3 text-slate-900">Jumlah Perbelanjaan</td>
                    <td className="px-3 py-3 text-center font-mono tabular-nums text-slate-700">
                      {expenseByCategory.reduce((s, r) => s + r.count, 0)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono tabular-nums text-red-800">
                      {formatRM(periodTotals.totalOut)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Itemized Monthly Statement Table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Senarai Penuh Transaksi Tempoh {formatMonthKeyLabel(effectiveMonth)}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-6 py-3 font-semibold">Tarikh</th>
                  <th className="px-4 py-3 font-semibold">No. Rujukan</th>
                  <th className="px-4 py-3 font-semibold">Pihak & Keterangan</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 text-right font-semibold">Masuk (RM)</th>
                  <th className="px-6 py-3 text-right font-semibold">Keluar (RM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTx.map((tx) => (
                  <tr key={tx.id}>
                    <td className="whitespace-nowrap px-6 py-3 text-slate-600">
                      {formatDateMY(tx.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-slate-900">
                      {tx.receiptNo}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">
                        {tx.partyName}
                      </span>
                      <span className="text-slate-500"> — {tx.description}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {tx.category}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-medium tabular-nums text-emerald-800">
                      {tx.type === 'masuk' ? formatRM(tx.amount) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right font-mono font-medium tabular-nums text-red-700">
                      {tx.type === 'keluar' ? formatRM(tx.amount) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Formal Audit Sign-off Footer */}
          <div className="grid grid-cols-1 gap-8 border-t border-slate-200 px-6 py-8 sm:grid-cols-3">
            <div>
              <div className="h-10 border-b border-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-900">
                Disediakan Oleh: Bendahari Kehormat
              </p>
              <p className="text-xs text-slate-500">{MASJID_INFO.name}</p>
            </div>
            <div>
              <div className="h-10 border-b border-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-900">
                Disemak Oleh: Juruaudit Dalaman Kariah
              </p>
              <p className="text-xs text-slate-500">{MASJID_INFO.name}</p>
            </div>
            <div>
              <div className="h-10 border-b border-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-900">
                Disahkan Oleh: Pengerusi Jawatankuasa
              </p>
              <p className="text-xs text-slate-500">{MASJID_INFO.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
