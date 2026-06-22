/**
 * Nama File: ArsipRaporPage.tsx
 * Fungsi: Cetak rapor siswa untuk admin menggunakan template Word
 * UPDATE: 
 *   - Dropdown filter lebih compact (grid layout)
 *   - Menggunakan styling dan animasi yang sama dengan RaporGuruKelasClient
 *   - Modal notifikasi dengan double circle icon
 *   - Tema oranye konsisten
 */

"use client";
import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
    FileText, Download, Play, Pause, Lock, Users,
    CheckCircle2, AlertCircle, WifiOff, ShieldAlert, X, Search, Calendar
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

type StatusPenilaian = 'nonaktif' | 'aktif' | 'selesai';

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes ar-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ar-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes ar-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .ar-fadeIn  { animation: ar-fadeIn  0.2s ease; }
    .ar-scaleIn { animation: ar-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .ar-pulse   { animation: ar-pulse   0.6s ease 0.15s; }
  `}</style>
);

// ─── NOTIF MODAL (UPDATED dengan desain double circle) ────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: {
        iconBg: 'bg-green-50',
        ring: 'ring-green-100',
        icon: (
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={64} className="text-green-500" />
                </div>
            </div>
        ),
        btn: 'bg-green-500 hover:bg-green-600'
    },
    error: {
        iconBg: 'bg-red-50',
        ring: 'ring-red-100',
        icon: (
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle size={64} className="text-red-500" />
                </div>
            </div>
        ),
        btn: 'bg-red-500 hover:bg-red-600'
    },
    warning: {
        iconBg: 'bg-orange-50',
        ring: 'ring-orange-100',
        icon: <ShieldAlert size={40} className="text-orange-500" />,
        btn: 'bg-orange-500 hover:bg-orange-600'
    },
    network: {
        iconBg: 'bg-slate-100',
        ring: 'ring-slate-200',
        icon: <WifiOff size={40} className="text-slate-500" />,
        btn: 'bg-slate-600 hover:bg-slate-700'
    },
    confirm: {
        iconBg: 'bg-orange-50',
        ring: 'ring-orange-100',
        icon: <ShieldAlert size={40} className="text-orange-500" />,
        btn: 'bg-orange-500 hover:bg-orange-600'
    },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 ar-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 flex flex-col items-center ar-scaleIn overflow-hidden">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                        <X size={20} />
                    </button>
                )}
                <div className="p-8 flex flex-col items-center gap-4 w-full">
                    <div className="mt-2">
                        {s.icon}
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                            {modal.message}
                        </p>
                    </div>
                    {isConfirm ? (
                        <div className="flex gap-3 w-full mt-2">
                            <button onClick={onClose}
                                className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >Batal</button>
                            <button onClick={() => { modal.onConfirm?.(); onClose(); }}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                            >Ya, Lanjutkan</button>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className={`w-full mt-4 ${s.btn} text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-lg hover:shadow-xl`}
                            style={modal.type === 'success' ? {
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                            } : modal.type === 'error' ? {
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                            } : {}}
                        >
                            OK, Mengerti
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const selectCls = "w-full border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200";

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface TahunAjaranInduk {
    id: number;
    tahun_ajaran: string;
    is_aktif?: boolean;
}

interface SemesterOption {
    id: number;
    semester: string;
    is_aktif: boolean;
    status_pts: StatusPenilaian;
    status_pas: StatusPenilaian;
}

interface Kelas {
    id_kelas: number;
    nama_kelas: string;
}

interface Siswa {
    id_siswa: number;
    nama: string;
    nis: string;
    nisn: string;
}

// ─── HELPER: STATUS STYLE ─────────────────────────────────────────────────────

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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ArsipRaporPage() {
    const API_BASE = 'http://localhost:5000/api';
    const { showSessionExpired, handleLogout } = useSession();

    // ── States ─────────────────────────────────────────────────────────────────
    const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaranInduk[]>([]);
    const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>([]);
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);

    const [selectedTA, setSelectedTA] = useState<number | null>(null);
    const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
    const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
    const [selectedJenis, setSelectedJenis] = useState<'PTS' | 'PAS' | null>(null);
    const [selectedKelas, setSelectedKelas] = useState<number | null>(null);

    const [loadingTA, setLoadingTA] = useState(true);
    const [loadingKelas, setLoadingKelas] = useState(false);
    const [loadingSiswa, setLoadingSiswa] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const [searchQuery, setSearchQuery] = useState('');

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // ── Fetch Functions ────────────────────────────────────────────────────────

    const fetchTahunAjaranList = async () => {
        setLoadingTA(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_BASE}/admin/tahun-ajaran`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.success) {
                const uniqueTA = Array.from(
                    new Map(data.data.map((item: any) => [item.id_induk, {
                        id: item.id_induk,
                        tahun_ajaran: item.tahun_ajaran,
                        is_aktif: item.status === 'AKTIF'
                    }])).values()
                ) as TahunAjaranInduk[];

                setTahunAjaranList(uniqueTA);

                const activeTA = uniqueTA.find(ta => ta.is_aktif);
                if (activeTA) {
                    setSelectedTA(prev => prev ?? activeTA.id);
                }
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoadingTA(false);
        }
    };

    const fetchSemesterByTahunAjaran = async (idInduk: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_BASE}/admin/semester-list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.success) {
                const semesters = data.data
                    .filter((sem: any) => sem.id_induk === idInduk)
                    .map((sem: any) => ({
                        id: sem.id,
                        semester: sem.semester,
                        is_aktif: sem.is_aktif,
                        status_pts: 'nonaktif' as StatusPenilaian,
                        status_pas: 'nonaktif' as StatusPenilaian,
                    }));

                const resTA = await fetch(`${API_BASE}/admin/tahun-ajaran`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const dataTA = await resTA.json();
                if (resTA.ok && dataTA.success) {
                    const taData = dataTA.data.find((t: any) => t.id_induk === idInduk);
                    if (taData) {
                        semesters.forEach(sem => {
                            if (sem.semester === 'Ganjil') {
                                sem.status_pts = taData.status_pts_ganjil || 'nonaktif';
                                sem.status_pas = taData.status_pas_ganjil || 'nonaktif';
                            } else if (sem.semester === 'Genap') {
                                sem.status_pts = taData.status_pts_genap || 'nonaktif';
                                sem.status_pas = taData.status_pas_genap || 'nonaktif';
                            }
                        });
                    }
                }

                setSemesterOptions(semesters);

                const activeSemester = semesters.find(s => s.is_aktif);
                if (activeSemester && !selectedSemesterId) {
                    setSelectedSemesterId(activeSemester.id);
                    setSelectedSemester(activeSemester.semester);
                }
            }
        } catch (err) {
            console.error('Error fetch semester:', err);
        }
    };

    const fetchKelas = async () => {
        if (!selectedTA || !selectedSemester) return;
        
        setLoadingKelas(true);
        setKelasList([]);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const res = await fetch(
                `${API_BASE}/admin/arsip-rapor/kelas?tahun_ajaran_id=${selectedTA}&semester=${selectedSemester}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            
            if (res.ok && data.success) {
                setKelasList(data.data || []);
            } else {
                setKelasList([]);
            }
        } catch {
            setKelasList([]);
        } finally {
            setLoadingKelas(false);
        }
    };

    const fetchSiswa = async () => {
        if (!selectedTA || !selectedKelas || !selectedSemester) return;
        
        setLoadingSiswa(true);
        setSiswaList([]);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const res = await fetch(
                `${API_BASE}/admin/arsip-rapor/daftar-siswa/${selectedTA}/${selectedKelas}?semester=${selectedSemester}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            
            if (res.ok && data.success) {
                setSiswaList(data.data || []);
            } else {
                setSiswaList([]);
            }
        } catch {
            setSiswaList([]);
        } finally {
            setLoadingSiswa(false);
        }
    };

    // ── Effects ───────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchTahunAjaranList();
    }, []);

    useEffect(() => {
        if (selectedTA) {
            fetchSemesterByTahunAjaran(selectedTA);
            setKelasList([]);
            setSiswaList([]);
            setSelectedKelas(null);
        } else {
            setSemesterOptions([]);
            setKelasList([]);
            setSiswaList([]);
            setSelectedSemesterId(null);
            setSelectedSemester(null);
            setSelectedKelas(null);
        }
    }, [selectedTA]);

    useEffect(() => {
        if (selectedSemesterId && selectedSemester) {
            fetchKelas();
            setSelectedKelas(null);
            setSiswaList([]);
        } else {
            setKelasList([]);
            setSelectedKelas(null);
            setSiswaList([]);
        }
    }, [selectedSemesterId, selectedSemester]);

    useEffect(() => {
        if (selectedKelas) {
            fetchSiswa();
        } else {
            setSiswaList([]);
        }
    }, [selectedKelas]);

    // ── Derived Data ───────────────────────────────────────────────────────────

    const currentSemester = semesterOptions.find(s => s.id === selectedSemesterId);
    const statusSaatIni: StatusPenilaian = selectedJenis === 'PTS'
        ? (currentSemester?.status_pts || 'nonaktif')
        : (currentSemester?.status_pas || 'nonaktif');
    const statusStyle = getStatusStyle(statusSaatIni);

    const filteredSiswa = siswaList.filter(s => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            s.nama.toLowerCase().includes(q) ||
            s.nis.toLowerCase().includes(q) ||
            s.nisn.toLowerCase().includes(q)
        );
    });

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleUbahStatus = async (statusBaru: StatusPenilaian) => {
        if (!selectedTA || !selectedJenis || !selectedSemester) return;

        setLoadingAction(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_BASE}/admin/atur-status-penilaian`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    jenis: selectedJenis,
                    status: statusBaru,
                    tahun_ajaran_id: selectedTA,
                    semester: selectedSemester
                })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                showModal({
                    type: 'success',
                    title: 'Status Diperbarui!',
                    message: result.message || `Status ${selectedJenis} berhasil diubah.`
                });
                if (selectedTA) await fetchSemesterByTahunAjaran(selectedTA);
            } else {
                showModal({
                    type: 'error',
                    title: 'Gagal Mengubah Status',
                    message: result.message || 'Terjadi kesalahan.'
                });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleArsipkan = async () => {
        if (!selectedTA || !selectedJenis || !selectedSemester) return;

        setLoadingAction(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_BASE}/admin/arsipkan-rapor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    jenis: selectedJenis,
                    semester: selectedSemester,
                    tahun_ajaran_id: selectedTA
                })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                showModal({
                    type: 'success',
                    title: 'Berhasil Diarsipkan!',
                    message: result.message || `${selectedJenis} berhasil diarsipkan dan dikunci.`
                });
                if (selectedTA) await fetchSemesterByTahunAjaran(selectedTA);
            } else {
                showModal({
                    type: 'error',
                    title: 'Gagal Mengarsipkan',
                    message: result.message || 'Terjadi kesalahan.'
                });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleDownloadRapor = async (siswaId: number, namaSiswa: string, nisn: string) => {
        if (!selectedSemesterId || !selectedJenis || !selectedSemester) {
            showModal({ type: 'warning', title: 'Data Tidak Lengkap', message: 'Pastikan semua filter sudah dipilih.' });
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
            return;
        }

        setDownloadingId(siswaId);
        try {
            const semester = selectedSemester.toLowerCase();
            const res = await fetch(
                `${API_BASE}/guru-kelas/generate-rapor/${siswaId}/${selectedJenis}/${semester}/${selectedSemesterId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Gagal mengunduh rapor (HTTP ${res.status})`);
            }

            const blob = await res.blob();
            const cleanNisn = (nisn || String(siswaId)).replace(/[^0-9]/g, '');
            const fileName = `Rapor_${selectedJenis}_${selectedSemester}_${cleanNisn}.docx`;

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

    // ── RENDER ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Arsip Rapor</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelola status penilaian dan unduh rapor siswa
                </p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                {/* Card Header */}
                <div className="px-6 py-4" style={HEADER_GRAD}>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Calendar size={18} />
                        Filter Arsip Rapor
                    </h2>
                </div>

                {/* ═══ FILTER SECTION - COMPACT LAYOUT ═══ */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    {/* Grid 3 kolom untuk TA, Semester, Jenis */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Tahun Ajaran */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>
                                Tahun Ajaran
                            </label>
                            <select
                                value={selectedTA ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || value === 'no-data') {
                                        setSelectedTA(null);
                                        return;
                                    }
                                    setSelectedTA(Number(value));
                                }}
                                className={selectCls}
                                disabled={loadingTA}
                            >
                                <option value="">-- Pilih Tahun Ajaran --</option>
                                {tahunAjaranList.map(ta => (
                                    <option key={ta.id} value={ta.id}>
                                        {ta.tahun_ajaran} {ta.is_aktif ? '(Aktif)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Semester */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>
                                Semester
                            </label>
                            <select
                                value={selectedSemesterId ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || value === 'no-data') {
                                        setSelectedSemesterId(null);
                                        setSelectedSemester(null);
                                        return;
                                    }
                                    const id = Number(value);
                                    const sem = semesterOptions.find(s => s.id === id);
                                    setSelectedSemesterId(id);
                                    setSelectedSemester(sem?.semester || null);
                                }}
                                className={selectCls}
                            >
                                <option value="">-- Pilih Semester --</option>
                                {semesterOptions.map(sem => (
                                    <option key={sem.id} value={sem.id}>
                                        {sem.semester} {sem.is_aktif ? '(Aktif)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Jenis Penilaian */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>
                                Jenis Penilaian
                            </label>
                            <select
                                value={selectedJenis ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value as 'PTS' | 'PAS' | '';
                                    setSelectedJenis(val || null);
                                }}
                                className={selectCls}
                            >
                                <option value="">-- Pilih Jenis --</option>
                                <option value="PTS">PTS</option>
                                <option value="PAS">PAS</option>
                            </select>
                        </div>
                    </div>

                    {/* Status Badge & Info */}
                    {selectedJenis && statusSaatIni && (
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4" style={{ borderTop: '1px dashed #fde0c8' }}>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
                                    Status:
                                </span>
                                <span
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                                    style={{
                                        background: statusStyle.bg,
                                        color: statusStyle.color,
                                        border: `1px solid ${statusStyle.border}`
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusStyle.dot }} />
                                    {statusStyle.icon}
                                    {statusStyle.text}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pesan jika belum pilih filter */}
                {selectedTA === null && (
                    <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                        <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Tahun Ajaran Terlebih Dahulu</p>
                    </div>
                )}

                {selectedTA !== null && selectedSemesterId === null && (
                    <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                        <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Semester Terlebih Dahulu</p>
                    </div>
                )}

                {selectedSemesterId !== null && selectedJenis === null && (
                    <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                        <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Jenis Penilaian Terlebih Dahulu</p>
                    </div>
                )}

                {/* ═══ PANEL STATUS & ACTION (hanya muncul jika jenis dipilih) ═══ */}
                {selectedJenis !== null && (
                    <>
                        {/* Panel Status */}
                        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8' }}>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div className="flex flex-wrap gap-2">
                                    {statusSaatIni === 'nonaktif' && (
                                        <button
                                            onClick={() => {
                                                showModal({
                                                    type: 'confirm',
                                                    title: `Aktifkan ${selectedJenis}?`,
                                                    message: `Guru akan bisa mulai menginput nilai ${selectedJenis} untuk semua kelas.\n\nLanjutkan?`,
                                                    onConfirm: () => handleUbahStatus('aktif')
                                                });
                                            }}
                                            disabled={loadingAction}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                                            style={{
                                                background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                                                boxShadow: '0 3px 10px rgba(22,163,74,0.25)'
                                            }}
                                        >
                                            <Play size={14} /> Aktifkan {selectedJenis}
                                        </button>
                                    )}

                                    {statusSaatIni === 'aktif' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    showModal({
                                                        type: 'confirm',
                                                        title: `Nonaktifkan ${selectedJenis}?`,
                                                        message: `Guru tidak akan bisa mengedit nilai ${selectedJenis} untuk sementara waktu.\n\nLanjutkan?`,
                                                        onConfirm: () => handleUbahStatus('nonaktif')
                                                    });
                                                }}
                                                disabled={loadingAction}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                                                style={{
                                                    background: 'linear-gradient(135deg,#d97706,#f59e0b)',
                                                    boxShadow: '0 3px 10px rgba(217,119,6,0.25)'
                                                }}
                                            >
                                                <Pause size={14} /> Nonaktifkan
                                            </button>

                                            <button
                                                onClick={() => {
                                                    showModal({
                                                        type: 'confirm',
                                                        title: `⚠️ Arsipkan & Kunci ${selectedJenis}?`,
                                                        message: `PERHATIAN!\n\nSetelah diarsipkan:\n• Data nilai ${selectedJenis} akan terkunci PERMANEN\n• Guru TIDAK BISA mengedit nilai lagi\n• Rapor bisa diunduh\n\nTindakan ini tidak dapat dibatalkan!`,
                                                        onConfirm: handleArsipkan
                                                    });
                                                }}
                                                disabled={loadingAction}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                                                style={{
                                                    background: 'linear-gradient(135deg,#dc2626,#ef4444)',
                                                    boxShadow: '0 3px 10px rgba(220,38,38,0.25)'
                                                }}
                                            >
                                                <Lock size={14} /> Arsipkan & Kunci
                                            </button>
                                        </>
                                    )}

                                    {statusSaatIni === 'selesai' && (
                                        <div
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                                            style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}
                                        >
                                            <Lock size={14} /> Data Terkunci Permanen
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                <p style={{ color: '#7a3a0a' }}>
                                    <span className="font-semibold">ℹ️ Info: </span>
                                    {statusSaatIni === 'nonaktif' && `Penilaian ${selectedJenis} belum dibuka. Guru tidak bisa input nilai.`}
                                    {statusSaatIni === 'aktif' && `Penilaian ${selectedJenis} sedang aktif. Guru bisa input/edit nilai dan rapor bisa diunduh.`}
                                    {statusSaatIni === 'selesai' && `Penilaian ${selectedJenis} sudah ditutup dan dikunci. Data tidak bisa diubah.`}
                                </p>
                            </div>
                        </div>

                        {/* ═══ DROPDOWN KELAS & SEARCH - GRID 2 KOLOM ═══ */}
                        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>
                                        Kelas
                                    </label>
                                    {loadingKelas ? (
                                        <div className="text-sm text-gray-400 py-1.5">Memuat kelas...</div>
                                    ) : (
                                        <select
                                            value={selectedKelas ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSelectedKelas(val ? Number(val) : null);
                                            }}
                                            className={selectCls}
                                        >
                                            <option value="">-- Pilih Kelas --</option>
                                            {kelasList.map((k, index) => (
                                                <option key={`kelas-${k.id_kelas}-${index}`} value={k.id_kelas}>
                                                    {k.nama_kelas}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>
                                        Cari Siswa
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Cari nama, NIS, atau NISN..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute inset-y-0 right-2 flex items-center"
                                                style={{ color: '#c95b08' }}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedKelas === null ? (
                            <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                                <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Kelas Terlebih Dahulu</p>
                            </div>
                        ) : (
                            <>

                                {/* Table */}
                                {loadingSiswa ? (
                                    <div className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                            <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data siswa...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[640px] text-sm border-collapse">
                                                <thead>
                                                    <tr style={TH_GRAD}>
                                                        {['No.', 'Nama Siswa', 'NIS', 'NISN', 'Aksi'].map(h => (
                                                            <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredSiswa.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                                                                {searchQuery ? 'Tidak ada siswa yang cocok dengan pencarian' : 'Tidak ada data siswa'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredSiswa.map((siswa, index) => (
                                                            <tr
                                                                key={siswa.id_siswa}
                                                                className="transition-colors"
                                                                style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                                                            >
                                                                <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{index + 1}</td>
                                                                <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama}</td>
                                                                <td className="px-5 py-3.5 text-center text-gray-600 font-mono">{siswa.nis}</td>
                                                                <td className="px-5 py-3.5 text-center text-gray-600 font-mono">{siswa.nisn || '—'}</td>
                                                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                                                    <button
                                                                        onClick={() => handleDownloadRapor(siswa.id_siswa, siswa.nama, siswa.nisn || '')}
                                                                        disabled={downloadingId === siswa.id_siswa}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                                        style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                                    >
                                                                        {downloadingId === siswa.id_siswa ? (
                                                                            <>
                                                                                <div className="w-3 h-3 rounded-full border-2 border-green-300 border-t-green-600 animate-spin" />
                                                                                Mengunduh...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Download size={13} /> Unduh Rapor
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Info Box */}
                                        <div className="px-5 py-4" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
                                            <div className="flex items-start gap-2">
                                                <FileText size={15} className="mt-0.5 shrink-0" style={{ color: '#c95b08' }} />
                                                <div>
                                                    <p className="text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Informasi Unduhan</p>
                                                    <ul className="text-xs space-y-0.5" style={{ color: '#c95b08' }}>
                                                        <li>• Rapor diunduh dalam format <strong>.docx</strong> (Microsoft Word)</li>
                                                        <li>• Buka dengan Microsoft Word atau LibreOffice untuk tampilan terbaik</li>
                                                        <li>• PAS Semester Genap mencantumkan status kenaikan kelas</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}