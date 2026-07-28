/*
 * Nama File: backup_restore_client.tsx
 * Fungsi: Komponen klien untuk fitur backup dan restore database aplikasi.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Database, FileUp, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

/* ==========================================================================
   TIPE DATA
   ========================================================================== */

type Tab = 'backup' | 'restore';
type BackupStatus = 'idle' | 'loading' | 'ready' | 'error';
type RestoreStatus = 'idle' | 'loading' | 'success' | 'error';
type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'accent';

/* ==========================================================================
   KONSTANTA DAN DESIGN TOKENS
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg, #c95b08 0%, #e8690a 55%, #f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = {
    border: '0.0625rem solid #ececec',
    boxShadow: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05)'
};

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: {
        background: BRAND_GRADIENT,
        color: '#fff',
        border: '0.09375rem solid #c95b08',
        boxShadow: '0 0.125rem 0.5rem rgba(232, 105, 10, 0.25)'
    },
    info: {
        background: '#eff6ff',
        color: '#1d4ed8',
        border: '0.09375rem solid #bfdbfe'
    },
    warning: {
        background: '#facc15',
        color: '#78350f',
        border: '0.09375rem solid #eab308',
        boxShadow: '0 0.125rem 0.5rem rgba(234, 179, 8, 0.35)'
    },
    neutral: {
        background: '#fff',
        color: ACCENT_DARK,
        border: '0.09375rem solid #f0e0d0'
    },
    accent: {
        background: 'linear-gradient(135deg, #fff5eb 0%, #ffe3c2 55%, #fdd7a8 100%)',
        color: ACCENT_DARK,
        border: '0.09375rem solid #f0a94e',
        boxShadow: '0 0.125rem 0.5rem rgba(232, 105, 10, 0.18)'
    }
};

/* ==========================================================================
   KOMPONEN PENDUKUNG
   ========================================================================== */

/* Fungsi: Menyuntikkan animasi global dan style dasar untuk halaman ini. */
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(0.5rem); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .anim-in { animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.02s; }
        .d2 { animation-delay: 0.06s; }
        .d3 { animation-delay: 0.10s; }

        .card-flat { transition: box-shadow 0.2s ease; }
        .card-flat:hover { box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.06); }

        .btn-action { 
            transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease; 
        }
        .btn-action:hover { filter: brightness(1.04); }
        .btn-action:active { filter: brightness(0.98); }

        button:focus-visible, input:focus-visible {
            outline: 0.15625rem solid #f5a623;
            outline-offset: 0.125rem;
        }

        @media (prefers-reduced-motion: reduce) {
            .anim-in, .card-flat, .btn-action { animation: none !important; transition: none !important; }
        }
    `}</style>
);

/* Fungsi: Merender tombol aksi dengan varian warna yang konsisten. */
const ActionButton = ({
    onClick,
    children,
    variant = 'neutral',
    disabled = false,
    title
}: {
    onClick?: () => void;
    children: React.ReactNode;
    variant?: BtnVariant;
    disabled?: boolean;
    title?: string;
}) => (
    <button
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={`btn-action inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={VARIANT_BASE[variant]}
    >
        {children}
    </button>
);

/* ==========================================================================
   KOMPONEN UTAMA
   ========================================================================== */

export default function BackupRestoreClient() {
    const [activeTab, setActiveTab] = useState<Tab>('backup');
    const { showSessionExpired, handleLogout } = useSession();

    // State untuk proses backup
    const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle');
    const [backupBlobUrl, setBackupBlobUrl] = useState<string>('');
    const [backupFileName, setBackupFileName] = useState<string>('backup_erapor.sql');
    const [backupError, setBackupError] = useState<string>('');

    // State untuk proses restore
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>('idle');
    const [restoreMessage, setRestoreMessage] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    /* Fungsi: Mengganti tab antara backup dan restore. */
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
    };

    /* Fungsi: Memproses permintaan backup ke server. */
    const handleBackup = async () => {
        setBackupStatus('loading');
        setBackupError('');

        if (backupBlobUrl) {
            window.URL.revokeObjectURL(backupBlobUrl);
            setBackupBlobUrl('');
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Silakan login terlebih dahulu');
                return;
            }

            const res = await fetch('http://localhost:5000/api/admin/backup', {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error('Gagal melakukan backup data.');
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get('Content-Disposition');
            let fileName = `Backup_E-Rapor_${Date.now()}.zip`;

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

    /* Fungsi: Memicu unduhan file backup yang sudah siap. */
    const handleDownloadBackup = () => {
        if (!backupBlobUrl) return;

        const link = document.createElement('a');
        link.href = backupBlobUrl;
        link.download = backupFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /* Fungsi: Menangani perubahan saat user memilih file untuk restore. */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
        setRestoreStatus('idle');
        setRestoreMessage('');
    };

    /* Fungsi: Memproses upload dan restore file backup ke server. */
    const handleRestore = async () => {
        // Validasi keberadaan file
        if (!selectedFile) {
            setRestoreStatus('error');
            setRestoreMessage('⚠️ Pilih file backup terlebih dahulu.');
            return;
        }

        // Validasi ekstensi file
        const allowedExtensions = ['.sql', '.zip'];
        const fileExt = `.${selectedFile.name.split('.').pop()?.toLowerCase()}`;

        if (!allowedExtensions.includes(fileExt)) {
            setRestoreStatus('error');
            setRestoreMessage('❌ Format file tidak didukung.\n\nGunakan file .sql atau .zip (hasil backup dari sistem).');
            return;
        }

        // Validasi ukuran file (Maksimal 500MB)
        const maxSize = 500 * 1024 * 1024;
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
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
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

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Soft reset: hapus sesi dan redirect ke login agar data segar terbaca
            setTimeout(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('userRole');
                window.location.href = '/login?restored=true';
            }, 2500);

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
        }
    };

    /* ==========================================================================
       RENDER UI
       ========================================================================== */
    return (
        <div className="flex-1 p-3 sm:p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />

            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* Judul Halaman */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Backup &amp; Restore</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">
                    Kelola data cadangan aplikasi e-Rapor
                </p>
            </div>

            {/* Pengalih Tab */}
            <div className="card-flat bg-white rounded-2xl px-2 py-2 mb-4 flex items-center gap-2 w-fit anim-in d2" style={CARD_STYLE}>
                <button
                    onClick={() => handleTabChange('backup')}
                    className="btn-action flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={activeTab === 'backup'
                        ? { background: BRAND_GRADIENT, color: '#fff', boxShadow: '0 0.125rem 0.5rem rgba(232, 105, 10, 0.25)' }
                        : { color: ACCENT_DARK, background: 'transparent' }}
                    onMouseEnter={(e) => { if (activeTab !== 'backup') e.currentTarget.style.background = '#fff5eb'; }}
                    onMouseLeave={(e) => { if (activeTab !== 'backup') e.currentTarget.style.background = 'transparent'; }}
                >
                    <Database className="w-4 h-4" />
                    Backup Data
                </button>

                <button
                    onClick={() => handleTabChange('restore')}
                    className="btn-action flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={activeTab === 'restore'
                        ? { background: BRAND_GRADIENT, color: '#fff', boxShadow: '0 0.125rem 0.5rem rgba(232, 105, 10, 0.25)' }
                        : { color: ACCENT_DARK, background: 'transparent' }}
                    onMouseEnter={(e) => { if (activeTab !== 'restore') e.currentTarget.style.background = '#fff5eb'; }}
                    onMouseLeave={(e) => { if (activeTab !== 'restore') e.currentTarget.style.background = 'transparent'; }}
                >
                    <FileUp className="w-4 h-4" />
                    Restore Data
                </button>
            </div>

            {/* Konten Tab: Backup Data */}
            {activeTab === 'backup' && (
                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                    <div className="px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                            <Database size="1.125rem" />
                            Backup Data Aplikasi e-Rapor
                        </h2>
                    </div>

                    <div className="p-4 sm:p-6">
                        {/* Kotak Informasi */}
                        <div
                            className="flex items-start gap-2.5 rounded-xl p-3.5 mb-4"
                            style={{ background: '#fef9c3', border: '0.0625rem solid #fde68a' }}
                        >
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#92400e' }} />
                            <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
                                Untuk keamanan, lakukan backup data secara rutin dan simpan hasilnya di tempat yang aman.
                                Klik tombol <strong>Backup Data</strong> di bawah ini, lalu tunggu hingga proses selesai.
                            </p>
                        </div>

                        {/* Status Sukses Backup */}
                        {backupStatus === 'ready' && (
                            <div className="flex items-center gap-2.5 rounded-xl p-3.5 mb-4" style={{ background: '#dcfce7', border: '0.0625rem solid #86efac' }}>
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#166534' }} />
                                <p className="text-sm font-medium" style={{ color: '#166534' }}>
                                    Data berhasil dibackup. Klik <strong>Unduh Backup</strong> untuk menyimpan file.
                                </p>
                            </div>
                        )}

                        {/* Status Error Backup */}
                        {backupStatus === 'error' && (
                            <div className="rounded-xl p-4 mb-4" style={{ background: '#fef2f2', border: '0.0625rem solid #fecaca' }}>
                                <p className="text-sm" style={{ color: '#b91c1c' }}>{backupError}</p>
                            </div>
                        )}

                        {/* Tombol Aksi Backup */}
                        <div className="pt-5 flex flex-col sm:flex-row justify-end gap-2.5 border-t" style={{ borderColor: '#f0e0d0' }}>
                            {backupStatus === 'ready' && (
                                <ActionButton variant="neutral" onClick={handleDownloadBackup}>
                                    <Download className="w-4 h-4" />
                                    Unduh Backup
                                </ActionButton>
                            )}

                            <ActionButton variant="primary" disabled={backupStatus === 'loading'} onClick={handleBackup}>
                                {backupStatus === 'loading' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Database className="w-4 h-4" />
                                )}
                                {backupStatus === 'loading' ? 'Memproses...' : 'Buat Backup'}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Konten Tab: Restore Data */}
            {activeTab === 'restore' && (
                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                    <div className="px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                            <FileUp size="1.125rem" />
                            Restore Hasil Backup Aplikasi e-Rapor
                        </h2>
                    </div>

                    <div className="p-4 sm:p-6">
                        {/* Langkah-langkah */}
                        <div className="flex flex-col gap-2.5 mb-5">
                            <div className="flex items-start gap-2.5">
                                <div
                                    className="w-[1.375rem] h-[1.375rem] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold mt-0.5"
                                    style={{ background: BRAND_GRADIENT, fontSize: '0.6875rem' }}
                                >
                                    1
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Pilih file hasil backup dari komputer Anda — format <strong style={{ color: '#7a3a0a' }}>.sql</strong> atau <strong style={{ color: '#7a3a0a' }}>.zip</strong>.
                                </p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <div
                                    className="w-[1.375rem] h-[1.375rem] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold mt-0.5"
                                    style={{ background: BRAND_GRADIENT, fontSize: '0.6875rem' }}
                                >
                                    2
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Klik <strong style={{ color: '#7a3a0a' }}>Upload dan Restore Data e-Rapor</strong>, lalu tunggu hingga prosesnya selesai.
                                </p>
                            </div>
                        </div>

                        {/* Status Sukses / Error Restore */}
                        {restoreStatus === 'success' && (
                            <div className="flex items-start gap-2.5 rounded-xl p-4 mb-5" style={{ background: '#dcfce7', border: '0.0625rem solid #86efac' }}>
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#166534' }} />
                                <p className="text-sm whitespace-pre-line" style={{ color: '#166534' }}>{restoreMessage}</p>
                            </div>
                        )}
                        {restoreStatus === 'error' && (
                            <div className="rounded-xl p-4 mb-5" style={{ background: '#fef2f2', border: '0.0625rem solid #fecaca' }}>
                                <p className="text-sm whitespace-pre-line" style={{ color: '#b91c1c' }}>{restoreMessage}</p>
                            </div>
                        )}

                        {/* Pemilih File */}
                        <div className="mb-6">
                            <p className="text-sm font-bold mb-2.5" style={{ color: '#7a3a0a' }}>
                                Pilih File Backup yang akan direstore
                            </p>

                            <div
                                className="flex items-stretch rounded-xl overflow-hidden w-full transition-colors"
                                style={{ border: '0.0625rem solid #ececec' }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#ececec')}
                            >
                                <label
                                    htmlFor="restore-file-input"
                                    className="flex items-center px-4 py-2.5 text-sm font-bold cursor-pointer whitespace-nowrap text-white"
                                    style={{ background: BRAND_GRADIENT }}
                                >
                                    Choose File
                                </label>
                                <span className="flex items-center px-4 py-2.5 text-sm flex-1 text-gray-600" style={{ background: '#fafafa' }}>
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
                                <p className="text-xs mt-1.5 text-gray-500">
                                    Ukuran: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            )}
                        </div>

                        {/* Tombol Aksi Restore */}
                        <div className="pt-5 flex justify-end border-t" style={{ borderColor: '#f0e0d0' }}>
                            <ActionButton variant="primary" disabled={restoreStatus === 'loading' || !selectedFile} onClick={handleRestore}>
                                {restoreStatus === 'loading' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                {restoreStatus === 'loading' ? 'Memproses...' : 'Upload dan Restore Data e-Rapor'}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}