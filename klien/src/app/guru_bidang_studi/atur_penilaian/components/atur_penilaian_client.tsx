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
 * UPDATE 2 (🎨 RESTYLE — konsistensi design system):
 *   Disamakan penuh dengan Data Guru/Admin/Siswa/Dashboard/Backup&Restore/
 *   Data Ekstrakurikuler: token BRAND_GRADIENT/ACCENT/ACCENT_DARK, kartu abu
 *   netral (#f6f7f9 / border #ececec), sistem ActionButton (primary/info/
 *   warning/neutral/danger), tabel Kategori Akademik diubah ke grid kolom
 *   sejajar (pola sama seperti tabel Data Guru/Admin/Siswa/Ekstrakurikuler),
 *   tab switcher & tombol simpan/edit warnanya disamakan dengan konvensi
 *   halaman lain (Simpan = oranye/primary, Edit = kuning/warning, Tambah
 *   Baris = biru/info, Hapus = merah/danger). TIDAK ADA PERUBAHAN LOGIKA:
 *   seluruh state, effect, handler, dan endpoint API tetap identik.
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

// ====== DESIGN TOKENS — disamakan penuh dengan Data Guru/Admin/Siswa/
// Dashboard/Backup&Restore/Data Ekstrakurikuler. ======

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";

/* Palet warna semantik untuk banner/badge (bukan tombol) — dipakai konsisten
   dengan warna yang sudah ada di halaman lain (info biru, sukses hijau,
   peringatan amber, bahaya merah, netral abu, aksen oranye lembut). */
const COLORS = {
    success: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    danger: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    warning: { bg: '#fef9c3', text: '#92400e', border: '#fde68a' },
    info: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    neutral: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
    accent: { bg: '#fff5eb', text: ACCENT_DARK, border: '#fde0c8' },
};

/* Kolom grid tabel Kategori Akademik — header & body memakai lebar identik
   (pola sama seperti tabel Data Guru/Admin/Siswa/Ekstrakurikuler). */
const GRID_COLS_KATEGORI = 'minmax(56px,0.6fr) minmax(160px,1.4fr) minmax(220px,2.6fr)';

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
type ModalType = 'success' | 'error' | 'warning' | 'network';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
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

// ====== GLOBAL STYLES — identik dengan Data Guru/Admin/Siswa/Ekstrakurikuler ======
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .dg-fadeIn  { animation: dg-fadeIn  0.18s ease; }
        .dg-scaleIn { animation: dg-scaleIn 0.22s cubic-bezier(0.4,0,0.2,1); }
        .dg-pulse   { animation: dg-pulse   0.6s ease 0.1s; }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0);    }
        }
        .anim-in { animation: fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.03s; }
        .d2 { animation-delay: 0.07s; }
        .d3 { animation-delay: 0.11s; }
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
            .anim-in, .row-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .btn-action, .card-flat, .row-hover {
                animation: none !important;
                transition: none !important;
            }
        }
    `}</style>
);

// ====== SISTEM TOMBOL AKSI — identik dengan Data Guru/Admin/Siswa/Ekstrakurikuler ======

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'danger';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#fff', color: '#4b5563', border: '1.5px solid #e5e7eb' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
    danger: { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
};

const ActionButton = ({
    onClick, children, variant = 'neutral', disabled = false, fullWidth = false, title,
}: {
    onClick?: () => void; children: React.ReactNode; variant?: BtnVariant;
    disabled?: boolean; fullWidth?: boolean; title?: string;
}) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={`btn-action inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={VARIANT_BASE[variant]}
    >
        {children}
    </button>
);

// ====== NOTIF MODAL — identik dengan Data Guru/Admin/Siswa ======
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                <div className="text-center w-full">
                    <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>OK, Mengerti</button>
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
        <div className="mb-5 pl-4 pr-4 py-4 rounded-xl flex items-start gap-3 anim-in"
            style={{ background: COLORS.warning.bg, border: `1px solid ${COLORS.warning.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fde68a' }}>
                <AlertTriangle size={18} style={{ color: COLORS.warning.text }} />
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold mb-2" style={{ color: COLORS.warning.text }}>Range Nilai 0–100 Belum Lengkap</p>
                {gaps.length === 1 ? (
                    <p className="text-xs" style={{ color: COLORS.warning.text }}>
                        Ada gap pada <strong>{gaps[0].aspek}</strong> di rentang <strong className="px-2 py-0.5 rounded bg-amber-200/60">{gaps[0].gap}</strong>.
                    </p>
                ) : (
                    <div className="text-xs" style={{ color: COLORS.warning.text }}>
                        <p className="mb-2">Ditemukan {gaps.length} gap:</p>
                        <ul className="space-y-1 ml-4">
                            {gaps.map((g, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.warning.text }}></span>
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

    // ✅ PERBAIKAN LOGIKA READ-ONLY
    // 1. Sistem terkunci jika KEDUA periode belum dibuka
    const isPeriodNotOpen = statusPTS === 'nonaktif' && statusPAS === 'nonaktif';

    // 2. Sistem terkunci HANYA JIKA periode yang SEDANG AKTIF berstatus 'selesai'
    const isPeriodLocked =
        (jenisPenilaianAktif === 'PTS' && statusPTS === 'selesai') ||
        (jenisPenilaianAktif === 'PAS' && statusPAS === 'selesai');

    // 3. Gabungkan kedua kondisi di atas
    const isReadOnly = isPeriodNotOpen || isPeriodLocked;

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
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                <div className="text-center dg-fadeIn">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-100 border-t-orange-500 mx-auto mb-4 animate-spin" />
                    <p className="text-sm font-semibold" style={{ color: ACCENT_DARK }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    if (isNotAssigned) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                            <AlertCircle size={44} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600">Anda belum ditugaskan mengajar mata pelajaran.</p>
                        </div>
                        <ActionButton variant="neutral" fullWidth onClick={handleLogout}>
                            <LogOut size={17} /> Logout
                        </ActionButton>
                    </div>
                </div>
            </div>
        );
    }

    // ====== RENDER ======
    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* ====== HEADER — teks polos, konsisten dengan Data Guru/Admin/Siswa ====== */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Atur Penilaian</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola kategori akademik dan bobot penilaian per mata pelajaran</p>
            </div>

            {/* ====== STATUS BANNER ====== */}
            {isReadOnly && (
                <div className="card-flat mb-4 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-white anim-in d2"
                    style={{
                        ...CARD_STYLE,
                        borderLeft: `4px solid ${isPeriodLocked ? COLORS.neutral.text : COLORS.warning.text}`,
                    }}>
                    <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: isPeriodLocked ? COLORS.neutral.text : COLORS.warning.text }} />
                    <div className="flex-1">
                        <p className="text-sm font-bold mb-1" style={{ color: isPeriodLocked ? COLORS.neutral.text : COLORS.warning.text }}>
                            {isPeriodLocked ? 'Periode Penilaian Selesai' : 'Periode Penilaian Belum Aktif'}
                        </p>
                        <p className="text-xs text-gray-500">
                            {isPeriodLocked
                                ? 'Konfigurasi kategori dan bobot sudah dikunci dan tidak dapat diubah.'
                                : 'Periode penilaian belum aktif. Silakan hubungi admin.'}
                        </p>
                    </div>
                </div>
            )}

            {/* ====== MAIN CARD ====== */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                {/* Tabs — segmented pill, warna aktif BRAND_GRADIENT, sama gaya dengan
                    tab switcher Backup & Restore */}
                <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: '#f0f0f0' }}>
                    <div className="inline-flex p-1 rounded-xl gap-1" style={{ background: '#f6f7f9', border: '1px solid #ececec' }}>
                        <button
                            onClick={() => handleTabChange('akademik')}
                            className="btn-action px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                            style={activeTab === 'akademik'
                                ? { background: BRAND_GRADIENT, color: '#fff', boxShadow: '0 2px 8px rgba(232,105,10,0.25)' }
                                : { background: 'transparent', color: ACCENT_DARK }}
                        >
                            <FileText size={15} /> Kategori Akademik
                        </button>
                        <button
                            onClick={() => handleTabChange('bobot')}
                            className="btn-action px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                            style={activeTab === 'bobot'
                                ? { background: BRAND_GRADIENT, color: '#fff', boxShadow: '0 2px 8px rgba(232,105,10,0.25)' }
                                : { background: 'transparent', color: ACCENT_DARK }}
                        >
                            <SlidersHorizontal size={15} /> Bobot Penilaian
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-6" key={activeTab}>
                    {/* ====== TAB: AKADEMIK ====== */}
                    {activeTab === 'akademik' && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                                <div>
                                    <label className={labelCls} style={labelColor}>
                                        <span className="inline-flex items-center gap-1.5"><GraduationCap size={14} style={{ color: ACCENT }} /> Mata Pelajaran</span>
                                    </label>
                                    <select
                                        value={selectedMapelAkademik || ''}
                                        onChange={(e) => {
                                            setSelectedMapelAkademik(e.target.value ? Number(e.target.value) : null);
                                            setSelectedKelasAkademik(null);
                                        }}
                                        className={inputCls}
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
                                        <label className={labelCls} style={labelColor}>
                                            <span className="inline-flex items-center gap-1.5"><Users size={14} style={{ color: ACCENT }} /> Kelas</span>
                                        </label>
                                        <select
                                            value={selectedKelasAkademik || ''}
                                            onChange={(e) => setSelectedKelasAkademik(e.target.value ? Number(e.target.value) : null)}
                                            className={inputCls}
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

                                    <div className="flex justify-between items-center mb-4 pb-4 border-b" style={{ borderColor: '#f0f0f0' }}>
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-gray-400" />
                                            <p className="text-xs text-gray-500">
                                                Menampilkan <strong>{kategoriList.length}</strong> kategori (urut dari nilai tertinggi)
                                            </p>
                                        </div>
                                        <ActionButton
                                            variant={isReadOnly ? 'neutral' : 'warning'}
                                            disabled={isReadOnly}
                                            onClick={openBatchEdit}
                                        >
                                            {isReadOnly ? (<><Lock size={16} /> Terkunci</>) : (<><Pencil size={16} /> Edit Semua</>)}
                                        </ActionButton>
                                    </div>

                                    {/* Tabel Kategori Akademik — grid kolom sejajar, pola sama dengan
                                        Data Guru/Admin/Siswa/Ekstrakurikuler */}
                                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ececec' }}>
                                        <div className="overflow-x-auto">
                                            <div style={{ width: '100%', minWidth: '480px' }}>
                                                <div className="grid" style={{ gridTemplateColumns: GRID_COLS_KATEGORI, background: BRAND_GRADIENT }}>
                                                    <div className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                                                    <div className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Range Nilai</div>
                                                    <div className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Deskripsi</div>
                                                </div>

                                                {kategoriLoading ? (
                                                    Array.from({ length: 3 }).map((_, i) => (
                                                        <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS_KATEGORI, borderColor: '#f0f0f0' }}>
                                                            {Array.from({ length: 3 }).map((__, j) => (
                                                                <div key={j} className="px-4 py-4 flex items-center justify-center">
                                                                    <div className="h-4 rounded w-full bg-gray-100 animate-pulse" style={{ maxWidth: j === 2 ? '85%' : '55%' }} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))
                                                ) : kategoriList.length === 0 ? (
                                                    <div className="py-12 text-center text-gray-400 text-sm">Belum ada kategori</div>
                                                ) : (
                                                    kategoriList
                                                        .slice()
                                                        .sort((a, b) => b.max_nilai - a.max_nilai)
                                                        .map((kategori, index) => (
                                                            <div key={kategori.id} className="grid row-in row-hover border-b transition-colors"
                                                                style={{ gridTemplateColumns: GRID_COLS_KATEGORI, borderColor: '#f0f0f0', background: '#fff', animationDelay: `${Math.min(index, 8) * 0.04}s` }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                                                <div className="px-4 py-3.5 flex items-center justify-center text-gray-400">{index + 1}</div>
                                                                <div className="px-4 py-3.5 flex items-center justify-center">
                                                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                                                                        style={{ background: COLORS.accent.bg, color: COLORS.accent.text, border: `1px solid ${COLORS.accent.border}` }}>
                                                                        {Math.floor(kategori.min_nilai)} – {Math.floor(kategori.max_nilai)}
                                                                    </span>
                                                                </div>
                                                                <div className="px-4 py-3.5 flex items-center text-gray-700 truncate" title={kategori.deskripsi}>{kategori.deskripsi}</div>
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-12 text-center rounded-2xl" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                                    <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-sm font-bold text-gray-500">
                                        {!selectedMapelAkademik ? 'Pilih Mata Pelajaran' : 'Pilih Kelas'}
                                    </p>
                                    <p className="text-xs mt-1 text-gray-400">untuk melihat kategori penilaian</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ====== TAB: BOBOT ====== */}
                    {activeTab === 'bobot' && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                                <div>
                                    <label className={labelCls} style={labelColor}>
                                        <span className="inline-flex items-center gap-1.5"><GraduationCap size={14} style={{ color: ACCENT }} /> Mata Pelajaran</span>
                                    </label>
                                    <select
                                        value={selectedMapelBobot || ''}
                                        onChange={(e) => {
                                            setSelectedMapelBobot(e.target.value ? Number(e.target.value) : null);
                                            setSelectedKelasBobot(null);
                                        }}
                                        className={inputCls}
                                    >
                                        <option value="">-- Pilih Mata Pelajaran --</option>
                                        {mapelList.map((mapel) => (
                                            <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedMapelBobot && kelasListBobot.length > 0 && (
                                    <div>
                                        <label className={labelCls} style={labelColor}>
                                            <span className="inline-flex items-center gap-1.5"><Users size={14} style={{ color: ACCENT }} /> Kelas</span>
                                        </label>
                                        <select
                                            value={selectedKelasBobot || ''}
                                            onChange={(e) => setSelectedKelasBobot(e.target.value ? Number(e.target.value) : null)}
                                            className={inputCls}
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
                                            <div className="w-8 h-8 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin" />
                                            <p className="text-sm text-gray-400">Memuat bobot...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {isPTSActive && (
                                            <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: COLORS.info.bg, border: `1px solid ${COLORS.info.border}` }}>
                                                <Info size={18} style={{ color: COLORS.info.text, flexShrink: 0 }} />
                                                <p className="text-sm" style={{ color: COLORS.info.text }}>
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
                                                    <div key={bobot.komponen_id} className="flex items-center justify-between gap-4 p-4 rounded-xl transition-colors"
                                                        style={{ background: isEditable ? '#fafafa' : '#f3f4f6', border: `1px solid ${isEditable ? '#ececec' : '#e5e7eb'}` }}>
                                                        <div className="flex-1">
                                                            <span className="font-bold text-sm text-gray-700">{komponen?.nama_komponen || 'Komponen'}</span>
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
                                                                className={`w-24 h-11 px-3 text-center font-bold rounded-xl border-2 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 ${isEditable ? 'bg-white text-gray-800 border-gray-200' : 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'}`}
                                                                readOnly={!isEditable}
                                                                placeholder="0"
                                                            />
                                                            <span className="text-base font-bold text-gray-600">%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="p-4 rounded-xl mb-6" style={{ background: isBobotValid ? COLORS.success.bg : COLORS.warning.bg, border: `1px solid ${isBobotValid ? COLORS.success.border : COLORS.warning.border}` }}>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm text-gray-700">Total Bobot:</span>
                                                <span className="text-lg font-bold" style={{ color: isBobotValid ? COLORS.success.text : COLORS.warning.text }}>{totalBobot.toFixed(2)}%</span>
                                            </div>
                                        </div>

                                        {!isPTSActive && !isReadOnly && (
                                            <div className="flex justify-end pt-4 border-t" style={{ borderColor: '#f0f0f0' }}>
                                                <ActionButton variant="primary" disabled={isSavingBobot || !isBobotValid} onClick={openConfirmSaveBobot}>
                                                    {isSavingBobot ? (
                                                        <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</>
                                                    ) : (
                                                        <><Save size={16} /> Simpan Bobot</>
                                                    )}
                                                </ActionButton>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="py-12 text-center rounded-2xl" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                                    <SlidersHorizontal size={48} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-sm font-bold text-gray-500">
                                        {!selectedMapelBobot ? 'Pilih Mata Pelajaran' : 'Pilih Kelas'}
                                    </p>
                                    <p className="text-xs mt-1 text-gray-400">untuk mengatur bobot penilaian</p>
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
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <FileText size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Edit Kategori Akademik</h2>
                                    <p className="text-xs text-white/80 mt-0.5">Kelola semua kategori sekaligus</p>
                                </div>
                            </div>
                            <button onClick={closeBatchEdit} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="p-4 sm:p-6 space-y-4">
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: COLORS.info.bg, border: `1px solid ${COLORS.info.border}` }}>
                                    <Info size={16} style={{ color: COLORS.info.text }} className="mt-0.5 flex-shrink-0" />
                                    <p className="text-xs" style={{ color: COLORS.info.text }}>
                                        <strong>Tips:</strong> Isi semua kategori sekaligus. Pastikan range nilai 0-100 lengkap tanpa overlap dan minimal 3 poin per kategori.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-700">Kategori ({batchKategori.length})</h3>
                                    <ActionButton variant="info" onClick={addBatchRow}>
                                        <Plus size={14} /> Tambah Baris
                                    </ActionButton>
                                </div>

                                <div className="space-y-3">
                                    {batchKategori.map((kategori, index) => {
                                        const errors: string[] = [];
                                        if (isNaN(kategori.min_nilai) || isNaN(kategori.max_nilai)) errors.push('Nilai tidak valid');
                                        else if (kategori.min_nilai >= kategori.max_nilai) errors.push(`Min (${kategori.min_nilai}) >= Max (${kategori.max_nilai})`);
                                        else if ((kategori.max_nilai - kategori.min_nilai) < 3) errors.push('Range minimal 3 poin');
                                        if (!kategori.deskripsi || kategori.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');

                                        return (
                                            <div key={index} className="p-4 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                                                        style={{ background: BRAND_GRADIENT }}>
                                                        {index + 1}
                                                    </div>

                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Min <span className="text-red-500">*</span></label>
                                                            <input type="number" min="0" max="100" value={kategori.min_nilai}
                                                                onChange={(e) => updateBatchRow(index, 'min_nilai', parseInt(e.target.value) || 0)}
                                                                className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Max <span className="text-red-500">*</span></label>
                                                            <input type="number" min="0" max="100" value={kategori.max_nilai}
                                                                onChange={(e) => updateBatchRow(index, 'max_nilai', parseInt(e.target.value) || 0)}
                                                                className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Deskripsi <span className="text-red-500">*</span></label>
                                                            <input type="text" value={kategori.deskripsi}
                                                                onChange={(e) => updateBatchRow(index, 'deskripsi', e.target.value)}
                                                                className={inputCls} placeholder="Sangat Baik" />
                                                        </div>
                                                    </div>

                                                    {batchKategori.length > 1 && (
                                                        <button onClick={() => removeBatchRow(index)}
                                                            className="btn-action mt-7 p-2 rounded-lg transition-colors"
                                                            style={{ background: COLORS.danger.bg, border: `1.5px solid ${COLORS.danger.border}`, color: COLORS.danger.text }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {errors.length > 0 && (
                                                    <div className="mt-3 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: COLORS.danger.bg, color: COLORS.danger.text, border: `1px solid ${COLORS.danger.border}` }}>
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
                                            background: validation.valid ? COLORS.success.bg : COLORS.warning.bg,
                                            border: `1.5px solid ${validation.valid ? COLORS.success.border : COLORS.warning.border}`,
                                            color: validation.valid ? COLORS.success.text : COLORS.warning.text
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

                        <div className="px-4 sm:px-6 py-4 flex justify-end gap-2.5" style={{ borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                            <ActionButton variant="neutral" disabled={isSavingBatch} onClick={closeBatchEdit}>
                                Batal
                            </ActionButton>
                            <ActionButton variant="primary" disabled={isSavingBatch} onClick={openConfirmSaveBatch}>
                                {isSavingBatch ? (
                                    <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</>
                                ) : (
                                    <><Save size={16} /> Simpan {batchKategori.length} Kategori</>
                                )}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL KONFIRMASI SIMPAN ====== */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Konfirmasi Penyimpanan</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">
                            {confirmAction === 'save-bobot' ? 'Apakah Anda yakin ingin menyimpan bobot ini?' :
                                confirmAction === 'save-batch-kategori' ? `Apakah Anda yakin ingin menyimpan ${batchKategori.length} kategori ini?\n\nSemua kategori lama akan dihapus dan diganti dengan yang baru.` :
                                    'Apakah Anda yakin ingin menyimpan?'}
                        </p>
                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmModal(false)}>Batal</ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={() => {
                                setShowConfirmModal(false);
                                if (confirmAction === 'save-bobot') executeSaveBobot();
                                else if (confirmAction === 'save-batch-kategori') executeSaveBatchKategori();
                            }}>
                                Ya, Simpan
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}