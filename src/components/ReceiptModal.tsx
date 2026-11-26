import React, { useState } from 'react';
import {
  CloudUpload,
  Download,
  ExternalLink,
  Mail,
  Printer,
  X,
} from 'lucide-react';
import { Transaction } from '../types/finance';
import {
  amountToMalayWords,
  formatDateMY,
  formatRM,
  MASJID_INFO,
} from '../utils/formatters';
import { buildReceiptPdf, GeneratedPdfResult } from '../utils/pdfGenerator';

interface ReceiptModalProps {
  transaction: Transaction | null;
  isSignedIn: boolean;
  onClose: () => void;
  onArchiveToDrive: (tx: Transaction) => void;
  onSendReceiptEmail: (tx: Transaction, recipientEmail: string) => void;
  onPreviewPdf: (pdf: GeneratedPdfResult) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  isSignedIn,
  onClose,
  onArchiveToDrive,
  onSendReceiptEmail,
  onPreviewPdf,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [customEmail, setCustomEmail] = useState(transaction?.partyEmail || '');
  const [showEmailInput, setShowEmailInput] = useState(false);

  if (!transaction) return null;

  const isIncome = transaction.type === 'masuk';

  const handleDownloadPdf = () => {
    const pdf = buildReceiptPdf(transaction);
    pdf.save();
    onPreviewPdf(pdf);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmailTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    const target = (customEmail || transaction.partyEmail || '').trim();
    if (!target) return;
    onSendReceiptEmail(transaction, target);
    setShowEmailInput(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="print-only-container max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Toolbar (hidden when printing) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="text-sm font-semibold text-slate-900">
            {isIncome ? 'Resit Rasmi Penderma' : 'Baucar Perbelanjaan Rasmi'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-900"
            >
              <Download className="h-3.5 w-3.5" />
              Muat Turun PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak
            </button>
            {isSignedIn && (
              <>
                <button
                  type="button"
                  onClick={() => onArchiveToDrive(transaction)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  Simpan Drive
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEmail(transaction.partyEmail || '');
                    setShowEmailInput((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Emel Gmail
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Tutup resit"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Optional inline Gmail dispatch strip */}
        {showEmailInput && isSignedIn && (
          <form
            onSubmit={handleEmailTrigger}
            className="no-print flex flex-wrap items-center gap-2 border-b border-slate-200 bg-emerald-50/70 px-6 py-3"
          >
            <input
              type="email"
              required
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="Masukkan alamat e-mel penderma/penerima"
              className="min-w-[220px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg bg-emerald-800 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-900"
            >
              Hantar Resit melalui Gmail
            </button>
          </form>
        )}

        {/* Official Printable Receipt Sheet */}
        <div className="p-8 sm:p-10">
          {/* Letterhead */}
          <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div className="flex items-center gap-4">
              {!imgFailed ? (
                <img
                  src={MASJID_INFO.emblemImage}
                  alt="Lambang Rasmi Masjid Muhsinin"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 font-semibold text-emerald-900">
                  MM
                </div>
              )}
              <div>
                <h1
                  id="receipt-modal-title"
                  className="text-xl font-bold tracking-tight text-slate-900"
                >
                  {MASJID_INFO.name}
                </h1>
                <p className="mt-0.5 text-xs text-slate-600">
                  {MASJID_INFO.address}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tel {MASJID_INFO.phone} · {MASJID_INFO.email}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-semibold tracking-wide text-emerald-800">
                {isIncome ? 'RESIT RASMI' : 'BAUCAR BAYARAN'}
              </div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900">
                {transaction.receiptNo}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {formatDateMY(transaction.date)} · {transaction.time}
              </div>
            </div>
          </div>

          {/* Core Details Grid */}
          <dl className="mt-6 divide-y divide-slate-100 border-b border-slate-200 text-sm">
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3">
              <dt className="font-medium text-slate-500">
                {isIncome ? 'Diterima Daripada' : 'Dibayar Kepada'}
              </dt>
              <dd className="font-semibold text-slate-900 sm:col-span-2">
                {transaction.partyName}
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3">
              <dt className="font-medium text-slate-500">Kategori Dana</dt>
              <dd className="text-slate-900 sm:col-span-2">
                {transaction.category}
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3">
              <dt className="font-medium text-slate-500">Keterangan</dt>
              <dd className="text-slate-800 sm:col-span-2">
                {transaction.description}
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3">
              <dt className="font-medium text-slate-500">Kaedah Bayaran</dt>
              <dd className="text-slate-900 sm:col-span-2">
                {transaction.paymentMethod}
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3">
              <dt className="font-medium text-slate-500">Dicatat Oleh</dt>
              <dd className="text-slate-800 sm:col-span-2">
                {transaction.recordedBy}
              </dd>
            </div>
            {transaction.notes && (
              <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3">
                <dt className="font-medium text-slate-500">Catatan</dt>
                <dd className="text-slate-700 sm:col-span-2">
                  {transaction.notes}
                </dd>
              </div>
            )}
          </dl>

          {/* Total Amount Box */}
          <div
            className={`mt-6 rounded-lg border p-5 ${
              isIncome
                ? 'border-emerald-200 bg-emerald-50/70'
                : 'border-red-200 bg-red-50/60'
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                {isIncome
                  ? 'Jumlah Sumbangan Diterima'
                  : 'Jumlah Perbelanjaan Diluluskan'}
              </span>
              <span
                className={`font-mono text-2xl font-bold tabular-nums ${
                  isIncome ? 'text-emerald-900' : 'text-red-800'
                }`}
              >
                {formatRM(transaction.amount)}
              </span>
            </div>
            <p className="mt-2 text-xs italic text-slate-700">
              {amountToMalayWords(transaction.amount)}
            </p>
          </div>

          {transaction.driveReceiptUrl && (
            <div className="no-print mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
              <span>Salinan PDF resit ini telah diarkibkan di Google Drive.</span>
              <a
                href={transaction.driveReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:underline"
              >
                Buka di Drive
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Appreciation & Verification Block */}
          <div className="mt-8 grid grid-cols-1 gap-8 border-t border-slate-200 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs leading-relaxed text-slate-600">
                {isIncome
                  ? 'Jazakumullahu Khairan Kathira. Terima kasih atas infaq dan sumbangan ikhlas tuan/puan demi mengimarahkan Masjid Muhsinin.'
                  : 'Bayaran ini telah direkodkan secara telus dalam buku tunai rasmi Jawatankuasa Pengurusan Masjid Muhsinin.'}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Akaun Rasmi: {MASJID_INFO.bankName} ({MASJID_INFO.accountNo})
              </p>
            </div>
            <div className="flex flex-col justify-end sm:text-right">
              <div className="text-xs font-semibold text-slate-900">
                Bendahari Kehormat Masjid Muhsinin
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Resit elektronik sah tanpa tandatangan basah
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
