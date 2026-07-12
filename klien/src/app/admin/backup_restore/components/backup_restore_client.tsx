'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Database, FileUp, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

type Tab = 'backup' | 'restore';
type BackupStatus = 'idle' | 'loading' | 'ready' | 'error';
type RestoreStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── SHARED STYLE CONSTANTS (disamakan dengan design system orange) ───────────

const PAGE_BG = { background: '#ffffff' };
const CARD_STYLE = { border: '1px solid #f0e0d0', boxShadow: '0 4px 20px rgba(180,70,10,0.10)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const btnPrimary = {
    base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

export default function BackupRestoreClient() {
    const [activeTab, setActiveTab] = useState<Tab>('backup');
    const { showSessionExpired, handleLogout } = useSession();

    // ── Backup state ──
    const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle');
    const [backupBlobUrl, setBackupBlobUrl] = useState<string>('');
    const [backupFileName, setBackupFileName] = useState<string>('backup_erapor.sql');
    const [backupError, setBackupError] = useState<string>('');

    // ── Restore state ──
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
            let fileName = 'Backup_E-Rapor_' + Date.now() + '.zip';

            if (contentDisposition) {
                const filenameRegex = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i;
                const matches = contentDisposition.match(filenameRegex);
                if (matches && matches[1]) {
                    fileName = decodeURIComponent(matches[1].trim());
                }
            }

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
        link.href = backupBlobUrl;
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
        // Validasi file dipilih
        if (!selectedFile) {
            setRestoreStatus('error');
            setRestoreMessage('⚠️ Pilih file backup terlebih dahulu.');
            return;
        }

        // Validasi ekstensi file
        const allowedExtensions = ['.sql', '.zip'];
        const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

        if (!allowedExtensions.includes(fileExt)) {
            setRestoreStatus('error');
            setRestoreMessage(`❌ Format file tidak didukung.\n\nGunakan file .sql atau .zip (hasil backup dari sistem).`);
            return;
        }

        // Validasi ukuran file (max 500MB)
        const maxSize = 500 * 1024 * 1024; // 500MB
        if (selectedFile.size > maxSize) {
            setRestoreStatus('error');
            setRestoreMessage(`❌ File terlalu besar.\n\nMaksimal: 500MB\nFile Anda: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
            return;
        }

        setRestoreStatus('loading');
        setRestoreMessage('⏳ Sedang memproses restore...\n\nMohon tunggu, proses ini mungkin memakan waktu beberapa menit.');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setRestoreStatus('error');
                setRestoreMessage('❌ Sesi login habis.\n\nSilakan login ulang.');
                return;
            }

            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch('http://localhost:5000/api/admin/backup/restore', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                const errorMsg = data.detail
                    ? `❌ ${data.message}\n\n💡 ${data.detail}`
                    : `❌ ${data.message || 'Gagal restore database'}`;
                throw new Error(errorMsg);
            }

            setRestoreStatus('success');
            setRestoreMessage(`✅ ${data.message}\n\n⚠️ ${data.warning}`);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (err: any) {
            setRestoreStatus('error');

            let errorMessage = '❌ Terjadi kesalahan: ';

            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                errorMessage = '❌ Tidak dapat terhubung ke server.\n\n💡 Pastikan:\n• Server backend berjalan di http://localhost:5000\n• Koneksi internet stabil\n• Tidak ada firewall yang memblokir';
            } else if (err.message.includes('413')) {
                errorMessage = '❌ File terlalu besar untuk diupload.\n\nMaksimal: 500MB';
            } else if (err.message.includes('401') || err.message.includes('403')) {
                errorMessage = '❌ Sesi login tidak valid.\n\nSilakan login ulang.';
            } else if (err.message.includes('400')) {
                errorMessage = err.message;
            } else {
                errorMessage = err.message || '❌ Terjadi kesalahan yang tidak diketahui.\n\nSilakan coba lagi atau hubungi administrator.';
            }

            setRestoreMessage(errorMessage);
            console.error('Restore error:', err);
        }
    };

    // =============================================
    // RENDER
    // =============================================
    return (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* ── Page Title ── */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Backup &amp; Restore</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelola data cadangan aplikasi e-Rapor
                </p>
            </div>

            {/* ====================================================================
                CARD 1: Tab Switcher — berdiri sendiri, gaya pill, sama pola
                dengan Card 1 di halaman lain (latar putih, border standar).
            ==================================================================== */}
            <div className="bg-white rounded-2xl px-2 py-2 mb-5 flex items-center gap-2 w-fit" style={CARD_STYLE}>
                <button
                    onClick={() => handleTabChange('backup')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={activeTab === 'backup'
                        ? { ...HEADER_GRAD, color: '#fff', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }
                        : { color: '#7a3a0a', background: 'transparent' }}
                    onMouseEnter={e => { if (activeTab !== 'backup') e.currentTarget.style.background = '#fff0e5'; }}
                    onMouseLeave={e => { if (activeTab !== 'backup') e.currentTarget.style.background = 'transparent'; }}
                >
                    <Database className="w-4 h-4" />
                    Backup Data
                </button>

                <button
                    onClick={() => handleTabChange('restore')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={activeTab === 'restore'
                        ? { ...HEADER_GRAD, color: '#fff', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }
                        : { color: '#7a3a0a', background: 'transparent' }}
                    onMouseEnter={e => { if (activeTab !== 'restore') e.currentTarget.style.background = '#fff0e5'; }}
                    onMouseLeave={e => { if (activeTab !== 'restore') e.currentTarget.style.background = 'transparent'; }}
                >
                    <FileUp className="w-4 h-4" />
                    Restore Data
                </button>
            </div>

            {/* ──────────────────────────────────────
          TAB: BACKUP DATA
      ────────────────────────────────────── */}
            {activeTab === 'backup' && (
                <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                    <div className="px-6 py-4" style={HEADER_GRAD}>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Database size={18} />
                            Backup Data Aplikasi e-Rapor
                        </h2>
                    </div>

                    <div className="p-6">
                        {/* ── Info box (kuning - peringatan) ── */}
                        <div
                            className="flex items-start gap-2.5 rounded-xl p-3.5 mb-4"
                            style={{ background: '#fef9c3', border: '1px solid #fde68a' }}
                        >
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#92400e' }} />
                            <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
                                Untuk keamanan, lakukan backup data secara rutin dan simpan hasilnya di tempat yang aman.
                                Klik tombol <strong>Backup Data</strong> di bawah ini, lalu tunggu hingga proses selesai.
                            </p>
                        </div>

                        {/* ── Sukses backup ── */}
                        {backupStatus === 'ready' && (
                            <div className="flex items-center gap-2.5 rounded-xl p-3.5 mb-4" style={{ background: '#eaf7ef', border: '1px solid #b6e8c8' }}>
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#1a7a3a' }} />
                                <p className="text-sm font-medium" style={{ color: '#1a7a3a' }}>
                                    Data berhasil dibackup. Klik <strong>Unduh Backup</strong> untuk menyimpan file.
                                </p>
                            </div>
                        )}

                        {/* ── Error ── */}
                        {backupStatus === 'error' && (
                            <div className="rounded-xl p-4 mb-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                <p className="text-sm" style={{ color: '#b91c1c' }}>{backupError}</p>
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid #fde0c8' }} className="pt-5 flex justify-end gap-3">
                            {backupStatus === 'ready' && (
                                <button
                                    onClick={handleDownloadBackup}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-200"
                                    style={{ color: '#c95b08', background: '#fff', border: '1.5px solid #e8690a' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                                >
                                    <Download className="w-4 h-4" />
                                    Unduh Backup
                                </button>
                            )}

                            <button
                                onClick={handleBackup}
                                disabled={backupStatus === 'loading'}
                                className={btnPrimary.base}
                                style={{ ...btnPrimary.style, border: '1.5px solid #c95b08' }}
                                onMouseEnter={e => { if (backupStatus !== 'loading') btnPrimary.hover(e); }}
                                onMouseLeave={btnPrimary.leave}
                            >
                                {backupStatus === 'loading' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Database className="w-4 h-4" />
                                )}
                                {backupStatus === 'loading' ? 'Memproses...' : 'Buat Backup'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────
          TAB: RESTORE DATA
      ────────────────────────────────────── */}
            {activeTab === 'restore' && (
                <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                    <div className="px-6 py-4" style={HEADER_GRAD}>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <FileUp size={18} />
                            Restore Hasil Backup Aplikasi e-Rapor
                        </h2>
                    </div>

                    <div className="p-6">
                        {/* ── Langkah-langkah ── */}
                        <div className="flex flex-col gap-2.5 mb-5">
                            <div className="flex items-start gap-2.5">
                                <div
                                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold mt-0.5"
                                    style={HEADER_GRAD}
                                >
                                    1
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Pilih file hasil backup dari komputer Anda — format <strong style={{ color: '#7a3a0a' }}>.sql</strong> atau <strong style={{ color: '#7a3a0a' }}>.zip</strong>.
                                </p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <div
                                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold mt-0.5"
                                    style={HEADER_GRAD}
                                >
                                    2
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Klik <strong style={{ color: '#7a3a0a' }}>Upload dan Restore Data e-Rapor</strong>, lalu tunggu hingga prosesnya selesai.
                                </p>
                            </div>
                        </div>

                        {/* ── Status sukses / error ── */}
                        {restoreStatus === 'success' && (
                            <div className="flex items-start gap-2.5 rounded-xl p-4 mb-5" style={{ background: '#eaf7ef', border: '1px solid #b6e8c8' }}>
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1a7a3a' }} />
                                <p className="text-sm whitespace-pre-line" style={{ color: '#1a7a3a' }}>{restoreMessage}</p>
                            </div>
                        )}
                        {restoreStatus === 'error' && (
                            <div className="rounded-xl p-4 mb-5" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                <p className="text-sm whitespace-pre-line" style={{ color: '#b91c1c' }}>{restoreMessage}</p>
                            </div>
                        )}

                        {/* ── File Picker ── */}
                        <div className="mb-6">
                            <p className="text-sm font-bold mb-2.5" style={{ color: '#7a3a0a' }}>
                                Pilih File Backup yang akan direstore
                            </p>

                            <div
                                className="flex items-stretch rounded-xl overflow-hidden w-full transition-colors"
                                style={{ border: '1px solid #fde0c8' }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#e8690a')}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#fde0c8')}
                            >
                                <label
                                    htmlFor="restore-file-input"
                                    className="flex items-center px-4 py-2.5 text-sm font-bold cursor-pointer whitespace-nowrap text-white"
                                    style={HEADER_GRAD}
                                >
                                    Choose File
                                </label>
                                <span className="flex items-center px-4 py-2.5 text-sm flex-1" style={{ color: '#9a3412', background: '#fffaf6' }}>
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
                                <p className="text-xs mt-1.5" style={{ color: '#c95b08' }}>
                                    Ukuran: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid #fde0c8' }} className="pt-5 flex justify-end">
                            <button
                                onClick={handleRestore}
                                disabled={restoreStatus === 'loading' || !selectedFile}
                                className={btnPrimary.base}
                                style={{ ...btnPrimary.style, border: '1.5px solid #c95b08' }}
                                onMouseEnter={e => { if (restoreStatus !== 'loading' && selectedFile) btnPrimary.hover(e); }}
                                onMouseLeave={btnPrimary.leave}
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
                </div>
            )}
        </div>
    );
}