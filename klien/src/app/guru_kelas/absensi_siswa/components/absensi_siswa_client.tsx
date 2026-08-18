"use client";

import { useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
    X, Search, CheckCircle2, AlertCircle,
    WifiOff, ShieldAlert, Users,
    Info, Edit3, Check, School, Lock, LogOut,
    Upload, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface SiswaAbsensi {
    id_siswa: number;
    nama: string;
    nis: string;
    nisn: string;
    sakit: number;
    izin: number;
    alpha: number;
    sudah_diinput: boolean;
    pts_sakit?: number;
    pts_izin?: number;
    pts_alpha?: number;
}

interface AbsensiData {
    kelas_id: number;
    kelas: string;
    jenis_penilaian: 'PTS' | 'PAS';
    semester: string;
    absensi: SiswaAbsensi[];
    total: number;
}

// ─── NOTIF MODAL TYPES ────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
}

/* ==========================================================================
   DESIGN TOKENS — disamakan penuh dengan data_guru_client.tsx / kokurikuler_client.tsx
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const GRID_COLS = 'minmax(48px,0.5fr) minmax(190px,2.6fr) minmax(90px,1fr) minmax(80px,0.9fr) minmax(80px,0.9fr) minmax(80px,0.9fr) minmax(170px,1.6fr)';

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   GLOBAL STYLES — identik dengan data_guru_client.tsx / kokurikuler_client.tsx
   ========================================================================== */

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

        .row-hover { position: relative; transition: background-color 0.15s ease; }
        .row-hover::before {
            content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
            background: ${BRAND_GRADIENT}; transform: scaleY(0); transition: transform 0.16s ease;
        }
        .row-hover:hover::before { transform: scaleY(1); }

        .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease; }
        .btn-action:hover  { filter: brightness(1.04); }
        .btn-action:active { filter: brightness(0.98); }

        .scrollbar-thin::-webkit-scrollbar { width: 5px; height: 5px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #f0c9a0; border-radius: 10px; }

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

/* ==========================================================================
   NOTIFICATION MODAL — identik dengan data_guru_client.tsx / kokurikuler_client.tsx
   ========================================================================== */

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <X size={18} />
                </button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                <div className="text-center w-full">
                    <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>
                    OK, Mengerti
                </button>
            </div>
        </div>
    );
};

/* ==========================================================================
   INPUT & SISTEM TOMBOL AKSI — identik dengan data_guru_client.tsx / kokurikuler_client.tsx
   ========================================================================== */

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm text-center text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200";

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
    accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
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

/** Badge angka absensi — konsisten dengan NilaiBadge di kokurikuler_client.tsx */
const AbsenBadge = ({ value }: { value: number }) => (
    <span
        className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold min-w-[28px]"
        style={{ background: '#fff0e5', color: ACCENT_DARK, border: '1px solid #fde0c8' }}
    >
        {value || 0}
    </span>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AbsensiClient() {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/guru-kelas';
    const { showSessionExpired, handleLogout } = useSession();

    // ── State ──────────────────────────────────────────────────────────────
    const [jenisPenilaian, setJenisPenilaian] = useState<'PTS' | 'PAS'>('PTS');
    const [absensiData, setAbsensiData] = useState<AbsensiData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingRows, setEditingRows] = useState<Set<number>>(new Set());
    const [editedData, setEditedData] = useState<Record<number, { sakit: number; izin: number; alpha: number }>>({});
    const [savingRows, setSavingRows] = useState<Set<number>>(new Set());

    // ✅ STATE: Kondisi akses
    const [isNotAssigned, setIsNotAssigned] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);
    const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [semesterAktif, setSemesterAktif] = useState<string>('Ganjil');

    // 🆕 STATE untuk Import Absensi
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    // ── Modal state ────────────────────────────────────────────────────────
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmData, setConfirmData] = useState<{ siswaId: number; data: any } | null>(null);

    // ── Fetch Tahun Ajaran Aktif ───────────────────────────────────────────
    const fetchTahunAjaran = useCallback(async (token: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE}/tahun-ajaran/aktif`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = '/login';
                return false;
            }

            if (!res.ok) {
                console.error('❌ fetchTahunAjaran gagal:', res.status);
                return false;
            }

            const result = await res.json();
            if (result.success && result.data) {
                const ta = result.data;
                const ptsStatus = ta.status_pts || 'nonaktif';
                const pasStatus = ta.status_pas || 'nonaktif';

                setStatusPTS(ptsStatus);
                setStatusPAS(pasStatus);
                setSemesterAktif(ta.semester || 'Ganjil');

                if (ptsStatus === 'aktif') {
                    setJenisPenilaian('PTS');
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (pasStatus === 'aktif') {
                    setJenisPenilaian('PAS');
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (ptsStatus === 'selesai' || pasStatus === 'selesai') {
                    setJenisPenilaian(pasStatus === 'selesai' ? 'PAS' : 'PTS');
                    setIsReadOnly(true);
                    setReadOnlyReason('locked');
                } else {
                    setJenisPenilaian('PTS');
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');

                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: 'Periode Penilaian Belum Aktif',
                            message: 'Baik PTS maupun PAS belum dibuka oleh admin. Anda dapat melihat data absensi, tetapi belum dapat mengedit.\n\nTip: Silakan hubungi Administrator untuk membuka periode penilaian.'
                        });
                    }, 500);
                }

                return true;
            }
            return false;
        } catch (err) {
            console.error('Error fetch tahun ajaran:', err);
            return false;
        }
    }, [showModal]);

    // ── Fetch Data Absensi ─────────────────────────────────────────────────
    const fetchAbsensi = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                setLoading(false);
                return;
            }

            const semester = semesterAktif;
            const res = await fetch(`${API_BASE}/absensi/${jenisPenilaian}/${semester}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ code: 'UNKNOWN', message: 'Gagal memuat data' }));

                if (errData.code === 'NOT_ASSIGNED') {
                    setIsNotAssigned(true);
                    setLoading(false);
                    return;
                } else if (errData.code === 'PERIOD_NOT_OPEN') {
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                    setAbsensiData(null);
                    setLoading(false);
                    return;
                } else if (errData.code === 'PERIOD_LOCKED') {
                    setIsReadOnly(true);
                    setReadOnlyReason('locked');
                    setAbsensiData(null);
                    setLoading(false);
                    return;
                }

                showModal({
                    type: 'error',
                    title: 'Gagal Memuat Data',
                    message: errData.message || 'Terjadi kesalahan saat memuat data absensi.'
                });
                setLoading(false);
                return;
            }

            const result = await res.json();

            if (result.success) {
                setAbsensiData(result.data);
                setIsNotAssigned(false);
            } else {
                showModal({
                    type: 'error',
                    title: 'Gagal Memuat Data',
                    message: result.message || 'Terjadi kesalahan saat memuat data absensi.'
                });
            }
        } catch (err) {
            console.error('Error fetch absensi:', err);
            showModal({
                type: 'network',
                title: 'Koneksi Gagal',
                message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
            });
        } finally {
            setLoading(false);
        }
    }, [jenisPenilaian, semesterAktif, showModal]);

    // ── Initial Load ───────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                setLoading(false);
                return;
            }

            const success = await fetchTahunAjaran(token);

            if (success) {
                await fetchAbsensi();
            } else {
                setLoading(false);
                showModal({
                    type: 'network',
                    title: 'Gagal Memuat Data',
                    message: 'Tidak dapat memuat data tahun ajaran. Silakan refresh halaman.'
                });
            }
        };
        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Refetch saat jenis penilaian berubah ───────────────────────────────
    useEffect(() => {
        if (isNotAssigned) return;
        fetchAbsensi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jenisPenilaian, fetchAbsensi, isNotAssigned]);

    // ── Warning sebelum unload jika ada perubahan ──────────────────────────
    useEffect(() => {
        const hasUnsavedChanges = editingRows.size > 0;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [editingRows]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleEdit = (siswaId: number) => {
        if (isReadOnly) {
            if (readOnlyReason === 'locked') {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message: 'Periode penilaian sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengedit data absensi.'
                });
            } else {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message: 'Periode penilaian belum aktif.\n\nAnda belum dapat mengedit data absensi.\n\nSilakan tunggu admin membuka periode penilaian.'
                });
            }
            return;
        }

        setEditingRows(prev => new Set(prev).add(siswaId));

        const siswa = absensiData?.absensi?.find(s => s.id_siswa === siswaId);
        if (siswa) {
            setEditedData(prev => ({
                ...prev,
                [siswaId]: {
                    sakit: siswa.sakit || 0,
                    izin: siswa.izin || 0,
                    alpha: siswa.alpha || 0
                }
            }));
        }
    };

    const handleCancelEdit = (siswaId: number) => {
        setEditingRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(siswaId);
            return newSet;
        });
        setEditedData(prev => {
            const newData = { ...prev };
            delete newData[siswaId];
            return newData;
        });
    };

    const handleInputChange = (siswaId: number, field: 'sakit' | 'izin' | 'alpha', value: string) => {
        const numValue = Math.max(0, parseInt(value) || 0);
        setEditedData(prev => ({
            ...prev,
            [siswaId]: {
                ...prev[siswaId],
                [field]: numValue
            }
        }));
    };

    // ── Validasi Input ─────────────────────────────────────────────────────
    const validateInput = (siswaId: number): string | null => {
        const data = editedData[siswaId];
        if (!data) return 'Data tidak valid';

        if (data.sakit < 0 || data.izin < 0 || data.alpha < 0) {
            return 'Nilai absensi tidak boleh negatif';
        }

        const MAX_ABSEN = 90;
        if (data.sakit > MAX_ABSEN || data.izin > MAX_ABSEN || data.alpha > MAX_ABSEN) {
            return `Nilai absensi tidak boleh lebih dari ${MAX_ABSEN} hari`;
        }

        const totalHari = data.sakit + data.izin + data.alpha;
        if (totalHari > MAX_ABSEN) {
            return `Total absensi (${totalHari} hari) tidak boleh lebih dari ${MAX_ABSEN} hari`;
        }

        // ✅ VALIDASI PENTING: PAS tidak boleh kurang dari PTS
        if (jenisPenilaian === 'PAS') {
            const siswa = absensiData?.absensi?.find(s => s.id_siswa === siswaId);
            if (siswa) {
                const ptsSakit = siswa.pts_sakit || 0;
                const ptsIzin = siswa.pts_izin || 0;
                const ptsAlpha = siswa.pts_alpha || 0;

                if (data.sakit < ptsSakit) return `Total sakit (${data.sakit}) tidak boleh kurang dari data PTS (${ptsSakit})`;
                if (data.izin < ptsIzin) return `Total izin (${data.izin}) tidak boleh kurang dari data PTS (${ptsIzin})`;
                if (data.alpha < ptsAlpha) return `Total alpha (${data.alpha}) tidak boleh kurang dari data PTS (${ptsAlpha})`;
            }
        }

        return null;
    };

    const hasChanges = (siswaId: number): boolean => {
        const siswa = absensiData?.absensi?.find(s => s.id_siswa === siswaId);
        const edited = editedData[siswaId];

        if (!siswa || !edited) return false;

        return (
            edited.sakit !== siswa.sakit ||
            edited.izin !== siswa.izin ||
            edited.alpha !== siswa.alpha
        );
    };

    const openConfirmModal = (siswaId: number) => {
        if (!hasChanges(siswaId)) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Data absensi tidak berubah. Tidak perlu menyimpan.'
            });
            return;
        }

        const validationError = validateInput(siswaId);
        if (validationError) {
            showModal({ type: 'error', title: 'Validasi Gagal', message: validationError });
            return;
        }

        setConfirmData({ siswaId, data: editedData[siswaId] });
        setShowConfirmModal(true);
    };

    const executeSave = async () => {
        if (!confirmData) return;

        const { siswaId, data } = confirmData;

        try {
            setSavingRows(prev => new Set(prev).add(siswaId));

            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
                return;
            }

            const res = await fetch(`${API_BASE}/absensi`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    siswa_id: siswaId,
                    sakit: data.sakit,
                    izin: data.izin,
                    alpha: data.alpha,
                    jenis: jenisPenilaian,
                    semester: semesterAktif
                })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                setAbsensiData(prev => {
                    if (!prev?.absensi) return prev;
                    const newAbsensi = prev.absensi.map(s =>
                        s.id_siswa === siswaId
                            ? { ...s, sakit: data.sakit, izin: data.izin, alpha: data.alpha, sudah_diinput: true }
                            : s
                    );
                    return { ...prev, absensi: newAbsensi };
                });

                handleCancelEdit(siswaId);

                showModal({
                    type: 'success',
                    title: 'Berhasil Disimpan!',
                    message: `Absensi ${jenisPenilaian} berhasil disimpan.`
                });
            } else {
                showModal({
                    type: 'error',
                    title: 'Gagal Menyimpan',
                    message: result.message || 'Terjadi kesalahan saat menyimpan data.'
                });
            }
        } catch (err) {
            console.error('Error save absensi:', err);
            showModal({
                type: 'network',
                title: 'Koneksi Gagal',
                message: 'Tidak dapat terhubung ke server.'
            });
        } finally {
            setSavingRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(siswaId);
                return newSet;
            });
            setShowConfirmModal(false);
            setConfirmData(null);
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // IMPORT ABSENSI HANDLERS
    // ═════════════════════════════════════════════════════════════════════════

    const openImportModal = () => {
        if (isReadOnly) {
            showModal({
                type: 'warning',
                title: 'Mode Baca Saja',
                message: readOnlyReason === 'locked'
                    ? 'Periode penilaian sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengimport data absensi.'
                    : 'Periode penilaian belum aktif.\n\nAnda tidak dapat mengimport data absensi.'
            });
            return;
        }

        setImportFile(null);
        if (importFileInputRef.current) importFileInputRef.current.value = '';
        setShowImportModal(true);
    };

    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/absensi/import-template?jenis=${jenisPenilaian}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Gagal download template' }));
                throw new Error(err.message || 'Gagal download template');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Template_Absensi_${absensiData?.kelas.replace(/[^a-z0-9]/gi, '_') || 'Kelas'}_${jenisPenilaian}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showModal({
                type: 'success',
                title: 'Template Berhasil Diunduh',
                message: 'Template Excel berhasil diunduh.\n\nLangkah selanjutnya:\n1. Buka file Excel\n2. Isi data absensi (Sakit, Izin, Alpha)\n3. Simpan file\n4. Upload kembali melalui tombol "Import Absensi"'
            });
        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Mengunduh Template',
                message: err.message || 'Terjadi kesalahan saat mengunduh template.'
            });
        } finally {
            setDownloadingTemplate(false);
        }
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            showModal({
                type: 'warning',
                title: 'Format File Tidak Valid',
                message: 'Silakan upload file Excel (.xlsx atau .xls)'
            });
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showModal({
                type: 'warning',
                title: 'File Terlalu Besar',
                message: 'Ukuran file maksimal 10MB'
            });
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
            return;
        }

        setImportFile(file);
    };

    const downloadErrorReportAbsensi = (errors: any[]) => {
        const headers = ['No', 'Baris', 'Alasan Error'];
        const rows = errors.map((err, index) => {
            const message = err.message || '';
            const rowMatch = message.match(/Baris\s+(\d+)/i);
            const rowNumber = rowMatch ? rowMatch[1] : '-';
            const escapedMessage = message.replace(/"/g, '""');
            return [index + 1, rowNumber, `"${escapedMessage}"`].join(',');
        });

        const BOM = '\uFEFF';
        const csvContent = BOM + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `error_import_absensi_${jenisPenilaian}_${timestamp}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const executeImport = async () => {
        if (!importFile) {
            showModal({
                type: 'warning',
                title: 'File Belum Dipilih',
                message: 'Silakan pilih file Excel yang akan diimport.'
            });
            return;
        }

        setImporting(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', importFile);

            const response = await fetch(`${API_BASE}/absensi/import?jenis=${jenisPenilaian}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengimport absensi');
            }

            // Refresh data absensi
            await fetchAbsensi();

            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            const errors = data.data?.errors || [];
            const totalErrors = errors.length;

            if (totalErrors > 4) {
                downloadErrorReportAbsensi(errors);
            }

            let notifMessage = '';
            if (totalErrors === 0) {
                notifMessage = `Import berhasil!\n\n${data.data?.berhasil || 0} siswa berhasil diimport\n${data.data?.total_records_saved || 0} data absensi disimpan`;
            } else {
                notifMessage = `Import selesai dengan catatan\n\nBerhasil: ${data.data?.berhasil || 0} siswa\nGagal: ${totalErrors} baris\n`;
                if (totalErrors <= 4) {
                    notifMessage += `\nDetail Error:\n`;
                    errors.slice(0, 3).forEach((e: any, i: number) => {
                        notifMessage += `${i + 1}. ${e.message}\n`;
                    });
                } else {
                    notifMessage += `\nContoh Error:\n`;
                    errors.slice(0, 2).forEach((e: any, i: number) => {
                        notifMessage += `${i + 1}. ${e.message}\n`;
                    });
                    notifMessage += `\nFile CSV error telah diunduh otomatis!`;
                }
            }

            if (data.data?.periode) {
                notifMessage += `\n\nPeriode: ${data.data.periode}`;
            }

            setTimeout(() => {
                showModal({
                    type: totalErrors > 0 ? 'warning' : 'success',
                    title: totalErrors > 0 ? 'Import Selesai' : 'Import Berhasil!',
                    message: notifMessage
                });
            }, 250);

        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Import',
                message: err.message || 'Terjadi kesalahan saat mengimport absensi.'
            });
        } finally {
            setImporting(false);
        }
    };

    // ── Filter ─────────────────────────────────────────────────────────────
    const filteredAbsensi = (absensiData?.absensi ?? []).filter(siswa => {
        const query = searchQuery.toLowerCase();
        return (
            siswa.nama.toLowerCase().includes(query) ||
            siswa.nis.toLowerCase().includes(query) ||
            siswa.nisn.toLowerCase().includes(query)
        );
    });

    // ── Helper: Status Tab ─────────────────────────────────────────────────
    const getTabStatus = (jenis: 'PTS' | 'PAS') => {
        return jenis === 'PTS' ? statusPTS : statusPAS;
    };

    const handleTabChange = (jenis: 'PTS' | 'PAS') => {
        const status = getTabStatus(jenis);

        // ✅ Cegah pindah tab jika ada perubahan belum disimpan
        if (editingRows.size > 0) {
            showModal({
                type: 'warning',
                title: 'Perubahan Belum Disimpan',
                message: 'Anda memiliki perubahan yang belum disimpan. Silakan simpan atau batalkan perubahan sebelum pindah tab.'
            });
            return;
        }

        if (status === 'nonaktif') {
            showModal({
                type: 'warning',
                title: 'Periode Belum Aktif',
                message: `Periode ${jenis} belum dibuka oleh admin.\n\nSilakan tunggu admin membuka periode ${jenis}.`
            });
            return;
        }

        if (status === 'selesai') {
            setJenisPenilaian(jenis);
            setIsReadOnly(true);
            setReadOnlyReason('locked');
            showModal({
                type: 'warning',
                title: 'Periode Selesai',
                message: `Periode ${jenis} sudah selesai.\n\nAnda hanya dapat melihat data dalam mode baca saja.`
            });
            return;
        }

        setJenisPenilaian(jenis);
        setIsReadOnly(false);
        setReadOnlyReason(null);
    };

    // ── Render: Akses Ditolak ──────────────────────────────────────────────
    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn" style={CARD_STYLE}>
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
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
                        <ActionButton variant="primary" fullWidth onClick={handleLogout}>
                            <LogOut size={16} /> Logout
                        </ActionButton>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render Utama ───────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page Header */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Absensi Siswa</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">
                    Kelola data kehadiran siswa untuk <strong>{absensiData?.kelas || 'kelas Anda'}</strong>
                </p>
            </div>

            {/* ✅ BANNER READ-ONLY — konsisten dengan banner read-only di kokurikuler_client.tsx */}
            {isReadOnly && (
                <div className="mb-5 rounded-2xl overflow-hidden card-flat anim-in d2" style={{ border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}` }}>
                    <div
                        className="flex items-center gap-3 px-5 py-3.5"
                        style={{ background: readOnlyReason === 'locked' ? '#fee2e2' : '#fef3c7' }}
                    >
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ background: readOnlyReason === 'locked' ? '#fecaca' : '#fde68a' }}
                        >
                            <Lock size={18} className={readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'} />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>
                                Mode Baca Saja
                            </p>
                            <p className={`text-xs mt-0.5 ${readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'}`}>
                                {readOnlyReason === 'locked'
                                    ? 'Periode penilaian telah selesai dan data sudah dikunci. Anda dapat melihat data absensi, tetapi tidak dapat mengedit.'
                                    : 'Periode penilaian belum aktif. Anda dapat melihat data absensi, tetapi belum dapat mengedit. Silakan hubungi admin untuk membuka periode penilaian.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d2" style={CARD_STYLE}>

                {/* Card Header */}
                <div className="px-4 sm:px-6 py-4 sm:py-5" style={{ background: BRAND_GRADIENT }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/25 flex items-center justify-center backdrop-blur-sm">
                            <School className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white">
                                {absensiData?.kelas || 'Memuat...'}
                            </h2>
                            <p className="text-xs text-white/80 mt-0.5">
                                Semester {semesterAktif}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab Toggle PTS/PAS dengan Status */}
                <div className="px-4 sm:px-5 py-3" style={{ background: '#fff5eb', borderBottom: '1px solid #fde0c8' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold" style={{ color: ACCENT_DARK }}>Periode:</span>
                        <div className="flex gap-2 bg-white rounded-lg p-1" style={{ border: '1px solid #fde0c8' }}>
                            {/* Tab PTS */}
                            <button
                                onClick={() => handleTabChange('PTS')}
                                className="btn-action px-4 py-1.5 rounded-md text-xs font-bold transition-all flex flex-col items-center gap-0.5 min-w-[80px]"
                                style={{
                                    background: jenisPenilaian === 'PTS'
                                        ? BRAND_GRADIENT
                                        : statusPTS === 'aktif'
                                            ? 'rgba(232,105,10,0.08)'
                                            : statusPTS === 'selesai'
                                                ? 'rgba(156,163,175,0.1)'
                                                : 'transparent',
                                    color: jenisPenilaian === 'PTS'
                                        ? '#fff'
                                        : statusPTS === 'aktif'
                                            ? ACCENT_DARK
                                            : statusPTS === 'selesai'
                                                ? '#6b7280'
                                                : '#9ca3af',
                                    cursor: statusPTS !== 'nonaktif' ? 'pointer' : 'not-allowed',
                                    opacity: statusPTS === 'nonaktif' ? 0.6 : 1
                                }}
                            >
                                <span>PTS</span>
                                <span className="text-[9px] font-normal">
                                    {statusPTS === 'aktif' ? '● Aktif' : statusPTS === 'selesai' ? '✓ Selesai' : 'Menunggu'}
                                </span>
                            </button>

                            {/* Tab PAS */}
                            <button
                                onClick={() => handleTabChange('PAS')}
                                className="btn-action px-4 py-1.5 rounded-md text-xs font-bold transition-all flex flex-col items-center gap-0.5 min-w-[80px]"
                                style={{
                                    background: jenisPenilaian === 'PAS'
                                        ? BRAND_GRADIENT
                                        : statusPAS === 'aktif'
                                            ? 'rgba(232,105,10,0.08)'
                                            : statusPAS === 'selesai'
                                                ? 'rgba(156,163,175,0.1)'
                                                : 'transparent',
                                    color: jenisPenilaian === 'PAS'
                                        ? '#fff'
                                        : statusPAS === 'aktif'
                                            ? ACCENT_DARK
                                            : statusPAS === 'selesai'
                                                ? '#6b7280'
                                                : '#9ca3af',
                                    cursor: statusPAS !== 'nonaktif' ? 'pointer' : 'not-allowed',
                                    opacity: statusPAS === 'nonaktif' ? 0.6 : 1
                                }}
                            >
                                <span>PAS</span>
                                <span className="text-[9px] font-normal">
                                    {statusPAS === 'aktif' ? '● Aktif' : statusPAS === 'selesai' ? '✓ Selesai' : 'Menunggu'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Box untuk PAS — Hanya jika PAS aktif */}
                {jenisPenilaian === 'PAS' && statusPAS === 'aktif' && (
                    <div className="mx-4 sm:mx-5 mt-4 p-4 rounded-xl flex items-start gap-3" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: ACCENT_DARK }} />
                        <div className="flex-1">
                            <p className="text-sm font-bold mb-1" style={{ color: '#7a3a0a' }}>
                                Input Total Absensi Semester
                            </p>
                            <p className="text-xs" style={{ color: ACCENT_DARK }}>
                                Untuk PAS, input total absensi selama 1 semester penuh.
                                Total harus lebih besar atau sama dengan data PTS yang sudah diinput sebelumnya.
                            </p>
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <div className="px-4 sm:px-5 py-3 sm:py-4 mt-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" style={{ color: ACCENT_DARK }} />
                            <span className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
                                Total: {filteredAbsensi.length} siswa
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Tombol Import Absensi */}
                            {!isReadOnly && (
                                <ActionButton variant="success" onClick={openImportModal}>
                                    <Upload size={15} /> Import Absensi
                                </ActionButton>
                            )}

                            {/* Search */}
                            <div className="relative min-w-[200px] sm:min-w-[250px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari nama atau NIS..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-2.5 flex items-center"
                                        style={{ color: ACCENT }}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table — CSS grid, konsisten dengan data_guru_client.tsx / kokurikuler_client.tsx */}
                <div className="overflow-x-auto scrollbar-thin">
                    <div style={{ width: '100%', minWidth: '820px' }}>
                        <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                            <div className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Nama Siswa</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NIS</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Sakit</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Izin</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Alpha</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Aksi</div>
                        </div>

                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0' }}>
                                    {Array.from({ length: 7 }).map((__, j) => (
                                        <div key={j} className="px-4 py-4 flex items-center justify-center">
                                            <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 1 ? '85%' : '55%' }} />
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : filteredAbsensi.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Users size={32} className="text-gray-300" />
                                    <p className="text-sm font-semibold text-gray-500">
                                        {searchQuery ? 'Siswa Tidak Ditemukan' : 'Belum Ada Data Siswa'}
                                    </p>
                                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                                        {searchQuery
                                            ? `Tidak ada siswa yang cocok dengan kata kunci "${searchQuery}".`
                                            : 'Belum ada siswa yang terdaftar di kelas Anda.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            filteredAbsensi.map((siswa, index) => {
                                const isEditing = editingRows.has(siswa.id_siswa);
                                const isSaving = savingRows.has(siswa.id_siswa);
                                const editedValues = editedData[siswa.id_siswa];

                                return (
                                    <div
                                        key={siswa.id_siswa}
                                        className="grid row-in row-hover border-b transition-colors"
                                        style={{
                                            gridTemplateColumns: GRID_COLS,
                                            borderColor: '#f0f0f0',
                                            background: '#fff',
                                            animationDelay: `${Math.min(index, 8) * 0.03}s`,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                    >
                                        <div className="px-4 py-4 flex items-center justify-center text-center text-gray-400">
                                            {index + 1}
                                        </div>

                                        <div className="px-4 py-4 flex items-center overflow-hidden">
                                            <div>
                                                <p className="font-bold text-gray-900 truncate" title={siswa.nama}>{siswa.nama}</p>
                                                {jenisPenilaian === 'PAS' && siswa.pts_sakit !== undefined && (
                                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                                        Baseline PTS: S:{siswa.pts_sakit} I:{siswa.pts_izin} A:{siswa.pts_alpha}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">
                                            {siswa.nis}
                                        </div>

                                        {/* Sakit */}
                                        <div className="px-4 py-4 flex items-center justify-center">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="90"
                                                    value={editedValues?.sakit ?? 0}
                                                    onChange={(e) => handleInputChange(siswa.id_siswa, 'sakit', e.target.value)}
                                                    className={inputCls}
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <AbsenBadge value={siswa.sakit} />
                                            )}
                                        </div>

                                        {/* Izin */}
                                        <div className="px-4 py-4 flex items-center justify-center">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="90"
                                                    value={editedValues?.izin ?? 0}
                                                    onChange={(e) => handleInputChange(siswa.id_siswa, 'izin', e.target.value)}
                                                    className={inputCls}
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <AbsenBadge value={siswa.izin} />
                                            )}
                                        </div>

                                        {/* Alpha */}
                                        <div className="px-4 py-4 flex items-center justify-center">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="90"
                                                    value={editedValues?.alpha ?? 0}
                                                    onChange={(e) => handleInputChange(siswa.id_siswa, 'alpha', e.target.value)}
                                                    className={inputCls}
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <AbsenBadge value={siswa.alpha} />
                                            )}
                                        </div>

                                        {/* Aksi */}
                                        <div className="px-4 py-4 flex items-center justify-center">
                                            {isEditing ? (
                                                <div className="flex justify-center gap-1.5">
                                                    <ActionButton size="sm" variant="success" disabled={isSaving} onClick={() => openConfirmModal(siswa.id_siswa)}>
                                                        {isSaving ? (
                                                            <div className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                                                        ) : (
                                                            <Check size={13} />
                                                        )}
                                                        Simpan
                                                    </ActionButton>
                                                    <ActionButton size="sm" variant="neutral" disabled={isSaving} onClick={() => handleCancelEdit(siswa.id_siswa)}>
                                                        <X size={13} /> Batal
                                                    </ActionButton>
                                                </div>
                                            ) : (
                                                <ActionButton size="sm" variant="warning" disabled={isReadOnly} onClick={() => handleEdit(siswa.id_siswa)}>
                                                    {isReadOnly ? (
                                                        <>
                                                            <Lock size={13} /> Terkunci
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Edit3 size={13} /> Edit
                                                        </>
                                                    )}
                                                </ActionButton>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="px-4 sm:px-5 py-4 flex items-start gap-2" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: ACCENT_DARK }} />
                    <div className="text-xs" style={{ color: ACCENT_DARK }}>
                        <p className="font-semibold mb-1">Petunjuk Pengisian:</p>
                        <ul className="space-y-0.5 list-disc list-inside">
                            <li>Klik tombol <strong>Edit</strong> pada baris siswa untuk menginput absensi</li>
                            <li>Isi jumlah hari sakit, izin, dan alpha (maksimal 90 hari)</li>
                            <li>Klik <strong>Simpan</strong> untuk menyimpan data</li>
                            {jenisPenilaian === 'PAS' && statusPAS === 'aktif' && (
                                <li className="font-semibold">Total absensi PAS harus ≥ data PTS yang sudah diinput</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal — identik dengan pola confirm modal data_guru_client.tsx / kokurikuler_client.tsx */}
            {showConfirmModal && confirmData && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={22} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Konfirmasi Penyimpanan</h3>
                        </div>

                        <p className="text-sm text-gray-500 mb-5">
                            Apakah Anda yakin ingin menyimpan data absensi ini?
                        </p>

                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmModal(false)}>
                                Batal
                            </ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={executeSave}>
                                Simpan
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Import Absensi — konsisten dengan Modal Import Nilai di kokurikuler_client.tsx */}
            {showImportModal && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget && !importing) setShowImportModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl w-full max-w-lg dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Upload size={16} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 leading-none mb-0.5">Data Massal</p>
                                    <h2 className="text-sm font-bold text-white leading-tight truncate">Import Absensi {jenisPenilaian}</h2>
                                    <p className="text-[10px] text-white/70 mt-0.5">Kelas {absensiData?.kelas} • Semester {semesterAktif}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { if (!importing) setShowImportModal(false); }}
                                disabled={importing}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15 flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.15)' }}
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-5 p-4 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                <p className="text-sm text-blue-900 font-semibold mb-2 flex items-center gap-2">
                                    <AlertCircle size={16} className="text-blue-600" />
                                    Langkah-langkah Import:
                                </p>
                                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                                    <li>Download template Excel (sudah berisi daftar siswa)</li>
                                    <li>Isi data absensi (Sakit, Izin, Alpha)</li>
                                    <li>Simpan file Excel</li>
                                    <li>Upload file Excel yang sudah diisi</li>
                                    <li>Klik "Import Absensi" untuk memproses</li>
                                </ol>
                            </div>

                            <div className="mb-5 p-3 rounded-xl flex items-start gap-2" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                                <AlertCircle size={16} style={{ color: ACCENT_DARK }} className="flex-shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1" style={{ color: '#7a3a0a' }}>
                                    <p><strong>Periode {jenisPenilaian} Aktif:</strong></p>
                                    {jenisPenilaian === 'PTS' ? (
                                        <>
                                            <p>- Yang diimport: Data absensi periode PTS</p>
                                            <p>- Format: Sakit, Izin, Alpha (0-90 hari)</p>
                                            <p className="mt-1"><strong>Tip:</strong> Data PAS akan diinput saat periode PAS aktif.</p>
                                        </>
                                    ) : (
                                        <>
                                            <p>- Yang diimport: Total absensi semester</p>
                                            <p>- Format: Sakit, Izin, Alpha (0-90 hari)</p>
                                            <p className="mt-1"><strong>Perhatian:</strong> Total harus ≥ data PTS yang sudah diinput.</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mb-5">
                                <ActionButton variant="warning" fullWidth disabled={downloadingTemplate} onClick={handleDownloadTemplate}>
                                    {downloadingTemplate ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                                            Mengunduh Template...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} /> Download Template Excel
                                        </>
                                    )}
                                </ActionButton>
                            </div>

                            <div className="mb-5">
                                <label className={labelCls} style={labelColor}>
                                    Upload File Excel <span className="text-red-500">*</span>
                                </label>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${importFile ? 'border-green-400 bg-green-50' : 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                                        }`}
                                    onClick={() => importFileInputRef.current?.click()}
                                >
                                    <input
                                        ref={importFileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleImportFileChange}
                                        className="hidden"
                                    />
                                    {importFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                                <CheckCircle2 size={24} className="text-green-600" />
                                            </div>
                                            <p className="text-sm font-bold text-green-900">{importFile.name}</p>
                                            <p className="text-xs text-green-700">
                                                {(importFile.size / 1024).toFixed(1)} KB - Klik untuk ganti file
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload size={32} className="text-orange-400" />
                                            <p className="text-sm font-bold text-orange-900">Klik untuk pilih file Excel</p>
                                            <p className="text-xs text-orange-700">Format: .xlsx atau .xls (Maks 10MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2.5">
                                <ActionButton
                                    variant="neutral"
                                    fullWidth
                                    disabled={importing}
                                    onClick={() => { setShowImportModal(false); setImportFile(null); }}
                                >
                                    Batal
                                </ActionButton>
                                <ActionButton variant="success" fullWidth disabled={!importFile || importing} onClick={executeImport}>
                                    {importing ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                                            Mengimport...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} /> Import Absensi
                                        </>
                                    )}
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}