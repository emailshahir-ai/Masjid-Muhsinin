import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types/finance';
import {
  amountToMalayWords,
  calculateLedgerTotals,
  formatDateMY,
  formatMonthKeyLabel,
  formatRM,
  MASJID_INFO,
} from './formatters';

export interface GeneratedPdfResult {
  blob: Blob;
  fileName: string;
  save: () => void;
}

export function triggerPdfDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function buildReceiptPdf(tx: Transaction): GeneratedPdfResult {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isIncome = tx.type === 'masuk';

  // Top Header Band
  doc.setFillColor(6, 95, 70); // Emerald 800
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(MASJID_INFO.name.toUpperCase(), 18, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(MASJID_INFO.address, 18, 23);
  doc.text(
    `Tel: ${MASJID_INFO.phone}  |  E-mel: ${MASJID_INFO.email}`,
    18,
    29
  );

  // Document Title & Reference Box
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(
    isIncome ? 'RESIT RASMI KUTIPAN DERMA / INFAQ' : 'BAUCAR RASMI PERBELANJAAN MASJID',
    18,
    50
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`No. Rujukan: ${tx.receiptNo}`, 18, 57);
  doc.text(`Tarikh & Masa: ${formatDateMY(tx.date)}, ${tx.time}`, 132, 57);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(18, 62, 192, 62);

  // Details Table
  autoTable(doc, {
    startY: 68,
    margin: { left: 18, right: 18 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 4.5,
      lineColor: [226, 232, 240],
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 54, fillColor: [248, 250, 252] },
      1: { cellWidth: 120 },
    },
    body: [
      [isIncome ? 'Diterima Daripada' : 'Dibayar Kepada', tx.partyName],
      ['Kategori Dana / Akaun', tx.category],
      ['Keterangan Transaksi', tx.description],
      ['Kaedah Bayaran', tx.paymentMethod],
      ['Dicatat Oleh', tx.recordedBy],
      ...(tx.notes ? [['Catatan Tambahan', tx.notes]] : []),
    ],
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? 140;

  // Amount Summary Box
  doc.setFillColor(isIncome ? 236 : 254, isIncome ? 253 : 242, isIncome ? 245 : 242);
  doc.setDrawColor(isIncome ? 16 : 220, isIncome ? 185 : 38, isIncome ? 129 : 38);
  doc.setLineWidth(0.5);
  doc.roundedRect(18, finalY + 10, 174, 28, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    isIncome ? 'JUMLAH SUMBANGAN DITERIMA' : 'JUMLAH BAYARAN DILULUSKAN',
    24,
    finalY + 19
  );

  doc.setTextColor(isIncome ? 6 : 185, isIncome ? 95 : 28, isIncome ? 70 : 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(formatRM(tx.amount), 186, finalY + 21, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  const wrappedWords = doc.splitTextToSize(
    `Dalam Perkataan: ${amountToMalayWords(tx.amount)}`,
    162
  );
  doc.text(wrappedWords, 24, finalY + 30);

  // Blessing / Appreciation note
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  if (isIncome) {
    doc.text(
      'Jazakumullahu Khairan Kathira. Pihak Jawatankuasa Masjid Muhsinin merakamkan setinggi-tinggi',
      18,
      finalY + 50
    );
    doc.text(
      'penghargaan atas sumbangan ikhlas tuan/puan. Semoga Allah SWT memberkati rezeki tuan/puan.',
      18,
      finalY + 55.5
    );
  } else {
    doc.text(
      'Perbelanjaan ini telah disahkan mengikut tatacara kewangan Jawatankuasa Masjid Muhsinin.',
      18,
      finalY + 50
    );
  }

  // Signature block
  const sigY = finalY + 76;
  doc.setDrawColor(148, 163, 184);
  doc.line(18, sigY, 82, sigY);
  doc.line(128, sigY, 192, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Bendahari Kehormat', 18, sigY + 6);
  doc.text('Cop Rasmi / Pengesahan', 128, sigY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(MASJID_INFO.name, 18, sigY + 11);
  doc.text(`Akaun: ${MASJID_INFO.bankName} (${MASJID_INFO.accountNo})`, 128, sigY + 11);

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(18, 276, 192, 276);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Dokumen ini dijana secara elektronik melalui Sistem Kewangan Masjid Muhsinin dan sah untuk semakan rasmi.',
    105,
    282,
    { align: 'center' }
  );

  const fileName = `${isIncome ? 'Resit' : 'Baucar'}_${tx.receiptNo}_Masjid_Muhsinin.pdf`;
  const blob = doc.output('blob');

  return {
    blob,
    fileName,
    save: () => triggerPdfDownload(blob, fileName),
  };
}

export function buildMonthlyReportPdf(
  monthKey: string,
  allTransactions: Transaction[],
  openingBalance: number
): GeneratedPdfResult {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const periodLabel = formatMonthKeyLabel(monthKey);

  const filtered =
    monthKey === 'ALL'
      ? [...allTransactions]
      : allTransactions.filter((tx) => tx.date.startsWith(monthKey));

  filtered.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  const totals = calculateLedgerTotals(filtered);
  const closingBalance = openingBalance + totals.balance;

  // Header
  doc.setFillColor(6, 95, 70);
  doc.rect(0, 0, 210, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('LAPORAN KEWANGAN BULANAN MASJID MUHSININ', 16, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Tempoh Penyata: ${periodLabel}  |  ${MASJID_INFO.name}`,
    16,
    22.5
  );
  doc.text(
    `${MASJID_INFO.address}  |  Dijana pada: ${formatDateMY(new Date().toISOString().slice(0, 10))}`,
    16,
    28.5
  );

  // 1. Ringkasan Kedudukan Kewangan
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('1. Ringkasan Kedudukan Dana', 16, 45);

  autoTable(doc, {
    startY: 49,
    margin: { left: 16, right: 16 },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    styles: {
      fontSize: 9.5,
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
    },
    columnStyles: {
      0: { cellWidth: 118 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    head: [['Perkara', 'Jumlah (RM)']],
    body: [
      ['Baki Bawa Ke Hadapan (Baki Awal Tempoh)', formatRM(openingBalance)],
      ['Jumlah Kutipan Derma & Sumbangan Masuk', formatRM(totals.totalIn)],
      ['Jumlah Perbelanjaan & Agihan Keluar', formatRM(totals.totalOut)],
      [
        totals.balance >= 0
          ? 'Lebihan Bersih Tempoh Ini'
          : 'Kurangan Bersih Tempoh Ini',
        formatRM(totals.balance),
      ],
      ['Baki Akhir Semasa Dana Masjid', formatRM(closingBalance)],
    ],
  });

  // 2. Pecahan Mengikut Kategori
  const yAfterSummary =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 100;

  const catMap = new Map<string, { type: string; count: number; total: number }>();
  for (const tx of filtered) {
    const key = `${tx.type}::${tx.category}`;
    const prev = catMap.get(key) || {
      type: tx.type === 'masuk' ? 'Kutipan Masuk' : 'Perbelanjaan',
      count: 0,
      total: 0,
    };
    prev.count += 1;
    prev.total += tx.amount;
    catMap.set(key, prev);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('2. Pecahan Kutipan & Perbelanjaan Mengikut Kategori', 16, yAfterSummary + 10);

  autoTable(doc, {
    startY: yAfterSummary + 14,
    margin: { left: 16, right: 16 },
    theme: 'striped',
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
    head: [['Jenis', 'Kategori', 'Bil.', 'Jumlah (RM)']],
    body: Array.from(catMap.entries()).map(([key, v]) => [
      v.type,
      key.split('::')[1],
      String(v.count),
      formatRM(v.total),
    ]),
  });

  // 3. Senarai Terperinci Transaksi
  const yAfterCat =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 150;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(
    `3. Penyata Terperinci Buku Tunai (${filtered.length} Transaksi)`,
    16,
    yAfterCat + 10
  );

  autoTable(doc, {
    startY: yAfterCat + 14,
    margin: { left: 16, right: 16 },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8.2,
      cellPadding: 2.6,
      lineColor: [226, 232, 240],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 52 },
      3: { cellWidth: 30 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24 },
    },
    head: [['Tarikh', 'No. Rujukan', 'Keterangan / Pihak', 'Kategori', 'Masuk (RM)', 'Keluar (RM)']],
    body: filtered.map((tx) => [
      tx.date,
      tx.receiptNo,
      `${tx.partyName} — ${tx.description}`,
      tx.category,
      tx.type === 'masuk' ? formatRM(tx.amount) : '-',
      tx.type === 'keluar' ? formatRM(tx.amount) : '-',
    ]),
  });

  // Signature Section
  let sigY =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 220) + 18;
  if (sigY > 255) {
    doc.addPage();
    sigY = 30;
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(16, sigY, 68, sigY);
  doc.line(79, sigY, 131, sigY);
  doc.line(142, sigY, 194, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text('Disediakan Oleh:', 16, sigY + 5);
  doc.text('Disemak Oleh:', 79, sigY + 5);
  doc.text('Disahkan Oleh:', 142, sigY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Bendahari Kehormat', 16, sigY + 10);
  doc.text('Juruaudit Dalaman', 79, sigY + 10);
  doc.text('Pengerusi Masjid Muhsinin', 142, sigY + 10);

  // Page numbering footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Laporan Kewangan ${MASJID_INFO.name} (${periodLabel})  ·  Muka Surat ${i} daripada ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  const safePeriod = monthKey === 'ALL' ? 'Tahun_2026' : monthKey;
  const fileName = `Laporan_Kewangan_Masjid_Muhsinin_${safePeriod}.pdf`;
  const blob = doc.output('blob');

  return {
    blob,
    fileName,
    save: () => triggerPdfDownload(blob, fileName),
  };
}
