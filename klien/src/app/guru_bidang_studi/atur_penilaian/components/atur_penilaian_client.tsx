/**
 * Nama File: atur_penilaian_gbs_client.tsx
 * Fungsi: Komponen klien untuk mengatur konfigurasi penilaian guru bidang studi
 * UPDATE (Redesign UI/UX):
 *   ✅ REDESIGN: Palet warna oranye dilembutkan (soft terracotta), tidak lagi mencolok
 *   ✅ REDESIGN: Warna tombol disesuaikan dengan konvensi umum aplikasi
 *       - Hijau  → aksi menyimpan (Simpan Bobot, Simpan Kategori, konfirmasi simpan)
 *       - Oranye → aksi utama/edit (Edit Semua) — identitas brand halaman ini
 *       - Biru   → aksi menambah (Tambah Baris)
 *       - Merah  → aksi menghapus/destruktif (Hapus baris)
 *       - Abu    → aksi batal/netral (Batal, Logout)
 *       - Amber  → status peringatan (periode belum aktif)
 *       - Slate  → status info terkunci (periode selesai)
 *   ✅ REDESIGN: Tab diubah jadi segmented control, status banner jadi kartu accent-border
 *   ✅ REDESIGN: Modal konfirmasi simpan tidak lagi tampil seperti peringatan (ikon & warna disesuaikan)
 *   ✅ REDESIGN: Animasi diperhalus (fade/scale lebih lembut, transisi lebih konsisten)
 *   - Semua logika bisnis (state, validasi, pemanggilan API) TIDAK diubah
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Pencil, X, CheckCircle2, AlertCircle,
    WifiOff, ShieldAlert, LogOut, Lock, BookOpen,
    Trash2, Plus, FileText, TrendingUp,
    Save, AlertTriangle, Info, ClipboardList,
    GraduationCap, Users, SlidersHorizontal
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-bidang-studi';

// ====== DESIGN TOKENS (soft, muted orange) ======
const THEME = {
    colors: {
        primary: '#B6500A',
        primarySoft: '#E8690A',
        primaryLight: '#FBE3C6',
        background: '#FDFBF9',
        surface: '#FFFFFF',
        border: '#F0DDC0',
        text: {
            primary: '#2B241D',
            secondary: '#6B5D50',
            muted: '#A79683',
        },
        success: { base: '#3F9463', hover: '#357F54', soft: '#EAF6EF', text: '#276B45', border: '#BEE3CD' },
        danger: { base: '#D6564F', hover: '#BE4640', soft: '#FCECEB', text: '#9C332D', border: '#F3C4C0' },
        neutral: { base: '#6B7280', hover: '#565D68', soft: '#F3F3F1', text: '#4B4640', border: '#E1DCD3' },
        warning: { base: '#C98A2E', hover: '#AD7625', soft: '#FBF1DD', text: '#8A5A14', border: '#EDD6A6' },
        info: { base: '#3E8AA6', hover: '#33718A', soft: '#E9F3F6', text: '#215C71', border: '#BEDCE6' },
        slate: { base: '#5B6472', hover: '#49515C', soft: '#F0F1F3', text: '#3A4048', border: '#D9DDE2' },
    },
    gradients: {
        primary: 'linear-gradient(135deg, #B6500A 0%, #E8690A 100%)',
        header: 'linear-gradient(120deg, #B6500A 0%, #E8690A 45%, #F5A623 100%)',
    },
    shadows: {
        sm: '0 1px 2px rgba(120,70,20,0.05)',
        md: '0 6px 18px rgba(120,70,20,0.08)',
        lift: '0 10px 28px rgba(120,70,20,0.12)',
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
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes softPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.035); }
        }
        @keyframes overlayIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes iconPop {
            0% { opacity: 0; transform: scale(0.5) rotate(-8deg); }
            60% { opacity: 1; transform: scale(1.08) rotate(2deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes rowIn {
            from { opacity: 0; transform: translateX(-6px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes sheen {
            from { background-position: -150% 0; }
            to { background-position: 250% 0; }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
        .delay-1 { animation-delay: 0.06s; }
        .delay-2 { animation-delay: 0.12s; }
        .delay-3 { animation-delay: 0.18s; }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .overlay-in { animation: overlayIn 0.18s ease; }
        .soft-pulse { animation: softPulse 0.7s ease; }
        .icon-pop { animation: iconPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .row-in { animation: rowIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; }
        .header-sheen {
            position: relative;
            overflow: hidden;
        }
        .header-sheen::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%);
            background-size: 250% 100%;
            animation: sheen 1.4s ease-out 0.3s 1;
        }
        .hover-lift { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .hover-lift:hover { transform: translateY(-2px) scale(1.015); }
        .hover-lift:active { transform: translateY(0) scale(0.99); }
        .transition-smooth { transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease; }
        .scrollbar-thin::-webkit-scrollbar { width: 5px; height: 5px; }
        .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #ecd3b1;
            border-radius: 10px;
        }
        select:focus, input:focus {
            outline: none;
        }
    `}</style>
);

// ====== NOTIF MODAL ======
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btnBg: string; btnHover: string; btnLabel: string }> = {
    success: { iconBg: 'bg-emerald-50', ring: 'ring-emerald-100', icon: <CheckCircle2 size={38} className="text-emerald-500" />, btnBg: THEME.colors.success.base, btnHover: THEME.colors.success.hover, btnLabel: 'Ok' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btnBg: THEME.colors.danger.base, btnHover: THEME.colors.danger.hover, btnLabel: 'Ok' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btnBg: THEME.colors.warning.base, btnHover: THEME.colors.warning.hover, btnLabel: 'Mengerti' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btnBg: THEME.colors.slate.base, btnHover: THEME.colors.slate.hover, btnLabel: 'Ok' },
    confirm: { iconBg: 'bg-emerald-50', ring: 'ring-emerald-100', icon: <CheckCircle2 size={38} className="text-emerald-500" />, btnBg: THEME.colors.success.base, btnHover: THEME.colors.success.hover, btnLabel: 'Ya, Simpan' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 overlay-in">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 scale-in">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-smooth"><X size={18} /></button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} soft-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                {isConfirm ? (
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-smooth"
                            style={{ borderColor: THEME.colors.neutral.border, color: THEME.colors.neutral.text, background: '#fff' }}
                        >Batal</button>
                        <button onClick={() => { modal.onConfirm?.(); onClose(); }}
                            className="flex-1 text-white font-semibold py-3 rounded-xl transition-smooth text-sm"
                            style={{ background: s.btnBg }}
                            onMouseEnter={e => (e.currentTarget.style.background = s.btnHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = s.btnBg)}
                        >{s.btnLabel}</button>
                    </div>
                ) : (
                    <button onClick={onClose}
                        className="w-full text-white font-semibold py-3 rounded-xl transition-smooth"
                        style={{ background: s.btnBg }}
                        onMouseEnter={e => (e.currentTarget.style.background = s.btnHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = s.btnBg)}
                    >{s.btnLabel}</button>
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
        <div className="mb-5 pl-4 pr-4 py-4 rounded-xl flex items-start gap-3 animate-fade-in-up border-l-4"
            style={{ background: THEME.colors.warning.soft, borderColor: THEME.colors.warning.base }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F4DFAF' }}>
                <AlertTriangle size={18} style={{ color: THEME.colors.warning.hover }} />
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold mb-2" style={{ color: THEME.colors.warning.text }}>Range Nilai 0–100 Belum Lengkap</p>
                {gaps.length === 1 ? (
                    <p className="text-xs" style={{ color: THEME.colors.warning.hover }}>
                        Ada gap pada <strong>{gaps[0].aspek}</strong> di rentang <strong className="px-2 py-0.5 rounded bg-amber-200/60">{gaps[0].gap}</strong>.
                    </p>
                ) : (
                    <div className="text-xs" style={{ color: THEME.colors.warning.hover }}>
                        <p className="mb-2">Ditemukan {gaps.length} gap:</p>
                        <ul className="space-y-1 ml-4">
                            {gaps.map((g, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.colors.warning.base }}></span>
                                    <span><strong>{g.aspek}:</strong> gap pada <strong className="px-1.5 py-0.5 rounded bg-amber-200/60">{g.gap}</strong></span>
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

    // ✅ Logika read-only yang konsisten (TIDAK diubah)
    const isPeriodLocked = statusPTS === 'selesai' || statusPAS === 'selesai';
    const isPeriodNotOpen = statusPTS === 'nonaktif' && statusPAS === 'nonaktif';
    const isReadOnly = isPeriodLocked || isPeriodNotOpen;

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

    // ====== FETCH DATA (logika tidak diubah) ======
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
                    taRes.json(), komponenRes.json(), mapelRes.json(),
                ]);

                const { status_pts, status_pas } = taData.data;
                setStatusPTS(status_pts || 'nonaktif');
                setStatusPAS(status_pas || 'nonaktif');

                const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null;
                setJenisPenilaianAktif(jenisAktif);
                setKomponenList(komponenData.data || []);
                setMapelList(mapelData.data || []);

                if (!mapelData.data || mapelData.data.length === 0) {
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

    // ====== FETCH KELAS (logika tidak diubah) ======
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

                const res = await fetch(`${API}/atur-penilaian/kelas-by-mapel?mapel_id=${selectedMapelAkademik}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const kelasData = data.data || [];
                    setKelasListAkademik(kelasData);
                    if (kelasData.length > 0) setSelectedKelasAkademik(kelasData[0].kelas_id);
                } else {
                    setKelasListAkademik([]);
                    setSelectedKelasAkademik(null);
                }
            } catch (err) {
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

                const res = await fetch(`${API}/atur-penilaian/kelas-by-mapel?mapel_id=${selectedMapelBobot}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const kelasData = data.data || [];
                    setKelasListBobot(kelasData);
                    if (kelasData.length > 0) setSelectedKelasBobot(kelasData[0].kelas_id);
                } else {
                    setKelasListBobot([]);
                    setSelectedKelasBobot(null);
                }
            } catch (err) {
                setKelasListBobot([]);
                setSelectedKelasBobot(null);
            }
        };
        fetchKelas();
    }, [selectedMapelBobot]);

    // ====== FETCH KATEGORI (logika tidak diubah) ======
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
                    try { errorData = await res.json(); } catch { errorData = { message: await res.text(), code: null }; }

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

    // ====== FETCH BOBOT (logika tidak diubah) ======
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
                    try { errorData = await res.json(); } catch { errorData = { message: await res.text(), code: null }; }

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

    // ====== TAB CHANGE (logika tidak diubah) ======
    const handleTabChange = (tab: 'akademik' | 'bobot') => {
        setKategoriList([]);
        setCoverageInfo(null);
        setActiveTab(tab);
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH EDIT KATEGORI HANDLERS (logika tidak diubah)
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

    // ✅ Validasi range minimal 3 poin (logika tidak diubah)
    const validateBatchKategori = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (batchKategori.length === 0) {
            errors.push('Minimal harus ada 1 kategori.');
            return { valid: false, errors };
        }

        batchKategori.forEach((k, i) => {
            if (isNaN(k.min_nilai) || isNaN(k.max_nilai)) {
                errors.push(`Baris ${i + 1}: Nilai min/max harus angka.`);
            } else {
                if (k.min_nilai < 0 || k.max_nilai > 100) {
                    errors.push(`Baris ${i + 1}: Nilai harus antara 0-100.`);
                }
                if (k.min_nilai >= k.max_nilai) {
                    errors.push(`Baris ${i + 1}: Min (${k.min_nilai}) harus < Max (${k.max_nilai}).`);
                }
                if ((k.max_nilai - k.min_nilai) < 3) {
                    errors.push(`Baris ${i + 1}: Range nilai minimal 3 poin.`);
                }
            }

            if (!k.deskripsi || k.deskripsi.trim().length < 3) {
                errors.push(`Baris ${i + 1}: Deskripsi minimal 3 karakter.`);
            }
        });

        const sorted = [...batchKategori].sort((a, b) => a.min_nilai - b.min_nilai);
        let covered = new Set<number>();
        let hasOverlap = false;
        sorted.forEach(k => {
            for (let i = Math.floor(k.min_nilai); i <= Math.floor(k.max_nilai); i++) {
                if (covered.has(i)) hasOverlap = true;
                covered.add(i);
            }
        });
        if (hasOverlap) errors.push('Ada overlap pada range nilai.');

        return { valid: errors.length === 0, errors };
    };

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

            const deletePromises = originalBatchKategori
                .filter(k => k.id)
                .map(k => fetch(`${API}/atur-penilaian/kategori/${k.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                }));
            await Promise.all(deletePromises);

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
                    mapel_id: selectedMapelAkademik,
                    kelas_id: selectedKelasAkademik,
                    jenis_penilaian: jenisPenilaianAktif || 'PAS'
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

    // ====== BOBOT HANDLERS (logika tidak diubah) ======
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
                <div className="text-center overlay-in">
                    <div className="w-11 h-11 rounded-full border-[3px] mx-auto mb-4 animate-spin" style={{ borderColor: THEME.colors.primaryLight, borderTopColor: THEME.colors.primarySoft }} />
                    <p className="text-sm font-medium" style={{ color: THEME.colors.text.secondary }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    if (isNotAssigned) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={{ background: THEME.colors.background }}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overlay-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 scale-in">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                            <AlertCircle size={44} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600">Anda belum ditugaskan mengajar mata pelajaran.</p>
                        </div>
                        <button onClick={handleLogout}
                            className="w-full py-3 rounded-xl text-sm font-bold border transition-smooth flex items-center justify-center gap-2"
                            style={{ borderColor: THEME.colors.neutral.border, color: THEME.colors.neutral.text, background: THEME.colors.neutral.soft }}>
                            <LogOut size={17} /> Logout
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
            <div className="mb-6 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 icon-pop header-sheen" style={{ background: THEME.gradients.primary, boxShadow: `0 6px 16px rgba(232,105,10,0.35)` }}>
                    <ClipboardList size={20} className="text-white relative z-10" />
                </div>
                <div className="animate-fade-in-up delay-1">
                    <h1 className="text-xl font-bold" style={{ color: THEME.colors.text.primary }}>Atur Penilaian</h1>
                    <p className="text-sm" style={{ color: THEME.colors.text.muted }}>Kelola kategori akademik dan bobot penilaian per mata pelajaran</p>
                </div>
            </div>

            {/* ====== STATUS BANNER (accent-border card) ====== */}
            {isReadOnly && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-white border-l-4 animate-fade-in-up"
                    style={{
                        borderColor: isPeriodLocked ? THEME.colors.slate.base : THEME.colors.warning.base,
                        border: `1px solid ${THEME.colors.border}`,
                        borderLeftWidth: '4px',
                        borderLeftColor: isPeriodLocked ? THEME.colors.slate.base : THEME.colors.warning.base,
                        boxShadow: THEME.shadows.sm,
                    }}>
                    <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: isPeriodLocked ? THEME.colors.slate.base : THEME.colors.warning.base }} />
                    <div className="flex-1">
                        <p className="text-sm font-bold mb-1" style={{ color: isPeriodLocked ? THEME.colors.slate.text : THEME.colors.warning.text }}>
                            {isPeriodLocked ? 'Periode Penilaian Selesai' : 'Periode Penilaian Belum Aktif'}
                        </p>
                        <p className="text-xs" style={{ color: THEME.colors.text.secondary }}>
                            {isPeriodLocked
                                ? 'Konfigurasi kategori dan bobot sudah dikunci dan tidak dapat diubah.'
                                : 'Periode penilaian belum aktif. Silakan hubungi admin.'}
                        </p>
                    </div>
                </div>
            )}

            {/* ====== MAIN CARD ====== */}
            <div className="bg-white rounded-2xl overflow-hidden animate-fade-in-up delay-2" style={{ border: `1px solid ${THEME.colors.border}`, boxShadow: THEME.shadows.sm }}>
                {/* Tabs — segmented control */}
                <div className="px-6 py-4 border-b" style={{ borderColor: THEME.colors.border, background: THEME.colors.surface }}>
                    <div className="inline-flex p-1 rounded-xl gap-1" style={{ background: THEME.colors.primaryLight }}>
                        <button
                            onClick={() => handleTabChange('akademik')}
                            className="px-5 py-2 rounded-lg text-sm font-semibold transition-smooth flex items-center gap-2"
                            style={activeTab === 'akademik'
                                ? { background: '#fff', color: THEME.colors.primary, boxShadow: THEME.shadows.sm }
                                : { background: 'transparent', color: THEME.colors.text.muted }}
                        >
                            <FileText size={15} /> Kategori Akademik
                        </button>
                        <button
                            onClick={() => handleTabChange('bobot')}
                            className="px-5 py-2 rounded-lg text-sm font-semibold transition-smooth flex items-center gap-2"
                            style={activeTab === 'bobot'
                                ? { background: '#fff', color: THEME.colors.primary, boxShadow: THEME.shadows.sm }
                                : { background: 'transparent', color: THEME.colors.text.muted }}
                        >
                            <SlidersHorizontal size={15} /> Bobot Penilaian
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6" key={activeTab} style={{ animation: 'fadeInUp 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
                    {/* ====== TAB: AKADEMIK ====== */}
                    {activeTab === 'akademik' && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-xl" style={{ background: '#FBF7F2', border: `1px solid ${THEME.colors.border}` }}>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-semibold mb-1.5" style={{ color: THEME.colors.text.secondary }}>
                                        <GraduationCap size={14} style={{ color: THEME.colors.primarySoft }} /> Mata Pelajaran
                                    </label>
                                    <select
                                        value={selectedMapelAkademik || ''}
                                        onChange={(e) => {
                                            setSelectedMapelAkademik(e.target.value ? Number(e.target.value) : null);
                                            setSelectedKelasAkademik(null);
                                        }}
                                        className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white transition-smooth focus:ring-2"
                                        style={{ borderColor: THEME.colors.border, color: THEME.colors.text.primary }}
                                        onFocus={e => e.currentTarget.style.borderColor = THEME.colors.primarySoft}
                                        onBlur={e => e.currentTarget.style.borderColor = THEME.colors.border}
                                    >
                                        <option value="">-- Pilih Mata Pelajaran --</option>
                                        {/* ✅ Tanpa filter 'pilihan' — semua mapel yang ditugaskan tampil */}
                                        {mapelList.map((mapel) => (
                                            <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedMapelAkademik && kelasListAkademik.length > 0 && (
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-semibold mb-1.5" style={{ color: THEME.colors.text.secondary }}>
                                            <Users size={14} style={{ color: THEME.colors.primarySoft }} /> Kelas
                                        </label>
                                        <select
                                            value={selectedKelasAkademik || ''}
                                            onChange={(e) => setSelectedKelasAkademik(e.target.value ? Number(e.target.value) : null)}
                                            className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white transition-smooth focus:ring-2"
                                            style={{ borderColor: THEME.colors.border, color: THEME.colors.text.primary }}
                                            onFocus={e => e.currentTarget.style.borderColor = THEME.colors.primarySoft}
                                            onBlur={e => e.currentTarget.style.borderColor = THEME.colors.border}
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

                                    <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: `1px solid ${THEME.colors.border}` }}>
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} style={{ color: THEME.colors.text.muted }} />
                                            <p className="text-xs" style={{ color: THEME.colors.text.secondary }}>
                                                Menampilkan <strong>{kategoriList.length}</strong> kategori (urut dari nilai tertinggi)
                                            </p>
                                        </div>
                                        <button
                                            onClick={openBatchEdit}
                                            disabled={isReadOnly}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-smooth hover-lift"
                                            style={{
                                                background: isReadOnly ? THEME.colors.neutral.base : THEME.gradients.primary,
                                                boxShadow: isReadOnly ? 'none' : '0 6px 16px rgba(232,105,10,0.35)'
                                            }}
                                        >
                                            {isReadOnly ? (<><Lock size={16} /> Terkunci</>) : (<><Pencil size={16} /> Edit Semua</>)}
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto scrollbar-thin rounded-xl" style={{ border: `1px solid ${THEME.colors.border}` }}>
                                        <div className="min-w-[640px]">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr style={{ background: THEME.gradients.header }}>
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
                                                                    <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: THEME.colors.primaryLight, borderTopColor: THEME.colors.primarySoft }} />
                                                                    Memuat data...
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : kategoriList.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={3} className="py-12 text-center text-gray-400 text-sm">Belum ada kategori</td>
                                                        </tr>
                                                    ) : (
                                                        kategoriList
                                                            .slice()
                                                            .sort((a, b) => b.max_nilai - a.max_nilai)
                                                            .map((kategori, index) => (
                                                                <tr key={kategori.id} className="transition-smooth row-in"
                                                                    style={{ borderBottom: `1px solid ${THEME.colors.border}`, background: index % 2 === 0 ? '#fff' : '#FBF7F2', animationDelay: `${Math.min(index, 8) * 0.04}s` }}
                                                                    onMouseEnter={e => (e.currentTarget.style.background = THEME.colors.primaryLight)}
                                                                    onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#FBF7F2')}>
                                                                    <td className="px-4 py-3 text-center text-gray-500 font-medium">{index + 1}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                                                                            style={{ background: THEME.colors.primaryLight, color: THEME.colors.primary, border: `1px solid ${THEME.colors.border}` }}>
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
                                <div className="py-12 text-center rounded-2xl" style={{ background: '#FBF7F2', border: `2px dashed ${THEME.colors.border}` }}>
                                    <FileText size={56} className="mx-auto mb-4" style={{ color: THEME.colors.primarySoft, opacity: 0.6 }} />
                                    <p className="text-base font-bold" style={{ color: THEME.colors.text.secondary }}>
                                        {!selectedMapelAkademik ? 'Pilih Mata Pelajaran' : 'Pilih Kelas'}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: THEME.colors.text.muted }}>untuk melihat kategori penilaian</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ====== TAB: BOBOT ====== */}
                    {activeTab === 'bobot' && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-xl" style={{ background: '#FBF7F2', border: `1px solid ${THEME.colors.border}` }}>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-semibold mb-1.5" style={{ color: THEME.colors.text.secondary }}>
                                        <GraduationCap size={14} style={{ color: THEME.colors.primarySoft }} /> Mata Pelajaran
                                    </label>
                                    <select
                                        value={selectedMapelBobot || ''}
                                        onChange={(e) => {
                                            setSelectedMapelBobot(e.target.value ? Number(e.target.value) : null);
                                            setSelectedKelasBobot(null);
                                        }}
                                        className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white transition-smooth focus:ring-2"
                                        style={{ borderColor: THEME.colors.border, color: THEME.colors.text.primary }}
                                        onFocus={e => e.currentTarget.style.borderColor = THEME.colors.primarySoft}
                                        onBlur={e => e.currentTarget.style.borderColor = THEME.colors.border}
                                    >
                                        <option value="">-- Pilih Mata Pelajaran --</option>
                                        {mapelList.map((mapel) => (
                                            <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedMapelBobot && kelasListBobot.length > 0 && (
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-semibold mb-1.5" style={{ color: THEME.colors.text.secondary }}>
                                            <Users size={14} style={{ color: THEME.colors.primarySoft }} /> Kelas
                                        </label>
                                        <select
                                            value={selectedKelasBobot || ''}
                                            onChange={(e) => setSelectedKelasBobot(e.target.value ? Number(e.target.value) : null)}
                                            className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white transition-smooth focus:ring-2"
                                            style={{ borderColor: THEME.colors.border, color: THEME.colors.text.primary }}
                                            onFocus={e => e.currentTarget.style.borderColor = THEME.colors.primarySoft}
                                            onBlur={e => e.currentTarget.style.borderColor = THEME.colors.border}
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
                                            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: THEME.colors.primaryLight, borderTopColor: THEME.colors.primarySoft }} />
                                            <p className="text-sm text-gray-400">Memuat bobot...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {isPTSActive && (
                                            <div className="mb-4 p-3 rounded-xl flex items-center gap-3 border-l-4" style={{ background: THEME.colors.info.soft, borderColor: THEME.colors.info.base }}>
                                                <Info size={18} style={{ color: THEME.colors.info.base, flexShrink: 0 }} />
                                                <p className="text-sm" style={{ color: THEME.colors.info.text }}>
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
                                                    <div key={bobot.komponen_id} className="flex items-center justify-between gap-4 p-4 rounded-xl transition-smooth"
                                                        style={{ background: isEditable ? '#FBF7F2' : '#F7F7F6', border: `1px solid ${isEditable ? THEME.colors.border : '#E5E7EB'}` }}>
                                                        <div className="flex-1">
                                                            <span className="font-semibold text-sm" style={{ color: THEME.colors.text.secondary }}>{komponen?.nama_komponen || 'Komponen'}</span>
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
                                                                        if (val < 0) handleBobotChange(bobot.komponen_id, '0');
                                                                        else if (val > 100) handleBobotChange(bobot.komponen_id, '100');
                                                                    }
                                                                }}
                                                                disabled={!isEditable}
                                                                maxLength={5}
                                                                className={`w-24 h-11 px-3 text-center font-bold rounded-xl border-2 transition-smooth focus:ring-2 ${isEditable ? 'bg-white text-gray-800' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                                                                style={{ borderColor: isEditable ? THEME.colors.border : '#E5E7EB' }}
                                                                readOnly={!isEditable}
                                                                placeholder="0"
                                                            />
                                                            <span className="text-base font-bold" style={{ color: THEME.colors.text.secondary }}>%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="p-4 rounded-xl mb-6 border-l-4" style={{ background: isBobotValid ? THEME.colors.success.soft : THEME.colors.warning.soft, borderColor: isBobotValid ? THEME.colors.success.base : THEME.colors.warning.base }}>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm" style={{ color: THEME.colors.text.secondary }}>Total Bobot:</span>
                                                <span className="text-lg font-bold" style={{ color: isBobotValid ? THEME.colors.success.text : THEME.colors.warning.text }}>{totalBobot.toFixed(2)}%</span>
                                            </div>
                                        </div>

                                        {!isPTSActive && !isReadOnly && (
                                            <div className="flex justify-end pt-4" style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                                                <button onClick={openConfirmSaveBobot} disabled={isSavingBobot || !isBobotValid}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-smooth hover-lift"
                                                    style={{ background: THEME.colors.success.base, boxShadow: '0 6px 16px rgba(63,148,99,0.3)' }}
                                                    onMouseEnter={(e) => { if (!isSavingBobot && isBobotValid) e.currentTarget.style.background = THEME.colors.success.hover; }}
                                                    onMouseLeave={(e) => { if (!isSavingBobot && isBobotValid) e.currentTarget.style.background = THEME.colors.success.base; }}>
                                                    {isSavingBobot ? (
                                                        <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</>
                                                    ) : (
                                                        <><Save size={16} /> Simpan Bobot</>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="py-12 text-center rounded-2xl" style={{ background: '#FBF7F2', border: `2px dashed ${THEME.colors.border}` }}>
                                    <SlidersHorizontal size={56} className="mx-auto mb-4" style={{ color: THEME.colors.primarySoft, opacity: 0.6 }} />
                                    <p className="text-base font-bold" style={{ color: THEME.colors.text.secondary }}>
                                        {!selectedMapelBobot ? 'Pilih Mata Pelajaran' : 'Pilih Kelas'}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: THEME.colors.text.muted }}>untuk mengatur bobot penilaian</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ====== MODAL BATCH EDIT KATEGORI ====== */}
            {showBatchEdit && (
                <div className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${batchEditClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => { if (e.target === e.currentTarget) closeBatchEdit(); }}>
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={{ border: `1px solid ${THEME.colors.border}` }}>

                        <div className="flex items-center justify-between px-6 py-4" style={{ background: THEME.gradients.header }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                    <FileText size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Edit Kategori Akademik</h2>
                                    <p className="text-xs text-orange-50/90 mt-0.5">Kelola semua kategori sekaligus</p>
                                </div>
                            </div>
                            <button onClick={closeBatchEdit} className="w-8 h-8 rounded-lg flex items-center justify-center transition-smooth" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
                            <div className="p-6 space-y-4">
                                <div className="p-3 rounded-xl flex items-start gap-2 border-l-4" style={{ background: THEME.colors.info.soft, borderColor: THEME.colors.info.base }}>
                                    <Info size={16} style={{ color: THEME.colors.info.base }} className="mt-0.5 flex-shrink-0" />
                                    <p className="text-xs" style={{ color: THEME.colors.info.text }}>
                                        <strong>Tips:</strong> Isi semua kategori sekaligus. Pastikan range nilai 0-100 lengkap tanpa overlap dan minimal 3 poin per kategori.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold" style={{ color: THEME.colors.text.secondary }}>Kategori ({batchKategori.length})</h3>
                                    <button onClick={addBatchRow}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth"
                                        style={{ background: THEME.colors.info.soft, border: `1.5px solid ${THEME.colors.info.border}`, color: THEME.colors.info.text }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#DCEBF0')}
                                        onMouseLeave={e => (e.currentTarget.style.background = THEME.colors.info.soft)}>
                                        <Plus size={14} /> Tambah Baris
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {batchKategori.map((kategori, index) => {
                                        const errors: string[] = [];
                                        if (isNaN(kategori.min_nilai) || isNaN(kategori.max_nilai)) errors.push('Nilai tidak valid');
                                        else if (kategori.min_nilai >= kategori.max_nilai) errors.push(`Min (${kategori.min_nilai}) >= Max (${kategori.max_nilai})`);
                                        else if ((kategori.max_nilai - kategori.min_nilai) < 3) errors.push('Range minimal 3 poin');
                                        if (!kategori.deskripsi || kategori.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');

                                        return (
                                            <div key={index} className="p-4 rounded-xl transition-smooth" style={{ background: '#FBF7F2', border: `1.5px solid ${THEME.colors.border}` }}>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                                                        style={{ background: THEME.gradients.primary }}>
                                                        {index + 1}
                                                    </div>

                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5" style={{ color: THEME.colors.text.secondary }}>Min <span style={{ color: THEME.colors.danger.base }}>*</span></label>
                                                            <input type="number" min="0" max="100" value={kategori.min_nilai}
                                                                onChange={(e) => updateBatchRow(index, 'min_nilai', parseInt(e.target.value) || 0)}
                                                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white transition-smooth focus:ring-2"
                                                                style={{ borderColor: THEME.colors.border }} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5" style={{ color: THEME.colors.text.secondary }}>Max <span style={{ color: THEME.colors.danger.base }}>*</span></label>
                                                            <input type="number" min="0" max="100" value={kategori.max_nilai}
                                                                onChange={(e) => updateBatchRow(index, 'max_nilai', parseInt(e.target.value) || 0)}
                                                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white transition-smooth focus:ring-2"
                                                                style={{ borderColor: THEME.colors.border }} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5" style={{ color: THEME.colors.text.secondary }}>Deskripsi <span style={{ color: THEME.colors.danger.base }}>*</span></label>
                                                            <input type="text" value={kategori.deskripsi}
                                                                onChange={(e) => updateBatchRow(index, 'deskripsi', e.target.value)}
                                                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white transition-smooth focus:ring-2"
                                                                style={{ borderColor: THEME.colors.border }} placeholder="Sangat Baik" />
                                                        </div>
                                                    </div>

                                                    {batchKategori.length > 1 && (
                                                        <button onClick={() => removeBatchRow(index)}
                                                            className="mt-7 p-2 rounded-lg transition-smooth"
                                                            style={{ background: THEME.colors.danger.soft, border: `1.5px solid ${THEME.colors.danger.border}`, color: THEME.colors.danger.text }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = '#F9D9D6')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = THEME.colors.danger.soft)}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {errors.length > 0 && (
                                                    <div className="mt-3 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: THEME.colors.danger.soft, color: THEME.colors.danger.text, border: `1px solid ${THEME.colors.danger.border}` }}>
                                                        <AlertCircle size={12} /> {errors.join(' | ')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {(() => {
                                    const validation = validateBatchKategori();
                                    return (
                                        <div className="p-3 rounded-xl flex items-center gap-2" style={{
                                            background: validation.valid ? THEME.colors.success.soft : THEME.colors.warning.soft,
                                            border: `1.5px solid ${validation.valid ? THEME.colors.success.border : THEME.colors.warning.border}`,
                                            color: validation.valid ? THEME.colors.success.text : THEME.colors.warning.text
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

                        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: `1.5px solid ${THEME.colors.border}`, background: '#FBF7F2' }}>
                            <button onClick={closeBatchEdit} disabled={isSavingBatch}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ borderColor: THEME.colors.neutral.border, color: THEME.colors.neutral.text, background: '#fff' }}
                                onMouseEnter={e => { if (!isSavingBatch) e.currentTarget.style.background = THEME.colors.neutral.soft; }}
                                onMouseLeave={e => { if (!isSavingBatch) e.currentTarget.style.background = '#fff'; }}>
                                Batal
                            </button>
                            <button onClick={openConfirmSaveBatch} disabled={isSavingBatch}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-smooth hover-lift"
                                style={{ background: THEME.colors.success.base, boxShadow: '0 6px 16px rgba(63,148,99,0.3)' }}
                                onMouseEnter={e => { if (!isSavingBatch) e.currentTarget.style.background = THEME.colors.success.hover; }}
                                onMouseLeave={e => { if (!isSavingBatch) e.currentTarget.style.background = THEME.colors.success.base; }}>
                                {isSavingBatch ? (
                                    <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</>
                                ) : (
                                    <><Save size={16} /> Simpan {batchKategori.length} Kategori</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL KONFIRMASI (disesuaikan agar terasa sebagai konfirmasi simpan, bukan peringatan) ====== */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overlay-in"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}>
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: THEME.colors.success.soft }}>
                                <CheckCircle2 size={24} style={{ color: THEME.colors.success.base }} />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Konfirmasi Penyimpanan</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">
                            {confirmAction === 'save-bobot' ? 'Apakah Anda yakin ingin menyimpan bobot ini?' :
                                confirmAction === 'save-batch-kategori' ? `Apakah Anda yakin ingin menyimpan ${batchKategori.length} kategori ini?\n\nSemua kategori lama akan dihapus dan diganti dengan yang baru.` :
                                    'Apakah Anda yakin ingin menyimpan?'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-smooth"
                                style={{ borderColor: THEME.colors.neutral.border, color: THEME.colors.neutral.text, background: '#fff' }}
                                onMouseEnter={e => (e.currentTarget.style.background = THEME.colors.neutral.soft)}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                Batal
                            </button>
                            <button onClick={() => {
                                setShowConfirmModal(false);
                                if (confirmAction === 'save-bobot') executeSaveBobot();
                                else if (confirmAction === 'save-batch-kategori') executeSaveBatchKategori();
                            }}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-smooth"
                                style={{ background: THEME.colors.success.base, boxShadow: THEME.shadows.sm }}
                                onMouseEnter={e => (e.currentTarget.style.background = THEME.colors.success.hover)}
                                onMouseLeave={e => (e.currentTarget.style.background = THEME.colors.success.base)}>
                                Ya, Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}