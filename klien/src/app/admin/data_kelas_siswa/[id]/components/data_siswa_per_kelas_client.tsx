/**
 * Nama File: siswa_per_kelas_client.tsx
 * Path: /admin/data-kelas/[id]/siswa
 * Fungsi: Menampilkan daftar siswa dalam kelas tertentu (Master-First Concept)
 * Update: 
 *   - Hapus fitur Detail, fokus hanya Assign & Keluarkan
 *   - ✅ TAMBAHAN: Fitur READ-ONLY saat data kelas dikunci (PTS/PAS diarsipkan)
 *   - ✅ TAMBAHAN: Badge warning yang jelas saat data terkunci
 */

'use client';
import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    X, Search, ArrowLeft, CheckCircle2, AlertCircle, 
    WifiOff, ShieldAlert, Users, Plus, Trash2, Lock  // ✅ TAMBAH Lock
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
}

interface Siswa {
    id_siswa: number;
    nis: string;
    nisn: string;
    nama_lengkap: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    jenis_kelamin?: string;
    alamat?: string;
    status: string;
}

// ✅ UPDATED: Tambah field read-only
interface KelasInfo {
    id_kelas: number;
    nama_kelas: string;
    wali_kelas: string;
    fase: string;
    tahun_ajaran_id: number;
    id_tahun_ajaran_induk: number | null;
    tahun_ajaran?: string;
    is_aktif: boolean;
    is_read_only?: boolean;
    locked_by?: string | null;
    locked_semester?: string | null;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes spk-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spk-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes spk-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .spk-fadeIn  { animation: spk-fadeIn  0.2s ease; }
        .spk-scaleIn { animation: spk-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .spk-pulse   { animation: spk-pulse   0.6s ease 0.15s; }
    `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 spk-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 spk-scaleIn">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} spk-pulse`}>
                    {s.icon}
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                {isConfirm ? (
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
                            style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                        >Batal</button>
                        <button onClick={() => { modal.onConfirm?.(); onClose(); }}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                        >Ya, Keluarkan</button>
                    </div>
                ) : (
                    <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>
                        OK, Mengerti
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
    base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const BtnSecondary = ({ onClick, children, disabled = false }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}
        className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#fff0e5'; }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = '#fff'; }}
    >
        {children}
    </button>
);

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatGender = (g?: string | null) => {
    if (!g) return '-';
    const s = String(g).trim().toLowerCase();
    if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l') return 'Laki-laki';
    if (s === 'perempuan' || s === 'p') return 'Perempuan';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
};

const highlightText = (text: string, query: string): ReactNode => {
    if (!query || !text) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part)
            ? <mark key={i} className="bg-orange-200 text-gray-900 px-0.5 rounded font-semibold">{part}</mark>
            : part
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function SiswaPerKelasClient() {
    const params = useParams();
    const router = useRouter();
    const kelasId = Number(params.id);
    const { showSessionExpired, handleLogout } = useSession();

    // State data
    const [kelasInfo, setKelasInfo] = useState<KelasInfo | null>(null);
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(true);

    // State UI
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'nama-asc' | 'nama-desc' | 'nis-asc'>('nama-asc');
    const [filterGender, setFilterGender] = useState<'all' | 'Laki-laki' | 'Perempuan'>('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Modal states
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // Modal Assign
    const [showAssign, setShowAssign] = useState(false);
    const [availableSiswa, setAvailableSiswa] = useState<Siswa[]>([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [searchAvailable, setSearchAvailable] = useState('');
    const [selectedSiswaIds, setSelectedSiswaIds] = useState<number[]>([]);
    const [assignClosing, setAssignClosing] = useState(false);

    // ── FETCH FUNCTIONS ──────────────────────────────────────────────────────

    // ✅ UPDATED: Ambil info read-only dari backend
    const fetchKelasInfo = useCallback(async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`http://localhost:5000/api/admin/kelas/${kelasId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            setKelasInfo({
                id_kelas: data.data.id_kelas || data.data.id,
                nama_kelas: data.data.nama_kelas,
                wali_kelas: data.data.wali_kelas || '-',
                fase: data.data.fase,
                tahun_ajaran_id: data.data.tahun_ajaran_id,
                id_tahun_ajaran_induk: data.data.id_tahun_ajaran_induk || null,  // ✅ SIMPAN INI
                tahun_ajaran: data.data.tahun_ajaran,
                is_aktif: data.data.is_aktif || false,
                is_read_only: data.data.is_read_only || false,
                locked_by: data.data.locked_by || null,
                locked_semester: data.data.locked_semester || null,
            });
        } else {
            showModal({ type: 'error', title: 'Kelas Tidak Ditemukan', message: data.message || 'Data kelas tidak ditemukan.' });
        }
    } catch {
        showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    }
}, [kelasId, showModal]);

    const fetchSiswaByKelas = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`http://localhost:5000/api/admin/kelas/${kelasId}/siswa`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setSiswaList(Array.isArray(data.data) ? data.data : []);
            } else {
                setSiswaList([]);
            }
        } catch {
            console.error('Error fetch siswa:', {});
        } finally {
            setLoading(false);
        }
    }, [kelasId]);

    const fetchAvailableSiswa = useCallback(async (search = '') => {
    setLoadingAvailable(true);
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const queryParams = new URLSearchParams();
        
        // ✅ PERBAIKAN: Gunakan id_tahun_ajaran_induk, bukan tahun_ajaran_id
        if (kelasInfo?.id_tahun_ajaran_induk) {
            queryParams.append('tahun_ajaran_id', String(kelasInfo.id_tahun_ajaran_induk));
        }
        
        if (search) queryParams.append('search', search);

        const res = await fetch(`http://localhost:5000/api/admin/siswa/available?${queryParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            setAvailableSiswa(Array.isArray(data.data) ? data.data : []);
        }
    } catch {
        console.error('Error fetch available:', {});
    } finally {
        setLoadingAvailable(false);
    }
}, [kelasInfo?.id_tahun_ajaran_induk]);  // ✅ UBAH dependency

    // ── EFFECTS ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!kelasId || isNaN(kelasId)) {
            showModal({ type: 'error', title: 'Error', message: 'ID kelas tidak valid.' });
            return;
        }
        fetchKelasInfo();
        fetchSiswaByKelas();
    }, [kelasId, fetchKelasInfo, fetchSiswaByKelas, showModal]);

    useEffect(() => {
        if (!showAssign) return;
        const timer = setTimeout(() => {
            fetchAvailableSiswa(searchAvailable);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchAvailable, showAssign, fetchAvailableSiswa]);

    // ── FILTER & SORT ────────────────────────────────────────────────────────

    const filteredSiswa = siswaList
        .filter(siswa => {
            const query = searchQuery.toLowerCase().trim();
            const matchSearch = !query ||
                siswa.nama_lengkap?.toLowerCase().includes(query) ||
                siswa.nis?.toLowerCase().includes(query) ||
                siswa.nisn?.toLowerCase().includes(query);
            const matchGender = filterGender === 'all' || formatGender(siswa.jenis_kelamin) === filterGender;
            return matchSearch && matchGender;
        })
        .sort((a, b) => {
            if (sortBy === 'nama-asc') return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '');
            if (sortBy === 'nama-desc') return (b.nama_lengkap || '').localeCompare(a.nama_lengkap || '');
            if (sortBy === 'nis-asc') return (a.nis || '').localeCompare(b.nis || '');
            return 0;
        });

    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    // ── HANDLERS ─────────────────────────────────────────────────────────────

    const openAssignModal = () => {
        setSelectedSiswaIds([]);
        setSearchAvailable('');
        setShowAssign(true);
        fetchAvailableSiswa('');
    };

    const closeAssignModal = () => {
        setAssignClosing(true);
        setTimeout(() => { 
            setShowAssign(false); 
            setAssignClosing(false); 
            setSelectedSiswaIds([]);
            setSearchAvailable('');
        }, 200);
    };

    const toggleSelectSiswa = (id: number) => {
        setSelectedSiswaIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllAvailable = () => {
        const filteredIds = availableSiswa
            .filter(s => {
                const query = searchAvailable.toLowerCase().trim();
                return !query || 
                    s.nama_lengkap?.toLowerCase().includes(query) ||
                    s.nis?.toLowerCase().includes(query) ||
                    s.nisn?.toLowerCase().includes(query);
            })
            .map(s => s.id_siswa);
        
        setSelectedSiswaIds(prev => {
            const newSet = new Set(prev);
            filteredIds.forEach(id => newSet.add(id));
            return Array.from(newSet);
        });
    };

    const deselectAll = () => setSelectedSiswaIds([]);

    const executeAssign = async () => {
    if (selectedSiswaIds.length === 0) {
        showModal({ type: 'warning', title: 'Belum Ada Siswa Dipilih', message: 'Pilih minimal 1 siswa untuk di-assign ke kelas.' });
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
        return;
    }

    try {
        const res = await fetch(`http://localhost:5000/api/admin/kelas/${kelasId}/assign-siswa`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({
                siswa_ids: selectedSiswaIds,
                // ✅ PERBAIKAN: Kirim id_tahun_ajaran_induk
                tahun_ajaran_id: kelasInfo?.id_tahun_ajaran_induk
            })
        });

        const result = await res.json();

        if (res.ok && result.success) {
            closeAssignModal();
            await fetchSiswaByKelas();
            
            if (result.skipped && result.skipped.length > 0) {
                showModal({
                    type: 'warning',
                    title: 'Assign Selesai dengan Peringatan',
                    message: `${result.assigned} siswa berhasil di-assign.\n\n${result.skipped.length} siswa dilewati:\n` +
                        result.skipped.map((s: any) => `• ${s.nama || 'Siswa #' + s.id}: ${s.reason}`).join('\n')
                });
            } else {
                showModal({
                    type: 'success',
                    title: 'Berhasil Assign!',
                    message: `${result.assigned} siswa berhasil ditambahkan ke kelas ${kelasInfo?.nama_kelas}.`
                });
            }
        } else {
            showModal({ type: 'error', title: 'Gagal Assign', message: result.message || 'Terjadi kesalahan.' });
        }
    } catch {
        showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    }
};

    const handleKeluarkan = (siswa: Siswa) => {
    showModal({
        type: 'confirm',
        title: 'Keluarkan Siswa dari Kelas',
        message: `Apakah Anda yakin ingin mengeluarkan "${siswa.nama_lengkap}" dari kelas ${kelasInfo?.nama_kelas}?\n\nData master siswa akan tetap tersimpan.`,
        onConfirm: async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const queryParams = new URLSearchParams();
                // ✅ PERBAIKAN: Gunakan id_tahun_ajaran_induk
                if (kelasInfo?.id_tahun_ajaran_induk) {
                    queryParams.append('tahun_ajaran_id', String(kelasInfo.id_tahun_ajaran_induk));
                }

                const res = await fetch(
                    `http://localhost:5000/api/admin/kelas/${kelasId}/siswa/${siswa.id_siswa}?${queryParams.toString()}`,
                    {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                const result = await res.json();

                if (res.ok && result.success) {
                    await fetchSiswaByKelas();
                    showModal({
                        type: 'success',
                        title: 'Berhasil Dikeluarkan!',
                        message: `"${siswa.nama_lengkap}" berhasil dikeluarkan dari kelas.`
                    });
                } else {
                    showModal({ type: 'error', title: 'Gagal Mengeluarkan', message: result.message || 'Terjadi kesalahan.' });
                }
            } catch {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
            }
        }
    });
};

    // ── PAGINATION ───────────────────────────────────────────────────────────
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

    // ── LOADING STATE ────────────────────────────────────────────────────────
    if (loading && !kelasInfo) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                    <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</span>
                </div>
            </div>
        );
    }

    // ── MAIN RENDER ──────────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* ── HEADER ────────────────────────────────────────────────── */}
            <div className="mb-6">
                <button
                    onClick={() => router.push(`/admin/data_kelas_siswa${kelasInfo?.tahun_ajaran_id ? `?ta=${kelasInfo.tahun_ajaran_id}` : ''}`)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold mb-3 transition-all"
                    style={{ color: '#c95b08' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                    <ArrowLeft size={15} />
                    <span>Kembali</span>
                </button>

                <h1 className="text-2xl font-bold text-gray-900 mb-1">Kelas {kelasInfo?.nama_kelas || '...'}</h1>
                <p className="text-sm" style={{ color: '#c95b08' }}>
                    Wali Kelas: <strong>{kelasInfo?.wali_kelas || '-'}</strong> &nbsp;•&nbsp; 
                    Fase: <strong>{kelasInfo?.fase || '-'}</strong>
                </p>
            </div>

            {/* ── CARD UTAMA ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* ═══ ✅ BADGE READ-ONLY (BARU) ═══ */}
                {kelasInfo?.is_read_only && (
                    <div 
                        className="mx-5 mt-4 p-4 rounded-xl flex items-start gap-3"
                        style={{ 
                            background: 'linear-gradient(135deg, #fef3c7, #fde68a)', 
                            border: '2px solid #f59e0b'
                        }}
                    >
                        <Lock size={24} className="text-amber-700 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-amber-900 mb-1">
                                🔒 Data Siswa Terkunci (Read-Only)
                            </h3>
                            <p className="text-xs text-amber-800 mb-2">
                                Penilaian <strong>{kelasInfo.locked_by}</strong> semester <strong>{kelasInfo.locked_semester}</strong> telah diarsipkan dan dikunci. 
                                Siswa tidak dapat ditambah atau dikeluarkan dari kelas sampai tahun ajaran berakhir.
                            </p>
                            <p className="text-xs text-amber-700 italic">
                                💡 Data siswa yang sudah ada tetap dapat dilihat dan dicari.
                            </p>
                        </div>
                    </div>
                )}

                {/* ═══ TOOLBAR ═══ */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">

                        {/* ✅ Kiri: Assign Siswa - DISABLE jika read-only */}
                        {kelasInfo?.is_aktif && !kelasInfo?.is_read_only && (
                            <button
                                onClick={openAssignModal}
                                className={btnPrimary.base}
                                style={btnPrimary.style}
                                onMouseEnter={btnPrimary.hover}
                                onMouseLeave={btnPrimary.leave}
                            >
                                <Plus size={16} /> Tambah Siswa
                            </button>
                        )}

                        {/* Kanan: Controls */}
                        <div className="flex flex-wrap items-center gap-2">

                            {/* Tampilkan N data */}
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                <select value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                            </div>

                            {/* Search */}
                            <div className="relative min-w-[200px] sm:min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input type="text" placeholder="Cari siswa..." value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filter Gender */}
                            <select
                                value={filterGender}
                                onChange={(e) => { setFilterGender(e.target.value as any); setCurrentPage(1); }}
                                className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200"
                                style={{ color: '#7a3a0a' }}
                            >
                                <option value="all">Semua Gender</option>
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>

                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200"
                                style={{ color: '#7a3a0a' }}
                            >
                                <option value="nama-asc">Nama (A-Z)</option>
                                <option value="nama-desc">Nama (Z-A)</option>
                                <option value="nis-asc">NIS</option>
                            </select>
                        </div>
                    </div>

                    {/* Info count */}
                    <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
                    </p>
                </div>

                {/* ═══ TABLE ═══ */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama Siswa', 'NIS', 'NISN', 'L/P', 'Aksi'].map(h => (
                                    <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                            Memuat data...
                                        </div>
                                    </td>
                                </tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                                        {searchQuery || filterGender !== 'all'
                                            ? 'Tidak ada siswa yang sesuai filter'
                                            : 'Belum ada siswa di kelas ini'}
                                    </td>
                                </tr>
                            ) : (
                                currentSiswa.map((siswa, index) => (
                                    <tr key={siswa.id_siswa}
                                        className="transition-colors"
                                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                        <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                        <td className="px-5 py-3.5 font-bold text-gray-800">
                                            {highlightText(siswa.nama_lengkap, searchQuery)}
                                        </td>
                                        <td className="px-5 py-3.5 text-center text-gray-600">
                                            {highlightText(siswa.nis, searchQuery)}
                                        </td>
                                        <td className="px-5 py-3.5 text-center text-gray-600">
                                            {highlightText(siswa.nisn || '-', searchQuery)}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold"
                                                style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                                {formatGender(siswa.jenis_kelamin) === 'Laki-laki' ? 'L' : 'P'}
                                            </span>
                                        </td>
                                        {/* ✅ UPDATED: Kolom Aksi - conditional */}
                                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                            {kelasInfo?.is_aktif && !kelasInfo?.is_read_only ? (
                                                <button onClick={() => handleKeluarkan(siswa)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}>
                                                        <Trash2 size={13} /> Hapus
                                                </button>
                                            ) : kelasInfo?.is_read_only ? (
                                                <span 
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold"
                                                    style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                                                    title="Data terkunci karena penilaian telah diarsipkan"
                                                >
                                                    <Lock size={10} /> Terkunci
                                                </span>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                    <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <div className="flex items-center gap-1">{renderPagination()}</div>
                </div>
            </div>

            {/* ═══ MODAL ASSIGN SISWA ═══ */}
            {showAssign && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${assignClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeAssignModal(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col transform transition-all duration-200 ${assignClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0" style={HEADER_GRAD}>
                            <div>
                                <h2 className="text-base font-bold text-white">Tambah Siswa ke Kelas {kelasInfo?.nama_kelas}</h2>
                                <p className="text-xs text-white/80 mt-0.5">Pilih siswa yang belum memiliki kelas</p>
                            </div>
                            <button onClick={closeAssignModal} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            
                            {/* Search */}
                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari nama, NIS, atau NISN..."
                                    value={searchAvailable}
                                    onChange={(e) => setSearchAvailable(e.target.value)}
                                    className={inputCls + ' pl-9 pr-9'}
                                />
                                {searchAvailable && (
                                    <button type="button" onClick={() => setSearchAvailable('')}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Action bar */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAllAvailable}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                        style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                    >
                                        Pilih Semua
                                    </button>
                                    <button
                                        onClick={deselectAll}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                        style={{ background: '#fff', color: '#7a3a0a', border: '1px solid #fde0c8' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                    >
                                        Batal Semua
                                    </button>
                                </div>
                                <div className="text-xs font-semibold" style={{ color: '#c95b08' }}>
                                    <strong className="text-sm">{selectedSiswaIds.length}</strong> dipilih
                                </div>
                            </div>

                            {/* List siswa available */}
                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#fde0c8' }}>
                                {loadingAvailable ? (
                                    <div className="py-12 text-center text-gray-400 text-sm">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                            Memuat data...
                                        </div>
                                    </div>
                                ) : availableSiswa.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center"
                                                style={{ background: '#fff0e5' }}>
                                                <Users className="w-6 h-6" style={{ color: '#c95b08' }} />
                                            </div>
                                            <p className="text-sm font-bold text-gray-700">
                                                {searchAvailable ? 'Tidak ada siswa yang cocok' : 'Tidak ada siswa tersedia'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {searchAvailable 
                                                    ? 'Coba ubah kata kunci pencarian'
                                                    : 'Semua siswa sudah memiliki kelas'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-y-auto">
                                        <table className="w-full text-sm border-collapse">
                                            <thead className="sticky top-0" style={{ background: '#fffaf6' }}>
                                                <tr style={{ borderBottom: '1px solid #fde0c8' }}>
                                                    <th className="px-3 py-2 text-center w-10">
                                                        <input
                                                            type="checkbox"
                                                            checked={availableSiswa.length > 0 && selectedSiswaIds.length === availableSiswa.length}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedSiswaIds(availableSiswa.map(s => s.id_siswa));
                                                                } else {
                                                                    setSelectedSiswaIds([]);
                                                                }
                                                            }}
                                                            className="w-4 h-4 accent-orange-500"
                                                        />
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: '#7a3a0a' }}>Nama</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold" style={{ color: '#7a3a0a' }}>NIS</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold" style={{ color: '#7a3a0a' }}>NISN</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold" style={{ color: '#7a3a0a' }}>L/P</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {availableSiswa.map((siswa, idx) => {
                                                    const isSelected = selectedSiswaIds.includes(siswa.id_siswa);
                                                    return (
                                                        <tr
                                                            key={siswa.id_siswa}
                                                            onClick={() => toggleSelectSiswa(siswa.id_siswa)}
                                                            className="cursor-pointer transition-colors"
                                                            style={{
                                                                background: isSelected ? '#fff0e5' : (idx % 2 === 0 ? '#fff' : '#fffaf6'),
                                                                borderBottom: '1px solid #fde0c8'
                                                            }}
                                                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fff8f0'; }}
                                                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fffaf6'; }}
                                                        >
                                                            <td className="px-3 py-2.5 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleSelectSiswa(siswa.id_siswa)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-4 h-4 accent-orange-500"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2.5 font-semibold text-gray-800">{siswa.nama_lengkap}</td>
                                                            <td className="px-3 py-2.5 text-center text-gray-600">{siswa.nis}</td>
                                                            <td className="px-3 py-2.5 text-center text-gray-600">{siswa.nisn || '-'}</td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                                                                    style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                                                    {formatGender(siswa.jenis_kelamin) === 'Laki-laki' ? 'L' : 'P'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 flex-shrink-0"
                            style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
                            <BtnSecondary onClick={closeAssignModal}>Batal</BtnSecondary>
                            <button
                                onClick={executeAssign}
                                disabled={selectedSiswaIds.length === 0}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${selectedSiswaIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={btnPrimary.style}
                                onMouseEnter={btnPrimary.hover}
                                onMouseLeave={btnPrimary.leave}
                            >
                                Simpan {selectedSiswaIds.length > 0 && `(${selectedSiswaIds.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}