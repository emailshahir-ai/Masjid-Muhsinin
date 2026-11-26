import { Transaction } from '../types/finance';

export const MASJID_INFO = {
  name: 'Masjid Muhsinin',
  subtitle: 'Jawatankuasa Pengurusan Kewangan Kariah',
  address: 'Kampung Kelubi, Pasir Puteh, Kelantan',
  phone: '09-786 4412',
  email: 'kewangan@masjidmuhsinin.org.my',
  bankName: 'Bank Islam Malaysia Berhad',
  accountNo: '1202-9010-0845-21',
  bannerImage: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_12.42.45_PM_a04aaf21.jpg',
  emblemImage: '/src/assets/images/masjid_muhsinin_emblem_1795643763583.jpg',
};

export const MALAY_MONTHS = [
  'Januari',
  'Februari',
  'Mac',
  'April',
  'Mei',
  'Jun',
  'Julai',
  'Ogos',
  'September',
  'Oktober',
  'November',
  'Disember',
];

export function formatRM(amount: number): string {
  const absVal = Math.abs(amount);
  const formatted = absVal.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-RM ${formatted}` : `RM ${formatted}`;
}

export function formatDateMY(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (monthIdx < 0 || monthIdx > 11 || isNaN(day)) return isoDate;
  return `${day} ${MALAY_MONTHS[monthIdx]} ${year}`;
}

export function formatMonthKeyLabel(monthKey: string): string {
  if (monthKey === 'ALL') return 'Keseluruhan Tahun 2026';
  const [year, monthStr] = monthKey.split('-');
  const idx = parseInt(monthStr, 10) - 1;
  if (idx < 0 || idx > 11) return monthKey;
  return `${MALAY_MONTHS[idx]} ${year}`;
}

export function formatTimestampMY(isoTimestamp: string): string {
  try {
    const d = new Date(isoTimestamp);
    if (isNaN(d.getTime())) return isoTimestamp;
    const day = d.getDate();
    const month = MALAY_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hh}:${mm}`;
  } catch {
    return isoTimestamp;
  }
}

export function generateReceiptNo(
  type: 'masuk' | 'keluar',
  existing: Transaction[],
  dateStr?: string
): string {
  const year = dateStr ? dateStr.slice(0, 4) : String(new Date().getFullYear());
  const prefix = type === 'masuk' ? `MM-${year}-` : `BV-${year}-`;
  let maxNum = 0;
  for (const tx of existing) {
    if (tx.receiptNo.startsWith(prefix)) {
      const suffix = parseInt(tx.receiptNo.slice(prefix.length), 10);
      if (!isNaN(suffix) && suffix > maxNum) {
        maxNum = suffix;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

const ONES = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Lapan',
  'Sembilan',
];

function convertHundredsMY(num: number): string {
  let result = '';
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    result += hundreds === 1 ? 'Seratus' : `${ONES[hundreds]} Ratus`;
  }

  if (remainder > 0) {
    if (result) result += ' ';
    if (remainder < 10) {
      result += ONES[remainder];
    } else if (remainder === 10) {
      result += 'Sepuluh';
    } else if (remainder === 11) {
      result += 'Sebelas';
    } else if (remainder < 20) {
      result += `${ONES[remainder - 10]} Belas`;
    } else {
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;
      result += `${ONES[tens]} Puluh`;
      if (ones > 0) result += ` ${ONES[ones]}`;
    }
  }

  return result;
}

export function amountToMalayWords(amount: number): string {
  const safe = Math.max(0, Math.round(amount * 100) / 100);
  const ringgit = Math.floor(safe);
  const sen = Math.round((safe - ringgit) * 100);

  let words = '';
  if (ringgit === 0) {
    words = 'Sifar';
  } else {
    const millions = Math.floor(ringgit / 1_000_000);
    const thousands = Math.floor((ringgit % 1_000_000) / 1_000);
    const rest = ringgit % 1_000;

    const parts: string[] = [];
    if (millions > 0) {
      parts.push(`${convertHundredsMY(millions)} Juta`);
    }
    if (thousands > 0) {
      parts.push(
        thousands === 1 ? 'Seribu' : `${convertHundredsMY(thousands)} Ribu`
      );
    }
    if (rest > 0) {
      parts.push(convertHundredsMY(rest));
    }
    words = parts.join(' ');
  }

  if (sen > 0) {
    return `Ringgit Malaysia ${words} Dan ${convertHundredsMY(sen)} Sen Sahaja`;
  }
  return `Ringgit Malaysia ${words} Sahaja`;
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  for (const tx of transactions) {
    if (tx.date && tx.date.length >= 7) {
      set.add(tx.date.slice(0, 7));
    }
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function calculateLedgerTotals(transactions: Transaction[]) {
  let totalIn = 0;
  let totalOut = 0;
  for (const tx of transactions) {
    if (tx.type === 'masuk') totalIn += tx.amount;
    else totalOut += tx.amount;
  }
  return {
    totalIn,
    totalOut,
    balance: totalIn - totalOut,
  };
}

export function calculateOpeningBalanceForMonth(
  transactions: Transaction[],
  monthKey: string
): number {
  if (monthKey === 'ALL') return 0;
  let balance = 0;
  for (const tx of transactions) {
    if (tx.date.slice(0, 7) < monthKey) {
      balance += tx.type === 'masuk' ? tx.amount : -tx.amount;
    }
  }
  return balance;
}
