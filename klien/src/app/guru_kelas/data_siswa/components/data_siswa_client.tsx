/**
 * Nama File: data_siswa_client.tsx
 * Fungsi: Komponen klien untuk menampilkan daftar siswa kelas
 *         oleh guru kelas. Menggunakan template UI Atur Penilaian.
 * UPDATE: Fix bug logic isNotAssigned - array kosong ≠ belum ditugaskan
 */

'use client';
import { useState, useEffect, ReactNode, useCallback } from 'react';
import { Eye, Search, X, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Users, LogOut } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-kelas';

// ====== HELPER: Parse Error dari Backend ======
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

// ====== TYPES ======
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

// ====== GLOBAL STYLES ======
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

// ====== NOTIF MODAL ======
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
    confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 ap-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ap-scaleIn">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ap-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                {isConfirm ? (
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors" style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}>Batal</button>
                        <button onClick={() => { modal.onConfirm?.(); onClose(); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm">Lanjutkan</button>
                    </div>
                ) : (
                    <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
                )}
            </div>
        </div>
    );
};

// ====== SHARED STYLE CONSTANTS ======
const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
    base: "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' },
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >{children}</button>
);

// ====== HELPERS FORMAT DATA ======
const formatTanggalIndo = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
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

    // State untuk mendeteksi jika guru belum ditugaskan
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    // Modal state
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [detailClosing, setDetailClosing] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); setSelectedSiswa(null); }, 200);
    };

    // ====== FETCH DATA SISWA ======
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

    // ====== FILTER PENCARIAN ======
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

    // ====== PAGINATION LOGIC ======
    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnActive = "text-white border-orange-500";
        const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";

        pages.push(
            <button key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className={`${btnBase} ${btnInactive} disabled:opacity-40`}>«</button>
        );

        const range: number[] = [];
        if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) range.push(i); }
        else {
            range.push(1);
            if (currentPage > 3) range.push(-1);
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) range.push(i);
            if (currentPage < totalPages - 2) range.push(-2);
            range.push(totalPages);
        }

        range.forEach((p) => {
            if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>); }
            else {
                pages.push(
                    <button key={p} onClick={() => setCurrentPage(p)}
                        className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
                        style={currentPage === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}
                    >{p}</button>
                );
            }
        });

        pages.push(
            <button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>
        );
        return pages;
    };

    // ====== RENDER UTAMA ======

    // Tampilkan Modal Akses Ditolak jika guru belum ditugaskan
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

            {/* Modals */}
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Daftar siswa kelas {kelasNama}</p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                {/* Toolbar */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
                            Kelas: <span style={{ color: '#e8690a' }}>{kelasNama}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Tampilkan per halaman */}
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                <select value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                            </div>

                            {/* Pencarian */}
                            <div className="relative min-w-[200px] sm:min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input type="text" placeholder="Cari siswa..." value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400" />
                                {searchQuery && (
                                    <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
                    </p>
                </div>

                {/* Tabel & Empty State */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama', 'NIS', 'NISN', 'Jenis Kelamin', 'Detail'].map(h => (
                                    <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                        Memuat data...
                                    </div>
                                </td></tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
                                                <Users size={32} style={{ color: '#e8690a' }} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-base">
                                                    {searchQuery ? 'Siswa Tidak Ditemukan' : 'Belum Ada Data Siswa'}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                                                    {searchQuery
                                                        ? `Tidak ada siswa yang cocok dengan kata kunci "${searchQuery}".`
                                                        : `Belum ada siswa yang terdaftar di kelas Anda.`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentSiswa.map((siswa, index) => (
                                <tr key={siswa.id}
                                    className="transition-colors"
                                    style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                    <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                    <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama}</td>
                                    <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nis}</td>
                                    <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nisn}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                                            style={{
                                                background: siswa.jenis_kelamin?.toLowerCase().includes('laki') ? '#eff6ff' : '#fdf2f8',
                                                color: siswa.jenis_kelamin?.toLowerCase().includes('laki') ? '#1d4ed8' : '#9d174d',
                                                border: `1px solid ${siswa.jenis_kelamin?.toLowerCase().includes('laki') ? '#bfdbfe' : '#fbcfe8'}`,
                                            }}>
                                            {formatJenisKelamin(siswa.jenis_kelamin)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <button onClick={() => handleDetail(siswa)}
                                            className={btnPrimary.base}
                                            style={btnPrimary.style}
                                            onMouseEnter={btnPrimary.hover}
                                            onMouseLeave={btnPrimary.leave}>
                                            <Eye size={13} /> Detail
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredSiswa.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                        <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Halaman {currentPage} dari {totalPages}</span>
                        <div className="flex items-center gap-1">{renderPagination()}</div>
                    </div>
                )}
            </div>

            {/* ====== MODAL DETAIL SISWA ====== */}
            {showDetail && selectedSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        {/* Modal header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Detail Siswa</h2>
                            <button onClick={closeDetail}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex flex-col items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">{selectedSiswa.nama}</h3>
                            </div>

                            {/* Detail rows */}
                            <div className="space-y-2.5">
                                {[
                                    { label: 'Kelas', value: selectedSiswa.kelas },
                                    { label: 'NIS', value: selectedSiswa.nis },
                                    { label: 'NISN', value: selectedSiswa.nisn },
                                    { label: 'Tempat Lahir', value: selectedSiswa.tempat_lahir || '-' },
                                    { label: 'Tanggal Lahir', value: formatTanggalIndo(selectedSiswa.tanggal_lahir) },
                                    { label: 'Jenis Kelamin', value: formatJenisKelamin(selectedSiswa.jenis_kelamin) },
                                    { label: 'Fase', value: selectedSiswa.fase || '-' },
                                ].map((item, i) => (
                                    <div key={i} className="grid grid-cols-4 gap-2 pb-2.5"
                                        style={{ borderBottom: '1px solid #fde0c8' }}>
                                        <span className="text-xs font-semibold col-span-1" style={{ color: '#7a3a0a' }}>{item.label}</span>
                                        <span className="text-xs text-gray-700">:</span>
                                        <span className="text-xs text-gray-700 col-span-2 wrap-break-word">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}