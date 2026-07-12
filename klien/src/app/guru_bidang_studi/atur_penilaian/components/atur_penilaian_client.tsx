/**
 * Nama File: atur_penilaian_gbs_client.tsx
 * Fungsi: Komponen klien untuk mengatur konfigurasi penilaian guru bidang studi
 * UPDATE:
 *   ✅ FIX: Perbaiki struktur JSX (fragment & ternary)
 *   ✅ HAPUS: Kolom Aksi di tabel
 *   ✅ UBAH: Tombol "Tambah Kategori" jadi "Edit Semua" (batch edit)
 *   - Sorting kategori dari nilai terbesar ke terkecil
 *   - Perbaiki border radius modal
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Pencil, Eye, X, Search, CheckCircle2, AlertCircle,
    WifiOff, ShieldAlert, LogOut, Lock, BookOpen,
    Users, GraduationCap, Trash2, Plus, FileText, TrendingUp,
    Save, AlertTriangle, Info
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-bidang-studi';

// ====== DESIGN TOKENS ======
const THEME = {
    colors: {
        primary: '#c95b08',
        secondary: '#e8690a',
        tertiary: '#f5870a',
        background: '#ffffff',
        border: '#fde0c8',
        text: {
            primary: '#15110d',
            secondary: '#5c5048',
            muted: '#a89a8c',
        },
    },
    gradients: {
        primary: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)',
        secondary: 'linear-gradient(135deg, #e8690a 0%, #f5870a 100%)',
        header: 'linear-gradient(120deg, #b6500a 0%, #e8690a 45%, #f5a623 100%)',
    },
    shadows: {
        sm: '0 1px 3px rgba(124, 68, 9, 0.06)',
        md: '0 6px 20px rgba(124, 68, 9, 0.10)',
    },
};

// ====== HELPER: Parse Error ======
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
    } catch (error) {
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

interface MapelItem {
    mata_pelajaran_id: number;
    nama_mapel: string;
    jenis: 'wajib' | 'pilihan';
}

interface KelasItem {
    kelas_id: number;
    nama_kelas: string;
}

interface KategoriAkademik {
    id: number;
    min_nilai: number;
    max_nilai: number;
    deskripsi: string;
    urutan: number;
}

interface KomponenPenilaian {
    id_komponen: number;
    nama_komponen: string;
    urutan: number;
}

interface BobotItem {
    komponen_id: number;
    bobot: number;
}

interface CoverageInfo {
    covered: boolean;
    gap?: string;
    gaps?: Array<{ aspek: string; gap: string }>;
}

// ✅ BARU: Tipe untuk batch edit
interface BatchKategoriItem {
    id?: number;
    min_nilai: number;
    max_nilai: number;
    deskripsi: string;
    isNew?: boolean;
}

// ====== GLOBAL STYLES ======
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.93) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
        .delay-1 { animation-delay: 0.06s; }
        .delay-2 { animation-delay: 0.12s; }
        .scale-in { animation: scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .fade-in { animation: fadeInUp 0.2s ease; }
        .pulse-anim { animation: pulse 0.6s ease; }
        .scrollbar-thin::-webkit-scrollbar { width: 5px; height: 5px; }
        .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #f0c9a0;
            border-radius: 10px;
        }
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 fade-in">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 scale-in">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} pulse-anim`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                {isConfirm ? (
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
                            style={{ borderColor: THEME.colors.border, color: '#7a3a0a', background: '#fff' }}
                        >Batal</button>
                        <button onClick={() => { modal.onConfirm?.(); onClose(); }}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                        >Ya</button>
                    </div>
                ) : (
                    <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
                )}
            </div>
        </div>
    );
};

// ====== COVERAGE WARNING ======
const CoverageWarning = ({ coverage }: { coverage: CoverageInfo | null }) => {
    if (!coverage || coverage.covered) return null;
    const gaps = coverage.gaps || (coverage.gap ? [{ aspek: 'Akademik', gap: coverage.gap }] : []);
    if (gaps.length === 0) return null;

    return (
        <div className="mb-5 p-4 rounded-xl flex items-start gap-3 animate-fade-in-up"
            style={{ background: '#fef3c7', border: '2px solid #fcd34d' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fde68a' }}>
                <AlertTriangle size={20} className="text-yellow-700" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold mb-2" style={{ color: '#78350f' }}>⚠️ Range Nilai 0-100 Belum Lengkap</p>
                {gaps.length === 1 ? (
                    <p className="text-xs" style={{ color: '#92400e' }}>
                        Ada gap pada <strong>{gaps[0].aspek}</strong> di rentang <strong className="px-2 py-0.5 rounded bg-yellow-200">{gaps[0].gap}</strong>.
                    </p>
                ) : (
                    <div className="text-xs" style={{ color: '#92400e' }}>
                        <p className="mb-2">Ditemukan {gaps.length} gap:</p>
                        <ul className="space-y-1 ml-4">
                            {gaps.map((g, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
                                    <span><strong>{g.aspek}:</strong> gap pada <strong className="px-1.5 py-0.5 rounded bg-yellow-200">{g.gap}</strong></span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

// ====== MAIN COMPONENT ======
export default function AturPenilaianGBSClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
    const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');

    const isPeriodNotActive = statusPTS !== 'aktif' && statusPAS !== 'aktif';
    const isPeriodLocked = statusPTS === 'selesai' && statusPAS === 'selesai';
    const isReadOnly = isPeriodNotActive || isPeriodLocked;

    const [activeTab, setActiveTab] = useState<'akademik' | 'bobot'>('akademik');
    const [loading, setLoading] = useState(true);

    const [mapelList, setMapelList] = useState<MapelItem[]>([]);
    const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);
    const [kelasListAkademik, setKelasListAkademik] = useState<KelasItem[]>([]);
    const [kelasListBobot, setKelasListBobot] = useState<KelasItem[]>([]);
    const [selectedKelasAkademik, setSelectedKelasAkademik] = useState<number | null>(null);
    const [selectedKelasBobot, setSelectedKelasBobot] = useState<number | null>(null);

    const [kategoriList, setKategoriList] = useState<KategoriAkademik[]>([]);
    const [kategoriLoading, setKategoriLoading] = useState(false);
    const [coverageInfo, setCoverageInfo] = useState<CoverageInfo | null>(null);

    // ✅ BARU: State untuk Batch Edit
    const [showBatchEdit, setShowBatchEdit] = useState(false);
    const [batchEditClosing, setBatchEditClosing] = useState(false);
    const [batchKategori, setBatchKategori] = useState<BatchKategoriItem[]>([]);
    const [originalBatchKategori, setOriginalBatchKategori] = useState<BatchKategoriItem[]>([]);
    const [isSavingBatch, setIsSavingBatch] = useState(false);

    const [selectedMapelAkademik, setSelectedMapelAkademik] = useState<number | null>(null);
    const [selectedMapelBobot, setSelectedMapelBobot] = useState<number | null>(null);

    const [bobotList, setBobotList] = useState<BobotItem[]>([]);
    const [bobotLoading, setBobotLoading] = useState(false);
    const initialBobotListRef = useRef<BobotItem[]>([]);

    const [isSavingBobot, setIsSavingBobot] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'save-bobot' | 'save-batch-kategori' | null>(null);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [isNotAssigned, setIsNotAssigned] = useState(false);

    // ====== FETCH DATA ======
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                    return;
                }

                const headers = { Authorization: `Bearer ${token}` };

                const [taRes, komponenRes, mapelRes] = await Promise.all([
                    fetch(`${API}/tahun-ajaran/aktif`, { headers }),
                    fetch(`${API}/atur-penilaian/komponen`, { headers }),
                    fetch(`${API}/atur-penilaian/mapel`, { headers }),
                ]);

                if (mapelRes.status === 403) {
                    setIsNotAssigned(true);
                    return;
                }

                if (!taRes.ok || !komponenRes.ok || !mapelRes.ok) {
                    const errRes = !taRes.ok ? taRes : !komponenRes.ok ? komponenRes : mapelRes;
                    const err = await parseBackendError(errRes);
                    throw new Error(err.message);
                }

                const [taData, komponenData, mapelData] = await Promise.all([
                    taRes.json(),
                    komponenRes.json(),
                    mapelRes.json(),
                ]);

                const { status_pts, status_pas } = taData.data;
                setStatusPTS(status_pts || 'nonaktif');
                setStatusPAS(status_pas || 'nonaktif');

                const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null;
                setJenisPenilaianAktif(jenisAktif);
                setKomponenList(komponenData.data || []);
                setMapelList(mapelData.data || []);

                if (mapelData.data?.length === 0) {
                    setIsNotAssigned(true);
                }
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showModal]);

    // ====== FETCH KELAS ======
    useEffect(() => {
        if (!selectedMapelAkademik) {
            setKelasListAkademik([]);
            setSelectedKelasAkademik(null);
            return;
        }

        const fetchKelas = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(
                    `${API}/atur-penilaian/kelas-by-mapel?mapel_id=${selectedMapelAkademik}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (res.ok) {
                    const data = await res.json();
                    const kelasData = data.data || [];
                    setKelasListAkademik(kelasData);
                    if (kelasData.length > 0) {
                        setSelectedKelasAkademik(kelasData[0].kelas_id);
                    }
                } else {
                    setKelasListAkademik([]);
                    setSelectedKelasAkademik(null);
                }
            } catch (err) {
                console.error('Error fetch kelas:', err);
                setKelasListAkademik([]);
                setSelectedKelasAkademik(null);
            }
        };

        fetchKelas();
    }, [selectedMapelAkademik]);

    useEffect(() => {
        if (!selectedMapelBobot) {
            setKelasListBobot([]);
            setSelectedKelasBobot(null);
            return;
        }

        const fetchKelas = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(
                    `${API}/atur-penilaian/kelas-by-mapel?mapel_id=${selectedMapelBobot}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (res.ok) {
                    const data = await res.json();
                    const kelasData = data.data || [];
                    setKelasListBobot(kelasData);
                    if (kelasData.length > 0) {
                        setSelectedKelasBobot(kelasData[0].kelas_id);
                    }
                } else {
                    setKelasListBobot([]);
                    setSelectedKelasBobot(null);
                }
            } catch (err) {
                console.error('Error fetch kelas:', err);
                setKelasListBobot([]);
                setSelectedKelasBobot(null);
            }
        };

        fetchKelas();
    }, [selectedMapelBobot]);

    // ====== FETCH KATEGORI ======
    useEffect(() => {
        if (loading || activeTab !== 'akademik') return;

        const fetchKategori = async () => {
            setKategoriLoading(true);
            setCoverageInfo(null);

            if (selectedMapelAkademik === null || selectedKelasAkademik === null) {
                setKategoriList([]);
                setKategoriLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(
                    `${API}/atur-penilaian/kategori?mapel_id=${selectedMapelAkademik}&kelas_id=${selectedKelasAkademik}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (!res.ok) {
                    let errorData;
                    try {
                        errorData = await res.json();
                    } catch {
                        errorData = { message: await res.text(), code: null };
                    }

                    if (res.status === 403 || errorData.code === 'NO_ACCESS_TO_MAPEL') {
                        showModal({ type: 'error', title: 'Akses Ditolak', message: 'Anda tidak memiliki akses ke mata pelajaran ini.' });
                        return;
                    }

                    throw new Error(errorData.message || `HTTP ${res.status}`);
                }

                const data = await res.json();
                const formattedData = (data.data || []).map((item: any) => ({
                    ...item,
                    min_nilai: Math.floor(parseFloat(item.min_nilai)),
                    max_nilai: Math.floor(parseFloat(item.max_nilai)),
                }));

                setKategoriList(formattedData);
                setCoverageInfo(data.coverage || null);
            } catch (err: any) {
                showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat kategori' });
            } finally {
                setKategoriLoading(false);
            }
        };

        fetchKategori();
    }, [activeTab, selectedMapelAkademik, selectedKelasAkademik, loading, showModal]);

    // ====== FETCH BOBOT ======
    useEffect(() => {
        if (selectedMapelBobot === null || selectedKelasBobot === null || activeTab !== 'bobot') {
            setBobotList([]);
            initialBobotListRef.current = [];
            return;
        }

        const fetchBobot = async () => {
            setBobotLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API}/atur-penilaian/bobot/${selectedMapelBobot}?kelas_id=${selectedKelasBobot}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (!res.ok) {
                    let errorData;
                    try {
                        errorData = await res.json();
                    } catch {
                        errorData = { message: await res.text(), code: null };
                    }

                    if (res.status === 403 || errorData.code === 'NO_ACCESS_TO_MAPEL') {
                        showModal({ type: 'error', title: 'Akses Ditolak', message: 'Anda tidak memiliki akses ke mata pelajaran ini.' });
                        return;
                    }

                    throw new Error(errorData.message || `HTTP ${res.status}`);
                }

                const result = await res.json();
                const bobotData: any[] = result.data || [];

                const bobotMap = new Map<number, number>();
                bobotData.forEach((b: any) => {
                    const numBobot = typeof b.bobot === 'number' ? b.bobot : parseFloat(b.bobot);
                    bobotMap.set(b.komponen_id, isNaN(numBobot) ? 0 : numBobot);
                });

                const fullBobot = komponenList.map((k) => ({
                    komponen_id: k.id_komponen,
                    bobot: bobotMap.get(k.id_komponen) || 0,
                }));

                setBobotList(fullBobot);
                initialBobotListRef.current = JSON.parse(JSON.stringify(fullBobot));
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal mengambil bobot' });
            } finally {
                setBobotLoading(false);
            }
        };

        fetchBobot();
    }, [selectedMapelBobot, selectedKelasBobot, komponenList, activeTab, showModal]);

    // ====== TAB CHANGE ======
    const handleTabChange = (tab: 'akademik' | 'bobot') => {
        setKategoriList([]);
        setCoverageInfo(null);
        setActiveTab(tab);
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ✅ BARU: BATCH EDIT KATEGORI HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    const openBatchEdit = () => {
        if (isReadOnly) {
            showModal({
                type: 'warning',
                title: 'Mode Baca Saja',
                message: 'Periode penilaian belum aktif atau sudah selesai.\n\nAnda tidak dapat mengedit kategori.'
            });
            return;
        }

        // Load existing kategori ke batch
        const existing = kategoriList
            .map(k => ({
                id: k.id,
                min_nilai: Math.floor(k.min_nilai),
                max_nilai: Math.floor(k.max_nilai),
                deskripsi: k.deskripsi,
                isNew: false
            }))
            .sort((a, b) => b.max_nilai - a.max_nilai);

        if (existing.length > 0) {
            setBatchKategori(existing);
            setOriginalBatchKategori([...existing]);
        } else {
            // Default: 5 kategori standar (A, B, C, D, E)
            const defaults: BatchKategoriItem[] = [
                { min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik', isNew: true },
                { min_nilai: 80, max_nilai: 89, deskripsi: 'Baik', isNew: true },
                { min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup', isNew: true },
                { min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang', isNew: true },
                { min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan', isNew: true },
            ];
            setBatchKategori(defaults);
            setOriginalBatchKategori([]);
        }

        setShowBatchEdit(true);
    };

    const closeBatchEdit = () => {
        setBatchEditClosing(true);
        setTimeout(() => {
            setShowBatchEdit(false);
            setBatchEditClosing(false);
            setBatchKategori([]);
            setOriginalBatchKategori([]);
        }, 200);
    };

    const addBatchRow = () => {
        setBatchKategori(prev => [...prev, { min_nilai: 0, max_nilai: 100, deskripsi: '', isNew: true }]);
    };

    const removeBatchRow = (index: number) => {
        setBatchKategori(prev => prev.filter((_, i) => i !== index));
    };

    const updateBatchRow = (index: number, field: keyof BatchKategoriItem, value: any) => {
        setBatchKategori(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    // ✅ Validasi batch: cek overlap, range 0-100, deskripsi
    const validateBatchKategori = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (batchKategori.length === 0) {
            errors.push('Minimal harus ada 1 kategori.');
            return { valid: false, errors };
        }

        batchKategori.forEach((k, i) => {
            // Validasi nilai
            if (isNaN(k.min_nilai) || isNaN(k.max_nilai)) {
                errors.push(`Baris ${i + 1}: Nilai min/max harus angka.`);
            } else {
                if (k.min_nilai < 0 || k.max_nilai > 100) {
                    errors.push(`Baris ${i + 1}: Nilai harus antara 0-100.`);
                }
                if (k.min_nilai >= k.max_nilai) {
                    errors.push(`Baris ${i + 1}: Min (${k.min_nilai}) harus < Max (${k.max_nilai}).`);
                }
            }

            // Validasi deskripsi
            if (!k.deskripsi || k.deskripsi.trim().length < 3) {
                errors.push(`Baris ${i + 1}: Deskripsi minimal 3 karakter.`);
            }
        });

        // Cek overlap
        const sorted = [...batchKategori].sort((a, b) => a.min_nilai - b.min_nilai);
        let covered = new Set<number>();
        let hasOverlap = false;
        sorted.forEach(k => {
            for (let i = k.min_nilai; i <= k.max_nilai; i++) {
                if (covered.has(i)) hasOverlap = true;
                covered.add(i);
            }
        });
        if (hasOverlap) errors.push('Ada overlap pada range nilai.');

        return { valid: errors.length === 0, errors };
    };

    // ✅ Cek apakah ada perubahan
    const hasBatchChanges = (): boolean => {
        if (originalBatchKategori.length === 0) return true;
        if (batchKategori.length !== originalBatchKategori.length) return true;

        const sc = [...batchKategori].sort((a, b) => a.min_nilai - b.min_nilai);
        const so = [...originalBatchKategori].sort((a, b) => a.min_nilai - b.min_nilai);

        for (let i = 0; i < sc.length; i++) {
            if (Number(sc[i].min_nilai) !== Number(so[i].min_nilai)) return true;
            if (Number(sc[i].max_nilai) !== Number(so[i].max_nilai)) return true;
            if (sc[i].deskripsi.trim() !== so[i].deskripsi.trim()) return true;
        }
        return false;
    };

    const openConfirmSaveBatch = () => {
        const v = validateBatchKategori();
        if (!v.valid) {
            showModal({ type: 'warning', title: 'Validasi Gagal', message: v.errors.join('\n') });
            return;
        }
        if (!hasBatchChanges()) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data yang Anda masukkan sama dengan data yang sudah ada.' });
            return;
        }
        setConfirmAction('save-batch-kategori');
        setShowConfirmModal(true);
    };

    const executeSaveBatchKategori = async () => {
        setIsSavingBatch(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Sesi berakhir');

            // ✅ Strategi: Delete semua existing, lalu insert semua baru
            const deletePromises = originalBatchKategori
                .filter(k => k.id)
                .map(k => fetch(`${API}/atur-penilaian/kategori/${k.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                }));
            await Promise.all(deletePromises);

            // Insert semua kategori baru
            const insertPromises = batchKategori.map(k => fetch(`${API}/atur-penilaian/kategori`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    min_nilai: Math.floor(k.min_nilai),
                    max_nilai: Math.floor(k.max_nilai),
                    deskripsi: k.deskripsi.trim(),
                    urutan: 0,
                    mapel_id: selectedMapelAkademik,
                    kelas_id: selectedKelasAkademik,
                })
            }));

            const results = await Promise.all(insertPromises);
            const allSuccess = results.every(r => r.ok);

            if (allSuccess) {
                setShowConfirmModal(false);
                closeBatchEdit();
                showModal({
                    type: 'success',
                    title: 'Berhasil Disimpan!',
                    message: `${batchKategori.length} kategori berhasil disimpan.`
                });

                // Reload data
                const reloadRes = await fetch(
                    `${API}/atur-penilaian/kategori?mapel_id=${selectedMapelAkademik}&kelas_id=${selectedKelasAkademik}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (reloadRes.ok) {
                    const reloadData = await reloadRes.json();
                    setKategoriList((reloadData.data || []).map((item: any) => ({
                        ...item,
                        min_nilai: Math.floor(parseFloat(item.min_nilai)),
                        max_nilai: Math.floor(parseFloat(item.max_nilai)),
                    })));
                    setCoverageInfo(reloadData.coverage || null);
                }
            } else {
                setShowConfirmModal(false);
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: 'Beberapa kategori gagal disimpan.' });
            }
        } catch (err: any) {
            setShowConfirmModal(false);
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan: ' + err.message });
        } finally {
            setIsSavingBatch(false);
        }
    };

    // ====== BOBOT HANDLERS ======
    const isPTSActive = jenisPenilaianAktif === 'PTS';

    const handleBobotChange = (komponenId: number, value: string) => {
        let num = parseFloat(value);
        if (isNaN(num)) num = 0;
        if (num < 0) num = 0;
        if (num > 100) num = 100;
        num = Math.round(num * 100) / 100;

        setBobotList((prev) =>
            prev.map((b) => (b.komponen_id === komponenId ? { ...b, bobot: num } : b))
        );
    };

    const validateBobot = (): boolean => {
        if (!selectedMapelBobot || !selectedKelasBobot) return false;

        const isUnchanged = bobotList.every((b) => {
            const initial = initialBobotListRef.current.find((i) => i.komponen_id === b.komponen_id);
            return initial && Math.abs(b.bobot - initial.bobot) < 0.01;
        });

        if (isUnchanged) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
            return false;
        }

        const adaNegatif = bobotList.some(b => b.bobot < 0);
        if (adaNegatif) {
            showModal({ type: 'warning', title: 'Bobot Tidak Valid', message: 'Bobot tidak boleh negatif.' });
            return false;
        }

        const total = bobotList.reduce((sum, b) => sum + b.bobot, 0);
        if (Math.abs(total - 100) > 0.01) {
            showModal({ type: 'warning', title: 'Total Bobot Salah', message: `Total bobot harus tepat 100%.\nSaat ini: ${total.toFixed(2)}%` });
            return false;
        }

        if (isPTSActive) {
            showModal({ type: 'warning', title: 'Periode PTS Aktif', message: 'Bobot tidak dapat diubah saat periode PTS aktif.' });
            return false;
        }

        return true;
    };

    const openConfirmSaveBobot = () => {
        if (!validateBobot()) return;
        setConfirmAction('save-bobot');
        setShowConfirmModal(true);
    };

    const executeSaveBobot = async () => {
        if (!selectedMapelBobot || !selectedKelasBobot) return;

        setIsSavingBobot(true);
        try {
            const token = localStorage.getItem('token');

            const payload = {
                kelas_id: selectedKelasBobot,
                bobot_list: bobotList
            };

            const res = await fetch(`${API}/atur-penilaian/bobot/${selectedMapelBobot}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (res.ok) {
                showModal({ type: 'success', title: 'Bobot Disimpan!', message: result.message || 'Bobot berhasil disimpan.' });
                initialBobotListRef.current = JSON.parse(JSON.stringify(bobotList));
            } else {
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: result.message || 'Gagal menyimpan bobot.' });
            }
        } catch (err) {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan bobot.' });
        } finally {
            setIsSavingBobot(false);
        }
    };

    const totalBobot = bobotList.reduce((sum, b) => {
        const komponen = komponenList.find((k) => k.id_komponen === b.komponen_id);
        const isPTS = komponen && /^PTS$/i.test(komponen.nama_komponen);
        const actualBobot = isPTSActive ? (isPTS ? 100 : 0) : b.bobot;
        return sum + actualBobot;
    }, 0);

    const isBobotValid = Math.abs(totalBobot - 100) < 0.01;

    // ====== LOADING STATE ======
    if (loading) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={{ background: THEME.colors.background }}>
                <GlobalStyles />
                <div className="text-center fade-in">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm font-medium" style={{ color: THEME.colors.primary }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    if (isNotAssigned) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={{ background: THEME.colors.background }}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 scale-in">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600">Anda belum ditugaskan mengajar mata pelajaran.</p>
                        </div>
                        <button onClick={handleLogout} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: THEME.gradients.primary }}>
                            <LogOut size={18} className="inline mr-2" /> Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ====== RENDER ======
    return (
        <div className="flex-1 p-6 min-h-screen" style={{ background: THEME.colors.background }}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* ====== HEADER ====== */}
            <div className="mb-6 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-gray-900">Atur Penilaian</h1>
                <p className="text-sm mt-1" style={{ color: THEME.colors.primary }}>Kelola kategori dan bobot penilaian</p>
            </div>

            {/* ====== STATUS BANNERS ====== */}
            {isReadOnly && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl animate-fade-in-up"
                    style={{
                        background: isPeriodLocked ? '#fef2f2' : '#fef3c7',
                        border: `1px solid ${isPeriodLocked ? '#fca5a5' : '#fcd34d'}`
                    }}>
                    <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isPeriodLocked ? 'text-red-600' : 'text-yellow-600'}`} />
                    <div className="flex-1">
                        <p className={`text-sm font-bold mb-1 ${isPeriodLocked ? 'text-red-900' : 'text-yellow-900'}`}>
                            {isPeriodLocked ? '🔒 Periode Penilaian Selesai' : '⏳ Periode Penilaian Belum Aktif'}
                        </p>
                        <p className={`text-xs ${isPeriodLocked ? 'text-red-800' : 'text-yellow-800'}`}>
                            {isPeriodLocked
                                ? 'Konfigurasi kategori dan bobot sudah dikunci dan tidak dapat diubah.'
                                : 'Anda dapat menyiapkan kategori dan bobot penilaian sebagai persiapan.'}
                        </p>
                    </div>
                </div>
            )}

            {/* ====== MAIN CARD ====== */}
            <div className="bg-white rounded-2xl overflow-hidden animate-fade-in-up delay-1" style={{ border: `1px solid ${THEME.colors.border}`, boxShadow: THEME.shadows.sm }}>
                {/* Tabs */}
                <div className="px-6 py-3 border-b" style={{ borderColor: THEME.colors.border, background: '#fffaf6' }}>
                    <div className="flex gap-2">
                        <button
                            className={`px-6 py-2.5 text-sm font-bold transition-all rounded-t-lg border-b-2 whitespace-nowrap ${activeTab === 'akademik'
                                ? 'border-orange-500 text-orange-600 bg-orange-50'
                                : 'border-transparent text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                                }`}
                            onClick={() => handleTabChange('akademik')}
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={16} />
                                Kategori Akademik
                            </div>
                        </button>
                        <button
                            className={`px-6 py-2.5 text-sm font-bold transition-all rounded-t-lg border-b-2 whitespace-nowrap ${activeTab === 'bobot'
                                ? 'border-orange-500 text-orange-600 bg-orange-50'
                                : 'border-transparent text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                                }`}
                            onClick={() => handleTabChange('bobot')}
                        >
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} />
                                Bobot Penilaian
                            </div>
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {/* ====== TAB: AKADEMIK ====== */}
                    {activeTab === 'akademik' && (
                        <div>
                            {/* Dropdown Mapel & Kelas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                        Mata Pelajaran
                                    </label>
                                    <select
                                        value={selectedMapelAkademik || ''}
                                        onChange={(e) => {
                                            setSelectedMapelAkademik(e.target.value ? Number(e.target.value) : null);
                                            setSelectedKelasAkademik(null);
                                        }}
                                        className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                                    >
                                        <option value="">-- Pilih Mata Pelajaran --</option>
                                        {mapelList.filter(m => m.jenis === 'pilihan').map((mapel) => (
                                            <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedMapelAkademik && kelasListAkademik.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                            Kelas
                                        </label>
                                        <select
                                            value={selectedKelasAkademik || ''}
                                            onChange={(e) => setSelectedKelasAkademik(e.target.value ? Number(e.target.value) : null)}
                                            className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                                        >
                                            <option value="">-- Pilih Kelas --</option>
                                            {kelasListAkademik.map((kelas) => (
                                                <option key={kelas.kelas_id} value={kelas.kelas_id}>{kelas.nama_kelas}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {selectedMapelAkademik && selectedKelasAkademik ? (
                                <>
                                    <CoverageWarning coverage={coverageInfo} />

                                    {/* ✅ PERBAIKAN: Toolbar dengan tombol "Edit Semua" */}
                                    <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: `1px solid ${THEME.colors.border}` }}>
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} style={{ color: THEME.colors.primary }} />
                                            <p className="text-xs" style={{ color: THEME.colors.primary }}>
                                                Menampilkan <strong>{kategoriList.length}</strong> kategori (urut dari nilai tertinggi)
                                            </p>
                                        </div>
                                        <button
                                            onClick={openBatchEdit}
                                            disabled={isReadOnly}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            style={{
                                                background: isReadOnly ? '#d1d5db' : THEME.gradients.secondary,
                                                boxShadow: isReadOnly ? 'none' : THEME.shadows.sm
                                            }}
                                            onMouseEnter={(e) => { if (!isReadOnly) e.currentTarget.style.background = THEME.gradients.primary; }}
                                            onMouseLeave={(e) => { if (!isReadOnly) e.currentTarget.style.background = THEME.gradients.secondary; }}
                                        >
                                            {isReadOnly ? (
                                                <>
                                                    <Lock size={16} />
                                                    Terkunci
                                                </>
                                            ) : (
                                                <>
                                                    <Pencil size={16} />
                                                    Edit Semua
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* ✅ PERBAIKAN: Table tanpa kolom Aksi */}
                                    <div className="overflow-x-auto scrollbar-thin rounded-xl" style={{ border: `1px solid ${THEME.colors.border}` }}>
                                        <div className="min-w-[640px]">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr style={{ background: THEME.gradients.primary }}>
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap w-16">No.</th>
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">Range Nilai</th>
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">Deskripsi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {kategoriLoading ? (
                                                        <tr>
                                                            <td colSpan={3} className="py-12 text-center text-gray-400 text-sm">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                                                    Memuat data...
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : kategoriList.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={3} className="py-12 text-center text-gray-400 text-sm">
                                                                Belum ada kategori
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        // ✅ SORTING: Urutkan dari nilai tertinggi (max_nilai) ke terendah
                                                        kategoriList
                                                            .slice()
                                                            .sort((a, b) => b.max_nilai - a.max_nilai)
                                                            .map((kategori, index) => (
                                                                <tr key={kategori.id} className="transition-colors"
                                                                    style={{ borderBottom: `1px solid ${THEME.colors.border}`, background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                                                    onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                                                    <td className="px-4 py-3 text-center text-gray-500 font-medium">{index + 1}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                                                                            style={{ background: '#fff0e5', color: THEME.colors.primary, border: `1px solid ${THEME.colors.border}` }}>
                                                                            {Math.floor(kategori.min_nilai)} – {Math.floor(kategori.max_nilai)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-700">{kategori.deskripsi}</td>
                                                                </tr>
                                                            ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-12 text-center rounded-2xl" style={{ background: '#fff7f0', border: `2px dashed ${THEME.colors.border}` }}>
                                    <FileText size={64} className="mx-auto mb-4" style={{ color: THEME.colors.secondary }} />
                                    <p className="text-lg font-bold" style={{ color: THEME.colors.primary }}>
                                        {!selectedMapelAkademik ? 'Pilih Mata Pelajaran' : 'Pilih Kelas'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ====== TAB: BOBOT ====== */}
                    {activeTab === 'bobot' && (
                        <div>
                            {/* Dropdown Mapel & Kelas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                        Mata Pelajaran
                                    </label>
                                    <select
                                        value={selectedMapelBobot || ''}
                                        onChange={(e) => {
                                            setSelectedMapelBobot(e.target.value ? Number(e.target.value) : null);
                                            setSelectedKelasBobot(null);
                                        }}
                                        className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                                    >
                                        <option value="">-- Pilih Mata Pelajaran --</option>
                                        {mapelList.filter(m => m.jenis === 'pilihan').map((mapel) => (
                                            <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedMapelBobot && kelasListBobot.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                            Kelas
                                        </label>
                                        <select
                                            value={selectedKelasBobot || ''}
                                            onChange={(e) => setSelectedKelasBobot(e.target.value ? Number(e.target.value) : null)}
                                            className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                                        >
                                            <option value="">-- Pilih Kelas --</option>
                                            {kelasListBobot.map((kelas) => (
                                                <option key={kelas.kelas_id} value={kelas.kelas_id}>{kelas.nama_kelas}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {selectedMapelBobot && selectedKelasBobot ? (
                                bobotLoading ? (
                                    <div className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                            <p className="text-sm text-gray-400">Memuat bobot...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {isPTSActive && (
                                            <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                                <AlertCircle size={18} style={{ color: THEME.colors.primary, flexShrink: 0 }} />
                                                <p className="text-sm" style={{ color: '#7a3a0a' }}>
                                                    Periode <strong>PTS</strong> aktif — bobot otomatis <strong>PTS = 100%</strong>
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-3 mb-6">
                                            {bobotList.map((bobot) => {
                                                const komponen = komponenList.find((k) => k.id_komponen === bobot.komponen_id);
                                                const isPTS = komponen && /^PTS$/i.test(komponen.nama_komponen);
                                                const displayBobot = isPTSActive ? (isPTS ? 100 : 0) : bobot.bobot;
                                                const isEditable = !isPTSActive && !isReadOnly;

                                                return (
                                                    <div key={bobot.komponen_id} className="flex items-center justify-between gap-4 p-4 rounded-xl"
                                                        style={{ background: isEditable ? '#fffaf6' : '#f9fafb', border: `1px solid ${isEditable ? THEME.colors.border : '#e5e7eb'}` }}>
                                                        <div className="flex-1">
                                                            <span className="font-semibold text-sm" style={{ color: '#7a3a0a' }}>{komponen?.nama_komponen || 'Komponen'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                pattern="[0-9]*"
                                                                value={displayBobot}
                                                                onChange={(e) => {
                                                                    if (isEditable) {
                                                                        const val = e.target.value;
                                                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                            handleBobotChange(bobot.komponen_id, val);
                                                                        }
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (!isNaN(val)) {
                                                                        if (val < 0) {
                                                                            handleBobotChange(bobot.komponen_id, '0');
                                                                        } else if (val > 100) {
                                                                            handleBobotChange(bobot.komponen_id, '100');
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={!isEditable}
                                                                maxLength={5}
                                                                className={`w-24 h-11 px-3 text-center font-bold rounded-xl border-2 outline-none transition-all ${isEditable ? 'bg-white border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400 focus:border-orange-400' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'}`}
                                                                readOnly={!isEditable}
                                                                placeholder="0"
                                                            />
                                                            <span className="text-base font-bold" style={{ color: '#7a3a0a' }}>%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="p-4 rounded-xl mb-6" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm" style={{ color: '#7a3a0a' }}>Total Bobot:</span>
                                                <span className={`text-lg font-bold ${isBobotValid ? 'text-green-600' : 'text-red-600'}`}>{totalBobot.toFixed(2)}%</span>
                                            </div>
                                        </div>

                                        {!isPTSActive && !isReadOnly && (
                                            <div className="flex justify-end pt-4" style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                                                <button onClick={openConfirmSaveBobot} disabled={isSavingBobot || !isBobotValid}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    style={{ background: THEME.gradients.secondary, boxShadow: THEME.shadows.sm }}
                                                    onMouseEnter={(e) => { if (!isSavingBobot && isBobotValid) e.currentTarget.style.background = THEME.gradients.primary; }}
                                                    onMouseLeave={(e) => { if (!isSavingBobot && isBobotValid) e.currentTarget.style.background = THEME.gradients.secondary; }}>
                                                    {isSavingBobot ? (
                                                        <>
                                                            <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                                            Menyimpan...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save size={16} />
                                                            Simpan Bobot
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="py-12 text-center rounded-2xl" style={{ background: '#fff7f0', border: `2px dashed ${THEME.colors.border}` }}>
                                    <TrendingUp size={64} className="mx-auto mb-4" style={{ color: THEME.colors.secondary }} />
                                    <p className="text-lg font-bold" style={{ color: THEME.colors.primary }}>
                                        {!selectedMapelBobot ? 'Pilih Mata Pelajaran' : 'Pilih Kelas'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {/* ✅ BARU: MODAL BATCH EDIT KATEGORI */}
            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {showBatchEdit && (
                <div className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${batchEditClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => { if (e.target === e.currentTarget) closeBatchEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={{ border: `1px solid ${THEME.colors.border}` }}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4" style={{ background: THEME.gradients.header }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                    <FileText size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Edit Kategori Akademik</h2>
                                    <p className="text-xs text-orange-100 mt-0.5">Kelola semua kategori sekaligus</p>
                                </div>
                            </div>
                            <button onClick={closeBatchEdit} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
                            <div className="p-6 space-y-4">
                                {/* Info Box */}
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                    <Info size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs" style={{ color: '#7a3a0a' }}>
                                        <strong>💡 Tips:</strong> Isi semua kategori sekaligus. Sistem akan menyimpan semua kategori dalam 1 aksi.
                                        Pastikan range nilai 0-100 lengkap tanpa overlap.
                                    </p>
                                </div>

                                {/* Header List */}
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                                        Kategori ({batchKategori.length})
                                    </h3>
                                    <button onClick={addBatchRow}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                        style={{ background: '#fff7ed', border: '1.5px solid #fb923c', color: '#c2410c' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#ffedd5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff7ed')}>
                                        <Plus size={14} /> Tambah Baris
                                    </button>
                                </div>

                                {/* List Kategori */}
                                <div className="space-y-3">
                                    {batchKategori.map((kategori, index) => {
                                        // Validasi real-time per baris
                                        const errors: string[] = [];
                                        if (isNaN(kategori.min_nilai) || isNaN(kategori.max_nilai)) errors.push('Nilai tidak valid');
                                        else if (kategori.min_nilai >= kategori.max_nilai) errors.push(`Min (${kategori.min_nilai}) >= Max (${kategori.max_nilai})`);
                                        if (!kategori.deskripsi || kategori.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');

                                        return (
                                            <div key={index} className="p-4 rounded-xl" style={{ background: '#fffaf6', border: '1.5px solid #fed7aa' }}>
                                                <div className="flex items-start gap-3">
                                                    {/* Nomor */}
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                                                        style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}>
                                                        {index + 1}
                                                    </div>

                                                    {/* Inputs */}
                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>
                                                                Min <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={kategori.min_nilai}
                                                                onChange={(e) => updateBatchRow(index, 'min_nilai', parseInt(e.target.value) || 0)}
                                                                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white border-orange-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>
                                                                Max <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={kategori.max_nilai}
                                                                onChange={(e) => updateBatchRow(index, 'max_nilai', parseInt(e.target.value) || 0)}
                                                                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white border-orange-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>
                                                                Deskripsi <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={kategori.deskripsi}
                                                                onChange={(e) => updateBatchRow(index, 'deskripsi', e.target.value)}
                                                                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white border-orange-200"
                                                                placeholder="Sangat Baik"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Tombol Hapus */}
                                                    {batchKategori.length > 1 && (
                                                        <button onClick={() => removeBatchRow(index)}
                                                            className="mt-7 p-2 rounded-lg transition-all"
                                                            style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Error per baris */}
                                                {errors.length > 0 && (
                                                    <div className="mt-3 p-2 rounded-lg text-xs flex items-center gap-2"
                                                        style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                                                        <AlertCircle size={12} /> {errors.join(' | ')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Status Validasi */}
                                {(() => {
                                    const validation = validateBatchKategori();
                                    return (
                                        <div className="p-3 rounded-xl flex items-center gap-2" style={{
                                            background: validation.valid ? '#f0fdf4' : '#fff7ed',
                                            border: `1.5px solid ${validation.valid ? '#86efac' : '#fdba74'}`,
                                            color: validation.valid ? '#166534' : '#7a3a0a'
                                        }}>
                                            {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            <strong>Status:</strong> {validation.valid
                                                ? 'Semua kategori valid dan siap disimpan'
                                                : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1.5px solid #fed7aa', background: '#fffaf6' }}>
                            <button onClick={closeBatchEdit} disabled={isSavingBatch}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ borderColor: THEME.colors.border, color: '#7a3a0a', background: '#fff' }}
                                onMouseEnter={e => { if (!isSavingBatch) e.currentTarget.style.background = '#fff0e5'; }}
                                onMouseLeave={e => { if (!isSavingBatch) e.currentTarget.style.background = '#fff'; }}>
                                Batal
                            </button>
                            <button onClick={openConfirmSaveBatch} disabled={isSavingBatch}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                style={{ background: THEME.gradients.secondary, boxShadow: THEME.shadows.sm }}
                                onMouseEnter={e => { if (!isSavingBatch) e.currentTarget.style.background = THEME.gradients.primary; }}
                                onMouseLeave={e => { if (!isSavingBatch) e.currentTarget.style.background = THEME.gradients.secondary; }}>
                                {isSavingBatch ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        Simpan {batchKategori.length} Kategori
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL KONFIRMASI ====== */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 fade-in"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Konfirmasi Penyimpanan</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                            {confirmAction === 'save-bobot' ? 'Apakah Anda yakin ingin menyimpan bobot ini?' :
                                confirmAction === 'save-batch-kategori' ? `Apakah Anda yakin ingin menyimpan ${batchKategori.length} kategori ini?\n\nSemua kategori lama akan dihapus dan diganti dengan yang baru.` :
                                    'Apakah Anda yakin ingin menyimpan?'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: THEME.colors.border, color: '#7a3a0a', background: '#fff' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                Batal
                            </button>
                            <button onClick={() => {
                                setShowConfirmModal(false);
                                if (confirmAction === 'save-bobot') executeSaveBobot();
                                else if (confirmAction === 'save-batch-kategori') executeSaveBatchKategori();
                            }}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                style={{ background: THEME.gradients.secondary, boxShadow: THEME.shadows.sm }}
                                onMouseEnter={e => (e.currentTarget.style.background = THEME.gradients.primary)}
                                onMouseLeave={e => (e.currentTarget.style.background = THEME.gradients.secondary)}>
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}