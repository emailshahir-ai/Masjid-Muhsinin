import {
  CloudFileItem,
  NotificationItem,
  PaymentMethod,
  Transaction,
  TransactionCategory,
  TransactionType,
  WorkspaceConnection,
} from '../types/finance';
import { formatMonthKeyLabel } from '../utils/formatters';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

const TRANSACTION_HEADERS = [
  'ID',
  'Tarikh',
  'Masa',
  'Jenis',
  'Kategori',
  'Keterangan',
  'Nama Pihak',
  'Emel',
  'Kaedah Bayaran',
  'Jumlah (RM)',
  'No. Resit / Baucar',
  'Dicatat Oleh',
  'Catatan',
];

const NOTIFICATION_HEADERS = [
  'ID',
  'Masa',
  'Jenis',
  'Tajuk',
  'Mesej',
  'Jumlah (RM)',
  'Baki Selepas (RM)',
  'No. Rujukan',
  'Saluran',
];

const SUMMARY_HEADERS = [
  'Bulan',
  'Jumlah Kutipan (RM)',
  'Jumlah Perbelanjaan (RM)',
  'Lebihan / Kurangan (RM)',
  'Bilangan Transaksi',
];

async function parseGoogleError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error?.message) return data.error.message;
  } catch {
    // ignore JSON parse failure
  }
  return `${fallback} (HTTP ${res.status})`;
}

function transactionToRow(tx: Transaction): (string | number)[] {
  return [
    tx.id,
    tx.date,
    tx.time,
    tx.type,
    tx.category,
    tx.description,
    tx.partyName,
    tx.partyEmail || '',
    tx.paymentMethod,
    Number(tx.amount.toFixed(2)),
    tx.receiptNo,
    tx.recordedBy,
    tx.notes || '',
  ];
}

function notificationToRow(n: NotificationItem): (string | number)[] {
  return [
    n.id,
    n.timestamp,
    n.type,
    n.title,
    n.message,
    n.amount !== undefined ? Number(n.amount.toFixed(2)) : '',
    n.balanceAfter !== undefined ? Number(n.balanceAfter.toFixed(2)) : '',
    n.receiptNo || '',
    n.channel,
  ];
}

function buildMonthlySummaryRows(transactions: Transaction[]): (string | number)[][] {
  const byMonth = new Map<
    string,
    { inTotal: number; outTotal: number; count: number }
  >();

  for (const tx of transactions) {
    const key = tx.date.slice(0, 7);
    const entry = byMonth.get(key) || { inTotal: 0, outTotal: 0, count: 0 };
    if (tx.type === 'masuk') entry.inTotal += tx.amount;
    else entry.outTotal += tx.amount;
    entry.count += 1;
    byMonth.set(key, entry);
  }

  return Array.from(byMonth.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, stat]) => [
      formatMonthKeyLabel(monthKey),
      Number(stat.inTotal.toFixed(2)),
      Number(stat.outTotal.toFixed(2)),
      Number((stat.inTotal - stat.outTotal).toFixed(2)),
      stat.count,
    ]);
}

function escapeSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

export async function createMasjidSpreadsheet(
  accessToken: string,
  transactions: Transaction[],
  notifications: NotificationItem[]
): Promise<{
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  transactionSheetName: string;
  notificationSheetName: string;
  summarySheetName: string;
}> {
  const title = 'Kewangan Masjid Muhsinin';
  const createRes = await fetch(SHEETS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title, locale: 'ms_MY' },
      sheets: [
        { properties: { title: 'Transaksi' } },
        { properties: { title: 'Ringkasan Bulanan' } },
        { properties: { title: 'Notifikasi' } },
      ],
    }),
  });

  if (!createRes.ok) {
    throw new Error(
      await parseGoogleError(createRes, 'Gagal mencipta Google Sheet')
    );
  }

  const created = await createRes.json();
  const spreadsheetId: string = created.spreadsheetId;
  const spreadsheetUrl: string =
    created.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const connection: WorkspaceConnection = {
    spreadsheetId,
    spreadsheetTitle: title,
    spreadsheetUrl,
    transactionSheetName: 'Transaksi',
    notificationSheetName: 'Notifikasi',
    summarySheetName: 'Ringkasan Bulanan',
    driveFolderId: null,
    driveFolderName: null,
    driveFolderUrl: null,
    lastSyncedAt: null,
  };

  await syncAllToSheet(accessToken, connection, transactions, notifications);

  return {
    spreadsheetId,
    spreadsheetTitle: title,
    spreadsheetUrl,
    transactionSheetName: 'Transaksi',
    notificationSheetName: 'Notifikasi',
    summarySheetName: 'Ringkasan Bulanan',
  };
}

export async function inspectSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  sheetNames: string[];
  transactionSheetName: string;
  notificationSheetName: string;
  summarySheetName: string;
}> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(
    `${SHEETS_API}/${encodeURIComponent(cleanId)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(
      await parseGoogleError(
        res,
        'Gagal membaca maklumat Google Sheet. Pastikan ID atau pautan adalah sah dan anda mempunyai akses.'
      )
    );
  }

  const data = await res.json();
  const sheetNames: string[] = (data.sheets || []).map(
    (s: { properties?: { title?: string } }) => s.properties?.title || ''
  ).filter(Boolean);

  if (sheetNames.length === 0) {
    throw new Error('Spreadsheet ini tidak mempunyai sebarang tab helaian.');
  }

  const txSheet =
    sheetNames.find((n) => n.toLowerCase().includes('transaksi')) ||
    sheetNames[0];
  const notifSheet =
    sheetNames.find((n) => n.toLowerCase().includes('notifikasi')) || '';
  const summarySheet =
    sheetNames.find((n) => n.toLowerCase().includes('ringkasan')) || '';

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetTitle: data.properties?.title || 'Kewangan Masjid Muhsinin',
    spreadsheetUrl:
      data.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheetNames,
    transactionSheetName: txSheet,
    notificationSheetName: notifSheet,
    summarySheetName: summarySheet,
  };
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

export async function readTransactionsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<Transaction[]> {
  const range = encodeURIComponent(`${escapeSheetName(sheetName)}!A2:M2000`);
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(
      await parseGoogleError(res, 'Gagal memuat turun data transaksi daripada Google Sheets')
    );
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  const parsed: Transaction[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 4) continue;
    const rawType = (r[3] || '').toString().toLowerCase().trim();
    const type: TransactionType =
      rawType === 'keluar' || rawType === 'perbelanjaan' ? 'keluar' : 'masuk';
    const rawAmount = parseFloat(
      String(r[9] || '0')
        .replace(/RM/gi, '')
        .replace(/,/g, '')
        .trim()
    );
    if (isNaN(rawAmount) || rawAmount <= 0) continue;

    parsed.push({
      id: r[0] || `sheet-row-${i + 2}`,
      date: r[1] || new Date().toISOString().slice(0, 10),
      time: r[2] || '12:00',
      type,
      category: (r[4] || (type === 'masuk' ? 'Derma Am & Infaq' : 'Pengurusan & Pentadbiran')) as TransactionCategory,
      description: r[5] || 'Transaksi direkodkan melalui Google Sheets',
      partyName: r[6] || 'Jemaah / Pihak Berkaitan',
      partyEmail: r[7] || undefined,
      paymentMethod: (r[8] || 'Tunai') as PaymentMethod,
      amount: rawAmount,
      receiptNo: r[10] || `MM-SHEET-${String(i + 1).padStart(4, '0')}`,
      recordedBy: r[11] || 'Bendahari Masjid Muhsinin',
      notes: r[12] || undefined,
      syncedToSheet: true,
      createdAt: `${r[1] || new Date().toISOString().slice(0, 10)}T${r[2] || '12:00'}:00+08:00`,
    });
  }

  return parsed;
}

export async function syncAllToSheet(
  accessToken: string,
  connection: WorkspaceConnection,
  transactions: Transaction[],
  notifications: NotificationItem[]
): Promise<void> {
  if (!connection.spreadsheetId) {
    throw new Error('Tiada Google Sheet disambungkan.');
  }

  const txRange = `${escapeSheetName(connection.transactionSheetName)}!A1:M2000`;
  const clearRanges = [txRange];

  if (connection.summarySheetName) {
    clearRanges.push(`${escapeSheetName(connection.summarySheetName)}!A1:E500`);
  }
  if (connection.notificationSheetName) {
    clearRanges.push(`${escapeSheetName(connection.notificationSheetName)}!A1:I1000`);
  }

  const clearRes = await fetch(
    `${SHEETS_API}/${connection.spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ranges: clearRanges }),
    }
  );

  if (!clearRes.ok) {
    throw new Error(
      await parseGoogleError(clearRes, 'Gagal menyediakan helaian Google Sheets untuk segerak')
    );
  }

  const sortedTx = [...transactions].sort((a, b) =>
    `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
  );

  const dataPayload: { range: string; values: (string | number)[][] }[] = [
    {
      range: `${escapeSheetName(connection.transactionSheetName)}!A1`,
      values: [TRANSACTION_HEADERS, ...sortedTx.map(transactionToRow)],
    },
  ];

  if (connection.summarySheetName) {
    dataPayload.push({
      range: `${escapeSheetName(connection.summarySheetName)}!A1`,
      values: [SUMMARY_HEADERS, ...buildMonthlySummaryRows(sortedTx)],
    });
  }

  if (connection.notificationSheetName) {
    dataPayload.push({
      range: `${escapeSheetName(connection.notificationSheetName)}!A1`,
      values: [NOTIFICATION_HEADERS, ...notifications.map(notificationToRow)],
    });
  }

  const updateRes = await fetch(
    `${SHEETS_API}/${connection.spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload,
      }),
    }
  );

  if (!updateRes.ok) {
    throw new Error(
      await parseGoogleError(updateRes, 'Gagal menyimpan data ke Google Sheets')
    );
  }
}

export async function ensureArchiveFolder(accessToken: string): Promise<{
  id: string;
  name: string;
  webViewLink: string;
}> {
  const folderName = 'Arkib Kewangan Masjid Muhsinin';
  const query = encodeURIComponent(
    `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await fetch(
    `${DRIVE_API}?q=${query}&fields=files(id,name,webViewLink)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!searchRes.ok) {
    throw new Error(
      await parseGoogleError(searchRes, 'Gagal menyemak folder Google Drive')
    );
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    return {
      id: existing.id,
      name: existing.name,
      webViewLink:
        existing.webViewLink ||
        `https://drive.google.com/drive/folders/${existing.id}`,
    };
  }

  const createRes = await fetch(
    `${DRIVE_API}?fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  if (!createRes.ok) {
    throw new Error(
      await parseGoogleError(createRes, 'Gagal mencipta folder arkib Google Drive')
    );
  }

  const created = await createRes.json();
  return {
    id: created.id,
    name: created.name,
    webViewLink:
      created.webViewLink ||
      `https://drive.google.com/drive/folders/${created.id}`,
  };
}

export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  content: Blob | string
): Promise<CloudFileItem> {
  const metadata = {
    name: fileName,
    mimeType,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  const fileBlob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  form.append('file', fileBlob);

  const res = await fetch(
    `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    throw new Error(
      await parseGoogleError(res, 'Gagal memuat naik fail ke Google Drive')
    );
  }

  const file = await res.json();
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime || new Date().toISOString(),
    size: file.size,
    webViewLink:
      file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
  };
}

export async function listArchiveFiles(
  accessToken: string,
  folderId: string
): Promise<CloudFileItem[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await fetch(
    `${DRIVE_API}?q=${query}&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(
      await parseGoogleError(res, 'Gagal menyenaraikan fail dalam folder Google Drive')
    );
  }

  const data = await res.json();
  return (data.files || []).map((f: CloudFileItem) => ({
    ...f,
    webViewLink:
      f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
  }));
}

function encodeBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeHeaderSubject(subject: string): string {
  const bytes = new TextEncoder().encode(subject);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

export async function sendEmailNotification(
  accessToken: string,
  toAddresses: string[],
  subject: string,
  htmlBody: string
): Promise<void> {
  const validEmails = toAddresses
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  if (validEmails.length === 0) {
    throw new Error('Tiada alamat e-mel penerima yang sah.');
  }

  const mimeLines = [
    `To: ${validEmails.join(', ')}`,
    `Subject: ${encodeHeaderSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlBody,
  ];

  const raw = encodeBase64UrlUtf8(mimeLines.join('\r\n'));

  const res = await fetch(GMAIL_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    throw new Error(
      await parseGoogleError(res, 'Gagal menghantar e-mel melalui Gmail')
    );
  }
}
