'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Database, FileText, FileUp, Loader2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, X } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Tab          = 'backup' | 'restore';
type BackupStatus = 'idle' | 'loading' | 'ready' | 'error';
type RestoreStatus = 'idle' | 'loading' | 'success' | 'error';
type ModalType    = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes br-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes br-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes br-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .br-fadeIn  { animation: br-fadeIn  0.2s ease; }
    .br-scaleIn { animation: br-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .br-pulse   { animation: br-pulse   0.6s ease 0.15s; }
  `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
    error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 br-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 br-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} br-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
            </div>
        </div>
    );
};

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────

const ConfirmModal = ({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 br-fadeIn">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 br-scaleIn">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 br-pulse">
                <ShieldAlert size={40} className="text-orange-500" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi</h3>
                <p className="text-sm text-gray-500 leading-relaxed mt-2 whitespace-pre-line">{message}</p>
            </div>
            <div className="flex gap-3 w-full">
                <button onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
                    style={{ borderColor: '#fde0c8', color: '#7a3a0a' }}>
                    Batal
                </button>
                <button onClick={onConfirm}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm"
                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}>
                    Ya, Lanjutkan
                </button>
            </div>
        </div>
    </div>
);

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG     = { background: '#fdf6f0' };
const CARD_STYLE  = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const btnPrimary = {
    base:  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BackupRestoreClient() {
    const [activeTab, setActiveTab] = useState<Tab>('backup');

    // ── Backup state ──
    const [backupStatus,   setBackupStatus]   = useState<BackupStatus>('idle');
    const [backupBlobUrl,  setBackupBlobUrl]   = useState<string>('');
    const [backupFileName, setBackupFileName]  = useState<string>('backup_erapor.sql');

    // ── Restore state ──
    const [selectedFile,   setSelectedFile]   = useState<File | null>(null);
    const [restoreStatus,  setRestoreStatus]  = useState<RestoreStatus>('idle');

    // ── Modal state ──
    const [modal,      setModal]      = useState<ModalConfig | null>(null);
    const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const showModal   = (cfg: ModalConfig) => setModal(cfg);
    const closeModal  = () => setModal(null);
    const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── BACKUP ─────────────────────────────────────────────────────────────────
    const handleBackup = async () => {
        setBackupStatus('loading');
        if (backupBlobUrl) { window.URL.revokeObjectURL(backupBlobUrl); setBackupBlobUrl(''); }
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); setBackupStatus('idle'); return; }

            const res = await fetch('http://localhost:5000/api/admin/backup', {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Gagal melakukan backup data.');

            const blob               = await res.blob();
            const contentDisposition = res.headers.get('Content-Disposition');
            const fileName           = contentDisposition
                ? (contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'backup_erapor.sql')
                : 'backup_erapor.sql';

            setBackupBlobUrl(window.URL.createObjectURL(blob));
            setBackupFileName(fileName);
            setBackupStatus('ready');
        } catch (err: any) {
            showModal({ type: 'error', title: 'Backup Gagal', message: err.message || 'Terjadi kesalahan saat backup.' });
            setBackupStatus('error');
        }
    };

    const handleDownloadBackup = () => {
        if (!backupBlobUrl) return;
        const link    = document.createElement('a');
        link.href     = backupBlobUrl;
        link.download = backupFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── RESTORE ────────────────────────────────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(e.target.files?.[0] || null);
        setRestoreStatus('idle');
    };

    const handleRestore = async () => {
        if (!selectedFile) { showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file backup terlebih dahulu.' }); return; }
        setRestoreStatus('loading');
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); setRestoreStatus('idle'); return; }

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
            showModal({ type: 'success', title: 'Restore Berhasil!', message: 'Data berhasil direstore dari file backup.' });
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            setRestoreStatus('error');
            showModal({ type: 'error', title: 'Restore Gagal', message: err.message || 'Terjadi kesalahan saat restore.' });
        }
    };

    // ── RENDER ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal      && <NotifModal modal={modal} onClose={closeModal} />}
            {confirmCfg && (
                <ConfirmModal
                    message={confirmCfg.message}
                    onConfirm={() => { confirmCfg.onConfirm(); setConfirmCfg(null); }}
                    onCancel={() => setConfirmCfg(null)}
                />
            )}

            {/* Page Title */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Backup &amp; Restore</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola backup dan restore data aplikasi e-Rapor</p>
            </div>

            {/* ── CARD UTAMA ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Card Header */}
                <div className="px-6 py-4" style={HEADER_GRAD}>
                    <h2 className="text-base font-bold text-white">Manajemen Data</h2>
                </div>

                {/* ── TAB NAVIGATION ──────────────────────────────────────── */}
                <div className="px-6 pt-4" style={{ borderBottom: '1px solid #fde0c8' }}>
                    <div className="flex gap-1">
                        {([
                            { key: 'backup',  label: 'Backup Data',  Icon: Database },
                            { key: 'restore', label: 'Restore Data', Icon: FileUp   },
                        ] as { key: Tab; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all"
                                style={activeTab === key
                                    ? { background: '#fff7ed', color: '#c95b08', borderTop: '2px solid #e8690a', borderLeft: '1px solid #fde0c8', borderRight: '1px solid #fde0c8' }
                                    : { color: '#9a7a6a', background: 'transparent' }}
                            >
                                <Icon size={15} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── TAB CONTENT ─────────────────────────────────────────── */}
                <div className="p-6">

                    {/* ════════════ TAB: BACKUP ════════════ */}
                    {activeTab === 'backup' && (
                        <div>
                            <h2 className="text-base font-bold text-gray-900 mb-1">Backup Data Aplikasi e-Rapor</h2>
                            <div className="mb-5" style={{ borderBottom: '1px solid #fde0c8' }} />

                            {/* Info teks */}
                            <div className="mb-5 p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                <p className="text-sm mb-2" style={{ color: '#7a3a0a' }}>
                                    Untuk keamanan, silahkan lakukan proses backup data secara rutin dan simpan hasil backup Anda pada tempat yang aman.
                                </p>
                                <p className="text-sm" style={{ color: '#7a3a0a' }}>
                                    Klik tombol <strong>Backup Data</strong> di bawah, tunggu hingga proses selesai, lalu unduh hasilnya.
                                </p>
                            </div>

                            {/* Hasil backup siap diunduh */}
                            {backupStatus === 'ready' && (
                                <div className="mb-5 p-4 rounded-xl" style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
                                    <p className="text-sm font-semibold mb-3" style={{ color: '#15803d' }}>
                                        ✓ Backup berhasil dibuat! Klik tombol di bawah untuk mengunduh.
                                    </p>
                                    <button
                                        onClick={handleDownloadBackup}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
                                        style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.25)' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}>
                                        <FileText size={15} /> Unduh Hasil Backup
                                    </button>
                                </div>
                            )}

                            <div className="mb-5" style={{ borderBottom: '1px solid #fde0c8' }} />

                            <div className="flex justify-end">
                                <button
                                    onClick={handleBackup}
                                    disabled={backupStatus === 'loading'}
                                    className={btnPrimary.base}
                                    style={btnPrimary.style}
                                    onMouseEnter={btnPrimary.hover}
                                    onMouseLeave={btnPrimary.leave}>
                                    {backupStatus === 'loading'
                                        ? <><Loader2 size={15} className="animate-spin" /> Memproses...</>
                                        : <><Download size={15} /> Backup Data</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ════════════ TAB: RESTORE ════════════ */}
                    {activeTab === 'restore' && (
                        <div>
                            <h2 className="text-base font-bold text-gray-900 mb-1">Restore Hasil Backup Aplikasi e-Rapor</h2>
                            <div className="mb-5" style={{ borderBottom: '1px solid #fde0c8' }} />

                            {/* Info teks */}
                            <div className="mb-5 p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                <p className="text-sm" style={{ color: '#7a3a0a' }}>
                                    Pilih file hasil backup (<strong>.sql</strong>, <strong>.zip</strong>, atau <strong>.gz</strong>) yang akan direstore,
                                    kemudian klik tombol <strong>Upload dan Restore</strong>.
                                </p>
                            </div>

                            <div className="mb-5" style={{ borderBottom: '1px solid #fde0c8' }} />

                            {/* File Picker */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold mb-2" style={{ color: '#7a3a0a' }}>
                                    Pilih File Backup
                                </label>

                                <label
                                    htmlFor="restore-file-input"
                                    className="flex items-stretch rounded-xl overflow-hidden cursor-pointer"
                                    style={{ border: '1px solid #fde0c8' }}>
                                    {/* Tombol "Pilih File" */}
                                    <span
                                        className="flex items-center px-4 py-2.5 text-sm font-bold text-white whitespace-nowrap"
                                        style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}>
                                        <Upload size={14} className="mr-2" /> Pilih File
                                    </span>
                                    {/* Nama file */}
                                    <span className="flex items-center px-4 py-2.5 text-sm flex-1"
                                        style={{ background: '#fffaf6', color: selectedFile ? '#374151' : '#9ca3af' }}>
                                        {selectedFile ? selectedFile.name : 'Belum ada file dipilih'}
                                    </span>
                                    <input
                                        id="restore-file-input"
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".sql,.zip,.gz"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>

                                {selectedFile && (
                                    <p className="text-xs mt-1.5 font-medium" style={{ color: '#c95b08' }}>
                                        Ukuran: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                )}
                            </div>

                            <div className="mb-5" style={{ borderBottom: '1px solid #fde0c8' }} />

                            <div className="flex justify-end">
                                <button
                                    onClick={() => showConfirm(
                                        '⚠️ PERHATIAN!\n\nProses restore akan menimpa seluruh data yang ada saat ini.\n\nPastikan file backup yang dipilih sudah benar sebelum melanjutkan.',
                                        handleRestore
                                    )}
                                    disabled={restoreStatus === 'loading' || !selectedFile}
                                    className={btnPrimary.base}
                                    style={btnPrimary.style}
                                    onMouseEnter={btnPrimary.hover}
                                    onMouseLeave={btnPrimary.leave}>
                                    {restoreStatus === 'loading'
                                        ? <><Loader2 size={15} className="animate-spin" /> Memproses...</>
                                        : <><Upload size={15} /> Upload dan Restore Data e-Rapor</>}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}