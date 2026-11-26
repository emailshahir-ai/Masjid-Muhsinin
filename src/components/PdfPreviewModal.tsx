import React, { useEffect, useMemo, useRef } from 'react';
import { Download, ExternalLink, Printer, X } from 'lucide-react';
import { GeneratedPdfResult } from '../utils/pdfGenerator';

interface PdfPreviewModalProps {
  pdf: GeneratedPdfResult | null;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  pdf,
  onClose,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const blobUrl = useMemo(() => {
    if (!pdf) return null;
    return URL.createObjectURL(pdf.blob);
  }, [pdf]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!pdf || !blobUrl) return null;

  const handlePrintIframe = () => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.focus();
        win.print();
        return;
      }
    } catch {
      // Fallback to window print if browser restricts PDF iframe printing
    }
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
    >
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="min-w-0">
            <h2
              id="pdf-preview-title"
              className="truncate text-sm font-semibold text-slate-900"
            >
              Pratonton Dokumen PDF · {pdf.fileName}
            </h2>
            <p className="text-xs text-slate-500">
              Muat turun terus atau cetak dokumen rasmi Masjid Muhsinin
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={blobUrl}
              download={pdf.fileName}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-900"
            >
              <Download className="h-3.5 w-3.5" />
              Muat Turun PDF
            </a>
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka Tab Baharu
            </a>
            <button
              type="button"
              onClick={handlePrintIframe}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              aria-label="Tutup pratonton PDF"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 bg-slate-200">
          <iframe
            ref={iframeRef}
            src={blobUrl}
            title={pdf.fileName}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
