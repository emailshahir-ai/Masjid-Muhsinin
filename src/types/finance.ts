export type TransactionType = 'masuk' | 'keluar';

export type PaymentMethod =
  | 'Tunai'
  | 'DuitNow QR'
  | 'Pindahan Bank'
  | 'Cek';

export type DonationCategory =
  | 'Derma Am & Infaq'
  | 'Tabung Pembangunan'
  | 'Tabung Kebajikan & Asnaf'
  | 'Sumbangan Ramadhan & Ibadah'
  | 'Sewa & Wakaf';

export type ExpenseCategory =
  | 'Utiliti (Air & Elektrik)'
  | 'Elaun Imam, Bilal & Siak'
  | 'Penyelenggaraan & Kebersihan'
  | 'Program Dakwah & Kuliah'
  | 'Bantuan Asnaf & Kebajikan'
  | 'Kelengkapan & Aset Masjid'
  | 'Pengurusan & Pentadbiran';

export type TransactionCategory = DonationCategory | ExpenseCategory;

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  partyName: string; // Nama Penderma atau Penerima/Pembekal
  partyEmail?: string;
  partyPhone?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  receiptNo: string; // e.g., MM-2026-0042 atau BV-2026-0018
  recordedBy: string;
  notes?: string;
  syncedToSheet?: boolean;
  driveReceiptUrl?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  type: TransactionType | 'sistem';
  title: string;
  message: string;
  amount?: number;
  balanceAfter?: number;
  receiptNo?: string;
  channel: 'Portal Web' | 'Google Sheets' | 'Gmail & Portal';
  recipient?: string;
  read: boolean;
}

export interface CloudFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

export interface NotificationSettings {
  committeeEmails: string; // comma-separated AJK/Bendahari emails
  promptGmailOnTransaction: boolean;
  largeExpenseThreshold: number;
  autoSyncIntervalSec: number;
}

export interface WorkspaceConnection {
  spreadsheetId: string | null;
  spreadsheetTitle: string | null;
  spreadsheetUrl: string | null;
  transactionSheetName: string;
  notificationSheetName: string;
  summarySheetName: string;
  driveFolderId: string | null;
  driveFolderName: string | null;
  driveFolderUrl: string | null;
  lastSyncedAt: string | null;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  onConfirm: () => Promise<void> | void;
}

export type ActiveTab =
  | 'portal'
  | 'buku-tunai'
  | 'laporan'
  | 'resit'
  | 'notifikasi'
  | 'awan';

export const DONATION_CATEGORIES: DonationCategory[] = [
  'Derma Am & Infaq',
  'Tabung Pembangunan',
  'Tabung Kebajikan & Asnaf',
  'Sumbangan Ramadhan & Ibadah',
  'Sewa & Wakaf',
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Utiliti (Air & Elektrik)',
  'Elaun Imam, Bilal & Siak',
  'Penyelenggaraan & Kebersihan',
  'Program Dakwah & Kuliah',
  'Bantuan Asnaf & Kebajikan',
  'Kelengkapan & Aset Masjid',
  'Pengurusan & Pentadbiran',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Tunai',
  'DuitNow QR',
  'Pindahan Bank',
  'Cek',
];
