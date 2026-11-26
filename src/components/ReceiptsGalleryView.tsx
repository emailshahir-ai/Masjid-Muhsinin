import React, { useMemo, useState } from 'react';
import { Download, Printer, Receipt, Search } from 'lucide-react';
import { Transaction } from '../types/finance';
import { formatDateMY, formatRM } from '../utils/formatters';
import { buildReceiptPdf, GeneratedPdfResult } from '../utils/pdfGenerator';

interface ReceiptsGalleryViewProps {
  transactions: Transaction[];
  onSelectReceipt: (tx: Transaction) => void;
  onPreviewPdf: (pdf: GeneratedPdfResult) => void;
}

export const ReceiptsGalleryView: React.FC<ReceiptsGalleryViewProps> = ({
  transactions,
  onSelectReceipt,
  onPreviewPdf,
}) => {
  const [query, setQuery] = useState('');
  const [docFilter, setDocFilter] = useState<'masuk' | 'keluar' | 'all'>(
    'masuk'
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...transactions]
      .filter((tx) => {
        if (docFilter !== 'all' && tx.type !== docFilter) return false;
        if (!q) return true;
        return (
          tx.receiptNo.toLowerCase().includes(q) ||
          tx.partyName.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }, [transactions, query, docFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              ['masuk', 'Resit Penderma'],
              ['keluar', 'Baucar Bayaran'],
              ['all', 'Semua Dokumen'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setDocFilter(val)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                docFilter === val
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari no. resit atau nama penderma..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-900">
            Tiada resit atau baucar ditemui.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Cuba masukkan nombor resit atau nama penderma yang berlainan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((tx) => {
            const isIncome = tx.type === 'masuk';
            return (
              <div
                key={tx.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-900">
                      {tx.receiptNo}
                    </span>
                    <span>{formatDateMY(tx.date)}</span>
                  </div>

                  <h3 className="mt-2.5 text-sm font-semibold text-slate-900">
                    {tx.partyName}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {tx.description}
                  </p>

                  <div className="mt-3 text-xs text-slate-500">
                    {tx.category} · {tx.paymentMethod}
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">
                      {isIncome ? 'Jumlah Derma' : 'Jumlah Bayaran'}
                    </span>
                    <span
                      className={`font-mono text-base font-bold tabular-nums ${
                        isIncome ? 'text-emerald-800' : 'text-red-700'
                      }`}
                    >
                      {formatRM(tx.amount)}
                    </span>
                  </div>

                  <div className="mt-3.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectReceipt(tx)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Papar & Cetak
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pdf = buildReceiptPdf(tx);
                        pdf.save();
                        onPreviewPdf(pdf);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-800 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-900"
                      title="Muat turun PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-emerald-800" />
          <span>
            Semua resit rasmi dijana mengikut format pengesahan Jawatankuasa Masjid
            Muhsinin.
          </span>
        </div>
        <span className="font-mono tabular-nums text-slate-700">
          {items.length} dokumen
        </span>
      </div>
    </div>
  );
};
