/**
 * Nama File: data_siswa_client.tsx
 * Fungsi: Komponen klien untuk menampilkan daftar siswa kelas
 *         oleh guru kelas.
 * UPDATE: Disamakan penuh dengan tampilan Data Guru (versi terbaru) — bentuk
 *         card, warna background, bentuk & warna tombol (pill Detail hijau,
 *         tabel asli <table>, modal detail bergaya kartu ikon), serta animasi
 *         buka/tutup 300ms dengan translate-y. Logic tidak diubah sama sekali
 *         (termasuk fix isNotAssigned).
 */

'use client';
import { useState, useEffect, ReactNode, useCallback } from 'react';
import {
    Eye, Search, X, CheckCircle2, AlertCircle, WifiOff, ShieldAlert,
    Users, LogOut, ChevronLeft, ChevronRight, User, IdCard, Award,
    Calendar, BookOpen,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API  (tidak diubah) ======
const API = 'http://localhost:5000/api/guru-kelas';

// ====== HELPER: Parse Error dari Backend  (tidak diubah) ======
const parseBackendError = async (res: Response): Promise<{ message: string; code?: string }> => {
    try {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            if (res.status === 404) return { message: 'Endpoint tidak ditemukan.', code: 'NOT_FOUND' };
            if (res.status === 500) return { message: 'Server error.', code: 'SERVER_ERROR' };
            return { message: `Server error (${res.status}).`, code: 'INVALID_RESPONSE' };
        }
        const data = await res.json();
        return { message: data.message || 'Terjadi kesalahan', code: data.code };
    } catch {
        return { message: 'Gagal memproses response dari server' };
    }
};

// ====== TYPES  (tidak diubah) ======
type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
}

interface Siswa {
    id: number;
    nis: string;
    nisn: string;
    nama: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    jenis_kelamin: string;
    status?: string;
    kelas: string;
    fase?: string;
}

/* ==========================================================================
   DESIGN TOKENS — sama persis dengan Data Guru (versi terbaru)
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

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
        .row-in { animation: fadeInUp 0.28s ease forwards; opacity: 0; }

        .card-flat { transition: box-shadow 0.2s ease; }
        .card-flat:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

        .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease; }
        .btn-action:hover  { filter: brightness(1.04); }
        .btn-action:active { filter: brightness(0.98); }

        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
            outline: 2.5px solid #f5a623;
            outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
            .anim-in, .row-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .dg-shimmer, .btn-action, .card-flat {
                animation: none !important;
                transition: none !important;
            }
        }
    `}</style>
);

// ====== NOTIF MODAL — struktur & warna identik dengan Data Guru ======
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
    confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={38} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <div className="dg-scaleIn contents w-full">
                    {!isConfirm && (
                        <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                    <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                    <div className="text-center w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                    </div>
                    {isConfirm ? (
                        <div className="flex gap-2.5 w-full mt-1">
                            <button onClick={onClose} className="btn-action flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors" style={{ borderColor: '#e5e7eb', color: '#4b5563', background: '#fff' }}>Batal</button>
                            <button onClick={() => { modal.onConfirm?.(); onClose(); }} className="btn-action flex-1 text-white font-bold py-2.5 rounded-xl transition-colors text-sm" style={{ background: BRAND_GRADIENT, boxShadow: '0 4px 14px rgba(232,105,10,0.30)' }}>Lanjutkan</button>
                        </div>
                    ) : (
                        <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>OK, Mengerti</button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ==========================================================================
   SHARED STYLE CONSTANTS  (sama persis dengan Data Guru)
   ========================================================================== */

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

/* ==========================================================================
   SISTEM TOMBOL AKSI — identik dengan Data Guru
   ========================================================================== */

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
};

const ActionButton = ({
    onClick, children, variant = 'neutral', size = 'md', disabled = false, type = 'button', fullWidth = false, title,
}: {
    onClick?: () => void; children: ReactNode; variant?: BtnVariant; size?: 'md' | 'sm';
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

// ====== HELPERS FORMAT DATA  (tidak diubah) ======
const formatTanggalIndo = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()];
    return `${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

const formatJenisKelamin = (jk: string): string => {
    if (!jk) return '-';
    const s = jk.trim().toLowerCase();
    if (s === 'l' || s === 'laki-laki' || s.includes('laki')) return 'Laki-laki';
    if (s === 'p' || s === 'perempuan' || s.includes('peremp')) return 'Perempuan';
    return jk;
};

// ====== MAIN COMPONENT ======
export default function DataSiswaClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [kelasNama, setKelasNama] = useState<string>('Kelas Anda');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // State untuk mendeteksi jika guru belum ditugaskan  (tidak diubah)
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    // Modal state
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [detailClosing, setDetailClosing] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // Fungsi penutup dengan animasi 300ms — sama persis dengan Data Guru
    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); setSelectedSiswa(null); }, 300);
    };

    // ====== FETCH DATA SISWA  (tidak diubah) ======
    useEffect(() => {
        const fetchSiswa = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                    return;
                }

                const res = await fetch(`${API}/siswa`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const siswa = data.data || [];
                        setSiswaList(siswa);
                        setFilteredSiswa(siswa);

                        // ✅ FIX: Ambil nama kelas dengan benar
                        if (data.kelas_nama) {
                            setKelasNama(data.kelas_nama);
                        } else if (siswa.length > 0) {
                            setKelasNama(siswa[0].kelas || 'Kelas Anda');
                        } else {
                            setKelasNama('Kelas Anda');
                        }

                        // ✅ FIX: JANGAN set isNotAssigned = true kalau array kosong!
                        // isNotAssigned hanya true kalau backend return 403
                    } else {
                        showModal({
                            type: 'error',
                            title: 'Gagal Memuat',
                            message: data.message || 'Terjadi kesalahan'
                        });
                    }
                } else {
                    // ✅ HANYA set isNotAssigned = true kalau backend return 403
                    const errData = await parseBackendError(res);
                    if (res.status === 403 || errData.code === 'NOT_ASSIGNED') {
                        setIsNotAssigned(true);
                    } else {
                        showModal({ type: 'error', title: 'Gagal Memuat', message: errData.message });
                    }
                }
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Tidak dapat terhubung ke server.' });
            } finally {
                setLoading(false);
            }
        };
        fetchSiswa();
    }, [showModal]);

    // ====== FILTER PENCARIAN  (tidak diubah) ======
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(siswaList.filter(s =>
                s.nama.toLowerCase().includes(q) ||
                s.nis.includes(q) ||
                s.nisn.includes(q)
            ));
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    const handleDetail = (siswa: Siswa) => { setSelectedSiswa(siswa); setShowDetail(true); };

    // ====== PAGINATION LOGIC  (tidak diubah) ======
    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    /* Render pagination — pola & gaya tombol identik dengan Data Guru */
    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "min-w-[30px] h-8 px-1.5 flex items-center justify-center rounded-lg text-xs font-bold border-2 transition-colors btn-action";
        const btnActive = "text-white border-transparent";
        const btnInactive = "text-gray-600 border-transparent hover:bg-orange-50 bg-transparent";
        const range: number[] = [];
        if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) range.push(i); }
        else {
            range.push(1);
            if (currentPage > 3) range.push(-1);
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) range.push(i);
            if (currentPage < totalPages - 2) range.push(-2);
            range.push(totalPages);
        }
        range.forEach(p => {
            if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-xs">…</span>); }
            else { pages.push(<button key={p} onClick={() => setCurrentPage(p)} className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`} style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}>{p}</button>); }
        });
        return pages;
    };

    // ====== RENDER UTAMA ======

    // Tampilkan layar Akses Ditolak jika guru belum ditugaskan  (logic tidak diubah)
    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-3 sm:p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
                            <AlertCircle size={38} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-1.5">Akses Ditolak</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
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

            {/* Page header — polos, sama dengan Data Guru (tanpa kotak ikon) */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Siswa</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Daftar siswa kelas {kelasNama}</p>
            </div>

            {/* Toolbar — kiri: info kelas. Kanan: search + tampilkan data. */}
            <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d2" style={CARD_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

                    <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                        <span className="text-xs font-bold" style={{ color: ACCENT_DARK }}>Kelas:</span>
                        <span className="text-xs font-bold" style={{ color: ACCENT }}>{kelasNama}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
                        <div className="relative w-full xs:w-auto sm:w-56 flex-shrink-0">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                            </div>
                            <input type="text" placeholder="Cari nama, NIS, NISN..." value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button type="button" aria-label="Bersihkan pencarian" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2.5 flex items-center" style={{ color: ACCENT }}>
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>Tampilkan</span>
                            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200">
                                <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                            </select>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>data</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table card — tabel asli, sama persis dengan Data Guru */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] table-fixed">
                        <thead>
                            <tr className="bg-gradient-to-r from-[#c95b08] via-[#e8690a] to-[#f5a623]">
                                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase" style={{ width: '60px' }}>No.</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase" style={{ width: '260px' }}>Nama</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase" style={{ width: '110px' }}>NIS</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase" style={{ width: '110px' }}>NISN</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase" style={{ width: '110px' }}>Kelamin</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase" style={{ width: '120px' }}>Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={6} className="px-4 py-3">
                                            <div className="dg-shimmer h-10 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : currentSiswa.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={32} className="text-gray-300" />
                                            <p className="text-sm font-semibold text-gray-500">
                                                {searchQuery ? 'Siswa Tidak Ditemukan' : 'Belum Ada Data Siswa'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {searchQuery ? `Tidak ada siswa yang cocok dengan kata kunci "${searchQuery}".` : 'Belum ada siswa yang terdaftar di kelas Anda.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentSiswa.map((siswa, index) => (
                                    <tr key={siswa.id} className="hover:bg-orange-50/30 transition-colors">
                                        <td className="px-4 py-3 text-center text-gray-400 text-sm" style={{ width: '60px' }}>{startIndex + index + 1}</td>
                                        <td className="px-4 py-3" style={{ width: '260px' }}>
                                            <p className="font-bold text-gray-900 truncate" title={siswa.nama}>{siswa.nama}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs" style={{ width: '110px' }}>{siswa.nis || '-'}</td>
                                        <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs" style={{ width: '110px' }}>{siswa.nisn || '-'}</td>
                                        <td className="px-4 py-3 text-center text-gray-600 text-sm" style={{ width: '110px' }}>{formatJenisKelamin(siswa.jenis_kelamin)}</td>
                                        <td className="px-4 py-3 text-center" style={{ width: '120px' }}>
                                            <button
                                                onClick={() => handleDetail(siswa)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                            >
                                                <Eye size={13} /> Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200" style={{ background: '#fafafa' }}>
                    <span className="text-xs font-medium text-gray-500">
                        {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
                    </span>

                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors" style={{ color: ACCENT_DARK }}>
                            <ChevronLeft size={14} /> Sebelumnya
                        </button>
                        <div className="flex items-center gap-1 mx-1">{renderPagination()}</div>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors" style={{ color: ACCENT_DARK }}>
                            Berikutnya <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Detail dengan Animasi — struktur kartu ikon sama persis dengan Data Guru */}
            {showDetail && selectedSiswa && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${detailClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${detailClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeDetail} />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all duration-300 overflow-hidden ${detailClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                            <h2 className="text-lg sm:text-xl font-bold text-white">Detail Data Siswa</h2>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={18} className="text-white" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                            <div className="flex justify-center mb-6">
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center border-4" style={{ background: 'linear-gradient(135deg, #fed7aa, #fde0c8)', borderColor: '#fde0c8' }}>
                                    <User size={48} style={{ color: '#c2410c' }} />
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-2.5 mb-6 pb-4 border-b" style={{ borderColor: '#fde0c8' }}>
                                <h3 className="text-lg font-bold text-gray-800 text-center">{selectedSiswa.nama}</h3>
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <span className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: '#fff5eb', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>
                                        Kelas {selectedSiswa.kelas}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><IdCard size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>NIS</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 font-mono">{selectedSiswa.nis || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Award size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>NISN</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 font-mono">{selectedSiswa.nisn || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Calendar size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Tempat, Tanggal Lahir</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedSiswa.tempat_lahir || '-'}, {formatTanggalIndo(selectedSiswa.tanggal_lahir)}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Users size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Jenis Kelamin</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{formatJenisKelamin(selectedSiswa.jenis_kelamin)}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><BookOpen size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Fase</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedSiswa.fase || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <button onClick={closeDetail} className="px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all" style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }} onMouseEnter={e => { e.currentTarget.style.background = '#fff5eb'; e.currentTarget.style.borderColor = '#fbbf24'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#fde0c8'; }}>Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}