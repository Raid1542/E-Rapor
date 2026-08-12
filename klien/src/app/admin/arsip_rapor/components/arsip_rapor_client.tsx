/**
 * Nama File: ArsipRaporPage.tsx
 * Fungsi: Halaman arsip rapor untuk admin
 * UPDATE:
 *   - ✅ FIXED: Persistensi localStorage (sama persis Data Pembelajaran)
 *   - ✅ FIXED: Auto-select aktif HANYA jika tidak ada data di localStorage
 *   - ✅ FIXED: Saat kembali ke fitur, tetap menampilkan pilihan user sebelumnya
 *   - ✅ FIXED: Race condition dihindari dengan parameter langsung ke fetch
 *   - ✅ FIXED: Sentinel value "" untuk tandai user sengaja kosongkan
 *   - Card 1: Filter TA + Semester + Jenis (compact satu baris)
 *   - Card 2: Panel Status (terpisah, menonjol)
 *   - Card 3: Toolbar Kelas + Search
 *   - Card 4: Tabel siswa + info unduhan
 */

'use client';
import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
    Download, Search, X, CheckCircle2, AlertCircle, WifiOff,
    ShieldAlert, Lock, Play, Pause, FileText, Calendar, CalendarRange
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

interface TahunAjaran {
    id: number;
    tahun_ajaran: string;
    is_aktif: boolean;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ar-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ar-scaleIn">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ar-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                {isConfirm ? (
                    <div className="flex gap-3 w-full">
                        <BtnBatal onClick={onClose} />
                        <button onClick={() => { modal.onConfirm?.(); onClose(); }}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                        >Ya, Lanjutkan</button>
                    </div>
                ) : (
                    <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
                )}
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG = { background: '#ffffff' };
const CARD_STYLE = { border: '1px solid #f0e0d0', boxShadow: '0 4px 20px rgba(180,70,10,0.10)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const selectCls = "border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[200px]";

const btnPrimary = {
    base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const BtnBatal = ({ onClick, children = 'Batal', disabled }: { onClick: () => void; children?: React.ReactNode; disabled?: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ background: '#fef2f2', border: '1.5px solid #f87171', color: '#b91c1c', boxShadow: '0 1px 4px rgba(239,68,68,0.18)' }}
        onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; } }}
        onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; } }}
    >
        {children}
    </button>
);

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
    const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;
    const { showSessionExpired, handleLogout } = useSession();

    // ── States ─────────────────────────────────────────────────────────────────
    const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
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

    const getToken = (): string | null => localStorage.getItem('token');

    // ── Fetch Functions ────────────────────────────────────────────────────────

    const fetchTahunAjaranList = useCallback(async () => {
        setLoadingTA(true);
        try {
            const token = getToken();
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
                ) as TahunAjaran[];

                setTahunAjaranList(uniqueTA);
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoadingTA(false);
        }
    }, [showModal]);

    const fetchSemesterByTahunAjaran = useCallback(async (idInduk: number): Promise<SemesterOption[]> => {
        try {
            const token = getToken();
            if (!token) return [];

            const [semRes, taRes] = await Promise.all([
                fetch(`${API_BASE}/admin/semester-list`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/admin/tahun-ajaran`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const semData = await semRes.json();
            const taData = await taRes.json();

            if (semRes.ok && semData.success) {
                const semesters = semData.data
                    .filter((sem: any) => sem.id_induk === idInduk)
                    .map((sem: any) => ({
                        id: sem.id,
                        semester: sem.semester,
                        is_aktif: sem.is_aktif,
                        status_pts: 'nonaktif' as StatusPenilaian,
                        status_pas: 'nonaktif' as StatusPenilaian,
                    }));

                // Ambil status PTS/PAS
                if (taRes.ok && taData.success) {
                    const taInfo = taData.data.find((t: any) => t.id_induk === idInduk);
                    if (taInfo) {
                        semesters.forEach(sem => {
                            if (sem.semester === 'Ganjil') {
                                sem.status_pts = taInfo.status_pts_ganjil || 'nonaktif';
                                sem.status_pas = taInfo.status_pas_ganjil || 'nonaktif';
                            } else if (sem.semester === 'Genap') {
                                sem.status_pts = taInfo.status_pts_genap || 'nonaktif';
                                sem.status_pas = taInfo.status_pas_genap || 'nonaktif';
                            }
                        });
                    }
                }

                setSemesterOptions(semesters);
                return semesters;
            }
            return [];
        } catch (err) {
            console.error('Error fetch semester:', err);
            return [];
        }
    }, []);

    const fetchKelas = useCallback(async (idInduk: number, semester: string) => {
        setLoadingKelas(true);
        setKelasList([]);
        try {
            const token = getToken();
            if (!token) return;

            const res = await fetch(
                `${API_BASE}/admin/arsip-rapor/kelas?tahun_ajaran_id=${idInduk}&semester=${semester}`,
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
    }, []);

    const fetchSiswa = useCallback(async (idInduk: number, kelasId: number, semester: string) => {
        setLoadingSiswa(true);
        setSiswaList([]);
        try {
            const token = getToken();
            if (!token) return;

            const res = await fetch(
                `${API_BASE}/admin/arsip-rapor/daftar-siswa/${idInduk}/${kelasId}?semester=${semester}`,
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
    }, []);

    // ── useEffect: Load awal ───────────────────────────────────────────────────

    useEffect(() => {
        fetchTahunAjaranList();
    }, [fetchTahunAjaranList]);

    // ✅ FIXED: Load dari localStorage - PRIORITAS: localStorage > auto-select aktif
    // ✅ FIXED: Bedakan "belum pernah" (null) vs "sengaja kosong" ("")
    useEffect(() => {
        if (tahunAjaranList.length > 0 && selectedTA === null) {
            const savedTA = localStorage.getItem('arsip_selectedTA');
            const savedSemester = localStorage.getItem('arsip_selectedSemester');
            const savedJenis = localStorage.getItem('arsip_selectedJenis');
            const savedKelas = localStorage.getItem('arsip_selectedKelas');

            // ✅ PERBAIKAN: Cek apakah user pernah memilih (termasuk sengaja kosongkan)
            // null = belum pernah memilih → auto-select yang aktif
            // "" = sengaja kosongkan → JANGAN auto-select
            // "1", "2", dll = user memilih value tertentu → load value tersebut
            const hasUserMadeTAChoice = savedTA !== null;

            let taToSelect: TahunAjaran | undefined;

            if (hasUserMadeTAChoice) {
                // User sudah pernah memilih (bisa kosong atau ada value)
                if (savedTA !== '') {
                    const id = Number(savedTA);
                    taToSelect = tahunAjaranList.find(t => t.id === id);
                }
                // Jika savedTA === '', biarkan taToSelect undefined (tidak auto-select)
            } else {
                // User belum pernah memilih → auto-select yang aktif
                taToSelect = tahunAjaranList.find(t => t.is_aktif);
            }

            if (taToSelect) {
                setSelectedTA(taToSelect.id);
                localStorage.setItem('arsip_selectedTA', taToSelect.id.toString());

                // Fetch semester lalu auto-select
                fetchSemesterByTahunAjaran(taToSelect.id).then((semesters) => {
                    if (semesters.length === 0) return;

                    let semToSelect: SemesterOption | undefined;

                    // ✅ PERBAIKAN: Cek apakah user pernah memilih semester
                    const hasUserMadeSemesterChoice = savedSemester !== null;

                    if (hasUserMadeSemesterChoice) {
                        if (savedSemester !== '') {
                            const semId = Number(savedSemester);
                            semToSelect = semesters.find(s => s.id === semId);
                        }
                    } else {
                        // Auto-select yang aktif
                        semToSelect = semesters.find(s => s.is_aktif);
                    }

                    // ✅ PRIORITAS 3: Fallback ke semester pertama
                    if (!semToSelect && semesters.length > 0) {
                        semToSelect = semesters[0];
                    }

                    if (semToSelect) {
                        setSelectedSemesterId(semToSelect.id);
                        setSelectedSemester(semToSelect.semester);
                        localStorage.setItem('arsip_selectedSemester', semToSelect.id.toString());

                        // ✅ PRIORITAS 1: Auto-select jenis dari localStorage
                        let jenisToSelect: 'PTS' | 'PAS' | null = null;

                        const hasUserMadeJenisChoice = savedJenis !== null;

                        if (hasUserMadeJenisChoice) {
                            if (savedJenis === 'PTS' || savedJenis === 'PAS') {
                                jenisToSelect = savedJenis as 'PTS' | 'PAS';
                            }
                            // Jika savedJenis === '', biarkan null
                        } else {
                            // Auto-select jenis aktif
                            if (semToSelect.status_pas === 'aktif') {
                                jenisToSelect = 'PAS';
                            } else if (semToSelect.status_pts === 'aktif') {
                                jenisToSelect = 'PTS';
                            } else if (semToSelect.status_pas === 'selesai') {
                                jenisToSelect = 'PAS';
                            } else if (semToSelect.status_pts === 'selesai') {
                                jenisToSelect = 'PTS';
                            }
                        }

                        if (jenisToSelect) {
                            setSelectedJenis(jenisToSelect);
                            localStorage.setItem('arsip_selectedJenis', jenisToSelect);
                        }

                        // Fetch kelas
                        fetchKelas(taToSelect!.id, semToSelect.semester);

                        // ✅ PRIORITAS: Auto-select kelas dari localStorage
                        const hasUserMadeKelasChoice = savedKelas !== null;
                        if (hasUserMadeKelasChoice && savedKelas !== '') {
                            const kelasId = Number(savedKelas);
                            setSelectedKelas(kelasId);
                            localStorage.setItem('arsip_selectedKelas', kelasId.toString());
                            fetchSiswa(taToSelect!.id, kelasId, semToSelect.semester);
                        }
                    }
                });
            }
        }
    }, [tahunAjaranList]);

    // ── Handler: Pilih Tahun Ajaran ────────────────────────────────────────────

    const handleTahunAjaranChange = async (value: string) => {
        if (value === '' || value === 'no-data') {
            setSelectedTA(null);
            setSelectedSemesterId(null);
            setSelectedSemester(null);
            setSelectedJenis(null);
            setSelectedKelas(null);
            setSemesterOptions([]);
            setKelasList([]);
            setSiswaList([]);

            // ✅ PERBAIKAN: Simpan string kosong (bukan hapus) untuk tandai "user sengaja kosongkan"
            localStorage.setItem('arsip_selectedTA', '');
            localStorage.setItem('arsip_selectedSemester', '');
            localStorage.setItem('arsip_selectedJenis', '');
            localStorage.setItem('arsip_selectedKelas', '');
            return;
        }

        const id = Number(value);
        setSelectedTA(id);
        setSelectedSemesterId(null);
        setSelectedSemester(null);
        setSelectedJenis(null);
        setSelectedKelas(null);
        setKelasList([]);
        setSiswaList([]);
        localStorage.setItem('arsip_selectedTA', id.toString());
        localStorage.setItem('arsip_selectedSemester', '');  // Reset semester saat ganti TA
        localStorage.setItem('arsip_selectedJenis', '');
        localStorage.setItem('arsip_selectedKelas', '');

        const semesters = await fetchSemesterByTahunAjaran(id);

        // ✅ Auto-select semester aktif (karena user ganti TA manual)
        const activeSem = semesters.find(s => s.is_aktif) || semesters[0];
        if (activeSem) {
            setSelectedSemesterId(activeSem.id);
            setSelectedSemester(activeSem.semester);
            localStorage.setItem('arsip_selectedSemester', activeSem.id.toString());

            // ✅ Auto-select jenis penilaian aktif
            let jenisToSelect: 'PTS' | 'PAS' | null = null;
            if (activeSem.status_pas === 'aktif') {
                jenisToSelect = 'PAS';
            } else if (activeSem.status_pts === 'aktif') {
                jenisToSelect = 'PTS';
            } else if (activeSem.status_pas === 'selesai') {
                jenisToSelect = 'PAS';
            } else if (activeSem.status_pts === 'selesai') {
                jenisToSelect = 'PTS';
            }

            if (jenisToSelect) {
                setSelectedJenis(jenisToSelect);
                localStorage.setItem('arsip_selectedJenis', jenisToSelect);
            }

            fetchKelas(id, activeSem.semester);
        }
    };

    // ── Handler: Pilih Semester ────────────────────────────────────────────────

    const handleSemesterChange = (value: string) => {
        if (value === '' || value === 'no-data') {
            setSelectedSemesterId(null);
            setSelectedSemester(null);
            setSelectedJenis(null);
            setSelectedKelas(null);
            setKelasList([]);
            setSiswaList([]);

            // ✅ PERBAIKAN: Simpan string kosong (bukan hapus)
            localStorage.setItem('arsip_selectedSemester', '');
            localStorage.setItem('arsip_selectedJenis', '');
            localStorage.setItem('arsip_selectedKelas', '');
            return;
        }

        const id = Number(value);
        const sem = semesterOptions.find(s => s.id === id);

        setSelectedSemesterId(id);
        setSelectedSemester(sem?.semester || null);
        setSelectedJenis(null);
        setSelectedKelas(null);
        setKelasList([]);
        setSiswaList([]);
        localStorage.setItem('arsip_selectedSemester', id.toString());
        localStorage.setItem('arsip_selectedJenis', '');  // Reset jenis saat ganti semester
        localStorage.setItem('arsip_selectedKelas', '');

        if (sem && selectedTA) {
            // ✅ Auto-select jenis penilaian aktif
            let jenisToSelect: 'PTS' | 'PAS' | null = null;
            if (sem.status_pas === 'aktif') {
                jenisToSelect = 'PAS';
            } else if (sem.status_pts === 'aktif') {
                jenisToSelect = 'PTS';
            } else if (sem.status_pas === 'selesai') {
                jenisToSelect = 'PAS';
            } else if (sem.status_pts === 'selesai') {
                jenisToSelect = 'PTS';
            }

            if (jenisToSelect) {
                setSelectedJenis(jenisToSelect);
                localStorage.setItem('arsip_selectedJenis', jenisToSelect);
            }

            fetchKelas(selectedTA, sem.semester);
        }
    };

    // ── Handler: Pilih Jenis Penilaian ─────────────────────────────────────────

    const handleJenisChange = (value: string) => {
        if (value === '' || value === 'no-data') {
            setSelectedJenis(null);
            setSelectedKelas(null);
            setSiswaList([]);

            // ✅ PERBAIKAN: Simpan string kosong (bukan hapus)
            localStorage.setItem('arsip_selectedJenis', '');
            localStorage.setItem('arsip_selectedKelas', '');
            return;
        }

        const jenis = value as 'PTS' | 'PAS';
        setSelectedJenis(jenis);
        setSelectedKelas(null);
        setSiswaList([]);
        localStorage.setItem('arsip_selectedJenis', jenis);
        localStorage.setItem('arsip_selectedKelas', '');  // Reset kelas saat ganti jenis
    };

    // ── Handler: Pilih Kelas ───────────────────────────────────────────────────

    const handleKelasChange = (value: string) => {
        if (value === '' || value === 'no-data') {
            setSelectedKelas(null);
            setSiswaList([]);

            // ✅ PERBAIKAN: Simpan string kosong (bukan hapus)
            localStorage.setItem('arsip_selectedKelas', '');
            return;
        }

        const id = Number(value);
        setSelectedKelas(id);
        localStorage.setItem('arsip_selectedKelas', id.toString());

        if (selectedTA && selectedSemester) {
            fetchSiswa(selectedTA, id, selectedSemester);
        }
    };

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

    // ── Handlers: Status & Arsip ───────────────────────────────────────────────

    const handleUbahStatus = async (statusBaru: StatusPenilaian) => {
        if (!selectedTA || !selectedJenis || !selectedSemester) return;

        setLoadingAction(true);
        try {
            const token = getToken();
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
            const token = getToken();
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

        const token = getToken();
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

            {/* ====================================================================
                CARD 1: Filter Tahun Ajaran + Semester + Jenis Penilaian
            ==================================================================== */}
            <div className="bg-white rounded-2xl px-5 py-3.5 mb-5 flex flex-wrap items-center gap-5" style={CARD_STYLE}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff0e5' }}>
                        <CalendarRange size={16} style={{ color: '#c95b08' }} />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
                            Tahun Ajaran
                        </label>
                        <select
                            value={selectedTA ?? ''}
                            onChange={(e) => handleTahunAjaranChange(e.target.value)}
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
                </div>

                {selectedTA !== null && (
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
                            Semester
                        </label>
                        <select
                            value={selectedSemesterId ?? ''}
                            onChange={(e) => handleSemesterChange(e.target.value)}
                            className={selectCls}
                        >
                            <option value="">-- Pilih Semester --</option>
                            {semesterOptions.map(sem => (
                                <option key={sem.id} value={sem.id}>
                                    {sem.semester} {sem.is_aktif ? '(Aktif)' : ''}
                                </option>
                            ))}
                        </select>

                        {selectedSemesterId && currentSemester && (
                            currentSemester.is_aktif ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                                    style={{ background: '#d4f0dd', color: '#1a7a3a', border: '1px solid #86efac' }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                    Aktif
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                                    style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}>
                                    <Lock size={12} />
                                    Nonaktif
                                </span>
                            )
                        )}
                    </div>
                )}

                {selectedTA !== null && selectedSemesterId !== null && (
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
                            Jenis Penilaian
                        </label>
                        <select
                            value={selectedJenis ?? ''}
                            onChange={(e) => handleJenisChange(e.target.value)}
                            className={selectCls}
                        >
                            <option value="">-- Pilih Jenis --</option>
                            <option value="PTS">PTS (Penilaian Tengah Semester)</option>
                            <option value="PAS">PAS (Penilaian Akhir Semester)</option>
                        </select>
                    </div>
                )}
            </div>

            {selectedTA === null ? (
                <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                    <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                        <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Tahun Ajaran Terlebih Dahulu</p>
                    </div>
                </div>
            ) : selectedSemesterId === null ? (
                <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                    <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                        <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Semester Terlebih Dahulu</p>
                    </div>
                </div>
            ) : selectedJenis === null ? (
                <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                    <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                        <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Jenis Penilaian Terlebih Dahulu</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* ====================================================================
                        CARD 2: Panel Status
                    ==================================================================== */}
                    <div className="bg-white rounded-2xl overflow-hidden mb-5" style={CARD_STYLE}>
                        <div className="px-6 py-4 flex items-center justify-between" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Calendar size={18} />
                                Status Penilaian {selectedJenis}
                            </h2>
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
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

                        <div className="px-6 py-5">
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
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                                        style={{
                                            background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                                            boxShadow: '0 3px 10px rgba(22,163,74,0.25)'
                                        }}
                                    >
                                        <Play size={15} /> Aktifkan {selectedJenis}
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
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                                            style={{
                                                background: 'linear-gradient(135deg,#d97706,#f59e0b)',
                                                boxShadow: '0 3px 10px rgba(217,119,6,0.25)'
                                            }}
                                        >
                                            <Pause size={15} /> Nonaktifkan
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
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                                            style={{
                                                background: 'linear-gradient(135deg,#dc2626,#ef4444)',
                                                boxShadow: '0 3px 10px rgba(220,38,38,0.25)'
                                            }}
                                        >
                                            <Lock size={15} /> Arsipkan & Kunci
                                        </button>
                                    </>
                                )}

                                {statusSaatIni === 'selesai' && (
                                    <div
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                                        style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}
                                    >
                                        <Lock size={15} /> Data Terkunci Permanen
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                <p className="text-sm" style={{ color: '#7a3a0a' }}>
                                    <span className="font-semibold">ℹ️ Info: </span>
                                    {statusSaatIni === 'nonaktif' && `Penilaian ${selectedJenis} belum dibuka. Guru tidak bisa input nilai.`}
                                    {statusSaatIni === 'aktif' && `Penilaian ${selectedJenis} sedang aktif. Guru bisa input/edit nilai.`}
                                    {statusSaatIni === 'selesai' && `Penilaian ${selectedJenis} sudah ditutup dan dikunci. Data tidak bisa diubah.`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ====================================================================
                        CARD 3: Toolbar Kelas + Search
                    ==================================================================== */}
                    <div className="bg-white rounded-2xl px-5 py-3.5 mb-5 flex flex-wrap items-center justify-between gap-3" style={CARD_STYLE}>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
                                Kelas
                            </label>
                            {loadingKelas ? (
                                <div className="text-sm text-gray-400">Memuat kelas...</div>
                            ) : (
                                <select
                                    value={selectedKelas ?? ''}
                                    onChange={(e) => handleKelasChange(e.target.value)}
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

                        {selectedKelas !== null && (
                            <div className="relative min-w-[200px] sm:min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari siswa..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
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
                        )}
                    </div>

                    {selectedKelas === null ? (
                        <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                            <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                                <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Kelas Terlebih Dahulu</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ====================================================================
                                CARD 4: Tabel siswa
                            ==================================================================== */}
                            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                                <div className="px-5 py-2.5" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                                    <p className="text-xs" style={{ color: '#c95b08' }}>
                                        Menampilkan {filteredSiswa.length === 0 ? 0 : 1}–{filteredSiswa.length} dari {filteredSiswa.length} data
                                    </p>
                                </div>

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
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}