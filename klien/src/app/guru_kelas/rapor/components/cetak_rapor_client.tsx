/**
 * Nama File: RaporGuruKelasClient.tsx
 * Fungsi: Cetak rapor siswa untuk guru kelas menggunakan template Word
 * UPDATE: 
 *   - ✅ HAPUS: Fitur "Unduh Semua" (hanya unduh per siswa)
 *   - Kondisi 1: Modal "Akses Ditolak" + Logout jika belum ditugaskan
 *   - Kondisi 2: Read-Only mode jika periode penilaian belum aktif
 *   - Banner warning status periode
 *   - Tombol Download disabled jika periode belum aktif
 *   - Modal warning saat klik tombol di mode read-only
 *   - Auto-detect semester, tab toggle PTS/PAS, tema oranye
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText, Download, AlertCircle, CheckCircle2,
    WifiOff, ShieldAlert, X, School, Lock, Play, Pause, Users, LogOut
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

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes ap-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ap-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes ap-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .ap-fadeIn  { animation: ap-fadeIn  0.2s ease; }
        .ap-scaleIn { animation: ap-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .ap-pulse   { animation: ap-pulse   0.6s ease 0.15s; }
    `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 ap-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ap-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ap-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 4px 24px rgba(200,80,10,0.08)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const getStatusStyle = (status: StatusPenilaian) => {
    switch (status) {
        case 'aktif':
            return {
                bg: '#dcfce7', color: '#15803d', border: '#86efac',
                dot: '#22c55e', text: 'Aktif (Bisa Download)',
                icon: <Play size={14} />
            };
        case 'selesai':
            return {
                bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db',
                dot: '#9ca3af', text: 'Selesai (Terkunci)',
                icon: <Lock size={14} />
            };
        case 'nonaktif':
        default:
            return {
                bg: '#fef9c3', color: '#92400e', border: '#fde68a',
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

    // ✅ KONDISI 1: Belum ditugaskan
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    // ✅ KONDISI 2: Read-Only mode (periode belum aktif)
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

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

                // ✅ CEK STATUS PERIODE
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
                            title: '🔒 Periode Penilaian Selesai',
                            message: 'Periode penilaian telah selesai.\n\nRapor yang sudah selesai dapat diunduh, tetapi data nilai tidak dapat diubah lagi.'
                        });
                    }, 500);
                } else {
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: '⏳ Periode Penilaian Belum Aktif',
                            message: 'Baik PTS maupun PAS belum dibuka oleh admin.\n\nAnda belum dapat mengunduh rapor siswa.\n\nSilakan hubungi admin untuk membuka periode penilaian.'
                        });
                    }, 500);
                }
            } else {
                const errCode = data.code;
                if (errCode === 'NOT_ASSIGNED') {
                    setIsNotAssigned(true);
                } else {
                    showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal mengambil tahun ajaran aktif.' });
                }
            }
        } catch (err: any) {
            if (err.message?.includes('belum ditugaskan')) {
                setIsNotAssigned(true);
            } else {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
            }
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
            } else {
                const errCode = data.code;
                if (errCode === 'NOT_ASSIGNED') {
                    setIsNotAssigned(true);
                } else {
                    setSiswaList([]);
                    showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal memuat data siswa.' });
                }
            }
        } catch {
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
        // ✅ CEK READ-ONLY
        if (isReadOnly && readOnlyReason === 'not_open') {
            showModal({
                type: 'warning',
                title: '⏳ Mode Baca-Saja',
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

            const cleanNisn = (nisn || String(siswaId)).replace(/[^0-9]/g, '');
            const fileName = `rapor_${selectedJenis.toLowerCase()}_${semester}_${cleanNisn}.docx`;

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

    // === Derived state ===
    const currentStatus = getCurrentStatus();
    // ✅ UPDATE: Download allowed jika aktif ATAU selesai (bukan nonaktif)
    const isDownloadAllowed = currentStatus === 'aktif' || currentStatus === 'selesai';

    // ── Loading state ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-1 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</p>
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

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 ap-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 ap-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 ap-pulse">
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
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                boxShadow: '0 3px 12px rgba(232,105,10,0.3)'
                            }}
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* ✅ BANNER READ-ONLY (KONDISI 2) */}
            {isReadOnly && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{
                        background: readOnlyReason === 'locked' ? '#fef2f2' : '#fef3c7',
                        border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}`
                    }}>
                    <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${readOnlyReason === 'locked' ? 'text-red-600' : 'text-yellow-600'}`} />
                    <div className="flex-1">
                        <p className={`text-sm font-bold mb-1 ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>
                            🔒 Mode Baca-Saja (Read-Only)
                        </p>
                        <p className={`text-xs ${readOnlyReason === 'locked' ? 'text-red-800' : 'text-yellow-800'}`}>
                            {readOnlyReason === 'locked'
                                ? 'Periode penilaian telah selesai. Rapor yang sudah selesai dapat diunduh, tetapi data nilai tidak dapat diubah lagi.'
                                : 'Periode penilaian belum aktif. Anda belum dapat mengunduh rapor siswa. Silakan hubungi admin untuk membuka periode penilaian.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Cetak Rapor</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Unduh rapor siswa dalam format Microsoft Word
                </p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                {/* Card Header */}
                <div className="px-6 py-5" style={HEADER_GRAD}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center backdrop-blur-sm shadow-lg">
                                <FileText className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Cetak Rapor Siswa
                                </h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Toggle PTS/PAS */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                                Jenis Penilaian:
                            </span>
                            <div className="flex gap-2 bg-white rounded-lg p-1" style={{ border: '1px solid #fde0c8' }}>
                                <button
                                    onClick={() => setSelectedJenis('PTS')}
                                    className="px-4 py-1.5 rounded-md text-xs font-bold transition-all"
                                    style={{
                                        background: selectedJenis === 'PTS' ? '#c95b08' : 'transparent',
                                        color: selectedJenis === 'PTS' ? '#fff' : '#7a3a0a'
                                    }}
                                >
                                    PTS
                                </button>
                                <button
                                    onClick={() => setSelectedJenis('PAS')}
                                    className="px-4 py-1.5 rounded-md text-xs font-bold transition-all"
                                    style={{
                                        background: selectedJenis === 'PAS' ? '#c95b08' : 'transparent',
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
                        <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" style={{ color: '#c95b08' }} />
                                <span className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
                                    Total: {siswaList.length} siswa
                                </span>
                            </div>
                            {/* ✅ HAPUS: Tombol "Unduh Semua" sudah dihapus */}
                        </div>
                    )}
                </div>

                {/* Konten */}
                {!selectedJenis ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{ background: '#fff0e5', border: '1.5px dashed #f5870a' }}>
                            <FileText size={26} style={{ color: '#e8690a' }} />
                        </div>
                        <p className="text-m font-bold text-orange-700">Silakan pilih jenis penilaian</p>
                    </div>
                ) : loadingSiswa ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin" />
                        <p className="text-sm text-gray-400">Memuat daftar siswa...</p>
                    </div>
                ) : siswaList.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-400">
                        Tidak ada siswa di kelas Anda.
                    </div>
                ) : (
                    <>
                        {/* Tabel */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm border-collapse">
                                <thead>
                                    <tr style={TH_GRAD}>
                                        <th className="px-5 py-3.5 text-center text-xs font-bold text-white w-12">No.</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-white">Nama Siswa</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-bold text-white w-28">NIS</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-bold text-white w-32">NISN</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-bold text-white w-32">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {siswaList.map((siswa, index) => (
                                        <tr
                                            key={siswa.id}
                                            className="transition-all"
                                            style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                            onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                                        >
                                            <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{index + 1}</td>
                                            <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama}</td>
                                            <td className="px-5 py-3.5 text-center text-gray-600 font-mono text-xs">{siswa.nis}</td>
                                            <td className="px-5 py-3.5 text-center text-gray-600 font-mono text-xs">{siswa.nisn || '—'}</td>
                                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                                {isDownloadAllowed ? (
                                                    <button
                                                        onClick={() => handleDownloadRapor(siswa.id, siswa.nama, siswa.nisn)}
                                                        disabled={downloadingId === siswa.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                                                        style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                        onMouseEnter={e => { if (downloadingId !== siswa.id) e.currentTarget.style.background = '#d4f0de'; }}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}
                                                    >
                                                        {downloadingId === siswa.id ? (
                                                            <>
                                                                <div className="w-3 h-3 rounded-full border border-green-400 border-t-green-700 animate-spin" />
                                                                Mengunduh...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Download size={13} />
                                                                Unduh
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                                        style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#9ca3af' }}>
                                                        <Lock size={13} />
                                                        Terkunci
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Warning jika tidak aktif */}
                        {!isDownloadAllowed && (
                            <div className="mx-5 my-4 p-3 rounded-xl text-xs font-medium flex items-start gap-2"
                                style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                                <span>
                                    Rapor <strong>{selectedJenis}</strong> belum tersedia untuk diunduh karena statusnya saat ini adalah &ldquo;{currentStatus === 'selesai' ? 'Terkunci' : 'Belum Dibuka'}&rdquo;.
                                </span>
                            </div>
                        )}

                        {/* Info Template */}
                        <div className="mx-5 mb-5 mt-2 p-4 rounded-xl text-xs" style={{ background: '#fffaf6', border: '1px solid #fde0c8', color: '#7a3a0a' }}>
                            <p className="font-bold mb-1.5 flex items-center gap-1.5">
                                <FileText size={14} style={{ color: '#c95b08' }} />
                                Informasi Template Rapor
                            </p>
                            <ul className="list-disc pl-4 space-y-1" style={{ color: '#c95b08' }}>
                                <li>Rapor diunduh dalam format <strong>.docx</strong> (Microsoft Word)</li>
                                <li>Buka dengan Microsoft Word untuk tampilan terbaik</li>
                                <li>Unduh rapor satu per satu dengan klik tombol <strong>Unduh</strong> pada kolom Aksi</li>
                                {selectedJenis === 'PAS' && tahunAjaranInfo?.semester === 'Genap' && (
                                    <li className="font-semibold">✓ PAS Genap mencantumkan status kenaikan kelas</li>
                                )}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RaporGuruKelasClient;