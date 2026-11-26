import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import {
  DONATION_CATEGORIES,
  EXPENSE_CATEGORIES,
  Transaction,
} from '../types/finance';
import {
  calculateLedgerTotals,
  formatDateMY,
  formatMonthKeyLabel,
  formatRM,
  getAvailableMonths,
} from '../utils/formatters';

interface LedgerViewProps {
  transactions: Transaction[];
  canManage?: boolean;
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onSelectReceipt: (tx: Transaction) => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  transactions,
  canManage = true,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onSelectReceipt,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'masuk' | 'keluar'>(
    'all'
  );
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const availableMonths = useMemo(
    () => getAvailableMonths(transactions),
    [transactions]
  );

  const allCategories = useMemo(
    () => [...DONATION_CATEGORIES, ...EXPENSE_CATEGORIES],
    []
  );

  // Compute running balance chronologically across full ledger
  const runningBalanceMap = useMemo(() => {
    const chrono = [...transactions].sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );
    let running = 0;
    const map = new Map<string, number>();
    for (const tx of chrono) {
      running += tx.type === 'masuk' ? tx.amount : -tx.amount;
      map.set(tx.id, running);
    }
    return map;
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...transactions]
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (monthFilter !== 'ALL' && !tx.date.startsWith(monthFilter))
          return false;
        if (categoryFilter !== 'ALL' && tx.category !== categoryFilter)
          return false;
        if (q) {
          const hay =
            `${tx.receiptNo} ${tx.partyName} ${tx.description} ${tx.category} ${tx.paymentMethod}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }, [transactions, search, typeFilter, monthFilter, categoryFilter]);

  const filteredTotals = useMemo(
    () => calculateLedgerTotals(filtered),
    [filtered]
  );

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Segmented Filter Controls */}
          <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                ['all', 'Semua Rekod'],
                ['masuk', 'Kutipan Derma'],
                ['keluar', 'Perbelanjaan'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTypeFilter(val)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === val
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-3 lg:justify-end">
            <div className="relative min-w-[220px] flex-1 lg:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari no. resit, penderma, keterangan..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Tapis mengikut bulan"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-emerald-700 focus:outline-none"
            >
              <option value="ALL">Semua Bulan</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthKeyLabel(m)}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Tapis mengikut kategori"
              className="max-w-[200px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-emerald-700 focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Strip for Current Filter */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
          <span>
            Dipaparkan:{' '}
            <strong className="font-mono tabular-nums text-slate-900">
              {filtered.length}
            </strong>{' '}
            transaksi
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Masuk:{' '}
            <strong className="font-mono tabular-nums text-emerald-800">
              {formatRM(filteredTotals.totalIn)}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Keluar:{' '}
            <strong className="font-mono tabular-nums text-red-700">
              {formatRM(filteredTotals.totalOut)}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Bersih Tapisan:{' '}
            <strong className="font-mono tabular-nums text-slate-900">
              {formatRM(filteredTotals.balance)}
            </strong>
          </span>
        </div>
      </div>

      {/* High-Density Ledger Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-900">
              Tiada rekod transaksi sepadan dengan tapisan anda.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ubah kata kunci carian atau rekodkan kutipan derma/perbelanjaan baharu.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={onAddTransaction}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-900"
              >
                <Plus className="h-4 w-4" />
                Rekod Transaksi Baharu
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Tarikh & No. Rujukan</th>
                  <th className="px-4 py-3">Pihak & Keterangan</th>
                  <th className="px-4 py-3">Kategori & Kaedah</th>
                  <th className="px-4 py-3 text-right">Jumlah (RM)</th>
                  <th className="px-4 py-3 text-right">Baki Semasa</th>
                  <th className="px-5 py-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((tx) => {
                  const isIn = tx.type === 'masuk';
                  const bal = runningBalanceMap.get(tx.id) ?? 0;
                  return (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-slate-50/90"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="font-mono text-xs font-semibold text-slate-900">
                          {tx.receiptNo}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {formatDateMY(tx.date)} · {tx.time}
                        </div>
                      </td>
                      <td className="max-w-sm px-4 py-3.5">
                        <div className="font-medium text-slate-900">
                          {tx.partyName}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {tx.description}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="text-xs font-medium text-slate-800">
                          {tx.category}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {tx.paymentMethod} ·{' '}
                          {tx.syncedToSheet ? 'Disegerak Sheets' : 'Tempatan'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <span
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
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-xs font-medium tabular-nums text-slate-700">
                        {formatRM(bal)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectReceipt(tx)}
                            title={isIn ? 'Lihat & Cetak Resit' : 'Lihat Baucar'}
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-emerald-800"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditTransaction(tx)}
                                title="Sunting rekod"
                                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction(tx)}
                                title="Padam rekod"
                                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
