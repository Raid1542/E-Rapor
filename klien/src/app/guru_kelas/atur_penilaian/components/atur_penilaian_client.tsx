'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import {
    Pencil, X, Plus, Trash2, CheckCircle2, AlertCircle, WifiOff,
    ShieldAlert, LogOut, Lock, Layers, BookOpen, BarChart3, TrendingUp,
    AlertTriangle, Award, Calendar, Save, Info
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-kelas';
const ASPEK_MUTABAAH_ID = 5;

// ====== HELPER ======
const getJenisParam = (jenis: 'PTS' | 'PAS' | null): string => jenis ? `jenis=${jenis}` : '';

// ====== TYPES ======
type ModalType = 'success' | 'error' | 'warning' | 'network';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
}

interface AspekKokurikuler {
    id_aspek_kokurikuler: number;
    nama: string;
}

interface MapelItem {
    mata_pelajaran_id: number;
    nama_mapel: string;
    jenis: 'wajib' | 'pilihan';
}

interface KategoriAkademik {
    id: number;
    min_nilai: number;
    max_nilai: number;
    deskripsi: string;
    urutan: number;
}

interface KategoriKokurikuler {
    id: number;
    min_nilai: number;
    max_nilai: number;
    grade: string;
    deskripsi: string;
    urutan: number;
    id_aspek_kokurikuler: number;
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
    gaps?: Array<{ aspek: string; gap: string }> | string[];
}

interface BatchGradeItem {
    id?: number;
    grade?: string;
    min_nilai: number;
    max_nilai: number;
    deskripsi: string;
    isNew?: boolean;
}

// ====== DESIGN TOKENS ======
// Disamakan persis dengan atur_penilaian_gbs_client.tsx (Guru Bidang Studi) agar
// seluruh halaman "Atur Penilaian" untuk peran Guru memiliki tampilan konsisten.

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

/* Palet warna semantik untuk banner/badge (bukan tombol) — identik dengan
   atur_penilaian_gbs_client.tsx supaya kedua halaman Guru terlihat satu sistem. */
const COLORS = {
    success: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    danger: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    warning: { bg: '#fef9c3', text: '#92400e', border: '#fde68a' },
    info: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    neutral: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
    accent: { bg: '#fff5eb', text: ACCENT_DARK, border: '#fde0c8' },
};

/* Kolom grid tabel kategori (Kokurikuler/Akademik/Deskripsi Rata-rata) — header &
   body memakai lebar identik, sama seperti GRID_COLS_KATEGORI pada halaman GBS. */
const GRID_COLS_KATEGORI = 'minmax(56px,0.6fr) minmax(160px,1.4fr) minmax(220px,2.6fr)';

// ====== GLOBAL STYLES ======
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
    .d4 { animation-delay: 0.15s; }
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

    .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
    .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: #f0c896; border-radius: 10px; }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #e8a865; }
    .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #f0c896 transparent; }

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

// ====== SISTEM TOMBOL AKSI (disamakan dengan Guru Bidang Studi) ======
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
    onClick?: () => void; children: ReactNode; variant?: BtnVariant;
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

// ====== NOTIF MODAL ======
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

// ✅ CoverageWarning — restyle mengikuti atur_penilaian_gbs_client.tsx (palet
// COLORS.warning/amber), logika gap tetap mendukung format lama (gap tunggal)
// maupun format baru (gaps: string[] atau {aspek, gap}[]).
const CoverageWarning = ({ coverage }: { coverage: CoverageInfo | null }) => {
    if (!coverage || coverage.covered) return null;

    let gapsList: string[] = [];
    if (coverage.gaps) {
        if (Array.isArray(coverage.gaps)) {
            if (coverage.gaps.length > 0) {
                const first = coverage.gaps[0];
                if (typeof first === 'string') {
                    gapsList = coverage.gaps as string[];
                } else {
                    gapsList = (coverage.gaps as Array<{ aspek: string; gap: string }>).map(g => `${g.aspek}: ${g.gap}`);
                }
            }
        }
    } else if (coverage.gap) {
        gapsList = [coverage.gap];
    }

    if (gapsList.length === 0) return null;

    return (
        <div className="mb-5 pl-4 pr-4 py-4 rounded-xl flex items-start gap-3 anim-in"
            style={{ background: COLORS.warning.bg, border: `1px solid ${COLORS.warning.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fde68a' }}>
                <AlertTriangle size={18} style={{ color: COLORS.warning.text }} />
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold mb-2" style={{ color: COLORS.warning.text }}>Range Nilai 0–100 Belum Lengkap</p>
                {gapsList.length === 1 ? (
                    <p className="text-xs" style={{ color: COLORS.warning.text }}>
                        Ada gap pada rentang <strong className="px-2 py-0.5 rounded bg-amber-200/60">{gapsList[0]}</strong>
                    </p>
                ) : (
                    <div className="text-xs" style={{ color: COLORS.warning.text }}>
                        <p className="mb-2">Ditemukan {gapsList.length} gap yang belum dibuat:</p>
                        <ul className="space-y-1 ml-4">
                            {gapsList.map((gap, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: COLORS.warning.text }}></span>
                                    <span>Rentang <strong className="px-1.5 py-0.5 rounded bg-amber-200/60">{gap}</strong></span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

// ====== SHARED STYLE CONSTANTS ======
const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const selectCls = "border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 min-w-[200px]";

// ====== MAIN COMPONENT ======
export default function AturPenilaianGuruKelasClient() {
    const { showSessionExpired, handleLogout } = useSession();

    // ── States ──
    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);
    const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [activeTab, setActiveTab] = useState<'kokurikuler' | 'akademik' | 'bobot' | 'deskripsi-rata-rata'>('kokurikuler');

    const [loading, setLoading] = useState(true);
    const [aspekList, setAspekList] = useState<AspekKokurikuler[]>([]);
    const [mapelList, setMapelList] = useState<MapelItem[]>([]);
    const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);
    const [kategoriList, setKategoriList] = useState<(KategoriAkademik | KategoriKokurikuler)[]>([]);
    const [kategoriLoading, setKategoriLoading] = useState(false);
    const [coverageInfo, setCoverageInfo] = useState<CoverageInfo | null>(null);

    const [deskripsiRataRataList, setDeskripsiRataRataList] = useState<any[]>([]);
    const [deskripsiRataRataLoading, setDeskripsiRataRataLoading] = useState(false);
    const [deskripsiRataRataCoverage, setDeskripsiRataRataCoverage] = useState<CoverageInfo | null>(null);

    // Batch Edit - Kokurikuler
    const [showBatchEdit, setShowBatchEdit] = useState(false);
    const [batchEditClosing, setBatchEditClosing] = useState(false);
    const [batchEditAspekId, setBatchEditAspekId] = useState<number | null>(null);
    const [batchGrades, setBatchGrades] = useState<BatchGradeItem[]>([]);
    const [originalBatchGrades, setOriginalBatchGrades] = useState<BatchGradeItem[]>([]);
    const [isSavingBatch, setIsSavingBatch] = useState(false);

    // Batch Edit - Akademik
    const [showBatchEditAkademik, setShowBatchEditAkademik] = useState(false);
    const [batchEditAkademikClosing, setBatchEditAkademikClosing] = useState(false);
    const [batchAkademik, setBatchAkademik] = useState<BatchGradeItem[]>([]);
    const [originalBatchAkademik, setOriginalBatchAkademik] = useState<BatchGradeItem[]>([]);
    const [isSavingBatchAkademik, setIsSavingBatchAkademik] = useState(false);

    // Batch Edit - Deskripsi Rata-rata
    const [showBatchEditDeskripsi, setShowBatchEditDeskripsi] = useState(false);
    const [batchEditDeskripsiClosing, setBatchEditDeskripsiClosing] = useState(false);
    const [batchDeskripsi, setBatchDeskripsi] = useState<BatchGradeItem[]>([]);
    const [originalBatchDeskripsi, setOriginalBatchDeskripsi] = useState<BatchGradeItem[]>([]);
    const [isSavingBatchDeskripsi, setIsSavingBatchDeskripsi] = useState(false);

    const [selectedMapelAkademik, setSelectedMapelAkademik] = useState<number | null>(null);
    const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
    const [bobotList, setBobotList] = useState<BobotItem[]>([]);
    const [bobotLoading, setBobotLoading] = useState(false);
    const initialBobotListRef = useRef<BobotItem[]>([]);
    const [isSavingBobot, setIsSavingBobot] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'save-bobot' | 'save-batch' | 'save-batch-akademik' | 'save-batch-deskripsi' | null>(null);
    const [modal, setModal] = useState<ModalConfig | null>(null);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    // ── Helper functions ──
    const canEditAspekKokurikuler = useCallback((aspekId: number): boolean => {
        if (isReadOnly) return false;
        if (!jenisPenilaianAktif) return false;
        if (jenisPenilaianAktif === 'PTS') return aspekId === ASPEK_MUTABAAH_ID;
        if (jenisPenilaianAktif === 'PAS') return true;
        return false;
    }, [jenisPenilaianAktif, isReadOnly]);

    const canEditDeskripsiRataRata = useCallback((): boolean => {
        if (isReadOnly) return false;
        if (!jenisPenilaianAktif) return false;
        return jenisPenilaianAktif === 'PTS';
    }, [jenisPenilaianAktif, isReadOnly]);

    const canEditAkademik = useCallback((): boolean => {
        if (isReadOnly) return false;
        if (!jenisPenilaianAktif) return false;
        return true;
    }, [jenisPenilaianAktif, isReadOnly]);

    const getAspekKokurikulerLockReason = useCallback((aspekId: number): string => {
        if (isReadOnly) return readOnlyReason === 'locked' ? 'Periode Selesai' : 'Periode Belum Aktif';
        if (jenisPenilaianAktif === 'PTS' && aspekId !== ASPEK_MUTABAAH_ID) return 'Terkunci - PTS';
        if (!jenisPenilaianAktif) return 'Periode Belum Aktif';
        return '';
    }, [jenisPenilaianAktif, isReadOnly, readOnlyReason]);

    const getDeskripsiRataRataLockReason = useCallback((): string => {
        if (isReadOnly) return readOnlyReason === 'locked' ? 'Periode Selesai' : 'Periode Belum Aktif';
        if (jenisPenilaianAktif === 'PAS') return 'Terkunci - PAS';
        if (!jenisPenilaianAktif) return 'Periode Belum Aktif';
        return '';
    }, [jenisPenilaianAktif, isReadOnly, readOnlyReason]);

    // ── Fetch Functions ──
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                    setLoading(false);
                    return;
                }

                const headers = { Authorization: `Bearer ${token}` };
                const [taRes, komponenRes, mapelRes, aspekRes] = await Promise.all([
                    fetch(`${API}/tahun-ajaran/aktif`, { headers }),
                    fetch(`${API}/atur-penilaian/komponen`, { headers }),
                    fetch(`${API}/mapel`, { headers }),
                    fetch(`${API}/atur-penilaian/aspek-kokurikuler`, { headers }),
                ]);

                const responses = [
                    { res: taRes, name: 'tahun-ajaran' },
                    { res: komponenRes, name: 'komponen' },
                    { res: mapelRes, name: 'mapel' },
                    { res: aspekRes, name: 'aspek-kokurikuler' },
                ];

                for (const { res, name } of responses) {
                    if (res.status === 403) {
                        const errData = await res.json().catch(() => ({}));
                        if (errData.code === 'NOT_ASSIGNED') {
                            console.log(` [atur-penilaian] Akses ditolak dari endpoint /${name}`);
                            setIsNotAssigned(true);
                            setLoading(false);
                            return;
                        }
                    }
                }

                if (!taRes.ok || !komponenRes.ok || !mapelRes.ok || !aspekRes.ok) {
                    throw new Error('Gagal memuat data');
                }

                const [taData, komponenData, mapelData, aspekData] = await Promise.all([
                    taRes.json(), komponenRes.json(), mapelRes.json(), aspekRes.json()
                ]);

                const { status_pts, status_pas } = taData.data;
                setStatusPTS(status_pts || 'nonaktif');
                setStatusPAS(status_pas || 'nonaktif');

                const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null;
                setJenisPenilaianAktif(jenisAktif);

                if (status_pts === 'aktif' || status_pas === 'aktif') {
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (status_pts === 'selesai' || status_pas === 'selesai') {
                    setIsReadOnly(true);
                    setReadOnlyReason('locked');
                } else {
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                }

                setKomponenList(komponenData.data || []);
                const mapelWajib = mapelData.data?.wajib || mapelData.wajib || [];
                const mapelPilihan = mapelData.data?.pilihan || mapelData.pilihan || [];
                setMapelList([...mapelWajib, ...mapelPilihan]);
                setAspekList(aspekData.data || []);
                setIsNotAssigned(false);
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showModal]);

    useEffect(() => {
        if (loading || activeTab === 'bobot' || isNotAssigned) return;

        const fetchKategori = async () => {
            setKategoriLoading(true);
            setCoverageInfo(null);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const jenisParam = getJenisParam(jenisPenilaianAktif);
                let endpoint = '';

                if (activeTab === 'kokurikuler') {
                    endpoint = `${API}/atur-penilaian/kategori-kokurikuler?${jenisParam}`;
                } else if (activeTab === 'akademik') {
                    if (selectedMapelAkademik !== null) {
                        endpoint = `${API}/atur-penilaian/kategori-akademik?mapel_id=${selectedMapelAkademik}&${jenisParam}`;
                    } else {
                        setKategoriList([]);
                        setCoverageInfo(null);
                        setKategoriLoading(false);
                        return;
                    }
                } else if (activeTab === 'deskripsi-rata-rata') {
                    endpoint = `${API}/atur-penilaian/deskripsi-rata-rata`;
                }

                if (!endpoint) {
                    setKategoriList([]);
                    setCoverageInfo(null);
                    setKategoriLoading(false);
                    return;
                }

                const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
                if (res.status === 403) {
                    const errData = await res.json().catch(() => ({}));
                    if (errData.code === 'NOT_ASSIGNED') {
                        setIsNotAssigned(true);
                        setKategoriLoading(false);
                        return;
                    }
                }
                if (!res.ok) throw new Error('Gagal memuat kategori');

                const data = await res.json();
                const formattedData = activeTab === 'deskripsi-rata-rata'
                    ? (data.data || []).map((item: any) => ({
                        ...item,
                        min_nilai: parseFloat(parseFloat(item.min_nilai).toFixed(2)),
                        max_nilai: parseFloat(parseFloat(item.max_nilai).toFixed(2))
                    }))
                    : (data.data || []).map((item: any) => ({
                        ...item,
                        min_nilai: Math.floor(parseFloat(item.min_nilai)),
                        max_nilai: Math.floor(parseFloat(item.max_nilai))
                    }));

                if (activeTab === 'deskripsi-rata-rata') {
                    setDeskripsiRataRataList(formattedData);
                    setDeskripsiRataRataCoverage(data.coverage || null);
                } else {
                    setKategoriList(formattedData);
                    setCoverageInfo(data.coverage || null);
                }
            } catch (err: any) {
                if (!err.message?.includes('belum ditugaskan')) {
                    showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat kategori' });
                }
            } finally {
                setKategoriLoading(false);
            }
        };
        fetchKategori();
    }, [activeTab, selectedMapelAkademik, jenisPenilaianAktif, loading, showModal, isNotAssigned]);

    useEffect(() => {
        if (selectedMapelId === null || activeTab !== 'bobot' || isNotAssigned) {
            setBobotList([]);
            initialBobotListRef.current = [];
            return;
        }

        const fetchBobot = async () => {
            setBobotLoading(true);
            try {
                const token = localStorage.getItem('token');
                const jenisParam = getJenisParam(jenisPenilaianAktif);
                const res = await fetch(`${API}/atur-penilaian/bobot-akademik/${selectedMapelId}?${jenisParam}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.status === 403) {
                    const errData = await res.json().catch(() => ({}));
                    if (errData.code === 'NOT_ASSIGNED') {
                        setIsNotAssigned(true);
                        setBobotLoading(false);
                        return;
                    }
                }
                if (!res.ok) throw new Error('Gagal mengambil bobot');

                const result = await res.json();
                const bobotData: any[] = result.data || [];
                const bobotMap = new Map<number, number>();
                bobotData.forEach((b: any) => {
                    const numBobot = typeof b.bobot === 'number' ? b.bobot : parseFloat(b.bobot);
                    bobotMap.set(b.komponen_id, isNaN(numBobot) ? 0 : numBobot);
                });

                const fullBobot = komponenList.map((k) => ({ komponen_id: k.id_komponen, bobot: bobotMap.get(k.id_komponen) || 0 }));
                setBobotList(fullBobot);
                initialBobotListRef.current = JSON.parse(JSON.stringify(fullBobot));
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal mengambil bobot' });
            } finally {
                setBobotLoading(false);
            }
        };
        fetchBobot();
    }, [selectedMapelId, komponenList, activeTab, showModal, jenisPenilaianAktif, isNotAssigned]);

    const handleTabChange = (tab: typeof activeTab) => {
        // Hanya proses jika tab berbeda dari yang aktif
        if (tab === activeTab) return;

        // Clear data yang relevan saat pindah tab
        if (tab !== 'akademik') {
            setSelectedMapelAkademik(null);
            setCoverageInfo(null);
        }
        if (tab !== 'bobot') {
            setSelectedMapelId(null);
        }
        if (tab !== 'deskripsi-rata-rata') {
            setDeskripsiRataRataList([]);
            setDeskripsiRataRataCoverage(null);
        }

        // Clear kategori list saat pindah tab
        setKategoriList([]);
        setActiveTab(tab);
    };

    // ── Batch Edit - Kokurikuler ──
    const loadBatchGrades = (aspekId: number | null) => {
        if (!aspekId) {
            const defaults = [
                { grade: 'A', min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik', isNew: true },
                { grade: 'B', min_nilai: 80, max_nilai: 89, deskripsi: 'Baik', isNew: true },
                { grade: 'C', min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup', isNew: true },
                { grade: 'D', min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang', isNew: true },
                { grade: 'E', min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan', isNew: true },
            ];
            setBatchGrades(defaults);
            setOriginalBatchGrades([]);
        } else {
            const existing = kategoriList
                .filter(k => (k as KategoriKokurikuler).id_aspek_kokurikuler === aspekId)
                .map(k => ({
                    id: k.id,
                    grade: (k as KategoriKokurikuler).grade,
                    min_nilai: Math.floor(k.min_nilai),
                    max_nilai: Math.floor(k.max_nilai),
                    deskripsi: k.deskripsi,
                    isNew: false
                }))
                .sort((a, b) => b.min_nilai - a.min_nilai);

            if (existing.length > 0) {
                setBatchGrades(existing);
                setOriginalBatchGrades([...existing]);
            } else {
                const defaults = [
                    { grade: 'A', min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik', isNew: true },
                    { grade: 'B', min_nilai: 80, max_nilai: 89, deskripsi: 'Baik', isNew: true },
                    { grade: 'C', min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup', isNew: true },
                    { grade: 'D', min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang', isNew: true },
                    { grade: 'E', min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan', isNew: true },
                ];
                setBatchGrades(defaults);
                setOriginalBatchGrades([]);
            }
        }
    };

    const openBatchEdit = (aspekId: number | null = null) => {
        if (aspekId !== null && !canEditAspekKokurikuler(aspekId)) {
            showModal({ type: 'warning', title: 'Aspek Terkunci', message: 'Aspek ini tidak dapat dikelola saat periode PTS aktif.' });
            return;
        }
        setBatchEditAspekId(aspekId);
        loadBatchGrades(aspekId);
        setShowBatchEdit(true);
    };

    const closeBatchEdit = () => {
        setBatchEditClosing(true);
        setTimeout(() => {
            setShowBatchEdit(false);
            setBatchEditClosing(false);
            setBatchEditAspekId(null);
            setBatchGrades([]);
            setOriginalBatchGrades([]);
        }, 200);
    };

    const addBatchGradeRow = () => setBatchGrades(prev => [...prev, { grade: '', min_nilai: 0, max_nilai: 100, deskripsi: '', isNew: true }]);
    const removeBatchGradeRow = (index: number) => setBatchGrades(prev => prev.filter((_, i) => i !== index));
    const updateBatchGrade = (index: number, field: keyof BatchGradeItem, value: any) => setBatchGrades(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));

    const validateBatchGrades = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        if (batchGrades.length === 0) { errors.push('Minimal harus ada 1 grade.'); return { valid: false, errors }; }

        batchGrades.forEach((g, i) => {
            if (!g.grade || g.grade.trim().length === 0) errors.push(`Grade baris ${i + 1} tidak boleh kosong.`);
            if (g.grade && g.grade.length !== 1) errors.push(`Grade baris ${i + 1} harus tepat 1 karakter.`);
            if (isNaN(g.min_nilai) || isNaN(g.max_nilai)) {
                errors.push(`Grade baris ${i + 1}: Nilai min/max harus angka.`);
            } else {
                if (g.min_nilai < 0 || g.max_nilai > 100) errors.push(`Grade baris ${i + 1}: Nilai harus antara 0-100.`);
                if (g.min_nilai >= g.max_nilai) errors.push(`Grade baris ${i + 1}: Min (${g.min_nilai}) harus < Max (${g.max_nilai}).`);
                if ((g.max_nilai - g.min_nilai) < 3) errors.push(`Grade baris ${i + 1}: Range nilai minimal 3 poin.`);
            }
            if (!g.deskripsi || g.deskripsi.trim().length < 3) errors.push(`Grade baris ${i + 1}: Deskripsi minimal 3 karakter.`);
        });

        const grades = batchGrades.map(g => g.grade?.toUpperCase()).filter(Boolean);
        const duplicates = grades.filter((g, i) => grades.indexOf(g) !== i);
        if (duplicates.length > 0) errors.push(`Grade duplikat: ${[...new Set(duplicates)].join(', ')}`);

        const sorted = [...batchGrades].sort((a, b) => a.min_nilai - b.min_nilai);
        let covered = new Set<number>();
        let hasOverlap = false;
        sorted.forEach(g => {
            for (let i = Math.floor(g.min_nilai); i <= Math.floor(g.max_nilai); i++) {
                if (covered.has(i)) hasOverlap = true;
                covered.add(i);
            }
        });
        if (hasOverlap) errors.push('Terdapat overlap (tumpang tindih) pada range nilai antar kategori.');

        return { valid: errors.length === 0, errors };
    };

    const hasBatchChanges = (): boolean => {
        if (originalBatchGrades.length === 0) return true;
        if (batchGrades.length !== originalBatchGrades.length) return true;

        const sc = [...batchGrades].sort((a, b) => (a.grade || '').localeCompare(b.grade || ''));
        const so = [...originalBatchGrades].sort((a, b) => (a.grade || '').localeCompare(b.grade || ''));
        for (let i = 0; i < sc.length; i++) {
            if ((sc[i].grade || '').toUpperCase().trim() !== (so[i].grade || '').toUpperCase().trim()) return true;
            if (Number(sc[i].min_nilai) !== Number(so[i].min_nilai)) return true;
            if (Number(sc[i].max_nilai) !== Number(so[i].max_nilai)) return true;
            if (sc[i].deskripsi.trim() !== so[i].deskripsi.trim()) return true;
        }
        return false;
    };

    const openConfirmSaveBatch = () => {
        const v = validateBatchGrades();
        if (!v.valid) { showModal({ type: 'warning', title: 'Validasi Gagal', message: v.errors.join('\n') }); return; }
        if (!hasBatchChanges()) { showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data yang Anda masukkan sama dengan data yang sudah ada.' }); return; }
        setConfirmAction('save-batch');
        setShowConfirmModal(true);
    };

    const executeSaveBatch = async () => {
        setIsSavingBatch(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                id_aspek_kokurikuler: batchEditAspekId,
                jenis: jenisPenilaianAktif,
                grades: batchGrades.map(g => ({
                    id: g.id,
                    grade: g.grade?.toUpperCase(),
                    min_nilai: Math.floor(g.min_nilai),
                    max_nilai: Math.floor(g.max_nilai),
                    deskripsi: g.deskripsi.trim(),
                    isNew: g.isNew
                }))
            };

            const res = await fetch(`${API}/atur-penilaian/kategori-kokurikuler-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok) {
                setShowConfirmModal(false);
                closeBatchEdit();
                const successMessage = result.message || `${batchGrades.length} grade berhasil disimpan. Nilai siswa telah disesuaikan otomatis.`;
                showModal({ type: 'success', title: 'Berhasil Disimpan!', message: successMessage });

                const jenisParam = getJenisParam(jenisPenilaianAktif);
                const reloadRes = await fetch(`${API}/atur-penilaian/kategori-kokurikuler?${jenisParam}`, { headers: { Authorization: `Bearer ${token}` } });
                if (reloadRes.ok) {
                    const data = await reloadRes.json();
                    setKategoriList((data.data || []).map((item: any) => ({
                        ...item,
                        min_nilai: Math.floor(parseFloat(item.min_nilai)),
                        max_nilai: Math.floor(parseFloat(item.max_nilai))
                    })));
                    setCoverageInfo(data.coverage || null);
                }
            } else {
                setShowConfirmModal(false);
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: result.message || 'Terjadi kesalahan.' });
            }
        } catch (err: any) {
            setShowConfirmModal(false);
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan: ' + err.message });
        } finally {
            setIsSavingBatch(false);
        }
    };

    // ── Batch Edit - Akademik ──
    const loadBatchAkademik = () => {
        const existing = (kategoriList as KategoriAkademik[]).map(k => ({
            id: k.id,
            min_nilai: Math.floor(k.min_nilai),
            max_nilai: Math.floor(k.max_nilai),
            deskripsi: k.deskripsi,
            isNew: false
        })).sort((a, b) => b.min_nilai - a.min_nilai); // Sort HANYA untuk tampilan UI

        if (existing.length > 0) {
            setBatchAkademik(existing);
            // ✅ PERBAIKAN: Gunakan deep copy dengan JSON parse/stringify
            setOriginalBatchAkademik(JSON.parse(JSON.stringify(existing)));
        } else {
            const defaults = [
                { min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik', isNew: true },
                { min_nilai: 80, max_nilai: 89, deskripsi: 'Baik', isNew: true },
                { min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup', isNew: true },
                { min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang', isNew: true },
                { min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan', isNew: true },
            ];
            setBatchAkademik(defaults);
            setOriginalBatchAkademik([]);
        }
    };

    const openBatchEditAkademik = () => {
        if (!canEditAkademik()) {
            showModal({ type: 'warning', title: 'Kategori Terkunci', message: 'Kategori akademik tidak dapat dikelola saat ini.' });
            return;
        }
        if (!selectedMapelAkademik) {
            showModal({ type: 'warning', title: 'Pilih Mapel', message: 'Silakan pilih mata pelajaran terlebih dahulu.' });
            return;
        }
        loadBatchAkademik();
        setShowBatchEditAkademik(true);
    };

    const closeBatchEditAkademik = () => {
        setBatchEditAkademikClosing(true);
        setTimeout(() => {
            setShowBatchEditAkademik(false);
            setBatchEditAkademikClosing(false);
            setBatchAkademik([]);
            setOriginalBatchAkademik([]);
        }, 200);
    };

    const addBatchAkademikRow = () => setBatchAkademik(prev => [...prev, { min_nilai: 0, max_nilai: 100, deskripsi: '', isNew: true }]);
    const removeBatchAkademikRow = (index: number) => setBatchAkademik(prev => prev.filter((_, i) => i !== index));
    const updateBatchAkademik = (index: number, field: keyof BatchGradeItem, value: any) => setBatchAkademik(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));

    // ✅ PERBAIKAN: Validasi frontend yang lebih ketat dan sinkron dengan backend
    const validateBatchAkademik = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        if (batchAkademik.length === 0) {
            errors.push('Minimal harus ada 1 kategori.');
            return { valid: false, errors };
        }

        batchAkademik.forEach((g, i) => {
            if (isNaN(g.min_nilai) || isNaN(g.max_nilai)) {
                errors.push(`Kategori baris ${i + 1}: Nilai min/max harus angka.`);
            } else {
                if (g.min_nilai < 0 || g.max_nilai > 100) {
                    errors.push(`Kategori baris ${i + 1}: Nilai harus antara 0-100.`);
                }
                if (g.min_nilai >= g.max_nilai) {
                    errors.push(`Kategori baris ${i + 1}: Min (${g.min_nilai}) harus < Max (${g.max_nilai}).`);
                }
                // ✅ TAMBAHAN: Validasi range minimal 3 poin agar sesuai dengan backend
                if ((g.max_nilai - g.min_nilai) < 3) {
                    errors.push(`Kategori baris ${i + 1}: Range nilai minimal 3 poin (saat ini: ${g.max_nilai - g.min_nilai}).`);
                }
            }
            if (!g.deskripsi || g.deskripsi.trim().length < 3) {
                errors.push(`Kategori baris ${i + 1}: Deskripsi minimal 3 karakter.`);
            }
        });

        // ✅ TAMBAHAN: Validasi overlap yang lebih akurat
        const sorted = [...batchAkademik].sort((a, b) => a.min_nilai - b.min_nilai);
        let covered = new Set<number>();
        let hasOverlap = false;
        sorted.forEach(g => {
            for (let i = Math.floor(g.min_nilai); i <= Math.floor(g.max_nilai); i++) {
                if (covered.has(i)) hasOverlap = true;
                covered.add(i);
            }
        });
        if (hasOverlap) errors.push('Terdapat overlap (tumpang tindih) pada range nilai antar kategori.');

        return { valid: errors.length === 0, errors };
    };

    // ✅ PERBAIKAN FINAL: Gunakan Map berdasarkan ID, JANGAN sort untuk perbandingan
    const hasBatchAkademikChanges = (): boolean => {
        if (originalBatchAkademik.length === 0 && batchAkademik.length === 0) return false;
        if (originalBatchAkademik.length === 0) return true;
        if (batchAkademik.length !== originalBatchAkademik.length) return true;

        // Buat map untuk comparison berdasarkan ID
        const originalMap = new Map(originalBatchAkademik.map(item => [item.id, item]));

        for (const currentItem of batchAkademik) {
            if (!currentItem.id) {
                // Ini item baru
                return true;
            }

            const originalItem = originalMap.get(currentItem.id);
            if (!originalItem) {
                // Item ini tidak ada di original
                return true;
            }

            // Bandingkan field-fieldnya
            if (Math.floor(currentItem.min_nilai) !== Math.floor(originalItem.min_nilai)) return true;
            if (Math.floor(currentItem.max_nilai) !== Math.floor(originalItem.max_nilai)) return true;
            if (currentItem.deskripsi.trim() !== originalItem.deskripsi.trim()) return true;
        }
        return false;
    };

    const openConfirmSaveBatchAkademik = () => {
        const v = validateBatchAkademik();
        if (!v.valid) { showModal({ type: 'warning', title: 'Validasi Gagal', message: v.errors.join('\n') }); return; }
        if (!hasBatchAkademikChanges()) { showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data yang Anda masukkan sama dengan data yang sudah ada.' }); return; }
        setConfirmAction('save-batch-akademik');
        setShowConfirmModal(true);
    };

    // ✅ PERBAIKAN: executeSaveBatchAkademik dengan strategi DELETE dulu, baru UPDATE/INSERT
const executeSaveBatchAkademik = async () => {
    setIsSavingBatchAkademik(true);
    try {
        const token = localStorage.getItem('token');
        
        // 1. Cari kategori yang dihapus (ada di original, tapi tidak ada di batch sekarang)
        const currentIds = new Set(batchAkademik.map(b => b.id).filter(Boolean));
        const deletedItems = originalBatchAkademik.filter(orig => orig.id && !currentIds.has(orig.id));

        // 2. Hapus dulu kategori yang dihapus agar tidak terjadi error overlap saat update
        if (deletedItems.length > 0) {
            const deletePromises = deletedItems.map(orig =>
                fetch(`${API}/atur-penilaian/kategori-akademik/${orig.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                })
            );
            const deleteResults = await Promise.all(deletePromises);
            const deleteFailed = deleteResults.find(r => !r.ok);
            if (deleteFailed) {
                throw new Error('Gagal menghapus kategori yang dihapus.');
            }
        }

        // 3. Update kategori yang ada dan Insert kategori baru
        const updateInsertPromises = [];
        
        // Update existing
        originalBatchAkademik.forEach((orig) => {
            const updated = batchAkademik.find(b => b.id === orig.id);
            if (updated && orig.id) {
                updateInsertPromises.push(
                    fetch(`${API}/atur-penilaian/kategori-akademik/${orig.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                            min_nilai: Math.floor(updated.min_nilai),
                            max_nilai: Math.floor(updated.max_nilai),
                            deskripsi: updated.deskripsi.trim()
                        })
                    })
                );
            }
        });

        // Insert new
        batchAkademik.filter(b => !b.id).forEach(newCat => {
            updateInsertPromises.push(
                fetch(`${API}/atur-penilaian/kategori-akademik`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        min_nilai: Math.floor(newCat.min_nilai),
                        max_nilai: Math.floor(newCat.max_nilai),
                        deskripsi: newCat.deskripsi.trim(),
                        urutan: 0,
                        mapel_id: selectedMapelAkademik,
                        jenis: jenisPenilaianAktif
                    })
                })
            );
        });

        const results = await Promise.all(updateInsertPromises);
        const allSuccess = results.every(r => r.ok);

        if (allSuccess) {
            setShowConfirmModal(false);
            closeBatchEditAkademik();
            showModal({
                type: 'success',
                title: 'Berhasil Disimpan!',
                message: `${batchAkademik.length} kategori berhasil disimpan. Nilai rapor siswa telah dihitung ulang otomatis.`
            });
            
            // Refresh data
            const jenisParam = getJenisParam(jenisPenilaianAktif);
            const reloadRes = await fetch(`${API}/atur-penilaian/kategori-akademik?mapel_id=${selectedMapelAkademik}&${jenisParam}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (reloadRes.ok) {
                const data = await reloadRes.json();
                setKategoriList((data.data || []).map((item: any) => ({
                    ...item,
                    min_nilai: Math.floor(parseFloat(item.min_nilai)),
                    max_nilai: Math.floor(parseFloat(item.max_nilai))
                })));
                setCoverageInfo(data.coverage || null);
            }
        } else {
            setShowConfirmModal(false);
            const failedResult = results.find(r => !r.ok);
            if (failedResult) {
                const errData = await failedResult.json().catch(() => ({}));
                showModal({
                    type: 'error',
                    title: 'Gagal Menyimpan',
                    message: errData.message || 'Beberapa kategori gagal disimpan.'
                });
            } else {
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: 'Beberapa kategori gagal disimpan.' });
            }
        }
    } catch (err: any) {
        setShowConfirmModal(false);
        showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan: ' + err.message });
    } finally {
        setIsSavingBatchAkademik(false);
    }
};

    // ── Batch Edit - Deskripsi Rata-rata ──
    const loadBatchDeskripsi = () => {
        const existing = deskripsiRataRataList.map(k => ({
            id: k.id,
            min_nilai: parseFloat(k.min_nilai),
            max_nilai: parseFloat(k.max_nilai),
            deskripsi: k.deskripsi,
            isNew: false
        })).sort((a, b) => b.min_nilai - a.min_nilai);

        if (existing.length > 0) {
            setBatchDeskripsi(existing);
            // ✅ PERBAIKAN: Deep copy
            setOriginalBatchDeskripsi(existing.map(item => ({ ...item })));
        } else {
            const defaults = [
                { min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik', isNew: true },
                { min_nilai: 80, max_nilai: 89, deskripsi: 'Baik', isNew: true },
                { min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup', isNew: true },
                { min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang', isNew: true },
                { min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan', isNew: true },
            ];
            setBatchDeskripsi(defaults);
            setOriginalBatchDeskripsi([]);
        }
    };

    const openBatchEditDeskripsi = () => {
        if (!canEditDeskripsiRataRata()) {
            showModal({ type: 'warning', title: 'Deskripsi Terkunci', message: getDeskripsiRataRataLockReason() + '\nDeskripsi rata-rata hanya dapat diatur saat periode PTS aktif.' });
            return;
        }
        loadBatchDeskripsi();
        setShowBatchEditDeskripsi(true);
    };

    const closeBatchEditDeskripsi = () => {
        setBatchEditDeskripsiClosing(true);
        setTimeout(() => {
            setShowBatchEditDeskripsi(false);
            setBatchEditDeskripsiClosing(false);
            setBatchDeskripsi([]);
            setOriginalBatchDeskripsi([]);
        }, 200);
    };

    const addBatchDeskripsiRow = () => setBatchDeskripsi(prev => [...prev, { min_nilai: 0, max_nilai: 100, deskripsi: '', isNew: true }]);
    const removeBatchDeskripsiRow = (index: number) => setBatchDeskripsi(prev => prev.filter((_, i) => i !== index));
    const updateBatchDeskripsi = (index: number, field: keyof BatchGradeItem, value: any) => setBatchDeskripsi(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));

    const validateBatchDeskripsi = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        if (batchDeskripsi.length === 0) { errors.push('Minimal harus ada 1 kategori.'); return { valid: false, errors }; }

        batchDeskripsi.forEach((g, i) => {
            if (isNaN(g.min_nilai) || isNaN(g.max_nilai)) {
                errors.push(`Kategori baris ${i + 1}: Nilai min/max harus angka.`);
            } else {
                if (g.min_nilai < 0 || g.max_nilai > 100) errors.push(`Kategori baris ${i + 1}: Nilai harus antara 0-100.`);
                if (g.min_nilai >= g.max_nilai) errors.push(`Kategori baris ${i + 1}: Min (${g.min_nilai}) harus < Max (${g.max_nilai}).`);
                if ((g.max_nilai - g.min_nilai) < 0.01) errors.push(`Kategori baris ${i + 1}: Range nilai minimal 0.01.`);
            }
            if (!g.deskripsi || g.deskripsi.trim().length < 3) errors.push(`Kategori baris ${i + 1}: Deskripsi minimal 3 karakter.`);
        });

        const sorted = [...batchDeskripsi].sort((a, b) => a.min_nilai - b.min_nilai);
        let hasOverlap = false;
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].max_nilai >= sorted[i + 1].min_nilai) {
                hasOverlap = true;
                break;
            }
        }
        if (hasOverlap) errors.push('Terdapat overlap (tumpang tindih) pada range nilai antar kategori.');

        return { valid: errors.length === 0, errors };
    };

    // ✅ PERBAIKAN FINAL: Gunakan Map berdasarkan ID
    const hasBatchDeskripsiChanges = (): boolean => {
        if (originalBatchDeskripsi.length === 0) return true;
        if (batchDeskripsi.length !== originalBatchDeskripsi.length) return true;

        const sc = [...batchDeskripsi].sort((a, b) => a.min_nilai - b.min_nilai);
        const so = [...originalBatchDeskripsi].sort((a, b) => a.min_nilai - b.min_nilai);

        for (let i = 0; i < sc.length; i++) {
            const curr = sc[i];
            const orig = so[i];
            const currMin = parseFloat(curr.min_nilai.toFixed(2));
            const currMax = parseFloat(curr.max_nilai.toFixed(2));
            const origMin = parseFloat(orig.min_nilai.toFixed(2));
            const origMax = parseFloat(orig.max_nilai.toFixed(2));

            if (currMin !== origMin) return true;
            if (currMax !== origMax) return true;
            if (curr.deskripsi.trim() !== orig.deskripsi.trim()) return true;
        }

        return false;
    };

    const openConfirmSaveBatchDeskripsi = () => {
        const v = validateBatchDeskripsi();
        if (!v.valid) { showModal({ type: 'warning', title: 'Validasi Gagal', message: v.errors.join('\n') }); return; }
        if (!hasBatchDeskripsiChanges()) { showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data yang Anda masukkan sama dengan data yang sudah ada.' }); return; }
        setConfirmAction('save-batch-deskripsi');
        setShowConfirmModal(true);
    };

    const executeSaveBatchDeskripsi = async () => {
        setIsSavingBatchDeskripsi(true);
        try {
            const token = localStorage.getItem('token');

            // Delete all existing
            const deletePromises = originalBatchDeskripsi.filter(g => g.id).map(g =>
                fetch(`${API}/atur-penilaian/deskripsi-rata-rata/${g.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                })
            );
            await Promise.all(deletePromises);

            // Insert all new
            const insertPromises = batchDeskripsi.map(g =>
                fetch(`${API}/atur-penilaian/deskripsi-rata-rata`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        min_nilai: parseFloat(g.min_nilai.toFixed(2)),
                        max_nilai: parseFloat(g.max_nilai.toFixed(2)),
                        deskripsi: g.deskripsi.trim()
                    })
                })
            );
            const results = await Promise.all(insertPromises);
            const allSuccess = results.every(r => r.ok);

            if (allSuccess) {
                setShowConfirmModal(false);
                closeBatchEditDeskripsi();
                showModal({
                    type: 'success',
                    title: 'Berhasil Disimpan!',
                    message: `${batchDeskripsi.length} kategori berhasil disimpan. Deskripsi rata-rata siswa telah diperbarui otomatis.`
                });

                const reloadRes = await fetch(`${API}/atur-penilaian/deskripsi-rata-rata`, { headers: { Authorization: `Bearer ${token}` } });
                if (reloadRes.ok) {
                    const data = await reloadRes.json();
                    setDeskripsiRataRataList((data.data || []).map((item: any) => ({
                        ...item,
                        min_nilai: parseFloat(parseFloat(item.min_nilai).toFixed(2)),
                        max_nilai: parseFloat(parseFloat(item.max_nilai).toFixed(2))
                    })));
                    setDeskripsiRataRataCoverage(data.coverage || null);
                }
            } else {
                setShowConfirmModal(false);
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: 'Beberapa kategori gagal disimpan.' });
            }
        } catch (err: any) {
            setShowConfirmModal(false);
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan: ' + err.message });
        } finally {
            setIsSavingBatchDeskripsi(false);
        }
    };

    // ── Bobot handlers ──
    const isPTSActive = jenisPenilaianAktif === 'PTS';

    const handleBobotChange = (komponenId: number, value: string) => {
        let num = parseFloat(value);
        if (isNaN(num)) num = 0;
        if (num < 0) num = 0;
        if (num > 100) num = 100;
        num = Math.round(num * 100) / 100;
        setBobotList((prev) => prev.map((b) => (b.komponen_id === komponenId ? { ...b, bobot: num } : b)));
    };

    const validateBobot = (): boolean => {
        if (!selectedMapelId) return false;

        const isUnchanged = bobotList.every((b) => {
            const initial = initialBobotListRef.current.find((i) => i.komponen_id === b.komponen_id);
            return initial && Math.abs(b.bobot - initial.bobot) < 0.01;
        });
        if (isUnchanged) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
            return false;
        }

        if (bobotList.some(b => b.bobot < 0)) {
            showModal({ type: 'warning', title: 'Bobot Tidak Valid', message: 'Bobot tidak boleh negatif.' });
            return false;
        }

        const hasNonZeroBobot = bobotList.some(b => b.bobot > 0);
        if (!hasNonZeroBobot) {
            showModal({
                type: 'warning',
                title: 'Bobot Tidak Valid',
                message: 'Minimal harus ada 1 komponen dengan bobot > 0%.'
            });
            return false;
        }

        const total = bobotList.reduce((sum, b) => sum + b.bobot, 0);
        if (Math.abs(total - 100) > 0.01) {
            showModal({
                type: 'warning',
                title: 'Total Bobot Salah',
                message: `Total bobot harus tepat 100%.\nSaat ini: ${total.toFixed(2)}%`
            });
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
        if (!selectedMapelId) return;
        setIsSavingBobot(true);
        try {
            const token = localStorage.getItem('token');
            const jenisParam = getJenisParam(jenisPenilaianAktif);
            const res = await fetch(`${API}/atur-penilaian/bobot-akademik/${selectedMapelId}?${jenisParam}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ bobot: bobotList, jenis: jenisPenilaianAktif })
            });

            const result = await res.json();
            if (res.ok) {
                const successMessage = result.message || 'Bobot penilaian berhasil disimpan. Nilai rapor siswa telah dihitung ulang otomatis.';
                showModal({ type: 'success', title: 'Bobot Disimpan!', message: successMessage });
                initialBobotListRef.current = JSON.parse(JSON.stringify(bobotList));
            } else {
                if (result.code === 'BOBOT_NOT_100') {
                    showModal({
                        type: 'error',
                        title: 'Total Bobot Salah',
                        message: result.message || 'Total bobot harus tepat 100%.'
                    });
                } else {
                    showModal({ type: 'error', title: 'Gagal Menyimpan', message: result.message || 'Gagal menyimpan bobot.' });
                }
            }
        } catch (err) {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan bobot.' });
        } finally {
            setIsSavingBobot(false);
            setShowConfirmModal(false);
        }
    };

    const totalBobot = bobotList.reduce((sum, b) => {
        const komponen = komponenList.find((k) => k.id_komponen === b.komponen_id);
        const isPTS = komponen && /^PTS$/i.test(komponen.nama_komponen);
        const actualBobot = isPTSActive ? (isPTS ? 100 : 0) : b.bobot;
        return sum + actualBobot;
    }, 0);

    const isBobotValid = Math.abs(totalBobot - 100) < 0.01;

    // ── Loading & Error States ──
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
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                            <AlertCircle size={44} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600">Anda belum ditugaskan sebagai guru kelas di semester ini.</p>
                        </div>
                        <ActionButton variant="neutral" fullWidth onClick={handleLogout}>
                            <LogOut size={17} /> Logout
                        </ActionButton>
                    </div>
                </div>
            </div>
        );
    }

    const mapelWajibList = mapelList.filter(m => m.jenis === 'wajib');
    const groupedKokurikuler = aspekList.map(aspek => ({
        aspek,
        grades: kategoriList.filter(k => (k as KategoriKokurikuler).id_aspek_kokurikuler === aspek.id_aspek_kokurikuler).sort((a, b) => b.min_nilai - a.min_nilai)
    }));

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Header — teks polos, konsisten dengan Guru Bidang Studi dan halaman lain */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Atur Penilaian</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola kategori dan bobot penilaian kelas Anda</p>
            </div>

            {/* Read Only Banner — border-left card, sama gaya dengan Guru Bidang Studi */}
            {isReadOnly && (
                <div className="card-flat mb-4 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-white anim-in d2"
                    style={{ ...CARD_STYLE, borderLeft: `4px solid ${readOnlyReason === 'locked' ? COLORS.neutral.text : COLORS.warning.text}` }}>
                    <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: readOnlyReason === 'locked' ? COLORS.neutral.text : COLORS.warning.text }} />
                    <div className="flex-1">
                        <p className="text-sm font-bold mb-1" style={{ color: readOnlyReason === 'locked' ? COLORS.neutral.text : COLORS.warning.text }}>
                            {readOnlyReason === 'locked' ? 'Periode Penilaian Selesai' : 'Periode Penilaian Belum Aktif'}
                        </p>
                        <p className="text-xs text-gray-500">
                            {readOnlyReason === 'locked'
                                ? 'Konfigurasi kategori dan bobot sudah dikunci dan tidak dapat diubah.'
                                : 'Periode penilaian belum aktif. Silakan hubungi admin.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Active Period Banner — border-left card, sama gaya dengan Guru Bidang Studi */}
            {jenisPenilaianAktif && (
                <div className="card-flat mb-4 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white anim-in d2"
                    style={{ ...CARD_STYLE, borderLeft: `4px solid ${jenisPenilaianAktif === 'PTS' ? COLORS.accent.text : COLORS.success.text}` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: jenisPenilaianAktif === 'PTS' ? COLORS.accent.bg : COLORS.success.bg }}>
                        {jenisPenilaianAktif === 'PTS' ? <Award className="w-4 h-4" style={{ color: COLORS.accent.text }} /> : <CheckCircle2 className="w-4 h-4" style={{ color: COLORS.success.text }} />}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: jenisPenilaianAktif === 'PTS' ? COLORS.accent.text : COLORS.success.text }}>
                            Mode Konfigurasi: {jenisPenilaianAktif === 'PTS' ? 'PTS (Penilaian Tengah Semester)' : 'PAS (Penilaian Akhir Semester)'}
                        </p>
                        <p className="text-xs mt-0.5 text-gray-500">
                            {jenisPenilaianAktif === 'PTS' ? 'Anda sedang mengatur konfigurasi untuk PTS' : 'Anda sedang mengatur konfigurasi untuk PAS'}
                        </p>
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                {/* Tabs — segmented pill, sama persis gaya dengan Guru Bidang Studi */}
                <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: '#f0f0f0' }}>
                    <div className="inline-flex flex-wrap p-1 rounded-xl gap-1" style={{ background: '#f6f7f9', border: '1px solid #ececec' }}>
                        {[
                            { id: 'kokurikuler', label: 'Kokurikuler', icon: Layers },
                            { id: 'akademik', label: 'Akademik', icon: BookOpen },
                            { id: 'deskripsi-rata-rata', label: 'Deskripsi', icon: BarChart3, disabled: !canEditDeskripsiRataRata() },
                            { id: 'bobot', label: 'Bobot', icon: TrendingUp },
                        ].map((tab) => (
                            <button key={tab.id}
                                onClick={() => !tab.disabled && handleTabChange(tab.id as typeof activeTab)}
                                disabled={tab.disabled}
                                className="btn-action px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                style={activeTab === tab.id
                                    ? { background: BRAND_GRADIENT, color: '#fff', boxShadow: '0 2px 8px rgba(232,105,10,0.25)' }
                                    : tab.disabled
                                        ? { background: 'transparent', color: '#9ca3af', cursor: 'not-allowed' }
                                        : { background: 'transparent', color: ACCENT_DARK }}
                                title={tab.disabled ? getDeskripsiRataRataLockReason() : ''}
                            >
                                <tab.icon size={15} />
                                <span className="hidden sm:inline">{tab.label}</span>
                                {tab.disabled && <Lock size={11} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-6" key={activeTab}>
                    {/* KOKURIKULER TAB */}
                    {activeTab === 'kokurikuler' && (
                        <div>
                            <CoverageWarning coverage={coverageInfo} />
                            {kategoriLoading ? (
                                <div className="py-16 text-center">
                                    <div className="w-8 h-8 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Memuat data...</p>
                                </div>
                            ) : groupedKokurikuler.length === 0 ? (
                                <div className="py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                                    <Layers size={30} className="text-gray-300" />
                                    <p className="text-sm font-bold text-gray-500">Belum ada kategori kokurikuler</p>
                                    <p className="text-xs text-gray-400">Klik tombol "Edit" pada aspek untuk mulai menambahkan grade</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {groupedKokurikuler.map(({ aspek, grades }) => {
                                        const isEditable = canEditAspekKokurikuler(aspek.id_aspek_kokurikuler);
                                        const lockReason = getAspekKokurikulerLockReason(aspek.id_aspek_kokurikuler);

                                        return (
                                            <div key={aspek.id_aspek_kokurikuler} className="rounded-xl overflow-hidden transition-all"
                                                style={{ border: `1.5px solid ${isEditable ? COLORS.accent.border : '#e5e7eb'}`, opacity: isEditable ? 1 : 0.75 }}>
                                                <div className="px-5 py-3 flex items-center justify-between gap-3"
                                                    style={{ background: isEditable ? COLORS.accent.bg : '#f9fafb', borderBottom: `1.5px solid ${isEditable ? COLORS.accent.border : '#e5e7eb'}` }}>
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                                            style={{ background: isEditable ? '#fde0c8' : '#e5e7eb' }}>
                                                            <Layers size={16} style={{ color: isEditable ? ACCENT_DARK : '#6b7280' }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="text-sm font-bold truncate" style={{ color: isEditable ? '#7a3a0a' : '#6b7280' }} title={aspek.nama}>{aspek.nama}</h3>
                                                                {!isEditable && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 whitespace-nowrap">
                                                                        <Lock size={9} />{lockReason}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-400">{grades.length} grade</p>
                                                        </div>
                                                    </div>
                                                    <ActionButton variant={isEditable ? 'warning' : 'neutral'} disabled={!isEditable} onClick={() => openBatchEdit(aspek.id_aspek_kokurikuler)}>
                                                        {isEditable ? (<><Pencil size={16} /> Edit Semua</>) : (<><Lock size={16} /> Terkunci</>)}
                                                    </ActionButton>
                                                </div>
                                                {grades.length > 0 ? (
                                                    <div className="overflow-x-auto scrollbar-thin">
                                                        <div style={{ width: '100%', minWidth: '420px' }}>
                                                            <div className="grid" style={{ gridTemplateColumns: GRID_COLS_KATEGORI, background: '#fafafa' }}>
                                                                <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">Grade</div>
                                                                <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">Range Nilai</div>
                                                                <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">Deskripsi</div>
                                                            </div>
                                                            {grades.map((g) => (
                                                                <div key={g.id} className="grid row-hover border-t transition-colors"
                                                                    style={{ gridTemplateColumns: GRID_COLS_KATEGORI, borderColor: '#f0f0f0' }}
                                                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                                                    <div className="px-5 py-3 flex items-center">
                                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold"
                                                                            style={{ background: COLORS.accent.bg, color: COLORS.accent.text, border: `1px solid ${COLORS.accent.border}` }}>
                                                                            {(g as KategoriKokurikuler).grade}
                                                                        </span>
                                                                    </div>
                                                                    <div className="px-5 py-3 flex items-center">
                                                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                                                                            style={{ background: COLORS.accent.bg, color: COLORS.accent.text, border: `1px solid ${COLORS.accent.border}` }}>
                                                                            {Math.floor(g.min_nilai)} – {Math.floor(g.max_nilai)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="px-5 py-3 flex items-center text-gray-700 truncate" title={g.deskripsi}>{g.deskripsi}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="px-5 py-8 text-center text-sm text-gray-400">Belum ada grade untuk aspek ini</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* AKADEMIK TAB */}
                    {activeTab === 'akademik' && (
                        <div>
                            <div className="mb-5 max-w-md">
                                <label className={labelCls} style={labelColor}>Mata Pelajaran</label>
                                <select value={selectedMapelAkademik || ''}
                                    onChange={(e) => { setSelectedMapelAkademik(e.target.value ? Number(e.target.value) : null); }}
                                    className={selectCls + ' w-full'}
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    {mapelWajibList.map((mapel) => (
                                        <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedMapelAkademik ? (
                                <>
                                    <CoverageWarning coverage={coverageInfo} />
                                    {kategoriLoading ? (
                                        <div className="py-16 text-center">
                                            <div className="w-8 h-8 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin mx-auto mb-3" />
                                            <p className="text-sm text-gray-400">Memuat data...</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${canEditAkademik() ? COLORS.accent.border : '#e5e7eb'}`, opacity: canEditAkademik() ? 1 : 0.75 }}>
                                            <div className="px-5 py-3 flex items-center justify-between gap-3"
                                                style={{ background: canEditAkademik() ? COLORS.accent.bg : '#f9fafb', borderBottom: `1.5px solid ${canEditAkademik() ? COLORS.accent.border : '#e5e7eb'}` }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                        style={{ background: canEditAkademik() ? '#fde0c8' : '#e5e7eb' }}>
                                                        <BookOpen size={16} style={{ color: canEditAkademik() ? ACCENT_DARK : '#6b7280' }} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold" style={{ color: canEditAkademik() ? '#7a3a0a' : '#6b7280' }}>Kategori Akademik</h3>
                                                        <p className="text-xs text-gray-400">{kategoriList.length} kategori</p>
                                                    </div>
                                                </div>
                                                <ActionButton variant={canEditAkademik() ? 'warning' : 'neutral'} disabled={!canEditAkademik()} onClick={openBatchEditAkademik}>
                                                    {canEditAkademik() ? (<><Pencil size={16} /> Edit Semua</>) : (<><Lock size={16} /> Terkunci</>)}
                                                </ActionButton>
                                            </div>
                                            {(kategoriList as KategoriAkademik[]).length > 0 ? (
                                                <div className="overflow-x-auto scrollbar-thin">
                                                    <div style={{ width: '100%', minWidth: '480px' }}>
                                                        <div className="grid" style={{ gridTemplateColumns: GRID_COLS_KATEGORI, background: '#fafafa' }}>
                                                            <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">No</div>
                                                            <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">Range Nilai</div>
                                                            <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">Deskripsi</div>
                                                        </div>
                                                        {(kategoriList as KategoriAkademik[]).sort((a, b) => b.min_nilai - a.min_nilai).map((k, idx) => (
                                                            <div key={k.id} className="grid row-hover border-t transition-colors"
                                                                style={{ gridTemplateColumns: GRID_COLS_KATEGORI, borderColor: '#f0f0f0' }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                                                <div className="px-5 py-3 flex items-center text-gray-400 font-medium">{idx + 1}</div>
                                                                <div className="px-5 py-3 flex items-center">
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold"
                                                                        style={{ background: COLORS.accent.bg, color: COLORS.accent.text, border: `1px solid ${COLORS.accent.border}` }}>
                                                                        {Math.floor(k.min_nilai)} – {Math.floor(k.max_nilai)}
                                                                    </span>
                                                                </div>
                                                                <div className="px-5 py-3 flex items-center text-gray-700 truncate" title={k.deskripsi}>{k.deskripsi}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="px-5 py-8 text-center text-sm text-gray-400">Belum ada kategori untuk mata pelajaran ini</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                                    <BookOpen size={30} className="text-gray-300" />
                                    <p className="text-sm font-bold text-gray-500">Pilih Mata Pelajaran Terlebih Dahulu</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DESKRIPSI RATA-RATA TAB */}
                    {activeTab === 'deskripsi-rata-rata' && (
                        <div>
                            {!canEditDeskripsiRataRata() && (
                                <div className="mb-5 p-4 rounded-xl" style={{ background: COLORS.danger.bg, border: `1.5px solid ${COLORS.danger.border}` }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lock size={16} style={{ color: COLORS.danger.text }} />
                                        <p className="text-sm font-bold" style={{ color: COLORS.danger.text }}>Deskripsi Rata-rata Terkunci</p>
                                    </div>
                                    <p className="text-xs ml-6" style={{ color: COLORS.danger.text }}>{getDeskripsiRataRataLockReason()}</p>
                                </div>
                            )}

                            {canEditDeskripsiRataRata() && (
                                <div className="mb-5 p-4 rounded-xl flex items-center gap-3" style={{ background: COLORS.accent.bg, border: `1.5px solid ${COLORS.accent.border}` }}>
                                    <Calendar size={18} style={{ color: ACCENT_DARK }} className="flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: ACCENT_DARK }}>Periode PTS Sedang Aktif</p>
                                        <p className="text-xs" style={{ color: '#9a5b1f' }}>Deskripsi rata-rata digunakan untuk rapor PTS</p>
                                    </div>
                                </div>
                            )}

                            <CoverageWarning coverage={deskripsiRataRataCoverage} />

                            {deskripsiRataRataLoading ? (
                                <div className="py-16 text-center">
                                    <div className="w-8 h-8 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Memuat data...</p>
                                </div>
                            ) : (
                                <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${canEditDeskripsiRataRata() ? COLORS.accent.border : '#e5e7eb'}`, opacity: canEditDeskripsiRataRata() ? 1 : 0.75 }}>
                                    <div className="px-5 py-3 flex items-center justify-between gap-3"
                                        style={{ background: canEditDeskripsiRataRata() ? COLORS.accent.bg : '#f9fafb', borderBottom: `1.5px solid ${canEditDeskripsiRataRata() ? COLORS.accent.border : '#e5e7eb'}` }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                style={{ background: canEditDeskripsiRataRata() ? '#fde0c8' : '#e5e7eb' }}>
                                                <BarChart3 size={16} style={{ color: canEditDeskripsiRataRata() ? ACCENT_DARK : '#6b7280' }} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold" style={{ color: canEditDeskripsiRataRata() ? '#7a3a0a' : '#6b7280' }}>Deskripsi Rata-rata Nilai</h3>
                                                <p className="text-xs text-gray-400">{deskripsiRataRataList.length} kategori</p>
                                            </div>
                                        </div>
                                        <ActionButton variant={canEditDeskripsiRataRata() ? 'warning' : 'neutral'} disabled={!canEditDeskripsiRataRata()} onClick={openBatchEditDeskripsi}>
                                            {canEditDeskripsiRataRata() ? (<><Pencil size={16} /> Edit Semua</>) : (<><Lock size={16} /> Terkunci</>)}
                                        </ActionButton>
                                    </div>
                                    {deskripsiRataRataList.length > 0 ? (
                                        <div className="overflow-x-auto scrollbar-thin">
                                            <div style={{ width: '100%', minWidth: '480px' }}>
                                                <div className="grid" style={{ gridTemplateColumns: GRID_COLS_KATEGORI, background: '#fafafa' }}>
                                                    <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">No</div>
                                                    <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">Range Nilai</div>
                                                    <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">Deskripsi</div>
                                                </div>
                                                {[...deskripsiRataRataList].sort((a, b) => b.min_nilai - a.min_nilai).map((k, idx) => (
                                                    <div key={k.id} className="grid row-hover border-t transition-colors"
                                                        style={{ gridTemplateColumns: GRID_COLS_KATEGORI, borderColor: '#f0f0f0' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                                        <div className="px-5 py-3 flex items-center text-gray-400 font-medium">{idx + 1}</div>
                                                        <div className="px-5 py-3 flex items-center">
                                                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold"
                                                                style={{ background: COLORS.accent.bg, color: COLORS.accent.text, border: `1px solid ${COLORS.accent.border}` }}>
                                                                {parseFloat(k.min_nilai).toFixed(2)} – {parseFloat(k.max_nilai).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="px-5 py-3 flex items-center text-gray-700 truncate" title={k.deskripsi}>{k.deskripsi}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="px-5 py-8 text-center text-sm text-gray-400">Belum ada kategori deskripsi rata-rata</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* BOBOT TAB */}
                    {activeTab === 'bobot' && (
                        <div>
                            {isPTSActive && (
                                <div className="mb-5 p-4 rounded-xl flex items-start gap-3" style={{ background: COLORS.accent.bg, border: `1.5px solid ${COLORS.accent.border}` }}>
                                    <Info size={18} style={{ color: ACCENT_DARK }} className="mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold mb-1" style={{ color: ACCENT_DARK }}>Periode PTS Sedang Aktif</p>
                                        <p className="text-xs" style={{ color: '#9a5b1f' }}>Sistem otomatis menetapkan <strong>PTS = 100%</strong>. Anda tidak perlu mengatur bobot manual.</p>
                                    </div>
                                </div>
                            )}

                            {!isPTSActive && !isReadOnly && selectedMapelId && (
                                <div className="mb-5 p-4 rounded-xl flex items-start gap-3" style={{ background: COLORS.info.bg, border: `1.5px solid ${COLORS.info.border}` }}>
                                    <Info size={18} style={{ color: COLORS.info.text }} className="mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold mb-1" style={{ color: COLORS.info.text }}>Info Bobot</p>
                                        <p className="text-xs" style={{ color: COLORS.info.text }}>
                                            Bobot <strong>0% diizinkan</strong> untuk komponen yang tidak digunakan (misal: UH3 jika mapel hanya punya UH1, UH2, UH4, UH5).
                                            <br />
                                            Total bobot harus tetap <strong>100%</strong> dan minimal ada <strong>1 komponen dengan bobot &gt; 0%</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mb-5 max-w-md">
                                <label className={labelCls} style={labelColor}>Mata Pelajaran</label>
                                <select value={selectedMapelId || ''}
                                    onChange={(e) => setSelectedMapelId(e.target.value ? Number(e.target.value) : null)}
                                    className={selectCls + ' w-full'}
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    {mapelWajibList.map((mapel) => (
                                        <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedMapelId ? (
                                bobotLoading ? (
                                    <div className="py-16 text-center">
                                        <div className="w-8 h-8 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin mx-auto mb-3" />
                                        <p className="text-sm text-gray-400">Memuat bobot...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {bobotList.map((bobot) => {
                                            const komponen = komponenList.find((k) => k.id_komponen === bobot.komponen_id);
                                            const isPTS = komponen && /^PTS$/i.test(komponen.nama_komponen);
                                            const displayBobot = isPTSActive ? (isPTS ? 100 : 0) : bobot.bobot;
                                            const isEditable = !isPTSActive && !isReadOnly;

                                            return (
                                                <div key={bobot.komponen_id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl transition-all"
                                                    style={{
                                                        background: isPTSActive && isPTS ? COLORS.accent.bg : isEditable ? '#ffffff' : '#f9fafb',
                                                        border: `1.5px solid ${isPTSActive && isPTS ? COLORS.accent.border : isEditable ? COLORS.accent.border : '#e5e7eb'}`
                                                    }}>
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                            style={{ background: isPTSActive && isPTS ? '#fde0c8' : COLORS.accent.bg }}>
                                                            <TrendingUp size={16} style={{ color: ACCENT_DARK }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm" style={{ color: '#7a3a0a' }}>{komponen?.nama_komponen || 'Komponen'}</p>
                                                            <p className="text-xs text-gray-400">Komponen Penilaian</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text" inputMode="decimal" pattern="[0-9]*" value={displayBobot}
                                                            onChange={(e) => {
                                                                if (isEditable) {
                                                                    const value = e.target.value;
                                                                    if (value === '' || /^\d*\.?\d*$/.test(value)) handleBobotChange(bobot.komponen_id, value);
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                const value = parseFloat(e.target.value);
                                                                if (isNaN(value) || value < 0) handleBobotChange(bobot.komponen_id, '0');
                                                                else if (value > 100) handleBobotChange(bobot.komponen_id, '100');
                                                            }}
                                                            disabled={!isEditable} maxLength={5}
                                                            className={`w-24 h-11 px-3 text-center font-bold text-base rounded-xl border-2 transition-all outline-none ${isEditable
                                                                ? 'bg-white border-orange-200 text-gray-800 focus:ring-4 focus:ring-orange-100 focus:border-orange-400'
                                                                : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                                                                }`}
                                                            readOnly={!isEditable} placeholder="0"
                                                        />
                                                        <span className="text-base font-bold" style={{ color: ACCENT_DARK }}>%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Total Bobot */}
                                        <div className="p-5 rounded-xl mt-4" style={{ background: isBobotValid ? COLORS.success.bg : COLORS.warning.bg, border: `1.5px solid ${isBobotValid ? COLORS.success.border : COLORS.warning.border}` }}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: isBobotValid ? '#bbf7d0' : '#fde68a' }}>
                                                        <TrendingUp size={16} style={{ color: isBobotValid ? COLORS.success.text : COLORS.warning.text }} />
                                                    </div>
                                                    <span className="font-bold text-sm" style={{ color: isBobotValid ? COLORS.success.text : COLORS.warning.text }}>Total Bobot</span>
                                                </div>
                                                <span className="text-2xl font-bold" style={{ color: isBobotValid ? COLORS.success.text : COLORS.warning.text }}>
                                                    {totalBobot.toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="mt-3 h-2 rounded-full overflow-hidden bg-white/50">
                                                <div className="h-full rounded-full transition-all" style={{
                                                    width: `${Math.min(totalBobot, 100)}%`,
                                                    background: isBobotValid ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #eab308, #facc15)'
                                                }} />
                                            </div>
                                            <p className="text-xs mt-2" style={{ color: isBobotValid ? COLORS.success.text : COLORS.warning.text }}>
                                                {isBobotValid ? '✓ Bobot sudah tepat 100%' : `Total harus tepat 100% (saat ini ${totalBobot.toFixed(2)}%)`}
                                            </p>
                                        </div>

                                        {/* Save Button */}
                                        {!isPTSActive && !isReadOnly && (
                                            <div className="flex justify-end pt-4 mt-4" style={{ borderTop: '1.5px solid #ececec' }}>
                                                <ActionButton variant="primary" onClick={openConfirmSaveBobot} disabled={isSavingBobot || !isBobotValid}>
                                                    {isSavingBobot ? (
                                                        <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>
                                                    ) : (
                                                        <><Save size={16} />Simpan Bobot</>
                                                    )}
                                                </ActionButton>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                                    <TrendingUp size={30} className="text-gray-300" />
                                    <p className="text-sm font-bold text-gray-500">Pilih Mata Pelajaran Terlebih Dahulu</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL BATCH EDIT KOKURIKULER */}
            {showBatchEdit && (
                <div className={`fixed inset-0 flex items-center justify-center z-[1000] p-4 transition-opacity duration-200 ${batchEditClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => { if (e.target === e.currentTarget) closeBatchEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Layers size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Edit Grade Aspek Kokurikuler</h2>
                                    <p className="text-xs text-white/80 mt-0.5">Kelola semua grade sekaligus</p>
                                </div>
                            </div>
                            <button onClick={closeBatchEdit} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
                            <div className="p-6 space-y-4">
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: COLORS.info.bg, border: `1px solid ${COLORS.info.border}` }}>
                                    <Info size={16} style={{ color: COLORS.info.text }} className="mt-0.5 flex-shrink-0" />
                                    <p className="text-xs" style={{ color: COLORS.info.text }}><strong>Tips:</strong> Isi semua grade sekaligus untuk aspek ini. Sistem akan menyimpan semua grade dalam 1 aksi.</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-gray-700">Grade ({batchGrades.length})</h3>
                                        <ActionButton variant="info" onClick={addBatchGradeRow}>
                                            <Plus size={14} /> Tambah Baris
                                        </ActionButton>
                                    </div>
                                    {batchGrades.map((grade, index) => {
                                        const errors: string[] = [];
                                        if (!grade.grade) errors.push('Grade kosong');
                                        if (grade.grade && grade.grade.length !== 1) errors.push('Grade harus 1 karakter');
                                        if (isNaN(grade.min_nilai) || isNaN(grade.max_nilai)) errors.push('Nilai tidak valid');
                                        else if (grade.min_nilai >= grade.max_nilai) errors.push(`Min (${grade.min_nilai}) >= Max (${grade.max_nilai})`);
                                        if (!grade.deskripsi || grade.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');

                                        return (
                                            <div key={index} className="p-4 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                                                        style={{ background: BRAND_GRADIENT }}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Grade <span className="text-red-500">*</span></label>
                                                            <input type="text" value={grade.grade || ''}
                                                                onChange={(e) => updateBatchGrade(index, 'grade', e.target.value.toUpperCase().slice(0, 1))}
                                                                className={inputCls} maxLength={1} placeholder="A" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Min <span className="text-red-500">*</span></label>
                                                            <input type="number" min="0" max="100" value={grade.min_nilai}
                                                                onChange={(e) => updateBatchGrade(index, 'min_nilai', parseInt(e.target.value) || 0)}
                                                                className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Max <span className="text-red-500">*</span></label>
                                                            <input type="number" min="0" max="100" value={grade.max_nilai}
                                                                onChange={(e) => updateBatchGrade(index, 'max_nilai', parseInt(e.target.value) || 0)}
                                                                className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Deskripsi <span className="text-red-500">*</span></label>
                                                            <input type="text" value={grade.deskripsi}
                                                                onChange={(e) => updateBatchGrade(index, 'deskripsi', e.target.value)}
                                                                className={inputCls} placeholder="Sangat Baik" />
                                                        </div>
                                                    </div>
                                                    {batchGrades.length > 1 && (
                                                        <button onClick={() => removeBatchGradeRow(index)}
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
                                    const validation = validateBatchGrades();
                                    return (
                                        <div className="p-3 rounded-xl flex items-center gap-2" style={{
                                            background: validation.valid ? COLORS.success.bg : COLORS.warning.bg,
                                            border: `1.5px solid ${validation.valid ? COLORS.success.border : COLORS.warning.border}`,
                                            color: validation.valid ? COLORS.success.text : COLORS.warning.text
                                        }}>
                                            {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            <strong>Status:</strong> {validation.valid ? 'Semua grade valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="px-6 py-4 flex justify-end gap-2.5" style={{ borderTop: '1.5px solid #ececec', background: '#fafafa' }}>
                            <ActionButton variant="neutral" onClick={closeBatchEdit} disabled={isSavingBatch}>Batal</ActionButton>
                            <ActionButton variant="primary" onClick={openConfirmSaveBatch} disabled={isSavingBatch}>
                                {isSavingBatch ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>) : (<><Save size={16} />Simpan {batchGrades.length} Grade</>)}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL BATCH EDIT AKADEMIK */}
            {showBatchEditAkademik && (
                <div className={`fixed inset-0 flex items-center justify-center z-[1000] p-4 transition-opacity duration-200 ${batchEditAkademikClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => { if (e.target === e.currentTarget) closeBatchEditAkademik(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditAkademikClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <BookOpen size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Edit Kategori Akademik</h2>
                                    <p className="text-xs text-white/80 mt-0.5">Kelola semua kategori sekaligus</p>
                                </div>
                            </div>
                            <button onClick={closeBatchEditAkademik} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
                            <div className="p-6 space-y-4">
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: COLORS.info.bg, border: `1px solid ${COLORS.info.border}` }}>
                                    <Info size={16} style={{ color: COLORS.info.text }} className="mt-0.5 flex-shrink-0" />
                                    <p className="text-xs" style={{ color: COLORS.info.text }}><strong>Tips:</strong> Isi semua kategori sekaligus. Sistem akan menyimpan semua kategori dalam 1 aksi.</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-gray-700">Kategori ({batchAkademik.length})</h3>
                                        <ActionButton variant="info" onClick={addBatchAkademikRow}>
                                            <Plus size={14} /> Tambah Baris
                                        </ActionButton>
                                    </div>
                                    {batchAkademik.map((kategori, index) => {
                                        const errors: string[] = [];
                                        if (isNaN(kategori.min_nilai) || isNaN(kategori.max_nilai)) errors.push('Nilai tidak valid');
                                        else if (kategori.min_nilai >= kategori.max_nilai) errors.push(`Min (${kategori.min_nilai}) >= Max (${kategori.max_nilai})`);
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
                                                                onChange={(e) => updateBatchAkademik(index, 'min_nilai', parseInt(e.target.value) || 0)}
                                                                className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Max <span className="text-red-500">*</span></label>
                                                            <input type="number" min="0" max="100" value={kategori.max_nilai}
                                                                onChange={(e) => updateBatchAkademik(index, 'max_nilai', parseInt(e.target.value) || 0)}
                                                                className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Deskripsi <span className="text-red-500">*</span></label>
                                                            <input type="text" value={kategori.deskripsi}
                                                                onChange={(e) => updateBatchAkademik(index, 'deskripsi', e.target.value)}
                                                                className={inputCls} placeholder="Sangat Baik" />
                                                        </div>
                                                    </div>
                                                    {batchAkademik.length > 1 && (
                                                        <button onClick={() => removeBatchAkademikRow(index)}
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
                                    const validation = validateBatchAkademik();
                                    return (
                                        <div className="p-3 rounded-xl flex items-center gap-2" style={{
                                            background: validation.valid ? COLORS.success.bg : COLORS.warning.bg,
                                            border: `1.5px solid ${validation.valid ? COLORS.success.border : COLORS.warning.border}`,
                                            color: validation.valid ? COLORS.success.text : COLORS.warning.text
                                        }}>
                                            {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            <strong>Status:</strong> {validation.valid ? 'Semua kategori valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="px-6 py-4 flex justify-end gap-2.5" style={{ borderTop: '1.5px solid #ececec', background: '#fafafa' }}>
                            <ActionButton variant="neutral" onClick={closeBatchEditAkademik} disabled={isSavingBatchAkademik}>Batal</ActionButton>
                            <ActionButton variant="primary" onClick={openConfirmSaveBatchAkademik} disabled={isSavingBatchAkademik}>
                                {isSavingBatchAkademik ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>) : (<><Save size={16} />Simpan {batchAkademik.length} Kategori</>)}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL BATCH EDIT DESKRIPSI RATA-RATA */}
            {showBatchEditDeskripsi && (
                <div className={`fixed inset-0 flex items-center justify-center z-[1000] p-4 transition-opacity duration-200 ${batchEditDeskripsiClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => { if (e.target === e.currentTarget) closeBatchEditDeskripsi(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditDeskripsiClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <BarChart3 size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Edit Deskripsi Rata-rata</h2>
                                    <p className="text-xs text-white/80 mt-0.5">Kelola semua kategori sekaligus</p>
                                </div>
                            </div>
                            <button onClick={closeBatchEditDeskripsi} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
                            <div className="p-6 space-y-4">
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: COLORS.info.bg, border: `1px solid ${COLORS.info.border}` }}>
                                    <Info size={16} style={{ color: COLORS.info.text }} className="mt-0.5 flex-shrink-0" />
                                    <p className="text-xs" style={{ color: COLORS.info.text }}><strong>Tips:</strong> Nilai menggunakan desimal (2 digit). Contoh: 85.50</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-gray-700">Kategori ({batchDeskripsi.length})</h3>
                                        <ActionButton variant="info" onClick={addBatchDeskripsiRow}>
                                            <Plus size={14} /> Tambah Baris
                                        </ActionButton>
                                    </div>
                                    {batchDeskripsi.map((kategori, index) => {
                                        const errors: string[] = [];
                                        if (isNaN(kategori.min_nilai) || isNaN(kategori.max_nilai)) errors.push('Nilai tidak valid');
                                        else if (kategori.min_nilai >= kategori.max_nilai) errors.push(`Min (${kategori.min_nilai}) >= Max (${kategori.max_nilai})`);
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
                                                            <input type="number" min="0" max="100" step="0.01" value={kategori.min_nilai}
                                                                onChange={(e) => updateBatchDeskripsi(index, 'min_nilai', parseFloat(e.target.value) || 0)}
                                                                className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Max <span className="text-red-500">*</span></label>
                                                            <input type="number" min="0" max="100" step="0.01" value={kategori.max_nilai}
                                                                onChange={(e) => updateBatchDeskripsi(index, 'max_nilai', parseFloat(e.target.value) || 0)}
                                                                className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold mb-1.5 text-gray-600">Deskripsi <span className="text-red-500">*</span></label>
                                                            <input type="text" value={kategori.deskripsi}
                                                                onChange={(e) => updateBatchDeskripsi(index, 'deskripsi', e.target.value)}
                                                                className={inputCls} placeholder="Sangat Baik" />
                                                        </div>
                                                    </div>
                                                    {batchDeskripsi.length > 1 && (
                                                        <button onClick={() => removeBatchDeskripsiRow(index)}
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
                                    const validation = validateBatchDeskripsi();
                                    return (
                                        <div className="p-3 rounded-xl flex items-center gap-2" style={{
                                            background: validation.valid ? COLORS.success.bg : COLORS.warning.bg,
                                            border: `1.5px solid ${validation.valid ? COLORS.success.border : COLORS.warning.border}`,
                                            color: validation.valid ? COLORS.success.text : COLORS.warning.text
                                        }}>
                                            {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            <strong>Status:</strong> {validation.valid ? 'Semua kategori valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="px-6 py-4 flex justify-end gap-2.5" style={{ borderTop: '1.5px solid #ececec', background: '#fafafa' }}>
                            <ActionButton variant="neutral" onClick={closeBatchEditDeskripsi} disabled={isSavingBatchDeskripsi}>Batal</ActionButton>
                            <ActionButton variant="primary" onClick={openConfirmSaveBatchDeskripsi} disabled={isSavingBatchDeskripsi}>
                                {isSavingBatchDeskripsi ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>) : (<><Save size={16} />Simpan {batchDeskripsi.length} Kategori</>)}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Konfirmasi Penyimpanan</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                            {confirmAction === 'save-bobot' ? 'Apakah Anda yakin ingin menyimpan bobot penilaian ini?' :
                                confirmAction === 'save-batch' ? `Apakah Anda yakin ingin menyimpan ${batchGrades.length} grade?` :
                                    confirmAction === 'save-batch-akademik' ? `Apakah Anda yakin ingin menyimpan ${batchAkademik.length} kategori akademik?` :
                                        confirmAction === 'save-batch-deskripsi' ? `Apakah Anda yakin ingin menyimpan ${batchDeskripsi.length} kategori deskripsi rata-rata?` :
                                            'Apakah Anda yakin ingin menyimpan data ini?'}
                        </p>
                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" onClick={() => setShowConfirmModal(false)} fullWidth>Batal</ActionButton>
                            <ActionButton
                                variant="primary"
                                fullWidth
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    if (confirmAction === 'save-bobot') executeSaveBobot();
                                    else if (confirmAction === 'save-batch') executeSaveBatch();
                                    else if (confirmAction === 'save-batch-akademik') executeSaveBatchAkademik();
                                    else if (confirmAction === 'save-batch-deskripsi') executeSaveBatchDeskripsi();
                                }}
                                disabled={isSavingBobot || isSavingBatch || isSavingBatchAkademik || isSavingBatchDeskripsi}
                            >
                                {(isSavingBobot || isSavingBatch || isSavingBatchAkademik || isSavingBatchDeskripsi) ? (
                                    <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>
                                ) : (
                                    <>Ya, Simpan</>
                                )}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}