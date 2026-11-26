import React, { useState } from 'react';
import {
  Cloud,
  CloudUpload,
  ExternalLink,
  FileSpreadsheet,
  FolderArchive,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { CloudFileItem, WorkspaceConnection } from '../types/finance';
import { formatTimestampMY } from '../utils/formatters';
import { GoogleSignInButton } from './GoogleSignInButton';

interface CloudSyncViewProps {
  user: User | null;
  isLoggingIn: boolean;
  isBusy: boolean;
  connection: WorkspaceConnection;
  archiveFiles: CloudFileItem[];
  transactionCount: number;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onCreateNewSheet: () => void;
  onConnectExistingSheet: (sheetUrlOrId: string) => void;
  onPullFromSheet: () => void;
  onPushAllToSheet: () => void;
  onDisconnectSheet: () => void;
  onCreateJsonBackup: () => void;
  onRefreshDriveFiles: () => void;
}

function formatBytes(sizeStr?: string): string {
  if (!sizeStr) return '-';
  const bytes = parseInt(sizeStr, 10);
  if (isNaN(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const CloudSyncView: React.FC<CloudSyncViewProps> = ({
  user,
  isLoggingIn,
  isBusy,
  connection,
  archiveFiles,
  transactionCount,
  autoSyncEnabled,
  onToggleAutoSync,
  onGoogleLogin,
  onGoogleLogout,
  onCreateNewSheet,
  onConnectExistingSheet,
  onPullFromSheet,
  onPushAllToSheet,
  onDisconnectSheet,
  onCreateJsonBackup,
  onRefreshDriveFiles,
}) => {
  const [sheetInput, setSheetInput] = useState('');

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetInput.trim()) return;
    onConnectExistingSheet(sheetInput.trim());
    setSheetInput('');
  };

  return (
    <div className="space-y-6">
      {/* Authentication & Security Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Akses Selamat Google Sheets, Google Drive & Gmail
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Sambungkan akaun Google Bendahari Masjid Muhsinin untuk menyimpan semua
              rekod kewangan ke Google Sheets, mengarkibkan resit & laporan PDF di
              storan awan Google Drive, serta menghantar notifikasi Gmail secara
              terkawal.
            </p>
          </div>

          <div className="shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-900">
                    {user.displayName || 'Bendahari Masjid'}
                  </div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={onGoogleLogout}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log Keluar
                </button>
              </div>
            ) : (
              <GoogleSignInButton
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                label={
                  isLoggingIn ? 'Menyambung akaun...' : 'Sign in with Google'
                }
              />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
            <div>
              <div className="font-semibold text-slate-900">Google Sheets</div>
              <p className="mt-0.5 leading-relaxed">
                Menyimpan tab Transaksi, Ringkasan Bulanan, dan Log Notifikasi secara
                berstruktur.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <FolderArchive className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
            <div>
              <div className="font-semibold text-slate-900">
                Storan Awan Google Drive
              </div>
              <p className="mt-0.5 leading-relaxed">
                Folder khusus Arkib Kewangan Masjid Muhsinin untuk salinan PDF resit,
                laporan bulanan, dan sandaran JSON.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
            <div>
              <div className="font-semibold text-slate-900">
                Pengesahan Eksplisit & Akses Terhad
              </div>
              <p className="mt-0.5 leading-relaxed">
                Token disimpan dalam memori sahaja dan setiap pengubahsuaian awan
                memerlukan pengesahan pengguna.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Integration Controls */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Google Sheets Database Connection */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Pangkalan Data Google Sheets
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {connection.spreadsheetId
                  ? `Disambungkan · ${transactionCount} rekod semasa`
                  : 'Belum disambungkan ke mana-mana Google Sheet'}
              </p>
            </div>
            {connection.spreadsheetUrl && (
              <a
                href={connection.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-emerald-800 hover:underline"
              >
                Buka Sheets
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {!user ? (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-xs text-slate-600">
                Sila log masuk dengan akaun Google Bendahari di atas untuk mencipta
                atau menyambungkan Google Sheet rasmi Masjid Muhsinin.
              </p>
            </div>
          ) : connection.spreadsheetId ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="font-semibold text-slate-900">
                  {connection.spreadsheetTitle}
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">
                  ID: {connection.spreadsheetId}
                </div>
                <div className="mt-2 text-slate-600">
                  Tab Aktif: {connection.transactionSheetName}
                  {connection.summarySheetName
                    ? ` · ${connection.summarySheetName}`
                    : ''}
                  {connection.notificationSheetName
                    ? ` · ${connection.notificationSheetName}`
                    : ''}
                </div>
                {connection.lastSyncedAt && (
                  <div className="mt-1 text-slate-500">
                    Segerak terakhir: {formatTimestampMY(connection.lastSyncedAt)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onPushAllToSheet}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-800 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-900 disabled:opacity-50"
                >
                  <CloudUpload className="h-4 w-4" />
                  Segerak Semua ke Sheets
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onPullFromSheet}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tarik Data dari Sheets
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => onToggleAutoSync(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>Auto-muat semula data Sheets setiap 60 saat</span>
                </label>
                <button
                  type="button"
                  onClick={onDisconnectSheet}
                  className="text-xs font-medium text-slate-500 hover:text-red-700 hover:underline"
                >
                  Tukar Spreadsheet
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onCreateNewSheet}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-900 disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Cipta Google Sheet Baharu (Kewangan Masjid Muhsinin)
                </button>
                <p className="mt-1.5 text-xs text-slate-500">
                  Menjana helaian rasmi secara automatik dengan 3 tab: Transaksi,
                  Ringkasan Bulanan, dan Notifikasi.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <form onSubmit={handleConnectSubmit} className="space-y-2.5">
                  <label
                    htmlFor="existing-sheet-input"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Atau sambung ke Google Sheet sedia ada (Pautan URL atau ID)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="existing-sheet-input"
                      type="text"
                      value={sheetInput}
                      onChange={(e) => setSheetInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isBusy || !sheetInput.trim()}
                      className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Sambung
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>

        {/* Google Drive Cloud Storage Archive */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Storan Awan & Arkib Google Drive
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {connection.driveFolderName
                  ? `Folder: ${connection.driveFolderName}`
                  : 'Arkib PDF resit, laporan bulanan & sandaran keselamatan'}
              </p>
            </div>
            {connection.driveFolderUrl && (
              <a
                href={connection.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-emerald-800 hover:underline"
              >
                Buka Drive
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {!user ? (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-xs text-slate-600">
                Log masuk Google untuk mengaktifkan folder arkib awan Google Drive bagi
                penyimpanan resit PDF dan sandaran keselamatan.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onCreateJsonBackup}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  <Cloud className="h-3.5 w-3.5" />
                  Buat Sandaran Awan (JSON)
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onRefreshDriveFiles}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Muat Semula Arkib
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                {archiveFiles.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-500">
                    Belum ada fail arkib dalam folder Google Drive. Anda boleh
                    memuat naik resit PDF, laporan bulanan PDF, atau membuat sandaran
                    JSON sekarang.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {archiveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-xs hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-slate-900">
                            {file.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {formatTimestampMY(file.modifiedTime)} ·{' '}
                            {formatBytes(file.size)}
                          </div>
                        </div>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 font-medium text-emerald-800 hover:underline"
                          >
                            Lihat
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
