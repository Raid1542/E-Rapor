/**
 * Nama File: siswa_per_kelas_client.tsx
 * Path: /admin/data-kelas/[id]/siswa
 * Fungsi: Menampilkan daftar siswa dalam kelas tertentu (Master-First Concept)
 * Update: Menyamakan tampilan (warna, bentuk tombol, tabel grid, animasi) dengan
 *         data_guru_client.tsx / data_pembina_ekskul_client.tsx / data_kelas_client.tsx /
 *         data_tahun_ajaran_client.tsx / data_sekolah_client.tsx. Hanya lapisan UI
 *         yang diubah — semua logika, state, dan pemanggilan API tetap sama persis.
 */

'use client';
import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    X, Search, ArrowLeft, CheckCircle2, AlertCircle,
    WifiOff, ShieldAlert, Users, Plus, Trash2, Lock, GraduationCap,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ✅ PERUBAHAN 1: Tambahkan konstanta API_BASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const GRID_COLS = 'minmax(56px,0.5fr) minmax(180px,2.3fr) minmax(100px,1fr) minmax(100px,1fr) minmax(70px,0.6fr) minmax(150px,1.4fr)';

const labelColor = { color: '#7a3a0a' };

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

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

// ─── SISTEM TOMBOL AKSI ────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent' | 'danger';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
    accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
    danger: { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
};

const ActionButton = ({
    onClick, children, variant = 'neutral', size = 'md', disabled = false, fullWidth = false, title,
}: {
    onClick?: () => void; children: ReactNode; variant?: BtnVariant; size?: 'md' | 'sm';
    disabled?: boolean; fullWidth?: boolean; title?: string;
}) => {
    const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
    return (
        <button
            type="button"
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

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

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
                    <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>
                        {s.icon}
                    </div>
                    <div className="text-center w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                    </div>
                    {isConfirm ? (
                        <div className="flex gap-2.5 w-full mt-1">
                            <button onClick={onClose} className="btn-action flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors" style={{ borderColor: '#e5e7eb', color: '#4b5563', background: '#fff' }}>Batal</button>
                            <button onClick={() => { modal.onConfirm?.(); onClose(); }} className="btn-action flex-1 text-white font-bold py-2.5 rounded-xl transition-colors text-sm" style={{ background: '#dc2626', boxShadow: '0 4px 14px rgba(220,38,38,0.30)' }}>Ya, Keluarkan</button>
                        </div>
                    ) : (
                        <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>
                            OK, Mengerti
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";

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

    const [kelasInfo, setKelasInfo] = useState<KelasInfo | null>(null);
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'nama-asc' | 'nama-desc' | 'nis-asc'>('nama-asc');
    const [filterGender, setFilterGender] = useState<'all' | 'Laki-laki' | 'Perempuan'>('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [showAssign, setShowAssign] = useState(false);
    const [availableSiswa, setAvailableSiswa] = useState<Siswa[]>([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [searchAvailable, setSearchAvailable] = useState('');
    const [selectedSiswaIds, setSelectedSiswaIds] = useState<number[]>([]);
    const [assignClosing, setAssignClosing] = useState(false);

    // ── FETCH FUNCTIONS ──────────────────────────────────────────────────────

    const fetchKelasInfo = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // ✅ PERUBAHAN 2: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/kelas/${kelasId}`, {
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
                    id_tahun_ajaran_induk: data.data.id_tahun_ajaran_induk || null,
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

            // ✅ PERUBAHAN 3: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/kelas/${kelasId}/siswa`, {
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
            
            if (kelasInfo?.id_tahun_ajaran_induk) {
                queryParams.append('tahun_ajaran_id', String(kelasInfo.id_tahun_ajaran_induk));
            }
            
            if (search) queryParams.append('search', search);

            // ✅ PERUBAHAN 4: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/siswa/available?${queryParams.toString()}`, {
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
    }, [kelasInfo?.id_tahun_ajaran_induk]);

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
            // ✅ PERUBAHAN 5: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/kelas/${kelasId}/assign-siswa`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({
                    siswa_ids: selectedSiswaIds,
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
                    if (kelasInfo?.id_tahun_ajaran_induk) {
                        queryParams.append('tahun_ajaran_id', String(kelasInfo.id_tahun_ajaran_induk));
                    }

                    // ✅ PERUBAHAN 6: URL sekarang pakai API_BASE_URL
                    const res = await fetch(
                        `${API_BASE_URL}/api/admin/kelas/${kelasId}/siswa/${siswa.id_siswa}?${queryParams.toString()}`,
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

        range.forEach((p) => {
            if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-xs">…</span>); }
            else {
                pages.push(
                    <button key={p} onClick={() => setCurrentPage(p)}
                        className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
                        style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}
                    >{p}</button>
                );
            }
        });

        return pages;
    };

    if (loading && !kelasInfo) {
        return (
            <div className="flex-1 min-h-screen p-3 sm:p-6 flex items-center justify-center" style={PAGE_BG}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                    <span className="text-sm font-semibold" style={{ color: ACCENT_DARK }}>Memuat data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="mb-4 sm:mb-5 anim-in d1">
                <button
                    onClick={() => router.push(`/admin/data_kelas_siswa${kelasInfo?.tahun_ajaran_id ? `?ta=${kelasInfo.tahun_ajaran_id}` : ''}`)}
                    className="btn-action inline-flex items-center gap-1.5 text-sm font-bold mb-3 transition-all"
                    style={{ color: ACCENT_DARK }}
                >
                    <ArrowLeft size={15} />
                    <span>Kembali</span>
                </button>

                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelas {kelasInfo?.nama_kelas || '...'}</h1>
            </div>

            <div className="card-flat bg-white rounded-2xl px-4 sm:px-5 py-3.5 mb-4 flex flex-wrap items-center gap-3 anim-in d2" style={CARD_STYLE}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                    <GraduationCap size={16} style={{ color: ACCENT_DARK }} />
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    <span style={labelColor}>
                        Wali Kelas: <strong className="text-gray-800">{kelasInfo?.wali_kelas || '-'}</strong>
                    </span>
                    <span style={labelColor}>
                        Fase: <strong className="text-gray-800">{kelasInfo?.fase || '-'}</strong>
                    </span>
                </div>

                {kelasInfo?.is_read_only && (
                    <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ml-auto whitespace-nowrap"
                        style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                    >
                        <Lock size={12} /> Data Terkunci
                    </span>
                )}
            </div>

            {kelasInfo?.is_read_only && (
                <div className="mb-4 p-4 rounded-2xl flex items-start gap-3 anim-in d3" style={{ background: '#fffbeb', border: '1.5px solid #fcd34d' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
                        <Lock size={17} className="text-amber-700" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-amber-900 mb-1">Data Siswa Terkunci (Read-Only)</h3>
                        <p className="text-xs text-amber-800 leading-relaxed">
                            Penilaian <strong>{kelasInfo.locked_by}</strong> semester <strong>{kelasInfo.locked_semester}</strong> telah diarsipkan dan dikunci.
                            Siswa tidak dapat ditambah atau dikeluarkan dari kelas sampai tahun ajaran berakhir. Data siswa yang sudah ada tetap dapat dilihat dan dicari.
                        </p>
                    </div>
                </div>
            )}

            <div className={`card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in ${kelasInfo?.is_read_only ? 'd4' : 'd3'}`} style={CARD_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex-shrink-0">
                        {kelasInfo?.is_aktif && !kelasInfo?.is_read_only ? (
                            <ActionButton variant="primary" onClick={openAssignModal}>
                                <Plus size={16} /> <span className="hidden sm:inline">Tambah Siswa</span><span className="sm:hidden">Tambah</span>
                            </ActionButton>
                        ) : (
                            <span className="text-xs text-gray-400 italic">
                                {kelasInfo?.is_read_only ? 'Data terkunci, tidak dapat menambah siswa' : 'Kelas ini tidak aktif'}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
                        <div className="relative w-full xs:w-auto sm:w-56 flex-shrink-0">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                            </div>
                            <input type="text" placeholder="Cari siswa..." value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button type="button" aria-label="Bersihkan pencarian" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                    className="absolute inset-y-0 right-2.5 flex items-center" style={{ color: ACCENT }}>
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <select
                            value={filterGender}
                            onChange={(e) => { setFilterGender(e.target.value as any); setCurrentPage(1); }}
                            className="border rounded-lg px-2.5 py-2 text-xs font-bold outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200"
                            style={labelColor}
                        >
                            <option value="all">Semua Gender</option>
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="border rounded-lg px-2.5 py-2 text-xs font-bold outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200"
                            style={labelColor}
                        >
                            <option value="nama-asc">Nama (A-Z)</option>
                            <option value="nama-desc">Nama (Z-A)</option>
                            <option value="nis-asc">NIS</option>
                        </select>

                        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>Tampilkan</span>
                            <select value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>data</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`card-flat bg-white rounded-2xl overflow-hidden anim-in ${kelasInfo?.is_read_only ? 'd5' : 'd4'}`} style={CARD_STYLE}>
                <div className="overflow-x-auto">
                    <div style={{ width: '100%', minWidth: '740px' }}>
                        <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                            <div className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Nama Siswa</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NIS</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NISN</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">L/P</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Aksi</div>
                        </div>

                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0' }}>
                                    {Array.from({ length: 6 }).map((__, j) => (
                                        <div key={j} className="px-4 py-4 flex items-center justify-center">
                                            <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 1 ? '85%' : '55%' }} />
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : currentSiswa.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Users size={32} className="text-gray-300" />
                                    <p className="text-sm font-semibold text-gray-500">
                                        {searchQuery || filterGender !== 'all' ? 'Tidak ada siswa yang sesuai filter' : 'Belum ada siswa di kelas ini'}
                                    </p>
                                </div>
                            </div>
                        ) : currentSiswa.map((siswa, index) => (
                            <div key={siswa.id_siswa} className="grid row-in row-hover border-b transition-colors"
                                style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0', background: '#fff', animationDelay: `${Math.min(index, 8) * 0.03}s` }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-400">{startIndex + index + 1}</div>

                                <div className="px-4 py-4 flex items-center overflow-hidden">
                                    <p className="font-bold text-gray-900 truncate" title={siswa.nama_lengkap}>{highlightText(siswa.nama_lengkap, searchQuery)}</p>
                                </div>

                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">{highlightText(siswa.nis, searchQuery)}</div>
                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">{highlightText(siswa.nisn || '-', searchQuery)}</div>

                                <div className="px-4 py-4 flex items-center justify-center">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold" style={{ background: '#fff5eb', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>
                                        {formatGender(siswa.jenis_kelamin) === 'Laki-laki' ? 'L' : 'P'}
                                    </span>
                                </div>

                                <div className="px-4 py-4 flex items-center justify-center">
                                    {kelasInfo?.is_aktif && !kelasInfo?.is_read_only ? (
                                        <ActionButton size="sm" variant="danger" onClick={() => handleKeluarkan(siswa)} title="Keluarkan dari kelas">
                                            <Trash2 size={13} /> Hapus
                                        </ActionButton>
                                    ) : kelasInfo?.is_read_only ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }} title="Data terkunci karena penilaian telah diarsipkan">
                                            <Lock size={11} /> Terkunci
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
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

            {showAssign && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 transition-opacity duration-200 ${assignClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeAssignModal(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col transform transition-all duration-200 overflow-hidden ${assignClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>

                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0" style={{ background: BRAND_GRADIENT }}>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-bold text-white truncate">Tambah Siswa ke Kelas {kelasInfo?.nama_kelas}</h2>
                                <p className="text-xs text-white/80 mt-0.5">Pilih siswa yang belum memiliki kelas</p>
                            </div>
                            <button onClick={closeAssignModal} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari nama, NIS, atau NISN..."
                                    value={searchAvailable}
                                    onChange={(e) => setSearchAvailable(e.target.value)}
                                    className={inputCls + ' pl-8 pr-8'}
                                />
                                {searchAvailable && (
                                    <button type="button" onClick={() => setSearchAvailable('')}
                                        className="absolute inset-y-0 right-2.5 flex items-center" style={{ color: ACCENT }}>
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-between mb-3">
                                <div className="flex gap-2">
                                    <ActionButton size="sm" variant="accent" onClick={selectAllAvailable}>
                                        Pilih Semua
                                    </ActionButton>
                                    <ActionButton size="sm" variant="neutral" onClick={deselectAll}>
                                        Batal Semua
                                    </ActionButton>
                                </div>
                                <div className="text-xs font-bold" style={{ color: ACCENT_DARK }}>
                                    <span className="text-sm">{selectedSiswaIds.length}</span> dipilih
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#f0f0f0' }}>
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
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#fff5eb' }}>
                                                <Users className="w-6 h-6" style={{ color: ACCENT_DARK }} />
                                            </div>
                                            <p className="text-sm font-bold text-gray-700">
                                                {searchAvailable ? 'Tidak ada siswa yang cocok' : 'Tidak ada siswa tersedia'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {searchAvailable ? 'Coba ubah kata kunci pencarian' : 'Semua siswa sudah memiliki kelas'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-y-auto">
                                        <table className="w-full text-sm border-collapse">
                                            <thead className="sticky top-0" style={{ background: '#fafafa' }}>
                                                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
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
                                                    <th className="px-3 py-2 text-left text-xs font-bold" style={labelColor}>Nama</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold" style={labelColor}>NIS</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold" style={labelColor}>NISN</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold" style={labelColor}>L/P</th>
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
                                                                background: isSelected ? '#fff5eb' : (idx % 2 === 0 ? '#fff' : '#fafafa'),
                                                                borderBottom: '1px solid #f0f0f0'
                                                            }}
                                                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fff8f2'; }}
                                                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'; }}
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
                                                            <td className="px-3 py-2.5 font-bold text-gray-800">{siswa.nama_lengkap}</td>
                                                            <td className="px-3 py-2.5 text-center text-gray-600 font-mono text-xs">{siswa.nis}</td>
                                                            <td className="px-3 py-2.5 text-center text-gray-600 font-mono text-xs">{siswa.nisn || '-'}</td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-bold" style={{ background: '#fff5eb', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>
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

                        <div className="flex justify-end gap-2.5 px-4 sm:px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                            <ActionButton variant="neutral" onClick={closeAssignModal}>Batal</ActionButton>
                            <ActionButton variant="primary" disabled={selectedSiswaIds.length === 0} onClick={executeAssign}>
                                Simpan {selectedSiswaIds.length > 0 && `(${selectedSiswaIds.length})`}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}