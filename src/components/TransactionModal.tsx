import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  DONATION_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
  TransactionCategory,
  TransactionType,
} from '../types/finance';
import { generateReceiptNo } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  editingTransaction: Transaction | null;
  existingTransactions: Transaction[];
  defaultRecorderName: string;
  isSheetConnected: boolean;
  isSignedIn: boolean;
  onClose: () => void;
  onSubmit: (
    tx: Transaction,
    options: {
      isEdit: boolean;
      syncToSheet: boolean;
      sendGmailAlert: boolean;
    }
  ) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  editingTransaction,
  existingTransactions,
  defaultRecorderName,
  isSheetConnected,
  isSignedIn,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<TransactionType>('masuk');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [category, setCategory] =
    useState<TransactionCategory>('Derma Am & Infaq');
  const [partyName, setPartyName] = useState('');
  const [partyEmail, setPartyEmail] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [amountStr, setAmountStr] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [notes, setNotes] = useState('');
  const [syncToSheet, setSyncToSheet] = useState(true);
  const [sendGmailAlert, setSendGmailAlert] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setTime(editingTransaction.time);
      setCategory(editingTransaction.category);
      setPartyName(editingTransaction.partyName);
      setPartyEmail(editingTransaction.partyEmail || '');
      setDescription(editingTransaction.description);
      setPaymentMethod(editingTransaction.paymentMethod);
      setAmountStr(editingTransaction.amount.toFixed(2));
      setReceiptNo(editingTransaction.receiptNo);
      setNotes(editingTransaction.notes || '');
      setSyncToSheet(isSheetConnected);
      setSendGmailAlert(false);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const nowTime = new Date().toTimeString().slice(0, 5);
      setType('masuk');
      setDate(today);
      setTime(nowTime);
      setCategory('Derma Am & Infaq');
      setPartyName('');
      setPartyEmail('');
      setDescription('');
      setPaymentMethod('DuitNow QR');
      setAmountStr('');
      setReceiptNo(generateReceiptNo('masuk', existingTransactions, today));
      setNotes('');
      setSyncToSheet(isSheetConnected);
      setSendGmailAlert(isSignedIn);
    }
  }, [isOpen, editingTransaction, existingTransactions, isSheetConnected, isSignedIn]);

  if (!isOpen) return null;

  const categories = type === 'masuk' ? DONATION_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextCats =
      nextType === 'masuk' ? DONATION_CATEGORIES : EXPENSE_CATEGORIES;
    setCategory(nextCats[0]);
    if (!editingTransaction) {
      setReceiptNo(generateReceiptNo(nextType, existingTransactions, date));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Sila masukkan jumlah transaksi (RM) yang sah dan melebihi 0.');
      return;
    }
    if (!partyName.trim()) {
      setError(
        type === 'masuk'
          ? 'Sila masukkan nama penderma atau jemaah.'
          : 'Sila masukkan nama penerima atau pembekal.'
      );
      return;
    }
    if (!description.trim()) {
      setError('Sila masukkan keterangan ringkas transaksi.');
      return;
    }

    const tx: Transaction = {
      id: editingTransaction ? editingTransaction.id : `tx-${Date.now()}`,
      date,
      time,
      type,
      category,
      description: description.trim(),
      partyName: partyName.trim(),
      partyEmail: partyEmail.trim() || undefined,
      paymentMethod,
      amount: Math.round(parsedAmount * 100) / 100,
      receiptNo:
        receiptNo.trim() ||
        generateReceiptNo(type, existingTransactions, date),
      recordedBy: editingTransaction
        ? editingTransaction.recordedBy
        : defaultRecorderName,
      notes: notes.trim() || undefined,
      syncedToSheet: editingTransaction?.syncedToSheet ?? false,
      driveReceiptUrl: editingTransaction?.driveReceiptUrl,
      createdAt: editingTransaction
        ? editingTransaction.createdAt
        : new Date().toISOString(),
    };

    onSubmit(tx, {
      isEdit: Boolean(editingTransaction),
      syncToSheet: isSheetConnected && syncToSheet,
      sendGmailAlert: isSignedIn && sendGmailAlert,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="tx-modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              {editingTransaction
                ? 'Kemaskini Rekod Transaksi'
                : 'Rekod Transaksi Baharu'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Masjid Muhsinin · Setiap transaksi menjana nombor rujukan dan notifikasi automatik
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup borang"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Segmented Type Selector */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handleTypeChange('masuk')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  type === 'masuk'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kutipan Derma / Masuk
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('keluar')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  type === 'keluar'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Perbelanjaan / Keluar
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="tx-date"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Tarikh
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="tx-time"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Masa
              </label>
              <input
                id="tx-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="tx-receipt"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                {type === 'masuk' ? 'No. Resit Rasmi' : 'No. Baucar Bayaran'}
              </label>
              <input
                id="tx-receipt"
                type="text"
                required
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tx-amount"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Jumlah (RM)
              </label>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-base font-semibold tabular-nums text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="tx-method"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Kaedah Bayaran
              </label>
              <select
                id="tx-method"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tx-category"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Kategori Dana / Akaun
              </label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TransactionCategory)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="tx-party"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                {type === 'masuk'
                  ? 'Nama Penderma / Penyumbang'
                  : 'Nama Penerima / Pembekal'}
              </label>
              <input
                id="tx-party"
                type="text"
                required
                placeholder={
                  type === 'masuk'
                    ? 'Contoh: Tuan Haji Ahmad / Hamba Allah'
                    : 'Contoh: TNB / Al-Falah Services'
                }
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tx-desc"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Keterangan Transaksi
              </label>
              <input
                id="tx-desc"
                type="text"
                required
                placeholder="Nyatakan tujuan derma atau perbelanjaan"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="tx-email"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                E-mel Pihak (Pilihan untuk Resit/Notifikasi)
              </label>
              <input
                id="tx-email"
                type="email"
                placeholder="nama@contoh.com"
                value={partyEmail}
                onChange={(e) => setPartyEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="tx-notes"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Catatan / No. Rujukan Bank (Pilihan)
            </label>
            <textarea
              id="tx-notes"
              rows={2}
              placeholder="Contoh: No. rujukan transaksi bank, nama saksi kiraan tabung, atau nombor invois"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          {(isSheetConnected || isSignedIn) && (
            <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              {isSheetConnected && (
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={syncToSheet}
                    onChange={(e) => setSyncToSheet(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>
                    Segerak terus ke Google Sheets yang disambungkan selepas pengesahan
                  </span>
                </label>
              )}
              {isSignedIn && (
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={sendGmailAlert}
                    onChange={(e) => setSendGmailAlert(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>
                    Hantar notifikasi e-mel automatik melalui Gmail (kepada AJK
                    {partyEmail.trim() ? ' & penderma' : ''})
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors ${
                type === 'masuk'
                  ? 'bg-emerald-800 hover:bg-emerald-900'
                  : 'bg-red-700 hover:bg-red-800'
              }`}
            >
              {editingTransaction
                ? 'Simpan Kemaskini'
                : type === 'masuk'
                  ? 'Simpan Kutipan & Jana Resit'
                  : 'Simpan Perbelanjaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
