'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText, Download, AlertCircle, CheckCircle2,
    WifiOff, ShieldAlert, X, School, Lock, Play, Pause, Users, LogOut, Info,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

type StatusPenilaian = 'nonaktif' | 'aktif' | 'selesai';

interface Siswa {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
}

interface TahunAjaranInfo {
    id_tahun_ajaran: number;
    id_tahun_ajaran_induk: number;
    tahun_ajaran: string;
    semester: 'Ganjil' | 'Genap';
    status_pts: StatusPenilaian;
    status_pas: StatusPenilaian;
}

/* ==========================================================================
   DESIGN TOKENS — disamakan penuh dengan design system terbaru
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

/* ==========================================================================
   GLOBAL STYLES — identik dengan design system terbaru
   ========================================================================== */

const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
    @keyframes dg-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .dg-fadeIn  { animation: dg-fadeIn  0.18s ease; }
    .dg-scaleIn { animation: dg-scaleIn 0.22s cubic-bezier(0.4,0,0.2,1); }
    .dg-pulse   { animation: dg-pulse   0.6s ease 0.1s; }
    .dg-shimmer {
        background: linear-gradient(90deg, #f7f7f7 0%, #efefef 50%, #f7f7f7 100%);
        background-size: 800px 100%;
        animation: dg-shimmer 1.3s ease-in-out infinite;
    }
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0);   }
    }
    .anim-in { animation: fadeInUp 0.35s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
    .d1 { animation-delay: 0.02s; }
    .d2 { animation-delay: 0.06s; }
    .d3 { animation-delay: 0.10s; }
    .d4 { animation-delay: 0.14s; }
    .d5 { animation-delay: 0.18s; }
    .d6 { animation-delay: 0.22s; }
    .row-in { animation: fadeInUp 0.28s ease forwards; opacity: 0; }

    .card-flat { transition: box-shadow 0.2s ease; }
    .card-flat:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

    .row-hover { position: relative; transition: background-color 0.15s ease; }
    .row-hover::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
        background: ${BRAND_GRADIENT}; transform: scaleY(0); transition: transform 0.16s ease;
    }
    .row-hover:hover::before { transform: scaleY(1); }

    .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease; }
    .btn-action:hover  { filter: brightness(1.04); }
    .btn-action:active { filter: brightness(0.98); }

    .scrollbar-thin::-webkit-scrollbar { width: 5px; height: 5px; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: #f0c9a0; border-radius: 10px; }

    button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
        outline: 2.5px solid #f5a623;
        outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        .anim-in, .row-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .dg-shimmer, .btn-action, .card-flat, .row-hover {
            animation: none !important;
            transition: none !important;
        }
    }
  `}</style>
);

/* ==========================================================================
   NOTIFICATION MODAL — identik dengan design system terbaru
   ========================================================================== */

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <button
                    onClick={onClose}
                    aria-label="Tutup"
                    className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <X size={18} />
                </button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>
                    {s.icon}
                </div>
                <div className="text-center w-full">
                    <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>
                    OK, Mengerti
                </button>
            </div>
        </div>
    );
};

/* ==========================================================================
   SISTEM TOMBOL AKSI — identik dengan design system terbaru
   ========================================================================== */

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
    accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
};

const ActionButton = ({
    onClick, children, variant = 'neutral', size = 'md', disabled = false, type = 'button', fullWidth = false, title,
}: {
    onClick?: () => void; children: React.ReactNode; variant?: BtnVariant; size?: 'md' | 'sm';
    disabled?: boolean; type?: 'button' | 'submit'; fullWidth?: boolean; title?: string;
}) => {
    const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
    return (
        <button
            type={type}
            title={title}
            onClick={onClick}
            disabled={disabled}
            className={`btn-action inline-flex items-center justify-center gap-1.5 rounded-xl font-bold whitespace-nowrap ${pad} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            style={VARIANT_BASE[variant]}
        >
            {children}
        </button>
    );
};

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const getStatusStyle = (status: StatusPenilaian) => {
    switch (status) {
        case 'aktif':
            return {
                bg: '#dcfce7', color: '#166534', border: '#86efac',
                dot: '#22c55e', text: 'Aktif (Bisa Download)',
                icon: <Play size={14} />
            };
        case 'selesai':
            return {
                bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db',
                dot: '#9ca3af', text: 'Selesai (Terkunci)',
                icon: <Lock size={14} />
            };
        case 'nonaktif':
        default:
            return {
                bg: '#fef3c7', color: '#92400e', border: '#fcd34d',
                dot: '#eab308', text: 'Belum Dibuka',
                icon: <Pause size={14} />
            };
    }
};

const StatusBadge = ({ status }: { status: StatusPenilaian | null }) => {
    if (!status) return null;
    const s = getStatusStyle(status);
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.dot }} />
            {s.icon}
            {s.text}
        </span>
    );
};

// ─── HELPER: Sanitasi Nama File ───────────────────────────────────────────────

/**
 * Sanitasi string untuk nama file
 * - Ganti "/" dengan "-" (untuk tahun ajaran)
 * - Pertahankan spasi (untuk nama kelas)
 * - Hanya hapus karakter yang benar-benar ilegal di file system
 */
const sanitizeFileName = (str: string): string => {
    if (!str) return '';
    return str
        .replace(/\//g, '-')           // Ganti "/" dengan "-"
        .replace(/[\\:*?"<>|]/g, '_')  // Hanya hapus karakter ilegal
        .trim();
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const RaporGuruKelasClient = () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const { showSessionExpired, handleLogout } = useSession();
    const [tahunAjaranInfo, setTahunAjaranInfo] = useState<TahunAjaranInfo | null>(null);
    const [selectedJenis, setSelectedJenis] = useState<'PTS' | 'PAS' | ''>('');
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingSiswa, setLoadingSiswa] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    // 🆕 BARU: State untuk download semua rapor
    const [downloadingAll, setDownloadingAll] = useState<boolean>(false);

    // ✅ KONDISI 1: Belum ditugaskan
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    // ✅ KONDISI 2: Read-Only mode (periode belum aktif)
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // ✅ PERBAIKAN: State untuk nama kelas
    const [namaKelas, setNamaKelas] = useState<string>('');

    // === Fetch tahun ajaran aktif ===
    const fetchTahunAjaranAktif = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                return;
            }

            const res = await fetch(`${API_BASE}/guru-kelas/tahun-ajaran/aktif`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (res.ok && data.success) {
                const ta = data.data;
                setTahunAjaranInfo({
                    id_tahun_ajaran: ta.id_tahun_ajaran,
                    id_tahun_ajaran_induk: ta.id_tahun_ajaran_induk,
                    tahun_ajaran: ta.tahun_ajaran,
                    semester: ta.semester as 'Ganjil' | 'Genap',
                    status_pts: ta.status_pts as StatusPenilaian,
                    status_pas: ta.status_pas as StatusPenilaian,
                });

                const statusPts = ta.status_pts as StatusPenilaian;
                const statusPas = ta.status_pas as StatusPenilaian;

                if (statusPts === 'aktif' || statusPas === 'aktif') {
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (statusPts === 'selesai' || statusPas === 'selesai') {
                    setIsReadOnly(true);
                    setReadOnlyReason('locked');
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: 'Periode Penilaian Selesai',
                            message: 'Periode penilaian telah selesai.\n\nRapor yang sudah selesai dapat diunduh, tetapi data nilai tidak dapat diubah lagi.'
                        });
                    }, 500);
                } else {
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: 'Periode Penilaian Belum Aktif',
                            message: 'Baik PTS maupun PAS belum dibuka oleh admin.\n\nAnda belum dapat mengunduh rapor siswa.\n\nSilakan hubungi admin untuk membuka periode penilaian.'
                        });
                    }, 500);
                }
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal mengambil tahun ajaran aktif.' });
            }
        } catch (err: any) {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    };

    // === Fetch daftar siswa ===
    const fetchSiswaList = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            setLoadingSiswa(true);
            const res = await fetch(`${API_BASE}/guru-kelas/siswa`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setSiswaList(data.data || []);

                // ✅ PERBAIKAN: Tambahkan data.kelas_nama (dari kelasController.js)
                const namaKelasDariResponse =
                    data.kelas_nama ||           // ← TAMBAHKAN INI! (dari /siswa endpoint)
                    data.kelas ||                // (dari /absensi endpoint)
                    data.nama_kelas ||
                    data.data?.kelas ||
                    data.data?.nama_kelas ||
                    'Kelas';

                setNamaKelas(namaKelasDariResponse);
                setIsNotAssigned(false);
            } else {
                const errCode = data.code;
                if (errCode === 'NOT_ASSIGNED') {
                    setIsNotAssigned(true);
                } else {
                    setSiswaList([]);
                    showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal memuat data siswa.' });
                }
            }
        } catch (err) {
            setSiswaList([]);
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoadingSiswa(false);
        }
    };

    useEffect(() => {
        fetchTahunAjaranAktif();
    }, []);

    useEffect(() => {
        if (selectedJenis) {
            fetchSiswaList();
        } else {
            setSiswaList([]);
        }
    }, [selectedJenis]);

    // === Helper: status penilaian saat ini ===
    const getCurrentStatus = (): StatusPenilaian | null => {
        if (!selectedJenis || !tahunAjaranInfo) return null;
        return selectedJenis === 'PTS' ? tahunAjaranInfo.status_pts : tahunAjaranInfo.status_pas;
    };

    // === Unduh rapor (per siswa) ===
    const handleDownloadRapor = async (siswaId: number, namaSiswa: string, nisn: string) => {
        if (isReadOnly && readOnlyReason === 'not_open') {
            showModal({
                type: 'warning',
                title: 'Mode Baca-Saja',
                message: 'Periode penilaian belum aktif.\n\nAnda belum dapat mengunduh rapor siswa.\n\nSilakan tunggu admin membuka periode penilaian.'
            });
            return;
        }

        const token = localStorage.getItem('token');
        if (!token || !selectedJenis || !tahunAjaranInfo) {
            showModal({ type: 'warning', title: 'Data Tidak Lengkap', message: 'Silakan pilih jenis penilaian terlebih dahulu.' });
            return;
        }

        setDownloadingId(siswaId);
        try {
            const semester = tahunAjaranInfo.semester.toLowerCase();
            const res = await fetch(
                `${API_BASE}/guru-kelas/generate-rapor/${siswaId}/${selectedJenis}/${semester}/${tahunAjaranInfo.id_tahun_ajaran}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Gagal mengunduh rapor (HTTP ${res.status})`);
            }

            const blob = await res.blob();

            // ✅ Format nama file: Rapor_PTS_Ganjil_2024-2025_NamaSiswa_NISN.docx
            const cleanTahunAjaran = sanitizeFileName(tahunAjaranInfo.tahun_ajaran || '');
            const cleanNisn = (nisn || String(siswaId)).replace(/[^0-9]/g, '');
            const cleanNama = namaSiswa.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
            const fileName = `Rapor_${selectedJenis}_${tahunAjaranInfo.semester}_${cleanTahunAjaran}_${cleanNama}_${cleanNisn}.docx`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showModal({
                type: 'success',
                title: 'Berhasil Diunduh',
                message: `Rapor ${selectedJenis} untuk ${namaSiswa} berhasil diunduh.\n\nFile: ${fileName}`
            });
        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Mengunduh',
                message: err.message || 'Terjadi kesalahan saat mengunduh rapor.'
            });
        } finally {
            setDownloadingId(null);
        }
    };

    // 🆕 BARU: Unduh semua rapor sekaligus (ZIP)
    const handleDownloadAllRapor = async () => {
        if (isReadOnly && readOnlyReason === 'not_open') {
            showModal({
                type: 'warning',
                title: 'Mode Baca-Saja',
                message: 'Periode penilaian belum aktif.\n\nAnda belum dapat mengunduh rapor siswa.\n\nSilakan tunggu admin membuka periode penilaian.'
            });
            return;
        }

        const token = localStorage.getItem('token');
        if (!token || !selectedJenis || !tahunAjaranInfo || siswaList.length === 0) {
            showModal({
                type: 'warning',
                title: 'Data Tidak Lengkap',
                message: 'Tidak ada data siswa untuk diunduh.'
            });
            return;
        }

        setDownloadingAll(true);
        try {
            // ✅ PERBAIKAN: Ambil data kelas terbaru dari API
            const resKelas = await fetch(`${API_BASE}/guru-kelas/siswa`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataKelas = await resKelas.json();

            // ✅ PERBAIKAN: Tambahkan dataKelas.kelas_nama
            const namaKelasAktual =
                dataKelas.kelas_nama ||        // ← TAMBAHKAN INI!
                dataKelas.kelas ||
                dataKelas.nama_kelas ||
                dataKelas.data?.kelas ||
                dataKelas.data?.nama_kelas ||
                'Kelas';

            const semester = tahunAjaranInfo.semester.toLowerCase();
            const res = await fetch(
                `${API_BASE}/guru-kelas/generate-rapor-bulk/${selectedJenis}/${semester}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Gagal mengunduh rapor (HTTP ${res.status})`);
            }

            const blob = await res.blob();

            // ✅ PERBAIKAN: Format nama file ZIP dengan nama kelas yang benar
            const cleanTahunAjaran = sanitizeFileName(tahunAjaranInfo.tahun_ajaran || '');
            const cleanKelas = sanitizeFileName(namaKelasAktual);

            const fileName = `Rapor_${selectedJenis}_${tahunAjaranInfo.semester}_${cleanTahunAjaran}_${cleanKelas}.zip`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showModal({
                type: 'success',
                title: 'Berhasil Diunduh',
                message: `Semua rapor ${selectedJenis} (${siswaList.length} siswa) berhasil diunduh dalam satu file ZIP.\n\nFile: ${fileName}\n\nSilakan extract file ZIP untuk membuka rapor masing-masing siswa.`
            });
        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Mengunduh',
                message: err.message || 'Terjadi kesalahan saat mengunduh semua rapor.'
            });
        } finally {
            setDownloadingAll(false);
        }
    };

    // === Derived state ===
    const currentStatus = getCurrentStatus();
    const isDownloadAllowed = currentStatus === 'aktif' || currentStatus === 'selesai';

    // ── Loading state ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-1 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-semibold" style={{ color: ACCENT_DARK }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    // ✅ KONDISI 1: Belum Ditugaskan → Blokir Total
    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn" style={CARD_STYLE}>
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Anda belum ditugaskan sebagai guru kelas di semester ini.
                                <br />
                                Silakan hubungi Administrator untuk penugasan kelas.
                            </p>
                        </div>
                        <ActionButton variant="primary" fullWidth onClick={handleLogout}>
                            <LogOut size={16} /> Logout
                        </ActionButton>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* HEADER */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cetak Rapor</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Unduh rapor siswa dalam format Microsoft Word</p>
            </div>

            {/* ✅ BANNER READ-ONLY (KONDISI 2) */}
            {isReadOnly && (
                <div className="mb-5 rounded-2xl overflow-hidden card-flat anim-in d2" style={{ border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}` }}>
                    <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: readOnlyReason === 'locked' ? '#fee2e2' : '#fef3c7' }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: readOnlyReason === 'locked' ? '#fecaca' : '#fde68a' }}>
                            <Lock size={18} className={readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'} />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>Mode Baca-Saja (Read-Only)</p>
                            <p className={`text-xs mt-0.5 ${readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'}`}>
                                {readOnlyReason === 'locked'
                                    ? 'Periode penilaian telah selesai. Rapor yang sudah selesai dapat diunduh, tetapi data nilai tidak dapat diubah lagi.'
                                    : 'Periode penilaian belum aktif. Anda belum dapat mengunduh rapor siswa. Silakan hubungi admin untuk membuka periode penilaian.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* KARTU KELAS */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden mb-4 anim-in d2" style={CARD_STYLE}>
                <div className="px-4 sm:px-6 py-5" style={{ background: BRAND_GRADIENT }}>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div><h2 className="text-xl font-bold text-white">Cetak Rapor Siswa</h2></div>
                    </div>
                </div>

                {/* Tab Toggle PTS/PAS */}
                <div className="px-4 sm:px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Jenis Penilaian:</span>
                            <div className="flex gap-1 bg-white rounded-xl p-1" style={{ border: '1px solid #fde0c8' }}>
                                <button
                                    onClick={() => setSelectedJenis('PTS')}
                                    className="btn-action px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{
                                        background: selectedJenis === 'PTS' ? BRAND_GRADIENT : 'transparent',
                                        color: selectedJenis === 'PTS' ? '#fff' : '#7a3a0a'
                                    }}
                                >
                                    PTS
                                </button>
                                <button
                                    onClick={() => setSelectedJenis('PAS')}
                                    className="btn-action px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{
                                        background: selectedJenis === 'PAS' ? BRAND_GRADIENT : 'transparent',
                                        color: selectedJenis === 'PAS' ? '#fff' : '#7a3a0a'
                                    }}
                                >
                                    PAS
                                </button>
                            </div>
                        </div>

                        {/* Status Badge */}
                        {selectedJenis && currentStatus && (
                            <StatusBadge status={currentStatus} />
                        )}
                    </div>

                    {selectedJenis && (
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" style={{ color: ACCENT_DARK }} />
                                <span className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>Total: {siswaList.length} siswa</span>
                            </div>

                            {/* 🆕 BARU: Tombol Download Semua Rapor */}
                            {isDownloadAllowed && siswaList.length > 0 && (
                                <ActionButton variant="success" disabled={downloadingAll} onClick={handleDownloadAllRapor}>
                                    {downloadingAll ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-current/40 border-t-current animate-spin" />
                                            Membuat ZIP...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} />
                                            Download Semua ({siswaList.length})
                                        </>
                                    )}
                                </ActionButton>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Konten */}
            {!selectedJenis ? (
                <div className="card-flat bg-white rounded-2xl anim-in d3" style={CARD_STYLE}>
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#fff5eb', border: '1.5px dashed #f0a94e' }}>
                            <FileText size={26} style={{ color: ACCENT }} />
                        </div>
                        <p className="text-sm font-bold" style={{ color: ACCENT_DARK }}>Silakan pilih jenis penilaian</p>
                    </div>
                </div>
            ) : loadingSiswa ? (
                <div className="card-flat bg-white rounded-2xl anim-in d3" style={CARD_STYLE}>
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin" />
                        <p className="text-sm text-gray-400">Memuat daftar siswa...</p>
                    </div>
                </div>
            ) : siswaList.length === 0 ? (
                <div className="card-flat bg-white rounded-2xl anim-in d3" style={CARD_STYLE}>
                    <div className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Users size={32} className="text-gray-300" />
                            <p className="text-sm font-semibold text-gray-500">Tidak ada siswa di kelas Anda.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* TABEL — CSS grid, konsisten dengan design system terbaru */}
                    <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                        <div className="overflow-x-auto scrollbar-thin">
                            <div style={{ width: '100%', minWidth: '640px' }}>
                                <div className="grid" style={{ gridTemplateColumns: 'minmax(48px,0.5fr) minmax(180px,2.4fr) minmax(100px,0.9fr) minmax(110px,0.9fr) minmax(140px,1.1fr)', background: BRAND_GRADIENT }}>
                                    {['No.', 'Nama Siswa', 'NIS', 'NISN', 'Aksi'].map((h, i) => (
                                        <div key={i} className="px-5 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">
                                            {h}
                                        </div>
                                    ))}
                                </div>

                                {siswaList.map((siswa, index) => (
                                    <div
                                        key={siswa.id}
                                        className="grid row-in row-hover border-b transition-colors"
                                        style={{
                                            gridTemplateColumns: 'minmax(48px,0.5fr) minmax(180px,2.4fr) minmax(100px,0.9fr) minmax(110px,0.9fr) minmax(140px,1.1fr)',
                                            borderColor: '#f0f0f0',
                                            background: '#fff',
                                            animationDelay: `${Math.min(index, 8) * 0.03}s`,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                    >
                                        <div className="px-5 py-4 flex items-center justify-center text-center text-gray-400">{index + 1}</div>
                                        <div className="px-5 py-4 flex items-center overflow-hidden">
                                            <p className="font-bold text-gray-900 truncate" title={siswa.nama}>{siswa.nama}</p>
                                        </div>
                                        <div className="px-5 py-4 flex items-center justify-center text-center text-gray-600 font-mono text-xs">{siswa.nis}</div>
                                        <div className="px-5 py-4 flex items-center justify-center text-center text-gray-600 font-mono text-xs">{siswa.nisn || '—'}</div>
                                        <div className="px-5 py-4 flex items-center justify-center">
                                            {isDownloadAllowed ? (
                                                <ActionButton size="sm" variant="success" disabled={downloadingId === siswa.id} onClick={() => handleDownloadRapor(siswa.id, siswa.nama, siswa.nisn)}>
                                                    {downloadingId === siswa.id ? (
                                                        <>
                                                            <div className="w-3 h-3 rounded-full border border-current/40 border-t-current animate-spin" />
                                                            Mengunduh...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download size={13} />
                                                            Unduh
                                                        </>
                                                    )}
                                                </ActionButton>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: '#f3f4f6', border: '1.5px solid #d1d5db', color: '#9ca3af' }}>
                                                    <Lock size={13} />
                                                    Terkunci
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Warning jika tidak aktif */}
                        {!isDownloadAllowed && (
                            <div className="mx-4 sm:mx-5 my-4 p-3 rounded-xl text-xs font-medium flex items-start gap-2" style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
                                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                                <span>
                                    Rapor <strong>{selectedJenis}</strong> belum tersedia untuk diunduh karena statusnya saat ini adalah &ldquo;{currentStatus === 'selesai' ? 'Terkunci' : 'Belum Dibuka'}&rdquo;.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Info Template */}
                    <div className="card-flat bg-white rounded-2xl p-4 sm:p-5 mt-4 anim-in d4" style={CARD_STYLE}>
                        <p className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#7a3a0a' }}>
                            <Info size={16} style={{ color: ACCENT_DARK }} />
                            Informasi Template Rapor
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-xs" style={{ color: '#7a3a0a' }}>
                            <li>Rapor diunduh dalam format <strong>.docx</strong> (Microsoft Word)</li>
                            <li>Buka dengan Microsoft Word untuk tampilan terbaik</li>
                            <li>Unduh rapor satu per satu dengan klik tombol <strong>Unduh</strong> pada kolom Aksi</li>
                            <li>Atau unduh semua rapor sekaligus dengan tombol <strong>Download Semua</strong> (format ZIP)</li>
                            {selectedJenis === 'PAS' && tahunAjaranInfo?.semester === 'Genap' && (
                                <li className="font-semibold">PAS Genap mencantumkan status kenaikan kelas</li>
                            )}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

export default RaporGuruKelasClient;