'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Database, FileText, FileUp, Loader2 } from 'lucide-react';

type Tab = 'backup' | 'restore';
type BackupStatus = 'idle' | 'loading' | 'ready' | 'error';
type RestoreStatus = 'idle' | 'loading' | 'success' | 'error';

export default function BackupRestoreClient() {
  const [activeTab, setActiveTab] = useState<Tab>('backup');

  // ── Backup state ──
  const [backupStatus, setBackupStatus]   = useState<BackupStatus>('idle');
  const [backupBlobUrl, setBackupBlobUrl] = useState<string>('');
  const [backupFileName, setBackupFileName] = useState<string>('backup_erapor.sql');
  const [backupError, setBackupError]     = useState<string>('');

  // ── Restore state ──
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>('idle');
  const [restoreMessage, setRestoreMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Switch Tab ──
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  // ──────────────────────────────────────
  // BACKUP
  // ──────────────────────────────────────
  const handleBackup = async () => {
    setBackupStatus('loading');
    setBackupError('');
    if (backupBlobUrl) {
      window.URL.revokeObjectURL(backupBlobUrl);
      setBackupBlobUrl('');
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) { alert('Silakan login terlebih dahulu'); return; }

      const res = await fetch('http://localhost:5000/api/admin/backup', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Gagal melakukan backup data.');

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      const fileName = contentDisposition
        ? (contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'backup_erapor.sql')
        : 'backup_erapor.sql';

      const url = window.URL.createObjectURL(blob);
      setBackupBlobUrl(url);
      setBackupFileName(fileName);
      setBackupStatus('ready');
    } catch (err: any) {
      setBackupError(err.message || 'Terjadi kesalahan saat backup.');
      setBackupStatus('error');
    }
  };

  const handleDownloadBackup = () => {
    if (!backupBlobUrl) return;
    const link = document.createElement('a');
    link.href     = backupBlobUrl;
    link.download = backupFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ──────────────────────────────────────
  // RESTORE
  // ──────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setRestoreStatus('idle');
    setRestoreMessage('');
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setRestoreStatus('error');
      setRestoreMessage('Pilih file backup terlebih dahulu.');
      return;
    }
    setRestoreStatus('loading');
    setRestoreMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) { alert('Silakan login terlebih dahulu'); return; }

      const formData = new FormData();
      formData.append('backup_file', selectedFile);

      const res = await fetch('http://localhost:5000/api/admin/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal melakukan restore data.');
      }

      setRestoreStatus('success');
      setRestoreMessage('Restore data berhasil dilakukan.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setRestoreStatus('error');
      setRestoreMessage(err.message || 'Terjadi kesalahan saat restore.');
    }
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* ── Page Title ── */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Backup &amp; Restore</h1>

        <div
          className="rounded-2xl shadow-sm p-6 mb-6"
          style={{
            background: 'linear-gradient(160deg, #ffffff 0%, #fff7ed 60%, #ffedd5 100%)',
            border: '1px solid rgba(251,146,60,0.2)',
          }}
        >

          {/* ── Orange gradient bar — sesuai warna dashboard ── */}
          <div
            className="-mx-6 -mt-6 mb-0 h-4 rounded-t-2xl"
            style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)' }}
          />

          {/* ── Tab Header ── */}
          <div className="flex border-b border-orange-200 mt-4 gap-0">

            {/* Tab: Backup Data */}
            <button
              onClick={() => handleTabChange('backup')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border border-b-0 transition-colors rounded-t-lg -mb-px ${
                activeTab === 'backup'
                  ? 'border-orange-200 bg-white font-bold'
                  : 'border-transparent bg-transparent hover:text-orange-700'
              }`}
              style={activeTab === 'backup' ? { color: '#ea580c' } : { color: '#9a3412' }}
            >
              <Database className="w-4 h-4" />
              Backup Data
            </button>

            {/* Tab: Restore Data */}
            <button
              onClick={() => handleTabChange('restore')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border border-b-0 transition-colors rounded-t-lg -mb-px ${
                activeTab === 'restore'
                  ? 'border-orange-200 bg-white font-bold'
                  : 'border-transparent bg-transparent hover:text-orange-700'
              }`}
              style={activeTab === 'restore' ? { color: '#ea580c' } : { color: '#9a3412' }}
            >
              <FileUp className="w-4 h-4" />
              Restore Data
            </button>

          </div>

          {/* ──────────────────────────────────────
              TAB: BACKUP DATA
          ────────────────────────────────────── */}
          {activeTab === 'backup' && (
            <div className="pt-6">

              <h2 className="text-base font-bold text-gray-900 mb-3">
                Backup Data Aplikasi e-Rapor.
              </h2>
              <hr className="mb-5 border-orange-100" />

              <p className="text-sm text-gray-700 mb-3">
                Untuk keamanan, silahkan lakukan proses backup data secara rutin dan simpan hasil backup anda pada tempat yang aman
              </p>
              <p className="text-sm text-gray-700 mb-5">
                Untuk melakukan backup data, silahkan klik tombol Backup Data dibawah ini, tunggu hingga proses selesai
              </p>

              {/* ── Kotak hijau muncul setelah backup berhasil ── */}
              {backupStatus === 'ready' && (
                <div className="border border-green-200 bg-green-50 rounded-xl p-5 mb-5">
                  <p className="text-sm text-green-700 mb-4">
                    Data Aplikasi e-Rapor berhasil dibackup, silahkan download hasil backup berikut ini
                  </p>
                  <button
                    onClick={handleDownloadBackup}
                    className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
                    style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)')}
                  >
                    <FileText className="w-4 h-4" />
                    Download Hasil backup
                  </button>
                </div>
              )}

              {/* ── Error ── */}
              {backupStatus === 'error' && (
                <div className="border border-red-200 bg-red-50 rounded-xl p-4 mb-5">
                  <p className="text-sm text-red-700">{backupError}</p>
                </div>
              )}

              <hr className="mb-5 border-orange-100" />

              {/* ── Button Backup Data ── */}
              <div className="flex justify-end">
                <button
                  onClick={handleBackup}
                  disabled={backupStatus === 'loading'}
                  className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
                    boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                  }}
                  onMouseEnter={(e) => {
                    if (backupStatus !== 'loading') {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #c2410c 0%, #ea580c 60%, #f97316 100%)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)';
                  }}
                >
                  {backupStatus === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {backupStatus === 'loading' ? 'Memproses...' : 'Backup Data'}
                </button>
              </div>

            </div>
          )}

          {/* ──────────────────────────────────────
              TAB: RESTORE DATA
          ────────────────────────────────────── */}
          {activeTab === 'restore' && (
            <div className="pt-6">

              <h2 className="text-base font-bold text-gray-900 mb-3">
                Restore Hasil Backup Aplikasi e-Rapor.
              </h2>
              <hr className="mb-5 border-orange-100" />

              <p className="text-sm text-gray-700 mb-8">
                Untuk melakukan Upload dan restore data dari hasil backup Aplikasi e-Rapor, Silahkan Choose File hasil backup yang yang akan direstore,
                kemudian klik tombol &quot;Upload dan Restore Data e-Rapor&quot;.
              </p>

              <hr className="mb-5 border-orange-100" />

              {/* ── Status sukses / error ── */}
              {restoreStatus === 'success' && (
                <div className="border border-green-200 bg-green-50 rounded-xl p-4 mb-5">
                  <p className="text-sm text-green-700">{restoreMessage}</p>
                </div>
              )}
              {restoreStatus === 'error' && (
                <div className="border border-red-200 bg-red-50 rounded-xl p-4 mb-5">
                  <p className="text-sm text-red-700">{restoreMessage}</p>
                </div>
              )}

              {/* ── File Picker ── */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-800 mb-3">
                  Pilih File Backup yang akan direstore
                </p>

                <div
                  className="flex items-stretch rounded-xl overflow-hidden w-full"
                  style={{ border: '1px solid rgba(251,146,60,0.4)' }}
                >
                  <label
                    htmlFor="restore-file-input"
                    className="flex items-center px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                      color: 'white',
                      borderRight: '1px solid rgba(251,146,60,0.3)',
                    }}
                  >
                    Choose File
                  </label>
                  <span className="flex items-center px-4 py-2.5 text-sm text-gray-500 flex-1 bg-white">
                    {selectedFile ? selectedFile.name : 'No file chosen'}
                  </span>
                  <input
                    id="restore-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept=".sql,.zip,.gz"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {selectedFile && (
                  <p className="text-xs mt-1.5" style={{ color: '#9a3412' }}>
                    Ukuran: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>

              <hr className="mb-5 border-orange-100" />

              {/* ── Button Restore ── */}
              <div className="flex justify-end">
                <button
                  onClick={handleRestore}
                  disabled={restoreStatus === 'loading' || !selectedFile}
                  className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
                    boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                  }}
                  onMouseEnter={(e) => {
                    if (restoreStatus !== 'loading' && selectedFile) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #c2410c 0%, #ea580c 60%, #f97316 100%)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)';
                  }}
                >
                  {restoreStatus === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {restoreStatus === 'loading' ? 'Memproses...' : 'Upload dan Restore Data e-Rapor'}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}