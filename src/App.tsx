import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Cloud,
  FileBarChart2,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  ActiveTab,
  CloudFileItem,
  ConfirmDialogState,
  NotificationItem,
  NotificationSettings,
  Transaction,
  WorkspaceConnection,
} from './types/finance';
import { INITIAL_NOTIFICATIONS, INITIAL_TRANSACTIONS } from './data/initialData';
import {
  calculateLedgerTotals,
  formatDateMY,
  formatMonthKeyLabel,
  formatRM,
  MASJID_INFO,
} from './utils/formatters';
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  logoutGoogle,
} from './services/googleAuth';
import {
  createMasjidSpreadsheet,
  ensureArchiveFolder,
  inspectSpreadsheet,
  listArchiveFiles,
  readTransactionsFromSheet,
  sendEmailNotification,
  syncAllToSheet,
  uploadFileToDrive,
} from './services/googleWorkspace';
import {
  buildMonthlyReportPdf,
  buildReceiptPdf,
  GeneratedPdfResult,
} from './utils/pdfGenerator';
import { KariahPortalView } from './components/KariahPortalView';
import { LedgerView } from './components/LedgerView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { ReceiptsGalleryView } from './components/ReceiptsGalleryView';
import { NotificationsView } from './components/NotificationsView';
import { CloudSyncView } from './components/CloudSyncView';
import { TransactionModal } from './components/TransactionModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';

const STORAGE_KEYS = {
  transactions: 'masjid_muhsinin_transactions_v1',
  notifications: 'masjid_muhsinin_notifications_v1',
  settings: 'masjid_muhsinin_notif_settings_v1',
  connection: 'masjid_muhsinin_workspace_conn_v1',
};

const DEFAULT_CONNECTION: WorkspaceConnection = {
  spreadsheetId: null,
  spreadsheetTitle: null,
  spreadsheetUrl: null,
  transactionSheetName: 'Transaksi',
  notificationSheetName: 'Notifikasi',
  summarySheetName: 'Ringkasan Bulanan',
  driveFolderId: null,
  driveFolderName: null,
  driveFolderUrl: null,
  lastSyncedAt: null,
};

const DEFAULT_SETTINGS: NotificationSettings = {
  committeeEmails: '',
  promptGmailOnTransaction: true,
  largeExpenseThreshold: 2000,
  autoSyncIntervalSec: 60,
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface ToastMessage {
  id: number;
  title: string;
  detail?: string;
  tone: 'success' | 'error' | 'info';
}

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  breadcrumb: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'portal',
    label: 'Portal Utama',
    breadcrumb: 'Portal Semakan Dana',
    icon: LayoutDashboard,
  },
  {
    id: 'buku-tunai',
    label: 'Buku Tunai',
    breadcrumb: 'Buku Tunai & Rekod Transaksi',
    icon: BookOpen,
  },
  {
    id: 'laporan',
    label: 'Laporan Bulanan',
    breadcrumb: 'Laporan Kewangan Bulanan',
    icon: FileBarChart2,
  },
  {
    id: 'resit',
    label: 'Resit Penderma',
    breadcrumb: 'Resit Penderma & Baucar',
    icon: Receipt,
  },
  {
    id: 'notifikasi',
    label: 'Notifikasi',
    breadcrumb: 'Sistem Notifikasi Automatik',
    icon: Bell,
  },
  {
    id: 'awan',
    label: 'Sheets & Awan',
    breadcrumb: 'Google Sheets & Storan Awan',
    icon: Cloud,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('portal');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emblemFailed, setEmblemFailed] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadStored(STORAGE_KEYS.transactions, INITIAL_TRANSACTIONS)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadStored(STORAGE_KEYS.notifications, INITIAL_NOTIFICATIONS)
  );
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(() =>
    loadStored(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  );
  const [connection, setConnection] = useState<WorkspaceConnection>(() =>
    loadStored(STORAGE_KEYS.connection, DEFAULT_CONNECTION)
  );

  // Auth state (token strictly in-memory via googleAuth.ts)
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isWorkspaceBusy, setIsWorkspaceBusy] = useState(false);
  const [archiveFiles, setArchiveFiles] = useState<CloudFileItem[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  // Modals & Toasts
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [selectedReceiptTx, setSelectedReceiptTx] =
    useState<Transaction | null>(null);
  const [previewPdf, setPreviewPdf] = useState<GeneratedPdfResult | null>(null);
  const [confirmDialog, setConfirmDialog] =
    useState<ConfirmDialogState | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (title: string, detail?: string, tone: ToastMessage['tone'] = 'success') => {
      const id = Date.now();
      setToast({ id, title, detail, tone });
      setTimeout(() => {
        setToast((cur) => (cur?.id === id ? null : cur));
      }, 4800);
    },
    []
  );

  // Persist non-sensitive app state locally
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.transactions,
        JSON.stringify(transactions)
      );
    } catch {
      // ignore storage quota errors
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.notifications,
        JSON.stringify(notifications)
      );
    } catch {
      // ignore
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify(notifSettings)
      );
    } catch {
      // ignore
    }
  }, [notifSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.connection, JSON.stringify(connection));
    } catch {
      // ignore
    }
  }, [connection]);

  const loadDriveArchive = useCallback(
    async (token: string, existingFolderId?: string | null) => {
      try {
        let folderId = existingFolderId;
        if (!folderId) {
          const folder = await ensureArchiveFolder(token);
          folderId = folder.id;
          setConnection((prev) => ({
            ...prev,
            driveFolderId: folder.id,
            driveFolderName: folder.name,
            driveFolderUrl: folder.webViewLink,
          }));
        }
        const files = await listArchiveFiles(token, folderId);
        setArchiveFiles(files);
      } catch (err) {
        console.error('Drive archive load failed:', err);
      }
    },
    []
  );

  useEffect(() => {
    const unsub = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        if (authedUser.email) {
          setNotifSettings((prev) =>
            prev.committeeEmails
              ? prev
              : { ...prev, committeeEmails: authedUser.email || '' }
          );
        }
        loadDriveArchive(token, connection.driveFolderId);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const currentTotals = useMemo(
    () => calculateLedgerTotals(transactions),
    [transactions]
  );

  const requireToken = useCallback((): string | null => {
    const token = getAccessToken();
    if (!token) {
      showToast(
        'Sesi Google Workspace diperlukan',
        'Sila log masuk dengan akaun Google di halaman Sheets & Awan.',
        'error'
      );
      setActiveTab('awan');
      return null;
    }
    return token;
  }, [showToast]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      if (res.user.email) {
        setNotifSettings((prev) =>
          prev.committeeEmails
            ? prev
            : { ...prev, committeeEmails: res.user.email || '' }
        );
      }
      showToast(
        'Berjaya log masuk Google Workspace',
        `Akaun ${res.user.email} disambungkan untuk Sheets, Drive & Gmail.`
      );
      await loadDriveArchive(res.accessToken, connection.driveFolderId);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gagal log masuk dengan Google.';
      showToast('Log masuk dibatalkan atau gagal', msg, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setAutoSyncEnabled(false);
    setArchiveFiles([]);
    showToast('Log keluar berjaya', 'Token akses awan telah dikosongkan.');
  };

  // Auto-sync pull every 60s when enabled & connected
  useEffect(() => {
    if (!autoSyncEnabled || !user || !connection.spreadsheetId) return;
    const interval = setInterval(async () => {
      const token = getAccessToken();
      if (!token || !connection.spreadsheetId) return;
      try {
        const pulled = await readTransactionsFromSheet(
          token,
          connection.spreadsheetId,
          connection.transactionSheetName
        );
        if (pulled.length > 0) {
          setTransactions(pulled);
          setConnection((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.error('Auto-sync failed:', err);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [
    autoSyncEnabled,
    user,
    connection.spreadsheetId,
    connection.transactionSheetName,
  ]);

  const buildTransactionEmailHtml = (tx: Transaction, balanceAfter: number) => {
    const isIncome = tx.type === 'masuk';
    return `
      <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #065f46; color: #ffffff; padding: 20px 24px;">
          <h2 style="margin: 0; font-size: 18px;">${MASJID_INFO.name}</h2>
          <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Notifikasi Automatik Transaksi Kewangan · ${MASJID_INFO.address}</p>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 14px; font-size: 14px;">Assalamualaikum warahmatullahi wabarakatuh,</p>
          <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5;">
            Satu transaksi <strong>${isIncome ? 'Kutipan Derma / Sumbangan Masuk' : 'Perbelanjaan Masjid'}</strong> telah direkodkan secara rasmi dalam Sistem Kewangan ${MASJID_INFO.name}:
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 18px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">No. Rujukan</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${tx.receiptNo}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Tarikh & Masa</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${formatDateMY(tx.date)}, ${tx.time}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${isIncome ? 'Penderma' : 'Penerima'}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tx.partyName}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Kategori</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tx.category}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Keterangan</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tx.description}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Kaedah Bayaran</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tx.paymentMethod}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Jumlah</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${isIncome ? '#065f46' : '#b91c1c'}; font-size: 15px;">${formatRM(tx.amount)}</td></tr>
            <tr><td style="padding: 8px; color: #64748b;">Baki Terkini Masjid</td><td style="padding: 8px; font-weight: bold;">${formatRM(balanceAfter)}</td></tr>
          </table>
          <p style="margin: 0; font-size: 12px; color: #64748b;">
            Dijana oleh Sistem Kewangan ${MASJID_INFO.name}. ${MASJID_INFO.address}.
          </p>
        </div>
      </div>
    `;
  };

  // Save Transaction (with automatic notification + optional Workspace confirmation for Sheets/Gmail)
  const handleSaveTransaction = (
    tx: Transaction,
    options: {
      isEdit: boolean;
      syncToSheet: boolean;
      sendGmailAlert: boolean;
    }
  ) => {
    setTxModalOpen(false);
    setEditingTx(null);

    const nextTransactions = options.isEdit
      ? transactions.map((item) => (item.id === tx.id ? tx : item))
      : [tx, ...transactions];

    const nextTotals = calculateLedgerTotals(nextTransactions);
    const isLargeExpense =
      tx.type === 'keluar' && tx.amount >= notifSettings.largeExpenseThreshold;

    const autoNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: tx.type,
      title: `${
        options.isEdit
          ? 'Rekod Dikemaskini'
          : tx.type === 'masuk'
            ? 'Kutipan Derma Masuk'
            : 'Perbelanjaan Keluar'
      } · ${tx.receiptNo}${isLargeExpense ? ' (Melebihi Had Amaran)' : ''}`,
      message: `${tx.type === 'masuk' ? 'Sumbangan' : 'Bayaran'} ${formatRM(
        tx.amount
      )} (${tx.category}) melibatkan ${tx.partyName} melalui ${
        tx.paymentMethod
      }.`,
      amount: tx.amount,
      balanceAfter: nextTotals.balance,
      receiptNo: tx.receiptNo,
      channel: 'Portal Web',
      read: false,
    };

    const nextNotifications = [autoNotif, ...notifications];
    setTransactions(nextTransactions);
    setNotifications(nextNotifications);

    showToast(
      options.isEdit
        ? `Rekod ${tx.receiptNo} dikemas kini`
        : `${tx.type === 'masuk' ? 'Kutipan derma' : 'Perbelanjaan'} direkodkan`,
      `Baki semasa Masjid Muhsinin kini ${formatRM(nextTotals.balance)}.`
    );

    const recipientList = [
      ...notifSettings.committeeEmails
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      ...(tx.partyEmail ? [tx.partyEmail.trim()] : []),
    ];
    const uniqueRecipients = Array.from(new Set(recipientList));
    const wantsSheet = options.syncToSheet && Boolean(connection.spreadsheetId);
    const wantsGmail =
      options.sendGmailAlert && Boolean(user) && uniqueRecipients.length > 0;

    if (wantsSheet || wantsGmail) {
      const details: string[] = [];
      if (wantsSheet) {
        details.push(
          `Google Sheets: Kemas kini "${connection.spreadsheetTitle}" (${nextTransactions.length} rekod transaksi & ringkasan bulanan)`
        );
      }
      if (wantsGmail) {
        details.push(
          `Gmail: Hantar notifikasi transaksi ${tx.receiptNo} (${formatRM(tx.amount)}) kepada ${uniqueRecipients.join(', ')}`
        );
      }

      setConfirmDialog({
        isOpen: true,
        title: 'Sahkan Segerak Google Workspace',
        description:
          'Rekod telah disimpan secara tempatan. Sahkan tindakan berikut pada akaun Google Workspace anda:',
        details,
        confirmLabel: 'Sahkan & Laksanakan',
        variant: 'primary',
        onConfirm: async () => {
          const token = requireToken();
          if (!token) return;
          setIsWorkspaceBusy(true);
          try {
            let updatedTxList = nextTransactions;
            let updatedNotifList = nextNotifications;

            if (wantsGmail) {
              const subject = `[Masjid Muhsinin] ${
                tx.type === 'masuk' ? 'Kutipan Derma' : 'Perbelanjaan'
              } ${formatRM(tx.amount)} (${tx.receiptNo})`;
              await sendEmailNotification(
                token,
                uniqueRecipients,
                subject,
                buildTransactionEmailHtml(tx, nextTotals.balance)
              );
              updatedNotifList = updatedNotifList.map((n) =>
                n.id === autoNotif.id
                  ? {
                      ...n,
                      channel: 'Gmail & Portal',
                      recipient: uniqueRecipients.join(', '),
                    }
                  : n
              );
              setNotifications(updatedNotifList);
            }

            if (wantsSheet) {
              await syncAllToSheet(
                token,
                connection,
                updatedTxList,
                updatedNotifList
              );
              updatedTxList = updatedTxList.map((item) => ({
                ...item,
                syncedToSheet: true,
              }));
              setTransactions(updatedTxList);
              setConnection((prev) => ({
                ...prev,
                lastSyncedAt: new Date().toISOString(),
              }));
            }

            showToast(
              'Segerak Google Workspace selesai',
              [
                wantsSheet ? 'Google Sheets dikemas kini' : null,
                wantsGmail ? 'E-mel Gmail telah dihantar' : null,
              ]
                .filter(Boolean)
                .join(' · ')
            );
          } catch (err: unknown) {
            const msg =
              err instanceof Error ? err.message : 'Operasi awan gagal.';
            showToast('Ralat Google Workspace', msg, 'error');
          } finally {
            setIsWorkspaceBusy(false);
          }
        },
      });
    } else if (!options.isEdit && tx.type === 'masuk') {
      // Offer immediate receipt preview for newly recorded donations
      setSelectedReceiptTx(tx);
    }
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    const details = [
      `No. Rujukan: ${tx.receiptNo} (${tx.type === 'masuk' ? 'Kutipan Derma' : 'Perbelanjaan'})`,
      `Pihak: ${tx.partyName} · Jumlah: ${formatRM(tx.amount)}`,
    ];
    if (connection.spreadsheetId && user) {
      details.push(
        `Tindakan ini turut akan mengemas kini Google Sheet "${connection.spreadsheetTitle}".`
      );
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Padam Rekod Transaksi?',
      description:
        'Adakah anda pasti mahu memadam rekod transaksi ini daripada buku tunai Masjid Muhsinin? Baki semasa akan dikira semula secara automatik.',
      details,
      confirmLabel: 'Padam Rekod',
      variant: 'danger',
      onConfirm: async () => {
        const nextList = transactions.filter((item) => item.id !== tx.id);
        const nextTotals = calculateLedgerTotals(nextList);
        const deleteNotif: NotificationItem = {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'sistem',
          title: `Rekod Dipadam · ${tx.receiptNo}`,
          message: `Transaksi ${tx.receiptNo} (${formatRM(tx.amount)} - ${tx.partyName}) telah dipadam daripada buku tunai.`,
          balanceAfter: nextTotals.balance,
          channel: 'Portal Web',
          read: false,
        };
        const nextNotifs = [deleteNotif, ...notifications];

        setTransactions(nextList);
        setNotifications(nextNotifs);

        if (connection.spreadsheetId && user) {
          const token = getAccessToken();
          if (token) {
            setIsWorkspaceBusy(true);
            try {
              await syncAllToSheet(token, connection, nextList, nextNotifs);
              setConnection((prev) => ({
                ...prev,
                lastSyncedAt: new Date().toISOString(),
              }));
            } catch (err: unknown) {
              const msg =
                err instanceof Error ? err.message : 'Gagal segerak Sheets.';
              showToast('Dipadam tempatan, tetapi Sheets gagal', msg, 'error');
              return;
            } finally {
              setIsWorkspaceBusy(false);
            }
          }
        }

        showToast(
          `Rekod ${tx.receiptNo} dipadam`,
          `Baki semasa dikemas kini kepada ${formatRM(nextTotals.balance)}.`
        );
      },
    });
  };

  // Google Sheets Actions (All mutating actions require ConfirmationModal)
  const handleCreateNewSheet = () => {
    const token = requireToken();
    if (!token) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Cipta Google Sheet Baharu?',
      description:
        'Aplikasi akan mencipta fail Google Sheet baharu bernama "Kewangan Masjid Muhsinin" dalam akaun Google anda dan menyalin semua rekod sedia ada ke dalamnya.',
      details: [
        'Tab 1: Transaksi (semua rekod kutipan & perbelanjaan)',
        'Tab 2: Ringkasan Bulanan (agregat bulanan automatik)',
        'Tab 3: Notifikasi (log amaran transaksi masuk & keluar)',
      ],
      confirmLabel: 'Cipta & Segerak Sekarang',
      variant: 'primary',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        setIsWorkspaceBusy(true);
        try {
          const created = await createMasjidSpreadsheet(
            freshToken,
            transactions,
            notifications
          );
          setConnection((prev) => ({
            ...prev,
            spreadsheetId: created.spreadsheetId,
            spreadsheetTitle: created.spreadsheetTitle,
            spreadsheetUrl: created.spreadsheetUrl,
            transactionSheetName: created.transactionSheetName,
            notificationSheetName: created.notificationSheetName,
            summarySheetName: created.summarySheetName,
            lastSyncedAt: new Date().toISOString(),
          }));
          setTransactions((prev) =>
            prev.map((tx) => ({ ...tx, syncedToSheet: true }))
          );
          showToast(
            'Google Sheet berjaya dicipta',
            `Semua ${transactions.length} rekod telah disimpan ke "${created.spreadsheetTitle}".`
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Gagal mencipta Google Sheet.';
          showToast('Gagal mencipta Google Sheet', msg, 'error');
        } finally {
          setIsWorkspaceBusy(false);
        }
      },
    });
  };

  const handleConnectExistingSheet = async (sheetUrlOrId: string) => {
    const token = requireToken();
    if (!token) return;
    setIsWorkspaceBusy(true);
    try {
      const info = await inspectSpreadsheet(token, sheetUrlOrId);
      const pulled = await readTransactionsFromSheet(
        token,
        info.spreadsheetId,
        info.transactionSheetName
      );
      setConnection((prev) => ({
        ...prev,
        spreadsheetId: info.spreadsheetId,
        spreadsheetTitle: info.spreadsheetTitle,
        spreadsheetUrl: info.spreadsheetUrl,
        transactionSheetName: info.transactionSheetName,
        notificationSheetName: info.notificationSheetName,
        summarySheetName: info.summarySheetName,
        lastSyncedAt: new Date().toISOString(),
      }));
      if (pulled.length > 0) {
        setTransactions(pulled);
        showToast(
          `Disambungkan ke "${info.spreadsheetTitle}"`,
          `${pulled.length} transaksi berjaya dimuat turun daripada tab "${info.transactionSheetName}".`
        );
      } else {
        showToast(
          `Disambungkan ke "${info.spreadsheetTitle}"`,
          `Tab "${info.transactionSheetName}" masih kosong. Klik "Segerak Semua ke Sheets" untuk memuat naik data.`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gagal menyambung spreadsheet.';
      showToast('Gagal menyambung Google Sheet', msg, 'error');
    } finally {
      setIsWorkspaceBusy(false);
    }
  };

  const handlePullFromSheet = async () => {
    const token = requireToken();
    if (!token || !connection.spreadsheetId) return;
    setIsWorkspaceBusy(true);
    try {
      const pulled = await readTransactionsFromSheet(
        token,
        connection.spreadsheetId,
        connection.transactionSheetName
      );
      if (pulled.length === 0) {
        showToast(
          'Tiada rekod baharu dalam Sheets',
          `Tab "${connection.transactionSheetName}" tidak mengandungi baris transaksi.`,
          'info'
        );
      } else {
        setTransactions(pulled);
        setConnection((prev) => ({
          ...prev,
          lastSyncedAt: new Date().toISOString(),
        }));
        showToast(
          'Data terkini dimuat turun',
          `${pulled.length} rekod disegerakkan daripada Google Sheets.`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gagal membaca Google Sheets.';
      showToast('Ralat muat turun Sheets', msg, 'error');
    } finally {
      setIsWorkspaceBusy(false);
    }
  };

  const handlePushAllToSheet = () => {
    const token = requireToken();
    if (!token || !connection.spreadsheetId) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Segerak Semua Rekod ke Google Sheets?',
      description: `Tindakan ini akan menulis semula tab "${connection.transactionSheetName}" dalam Google Sheet "${connection.spreadsheetTitle}" dengan ${transactions.length} rekod semasa.`,
      details: [
        `Jumlah Kutipan: ${formatRM(currentTotals.totalIn)}`,
        `Jumlah Perbelanjaan: ${formatRM(currentTotals.totalOut)}`,
        `Baki Semasa: ${formatRM(currentTotals.balance)}`,
      ],
      confirmLabel: 'Segerak ke Sheets',
      variant: 'primary',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        setIsWorkspaceBusy(true);
        try {
          await syncAllToSheet(
            freshToken,
            connection,
            transactions,
            notifications
          );
          setTransactions((prev) =>
            prev.map((tx) => ({ ...tx, syncedToSheet: true }))
          );
          setConnection((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toISOString(),
          }));
          showToast(
            'Google Sheets berjaya dikemas kini',
            `${transactions.length} rekod telah disegerakkan.`
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Gagal menyimpan ke Sheets.';
          showToast('Ralat segerak Google Sheets', msg, 'error');
        } finally {
          setIsWorkspaceBusy(false);
        }
      },
    });
  };

  // Google Drive Archival Actions (All uploads require ConfirmationModal)
  const handleArchiveReceiptToDrive = (tx: Transaction) => {
    const token = requireToken();
    if (!token) return;
    const pdf = buildReceiptPdf(tx);

    setConfirmDialog({
      isOpen: true,
      title: 'Simpan Resit PDF ke Google Drive?',
      description:
        'Salinan rasmi PDF akan dimuat naik ke folder storan awan "Arkib Kewangan Masjid Muhsinin" dalam Google Drive anda.',
      details: [
        `Nama Fail: ${pdf.fileName}`,
        `Transaksi: ${tx.receiptNo} · ${tx.partyName} (${formatRM(tx.amount)})`,
      ],
      confirmLabel: 'Muat Naik ke Google Drive',
      variant: 'primary',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        setIsWorkspaceBusy(true);
        try {
          const folder = connection.driveFolderId
            ? {
                id: connection.driveFolderId,
                name:
                  connection.driveFolderName ||
                  'Arkib Kewangan Masjid Muhsinin',
                webViewLink: connection.driveFolderUrl || '',
              }
            : await ensureArchiveFolder(freshToken);

          const uploaded = await uploadFileToDrive(
            freshToken,
            folder.id,
            pdf.fileName,
            'application/pdf',
            pdf.blob
          );

          setConnection((prev) => ({
            ...prev,
            driveFolderId: folder.id,
            driveFolderName: folder.name,
            driveFolderUrl: folder.webViewLink || prev.driveFolderUrl,
          }));
          setTransactions((prev) =>
            prev.map((item) =>
              item.id === tx.id
                ? { ...item, driveReceiptUrl: uploaded.webViewLink }
                : item
            )
          );
          setSelectedReceiptTx((prev) =>
            prev && prev.id === tx.id
              ? { ...prev, driveReceiptUrl: uploaded.webViewLink }
              : prev
          );
          setArchiveFiles((prev) => [uploaded, ...prev]);
          showToast(
            'Resit PDF diarkibkan di Google Drive',
            `Fail "${uploaded.name}" selamat disimpan di storan awan.`
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Gagal memuat naik ke Drive.';
          showToast('Gagal arkib ke Google Drive', msg, 'error');
        } finally {
          setIsWorkspaceBusy(false);
        }
      },
    });
  };

  const handleArchiveMonthlyReportToDrive = (
    monthKey: string,
    openingBalance: number
  ) => {
    const token = requireToken();
    if (!token) return;
    const pdf = buildMonthlyReportPdf(monthKey, transactions, openingBalance);

    setConfirmDialog({
      isOpen: true,
      title: 'Arkib Laporan Bulanan PDF ke Google Drive?',
      description: `Penyata kewangan lengkap bagi tempoh ${formatMonthKeyLabel(
        monthKey
      )} akan dimuat naik ke folder "Arkib Kewangan Masjid Muhsinin".`,
      details: [`Nama Fail: ${pdf.fileName}`, 'Format: Dokumen Rasmi PDF'],
      confirmLabel: 'Arkib ke Google Drive',
      variant: 'primary',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        setIsWorkspaceBusy(true);
        try {
          const folder = connection.driveFolderId
            ? {
                id: connection.driveFolderId,
                name:
                  connection.driveFolderName ||
                  'Arkib Kewangan Masjid Muhsinin',
                webViewLink: connection.driveFolderUrl || '',
              }
            : await ensureArchiveFolder(freshToken);

          const uploaded = await uploadFileToDrive(
            freshToken,
            folder.id,
            pdf.fileName,
            'application/pdf',
            pdf.blob
          );

          setConnection((prev) => ({
            ...prev,
            driveFolderId: folder.id,
            driveFolderName: folder.name,
            driveFolderUrl: folder.webViewLink || prev.driveFolderUrl,
          }));
          setArchiveFiles((prev) => [uploaded, ...prev]);
          showToast(
            'Laporan Bulanan diarkibkan',
            `Fail "${uploaded.name}" telah disimpan ke Google Drive.`
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Gagal arkib laporan.';
          showToast('Ralat arkib Google Drive', msg, 'error');
        } finally {
          setIsWorkspaceBusy(false);
        }
      },
    });
  };

  const handleCreateJsonBackup = () => {
    const token = requireToken();
    if (!token) return;
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `Sandaran_Kewangan_Masjid_Muhsinin_${stamp}.json`;

    setConfirmDialog({
      isOpen: true,
      title: 'Buat Sandaran Keselamatan di Google Drive?',
      description:
        'Salinan penuh semua transaksi, notifikasi, dan ringkasan baki akan dimuat naik ke folder storan awan Google Drive anda.',
      details: [
        `Nama Fail: ${fileName}`,
        `Kandungan: ${transactions.length} rekod transaksi · ${notifications.length} log notifikasi`,
      ],
      confirmLabel: 'Muat Naik Sandaran',
      variant: 'primary',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        setIsWorkspaceBusy(true);
        try {
          const folder = connection.driveFolderId
            ? {
                id: connection.driveFolderId,
                name:
                  connection.driveFolderName ||
                  'Arkib Kewangan Masjid Muhsinin',
                webViewLink: connection.driveFolderUrl || '',
              }
            : await ensureArchiveFolder(freshToken);

          const payload = JSON.stringify(
            {
              masjid: MASJID_INFO.name,
              exportedAt: new Date().toISOString(),
              summary: currentTotals,
              transactions,
              notifications,
            },
            null,
            2
          );

          const uploaded = await uploadFileToDrive(
            freshToken,
            folder.id,
            fileName,
            'application/json',
            payload
          );

          setConnection((prev) => ({
            ...prev,
            driveFolderId: folder.id,
            driveFolderName: folder.name,
            driveFolderUrl: folder.webViewLink || prev.driveFolderUrl,
          }));
          setArchiveFiles((prev) => [uploaded, ...prev]);
          showToast(
            'Sandaran awan berjaya',
            `Fail "${uploaded.name}" telah disimpan ke Google Drive.`
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Gagal membuat sandaran.';
          showToast('Ralat sandaran Google Drive', msg, 'error');
        } finally {
          setIsWorkspaceBusy(false);
        }
      },
    });
  };

  // Gmail Dispatch Actions (All require ConfirmationModal)
  const handleSendReceiptEmail = (tx: Transaction, recipientEmail: string) => {
    const token = requireToken();
    if (!token) return;

    const subject = `[Masjid Muhsinin] ${
      tx.type === 'masuk' ? 'Resit Rasmi Derma' : 'Salinan Baucar Bayaran'
    } ${tx.receiptNo}`;

    setConfirmDialog({
      isOpen: true,
      title: 'Hantar Resit melalui Gmail?',
      description:
        'Salinan resit transaksi rasmi Masjid Muhsinin akan dihantar melalui akaun Gmail anda kepada penerima berikut:',
      details: [
        `Penerima: ${recipientEmail}`,
        `Subjek: ${subject}`,
        `Jumlah: ${formatRM(tx.amount)} (${tx.partyName})`,
      ],
      confirmLabel: 'Hantar E-mel Sekarang',
      variant: 'primary',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        setIsWorkspaceBusy(true);
        try {
          await sendEmailNotification(
            freshToken,
            [recipientEmail],
            subject,
            buildTransactionEmailHtml(tx, currentTotals.balance)
          );
          const sentNotif: NotificationItem = {
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'sistem',
            title: `Resit Dihantar melalui Gmail · ${tx.receiptNo}`,
            message: `Salinan rasmi ${tx.receiptNo} (${formatRM(tx.amount)}) telah dihantar ke ${recipientEmail}.`,
            channel: 'Gmail & Portal',
            recipient: recipientEmail,
            read: false,
          };
          setNotifications((prev) => [sentNotif, ...prev]);
          showToast(
            'Resit e-mel telah dihantar',
            `Dihantar melalui Gmail ke ${recipientEmail}.`
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Gagal menghantar e-mel.';
          showToast('Ralat penghantaran Gmail', msg, 'error');
        } finally {
          setIsWorkspaceBusy(false);
        }
      },
    });
  };

  const handleSendSummaryEmail = () => {
    const token = requireToken();
    if (!token) return;
    const recipients = notifSettings.committeeEmails
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      showToast(
        'Tiada e-mel AJK ditetapkan',
        'Sila masukkan sekurang-kurangnya satu alamat e-mel penerima.',
        'error'
      );
      return;
    }

    const subject = `[Masjid Muhsinin] Ringkasan Baki Kewangan Semasa (${formatDateMY(
      new Date().toISOString().slice(0, 10)
    )})`;

    setConfirmDialog({
      isOpen: true,
      title: 'Hantar E-mel Ringkasan Baki Semasa?',
      description:
        'Ringkasan kedudukan dana semasa Masjid Muhsinin akan dihantar melalui Gmail kepada senarai AJK berikut:',
      details: [
        `Penerima: ${recipients.join(', ')}`,
        `Baki Semasa: ${formatRM(currentTotals.balance)}`,
        `Kutipan: ${formatRM(currentTotals.totalIn)} · Perbelanjaan: ${formatRM(currentTotals.totalOut)}`,
      ],
      confirmLabel: 'Hantar melalui Gmail',
      variant: 'primary',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        setIsWorkspaceBusy(true);
        try {
          const html = `
            <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #065f46; color: #ffffff; padding: 20px 24px;">
                <h2 style="margin: 0; font-size: 18px;">Ringkasan Kewangan ${MASJID_INFO.name}</h2>
                <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Dikemaskini pada ${formatDateMY(new Date().toISOString().slice(0, 10))}</p>
              </div>
              <div style="padding: 24px; font-size: 14px;">
                <p style="margin-top: 0;">Berikut ialah kedudukan dana terkini Masjid Muhsinin:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Jumlah Kutipan Keseluruhan</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #065f46;">${formatRM(currentTotals.totalIn)}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Jumlah Perbelanjaan Keseluruhan</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #b91c1c;">${formatRM(currentTotals.totalOut)}</td></tr>
                  <tr><td style="padding: 10px 8px; font-weight: bold;">Baki Semasa Masa Nyata</td><td style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 16px;">${formatRM(currentTotals.balance)}</td></tr>
                </table>
                <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Jumlah rekod transaksi: ${transactions.length} · ${MASJID_INFO.address}</p>
              </div>
            </div>
          `;
          await sendEmailNotification(freshToken, recipients, subject, html);
          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: 'sistem',
              title: 'E-mel Ringkasan Baki Dihantar',
              message: `Ringkasan baki semasa (${formatRM(currentTotals.balance)}) telah dihantar ke ${recipients.join(', ')}.`,
              balanceAfter: currentTotals.balance,
              channel: 'Gmail & Portal',
              recipient: recipients.join(', '),
              read: false,
            },
            ...prev,
          ]);
          showToast(
            'Ringkasan baki berjaya dihantar',
            `E-mel dihantar kepada ${recipients.length} penerima AJK.`
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Gagal menghantar ringkasan.';
          showToast('Ralat Gmail', msg, 'error');
        } finally {
          setIsWorkspaceBusy(false);
        }
      },
    });
  };

  const activeNavObj =
    NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Workspace Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Zone */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('portal');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 text-left"
          >
            {!emblemFailed ? (
              <img
                src={MASJID_INFO.emblemImage}
                alt="Masjid Muhsinin"
                referrerPolicy="no-referrer"
                onError={() => setEmblemFailed(true)}
                className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-xs font-bold text-white">
                MM
              </div>
            )}
            <span className="whitespace-nowrap text-base font-bold tracking-tight text-slate-900">
              Masjid Muhsinin
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Menu utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-emerald-800' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === 'notifikasi' && unreadCount > 0 && (
                  <span className="font-mono text-xs font-semibold tabular-nums text-emerald-800">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Live Balance + Cloud Connection Quick Summary */}
        <div className="border-t border-slate-200 p-4">
          <div className="text-xs text-slate-500">Baki Tabung Semasa</div>
          <div className="mt-1 font-mono text-base font-bold tabular-nums text-slate-900">
            {formatRM(currentTotals.balance)}
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('awan');
              setMobileMenuOpen(false);
            }}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100"
          >
            <div className="truncate font-medium text-slate-900">
              {user
                ? user.displayName || user.email
                : 'Sambung Google Sheets'}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-500">
              {connection.spreadsheetId
                ? `Sheets: ${connection.spreadsheetTitle}`
                : 'Klik untuk storan awan & Sheets'}
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Clean Top Header Bar */}
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Buka navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden whitespace-nowrap text-slate-400 sm:inline">
                Masjid Muhsinin
              </span>
              <span
                aria-hidden="true"
                className="hidden text-slate-300 sm:inline"
              >
                /
              </span>
              <h1 className="truncate font-semibold text-slate-900">
                {activeNavObj.breadcrumb}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Rekod Transaksi
            </button>
          </div>
        </header>

        {/* Active Viewport Content */}
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {activeTab === 'portal' && (
            <KariahPortalView
              transactions={transactions}
              connection={connection}
              onSelectReceipt={(tx) => setSelectedReceiptTx(tx)}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenNewTransaction={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
            />
          )}

          {activeTab === 'buku-tunai' && (
            <LedgerView
              transactions={transactions}
              onAddTransaction={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
              onEditTransaction={(tx) => {
                setEditingTx(tx);
                setTxModalOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onSelectReceipt={(tx) => setSelectedReceiptTx(tx)}
            />
          )}

          {activeTab === 'laporan' && (
            <MonthlyReportView
              transactions={transactions}
              isSignedIn={Boolean(user)}
              onArchiveMonthlyReport={handleArchiveMonthlyReportToDrive}
              onPreviewPdf={(pdf) => setPreviewPdf(pdf)}
            />
          )}

          {activeTab === 'resit' && (
            <ReceiptsGalleryView
              transactions={transactions}
              onSelectReceipt={(tx) => setSelectedReceiptTx(tx)}
              onPreviewPdf={(pdf) => setPreviewPdf(pdf)}
            />
          )}

          {activeTab === 'notifikasi' && (
            <NotificationsView
              notifications={notifications}
              settings={notifSettings}
              isSignedIn={Boolean(user)}
              onUpdateSettings={setNotifSettings}
              onMarkAllRead={() =>
                setNotifications((prev) =>
                  prev.map((n) => ({ ...n, read: true }))
                )
              }
              onSendSummaryEmail={handleSendSummaryEmail}
            />
          )}

          {activeTab === 'awan' && (
            <CloudSyncView
              user={user}
              isLoggingIn={isLoggingIn}
              isBusy={isWorkspaceBusy}
              connection={connection}
              archiveFiles={archiveFiles}
              transactionCount={transactions.length}
              autoSyncEnabled={autoSyncEnabled}
              onToggleAutoSync={setAutoSyncEnabled}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
              onCreateNewSheet={handleCreateNewSheet}
              onConnectExistingSheet={handleConnectExistingSheet}
              onPullFromSheet={handlePullFromSheet}
              onPushAllToSheet={handlePushAllToSheet}
              onDisconnectSheet={() =>
                setConnection((prev) => ({
                  ...prev,
                  spreadsheetId: null,
                  spreadsheetTitle: null,
                  spreadsheetUrl: null,
                }))
              }
              onCreateJsonBackup={handleCreateJsonBackup}
              onRefreshDriveFiles={() => {
                const token = requireToken();
                if (token) {
                  loadDriveArchive(token, connection.driveFolderId);
                }
              }}
            />
          )}
        </main>

        {/* Quiet Institutional Footer */}
        <footer className="no-print border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2">
            <span>
              {MASJID_INFO.name} · {MASJID_INFO.address}
            </span>
            <span>
              Tel {MASJID_INFO.phone} · {MASJID_INFO.email}
            </span>
          </div>
        </footer>
      </div>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={txModalOpen}
        editingTransaction={editingTx}
        existingTransactions={transactions}
        defaultRecorderName={
          user?.displayName || 'Hj. Razak bin Othman (Bendahari)'
        }
        isSheetConnected={Boolean(connection.spreadsheetId)}
        isSignedIn={Boolean(user)}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
        onSubmit={handleSaveTransaction}
      />

      {/* Official Receipt / Voucher Preview & Print Modal */}
      <ReceiptModal
        transaction={selectedReceiptTx}
        isSignedIn={Boolean(user)}
        onClose={() => setSelectedReceiptTx(null)}
        onArchiveToDrive={handleArchiveReceiptToDrive}
        onSendReceiptEmail={handleSendReceiptEmail}
        onPreviewPdf={(pdf) => setPreviewPdf(pdf)}
      />

      {/* In-App PDF Document Preview & Download Modal */}
      <PdfPreviewModal
        pdf={previewPdf}
        onClose={() => setPreviewPdf(null)}
      />

      {/* Mandatory Explicit Confirmation Modal for Workspace Mutations */}
      <ConfirmationModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      {/* Live Transaction & Sync Notification Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`no-print fixed right-5 bottom-5 z-50 max-w-sm rounded-xl border px-4 py-3.5 shadow-lg ${
            toast.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-900'
              : toast.tone === 'info'
                ? 'border-slate-200 bg-white text-slate-900'
                : 'border-emerald-200 bg-white text-slate-900'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold">{toast.title}</div>
              {toast.detail && (
                <div className="mt-0.5 text-xs text-slate-600">
                  {toast.detail}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded p-0.5 text-slate-400 hover:text-slate-700"
              aria-label="Tutup makluman"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
