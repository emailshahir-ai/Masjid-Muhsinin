import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { ConfirmDialogState } from '../types/finance';

interface ConfirmationModalProps {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  dialog,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!dialog || !dialog.isOpen) return null;

  const isDanger = dialog.variant === 'danger';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await dialog.onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isDanger
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {isDanger ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <h3
              id="confirm-modal-title"
              className="text-base font-semibold text-slate-900"
            >
              {dialog.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-emerald-700"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-600">
            {dialog.description}
          </p>

          {dialog.details && dialog.details.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <ul className="space-y-1.5 text-xs text-slate-700">
                {dialog.details.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
                : 'bg-emerald-800 hover:bg-emerald-900 focus-visible:outline-emerald-800'
            }`}
          >
            {isSubmitting ? 'Memproses...' : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
