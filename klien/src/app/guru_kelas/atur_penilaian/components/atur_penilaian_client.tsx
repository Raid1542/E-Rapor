/**
 * Nama File: atur_penilaian_client.tsx
 * Fungsi: Komponen klien untuk mengatur konfigurasi penilaian oleh guru kelas
 * UPDATE: ✅ Fix validasi range < 3 poin di frontend
 *         ✅ Fix pesan error spesifik dari backend agar mudah diperbaiki
 *         ✅ Redesign UI - Modern, Simple, Clean dengan tema Oranye
 *         ✅ 4 Tab: Kokurikuler, Akademik, Deskripsi Rata-rata, Bobot
 *         ✅ Batch Edit Modal dengan validasi real-time
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Pencil, X, Plus, Trash2, CheckCircle2, AlertCircle, WifiOff,
    ShieldAlert, LogOut, Lock, Layers, BookOpen, BarChart3, TrendingUp,
    AlertTriangle, Award, Calendar, Save, Info, Settings
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-kelas';
const ASPEK_MUTABAAH_ID = 5;

// ====== HELPER ======
const getJenisParam = (jenis: 'PTS' | 'PAS' | null): string => jenis ? `jenis=${jenis}` : '';

// ====== TYPES ======
type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
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

// ====== GLOBAL STYLES ======
const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes ap-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ap-scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes ap-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    .ap-fadeIn { animation: ap-fadeIn 0.3s ease-out; }
    .ap-scaleIn { animation: ap-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .ap-pulse { animation: ap-pulse 0.6s ease; }
    .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: #fdba74; border-radius: 10px; }
    .scrollbar-thin::-webkit-scrollbar-track { background: #fff7ed; }
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
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all">
                            Batal
                        </button>
                        <button onClick={() => { modal.onConfirm?.(); onClose(); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                            Ya, Lanjutkan
                        </button>
                    </div>
                ) : (
                    <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
                )}
            </div>
        </div>
    );
};

// ✅ PERBAIKAN: CoverageWarning support array gaps (string[])
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
        <div className="mb-4 p-4 rounded-xl flex items-start gap-3 ap-fadeIn" style={{ background: '#fff7ed', border: '1.5px solid #fdba74' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}>
                <AlertTriangle size={18} className="text-orange-700" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold mb-1" style={{ color: '#9a3412' }}>Range Nilai 0-100 Belum Lengkap</p>
                {gapsList.length === 1 ? (
                    <p className="text-xs" style={{ color: '#c2410c' }}>
                        Ada gap pada rentang <span className="px-2 py-0.5 rounded-md bg-orange-200 font-semibold">{gapsList[0]}</span>
                    </p>
                ) : (
                    <div className="text-xs" style={{ color: '#c2410c' }}>
                        <p className="mb-2">Ada <strong>{gapsList.length} gap</strong> yang belum dibuat:</p>
                        <ul className="space-y-1 ml-4 list-disc">
                            {gapsList.map((gap, i) => (
                                <li key={i}>
                                    Rentang <span className="px-1.5 py-0.5 rounded bg-orange-200 font-semibold">{gap}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

// ====== STYLE CONSTANTS ======
const PAGE_BG = { background: '#faf8f5' };
const CARD_STYLE = { border: '1px solid #fed7aa', boxShadow: '0 4px 20px rgba(234, 88, 12, 0.08)', background: '#ffffff' };
const HEADER_GRAD = { background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f97316 100%)' };
const inputCls = "w-full border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200";
const selectCls = "border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[200px]";

const btnPrimary = {
    base: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm hover:shadow-md active:scale-95",
    style: { background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)' } as React.CSSProperties,
};

const BtnBatal = ({ onClick, children = 'Batal', disabled }: { onClick: () => void; children?: React.ReactNode; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-700"
    >{children}</button>
);

const BtnEdit = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
            background: disabled ? '#f3f4f6' : '#fff7ed',
            border: disabled ? '1px solid #e5e7eb' : '1.5px solid #fb923c',
            color: disabled ? '#9ca3af' : '#c2410c'
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#ffedd5'; }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = '#fff7ed'; }}
    >{children}</button>
);

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
        if (tab !== 'akademik') { setSelectedMapelAkademik(null); setCoverageInfo(null); }
        if (tab !== 'bobot') { setSelectedMapelId(null); }
        if (tab !== 'deskripsi-rata-rata') { setDeskripsiRataRataList([]); setDeskripsiRataRataCoverage(null); }
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
        })).sort((a, b) => b.min_nilai - a.min_nilai);

        if (existing.length > 0) {
            setBatchAkademik(existing);
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

    const hasBatchAkademikChanges = (): boolean => {
        if (originalBatchAkademik.length === 0 && batchAkademik.length === 0) return false;
        if (originalBatchAkademik.length === 0) return true;
        if (batchAkademik.length !== originalBatchAkademik.length) return true;

        const originalMap = new Map(originalBatchAkademik.map(item => [item.id, item]));
        for (const currentItem of batchAkademik) {
            if (!currentItem.id) return true; // Item baru
            const originalItem = originalMap.get(currentItem.id);
            if (!originalItem) return true;
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

    const executeSaveBatchAkademik = async () => {
        setIsSavingBatchAkademik(true);
        try {
            const token = localStorage.getItem('token');
            const jenisParam = getJenisParam(jenisPenilaianAktif);
            const errors = [];

            // ✅ VALIDASI SEBELUM KIRIM
            const validation = validateBatchAkademik();
            if (!validation.valid) {
                showModal({
                    type: 'warning',
                    title: 'Validasi Gagal',
                    message: validation.errors.join('\n')
                });
                setIsSavingBatchAkademik(false);
                return;
            }

            // 1. DELETE items that were removed from the list
            const currentIds = new Set(batchAkademik.filter(item => item.id).map(item => item.id));
            const itemsToDelete = originalBatchAkademik.filter(item => item.id && !currentIds.has(item.id));

            for (const item of itemsToDelete) {
                const res = await fetch(`${API}/atur-penilaian/kategori-akademik/${item.id}?${jenisParam}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    errors.push({ id: item.id, error: errData.message || 'Gagal hapus' });
                }
            }

            // 2. UPDATE or INSERT remaining items
            const originalMap = new Map(originalBatchAkademik.map(item => [item.id, item]));
            for (const item of batchAkademik) {
                if (item.id) {
                    // Skip PUT if nothing changed compared to original
                    const orig = originalMap.get(item.id);
                    if (orig) {
                        const sameMin = Math.floor(orig.min_nilai) === Math.floor(item.min_nilai);
                        const sameMax = Math.floor(orig.max_nilai) === Math.floor(item.max_nilai);
                        const sameDesc = (orig.deskripsi || '').trim() === (item.deskripsi || '').trim();
                        if (sameMin && sameMax && sameDesc) {
                            continue; // no-op, avoid sending PUT that returns "Tidak ada perubahan data"
                        }
                    }

                    // UPDATE existing
                    const payload = {
                        min_nilai: Math.floor(item.min_nilai),
                        max_nilai: Math.floor(item.max_nilai),
                        deskripsi: item.deskripsi.trim(),
                        mapel_id: selectedMapelAkademik
                    };

                    const res = await fetch(`${API}/atur-penilaian/kategori-akademik/${item.id}?${jenisParam}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        // Treat explicit "Tidak ada perubahan data" as non-fatal (may happen if concurrent changes already applied)
                        if ((errData.message || '').includes('Tidak ada perubahan')) {
                            continue;
                        }
                        errors.push({
                            id: item.id,
                            error: errData.message || errData.error || `Gagal update (Status: ${res.status})`
                        });
                    }
                } else {
                    // INSERT new
                    const payload = {
                        min_nilai: Math.floor(item.min_nilai),
                        max_nilai: Math.floor(item.max_nilai),
                        deskripsi: item.deskripsi.trim(),
                        mapel_id: selectedMapelAkademik,
                        jenis: jenisPenilaianAktif
                    };

                    const res = await fetch(`${API}/atur-penilaian/kategori-akademik?${jenisParam}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        errors.push({
                            index: batchAkademik.indexOf(item),
                            error: errData.message || errData.error || `Gagal insert (Status: ${res.status})`
                        });
                    }
                }
            }

            if (errors.length > 0) {
                showModal({
                    type: 'error',
                    title: 'Gagal Menyimpan',
                    message: `${errors.length} operasi gagal:\n${errors.map(e => `• ${e.error}`).join('\n')}`
                });
                return;
            }

            // Success
            setShowConfirmModal(false);
            closeBatchEditAkademik();
            showModal({
                type: 'success',
                title: 'Berhasil Disimpan!',
                message: 'Kategori akademik berhasil diperbarui. Nilai rapor siswa akan dihitung ulang otomatis.'
            });

            // Refresh data
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
        } catch (err: any) {
            showModal({
                type: 'network',
                title: 'Koneksi Gagal',
                message: 'Gagal menyimpan: ' + err.message
            });
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
            setOriginalBatchDeskripsi([...existing]);
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

    const hasBatchDeskripsiChanges = (): boolean => {
        if (originalBatchDeskripsi.length === 0) return true;
        if (batchDeskripsi.length !== originalBatchDeskripsi.length) return true;

        const sc = [...batchDeskripsi].sort((a, b) => a.min_nilai - b.min_nilai);
        const so = [...originalBatchDeskripsi].sort((a, b) => a.min_nilai - b.min_nilai);
        for (let i = 0; i < sc.length; i++) {
            const currMin = parseFloat(sc[i].min_nilai.toFixed(2));
            const currMax = parseFloat(sc[i].max_nilai.toFixed(2));
            const origMin = parseFloat(so[i].min_nilai.toFixed(2));
            const origMax = parseFloat(so[i].max_nilai.toFixed(2));
            if (currMin !== origMin) return true;
            if (currMax !== origMax) return true;
            if (sc[i].deskripsi.trim() !== so[i].deskripsi.trim()) return true;
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
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-4" />
                    <p className="text-sm font-medium" style={{ color: '#c2410c' }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    if (isNotAssigned) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 ap-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 ap-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">Anda belum ditugaskan sebagai guru kelas di semester ini.</p>
                        </div>
                        <button onClick={handleLogout} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
                            <LogOut size={18} className="inline mr-2" /> Logout
                        </button>
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
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Header */}
            <div className="mb-6 ap-fadeIn">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
                        <Settings size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Atur Penilaian</h1>
                        <p className="text-sm" style={{ color: '#c2410c' }}>Kelola kategori dan bobot penilaian kelas Anda</p>
                    </div>
                </div>
            </div>

            {/* Read Only Banner */}
            {isReadOnly && (
                <div className="mb-5 p-4 rounded-xl flex items-start gap-3 ap-fadeIn"
                    style={{ background: readOnlyReason === 'locked' ? '#fef2f2' : '#fff7ed', border: `1.5px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fdba74'}` }}>
                    <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${readOnlyReason === 'locked' ? 'text-red-600' : 'text-orange-600'}`} />
                    <div className="flex-1">
                        <p className={`text-sm font-bold mb-1 ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-orange-900'}`}>
                            Mode Baca Saja (Read Only)
                        </p>
                        <p className={`text-xs ${readOnlyReason === 'locked' ? 'text-red-800' : 'text-orange-800'}`}>
                            {readOnlyReason === 'locked'
                                ? 'Periode penilaian telah selesai dan data sudah dikunci.'
                                : 'Periode penilaian belum aktif. Silakan hubungi admin.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Active Period Banner */}
            {jenisPenilaianAktif && (
                <div className="mb-5 p-4 rounded-xl flex items-center gap-3 ap-fadeIn"
                    style={{
                        background: jenisPenilaianAktif === 'PTS' ? 'linear-gradient(135deg, #fff7ed, #ffedd5)' : 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                        border: `1.5px solid ${jenisPenilaianAktif === 'PTS' ? '#fdba74' : '#86efac'}`
                    }}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${jenisPenilaianAktif === 'PTS' ? 'bg-orange-200' : 'bg-green-200'}`}>
                        {jenisPenilaianAktif === 'PTS' ? <Award className="w-5 h-5 text-orange-700" /> : <CheckCircle2 className="w-5 h-5 text-green-700" />}
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-bold ${jenisPenilaianAktif === 'PTS' ? 'text-orange-900' : 'text-green-900'}`}>
                            📋 Mode Konfigurasi: {jenisPenilaianAktif === 'PTS' ? 'PTS (Penilaian Tengah Semester)' : 'PAS (Penilaian Akhir Semester)'}
                        </p>
                        <p className={`text-xs mt-0.5 ${jenisPenilaianAktif === 'PTS' ? 'text-orange-700' : 'text-green-700'}`}>
                            {jenisPenilaianAktif === 'PTS' ? 'Anda sedang mengatur konfigurasi untuk PTS' : 'Anda sedang mengatur konfigurasi untuk PAS'}
                        </p>
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div className="bg-white rounded-2xl overflow-hidden ap-fadeIn" style={CARD_STYLE}>
                {/* Tabs */}
                <div className="px-5 py-3 border-b" style={{ borderColor: '#fed7aa', background: 'linear-gradient(to right, #fff7ed, #ffffff)' }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                            { id: 'kokurikuler', label: 'Kokurikuler', icon: Layers },
                            { id: 'akademik', label: 'Akademik', icon: BookOpen },
                            { id: 'deskripsi-rata-rata', label: 'Deskripsi', icon: BarChart3, disabled: !canEditDeskripsiRataRata() },
                            { id: 'bobot', label: 'Bobot', icon: TrendingUp },
                        ].map((tab) => (
                            <button key={tab.id}
                                onClick={() => !tab.disabled && handleTabChange(tab.id as typeof activeTab)}
                                disabled={tab.disabled}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                                    ? 'text-white shadow-md'
                                    : tab.disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 border-2 border-orange-200'
                                    }`}
                                style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #ea580c, #f97316)' } : {}}
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
                <div className="p-6">
                    {/* KOKURIKULER TAB */}
                    {activeTab === 'kokurikuler' && (
                        <div>
                            <CoverageWarning coverage={coverageInfo} />
                            {kategoriLoading ? (
                                <div className="py-16 text-center">
                                    <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">Memuat data...</p>
                                </div>
                            ) : groupedKokurikuler.length === 0 ? (
                                <div className="py-16 text-center rounded-2xl" style={{ background: '#fff7ed', border: '2px dashed #fdba74' }}>
                                    <Layers size={56} className="mx-auto mb-4" style={{ color: '#fdba74' }} />
                                    <p className="text-base font-bold" style={{ color: '#c2410c' }}>Belum ada kategori kokurikuler</p>
                                    <p className="text-sm text-gray-500 mt-2">Klik tombol "Edit" pada aspek untuk mulai menambahkan grade</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {groupedKokurikuler.map(({ aspek, grades }) => {
                                        const isEditable = canEditAspekKokurikuler(aspek.id_aspek_kokurikuler);
                                        const lockReason = getAspekKokurikulerLockReason(aspek.id_aspek_kokurikuler);

                                        return (
                                            <div key={aspek.id_aspek_kokurikuler} className="rounded-xl overflow-hidden transition-all"
                                                style={{ border: `1.5px solid ${isEditable ? '#fed7aa' : '#e5e7eb'}`, opacity: isEditable ? 1 : 0.75 }}>
                                                <div className="px-5 py-3 flex items-center justify-between gap-3"
                                                    style={{ background: isEditable ? '#fff7ed' : '#f9fafb', borderBottom: `1.5px solid ${isEditable ? '#fed7aa' : '#e5e7eb'}` }}>
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                                            style={{ background: isEditable ? '#fed7aa' : '#e5e7eb' }}>
                                                            <Layers size={16} style={{ color: isEditable ? '#c2410c' : '#6b7280' }} />
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
                                                            <p className="text-xs" style={{ color: '#a89a8c' }}>{grades.length} grade</p>
                                                        </div>
                                                    </div>
                                                    <BtnEdit onClick={() => openBatchEdit(aspek.id_aspek_kokurikuler)} disabled={!isEditable}>
                                                        {isEditable ? (<><Pencil size={12} />Edit Semua</>) : (<><Lock size={12} />Terkunci</>)}
                                                    </BtnEdit>
                                                </div>
                                                {grades.length > 0 ? (
                                                    <div className="overflow-x-auto scrollbar-thin">
                                                        <table className="w-full text-sm">
                                                            <thead style={{ background: '#fff7ed' }}>
                                                                <tr>
                                                                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Grade</th>
                                                                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Range Nilai</th>
                                                                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Deskripsi</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-orange-100">
                                                                {grades.map((g) => (
                                                                    <tr key={g.id} className="transition-colors hover:bg-orange-50/50">
                                                                        <td className="px-5 py-3">
                                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold"
                                                                                style={{ background: '#fff7ed', color: '#c2410c', border: '1.5px solid #fdba74' }}>
                                                                                {(g as KategoriKokurikuler).grade}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-5 py-3 text-gray-700 font-medium">
                                                                            {Math.floor(g.min_nilai)} – {Math.floor(g.max_nilai)}
                                                                        </td>
                                                                        <td className="px-5 py-3 text-gray-600">{g.deskripsi}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
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
                                <label className="block text-sm font-bold mb-2" style={{ color: '#7a3a0a' }}>Mata Pelajaran</label>
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
                                            <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-3" />
                                            <p className="text-sm text-gray-500">Memuat data...</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${canEditAkademik() ? '#fed7aa' : '#e5e7eb'}`, opacity: canEditAkademik() ? 1 : 0.75 }}>
                                            <div className="px-5 py-3 flex items-center justify-between gap-3"
                                                style={{ background: canEditAkademik() ? '#fff7ed' : '#f9fafb', borderBottom: `1.5px solid ${canEditAkademik() ? '#fed7aa' : '#e5e7eb'}` }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                        style={{ background: canEditAkademik() ? '#fed7aa' : '#e5e7eb' }}>
                                                        <BookOpen size={16} style={{ color: canEditAkademik() ? '#c2410c' : '#6b7280' }} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold" style={{ color: canEditAkademik() ? '#7a3a0a' : '#6b7280' }}>Kategori Akademik</h3>
                                                        <p className="text-xs" style={{ color: '#a89a8c' }}>{kategoriList.length} kategori</p>
                                                    </div>
                                                </div>
                                                <BtnEdit onClick={openBatchEditAkademik} disabled={!canEditAkademik()}>
                                                    {canEditAkademik() ? (<><Pencil size={12} />Edit Semua</>) : (<><Lock size={12} />Terkunci</>)}
                                                </BtnEdit>
                                            </div>
                                            {(kategoriList as KategoriAkademik[]).length > 0 ? (
                                                <div className="overflow-x-auto scrollbar-thin">
                                                    <table className="w-full text-sm">
                                                        <thead style={{ background: '#fff7ed' }}>
                                                            <tr>
                                                                <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16">No</th>
                                                                <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Range Nilai</th>
                                                                <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Deskripsi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-orange-100">
                                                            {(kategoriList as KategoriAkademik[]).sort((a, b) => b.min_nilai - a.min_nilai).map((k, idx) => (
                                                                <tr key={k.id} className="transition-colors hover:bg-orange-50/50">
                                                                    <td className="px-5 py-3 text-gray-500 font-medium">{idx + 1}</td>
                                                                    <td className="px-5 py-3">
                                                                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold"
                                                                            style={{ background: '#fff7ed', color: '#c2410c', border: '1.5px solid #fdba74' }}>
                                                                            {Math.floor(k.min_nilai)} – {Math.floor(k.max_nilai)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-5 py-3 text-gray-700">{k.deskripsi}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="px-5 py-8 text-center text-sm text-gray-400">Belum ada kategori untuk mata pelajaran ini</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-16 text-center rounded-2xl" style={{ background: '#fff7ed', border: '2px dashed #fdba74' }}>
                                    <BookOpen size={56} className="mx-auto mb-4" style={{ color: '#fdba74' }} />
                                    <p className="text-base font-bold" style={{ color: '#c2410c' }}>Pilih Mata Pelajaran Terlebih Dahulu</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DESKRIPSI RATA-RATA TAB */}
                    {activeTab === 'deskripsi-rata-rata' && (
                        <div>
                            {!canEditDeskripsiRataRata() && (
                                <div className="mb-5 p-4 rounded-xl" style={{ background: '#fef2f2', border: '1.5px solid #fca5a5' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lock size={16} className="text-red-600" />
                                        <p className="text-sm font-bold text-red-900">Deskripsi Rata-rata Terkunci</p>
                                    </div>
                                    <p className="text-xs text-red-700 ml-6">{getDeskripsiRataRataLockReason()}</p>
                                </div>
                            )}

                            {canEditDeskripsiRataRata() && (
                                <div className="mb-5 p-4 rounded-xl flex items-center gap-3" style={{ background: '#fff7ed', border: '1.5px solid #fdba74' }}>
                                    <Calendar size={18} className="text-orange-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-orange-900">Periode PTS Sedang Aktif</p>
                                        <p className="text-xs text-orange-700">Deskripsi rata-rata digunakan untuk rapor PTS</p>
                                    </div>
                                </div>
                            )}

                            <CoverageWarning coverage={deskripsiRataRataCoverage} />

                            {deskripsiRataRataLoading ? (
                                <div className="py-16 text-center">
                                    <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">Memuat data...</p>
                                </div>
                            ) : (
                                <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${canEditDeskripsiRataRata() ? '#fed7aa' : '#e5e7eb'}`, opacity: canEditDeskripsiRataRata() ? 1 : 0.75 }}>
                                    <div className="px-5 py-3 flex items-center justify-between gap-3"
                                        style={{ background: canEditDeskripsiRataRata() ? '#fff7ed' : '#f9fafb', borderBottom: `1.5px solid ${canEditDeskripsiRataRata() ? '#fed7aa' : '#e5e7eb'}` }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                style={{ background: canEditDeskripsiRataRata() ? '#fed7aa' : '#e5e7eb' }}>
                                                <BarChart3 size={16} style={{ color: canEditDeskripsiRataRata() ? '#c2410c' : '#6b7280' }} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold" style={{ color: canEditDeskripsiRataRata() ? '#7a3a0a' : '#6b7280' }}>Deskripsi Rata-rata Nilai</h3>
                                                <p className="text-xs" style={{ color: '#a89a8c' }}>{deskripsiRataRataList.length} kategori</p>
                                            </div>
                                        </div>
                                        <BtnEdit onClick={openBatchEditDeskripsi} disabled={!canEditDeskripsiRataRata()}>
                                            {canEditDeskripsiRataRata() ? (<><Pencil size={12} />Edit Semua</>) : (<><Lock size={12} />Terkunci</>)}
                                        </BtnEdit>
                                    </div>
                                    {deskripsiRataRataList.length > 0 ? (
                                        <div className="overflow-x-auto scrollbar-thin">
                                            <table className="w-full text-sm">
                                                <thead style={{ background: '#fff7ed' }}>
                                                    <tr>
                                                        <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16">No</th>
                                                        <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Range Nilai</th>
                                                        <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Deskripsi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-orange-100">
                                                    {[...deskripsiRataRataList].sort((a, b) => b.min_nilai - a.min_nilai).map((k, idx) => (
                                                        <tr key={k.id} className="transition-colors hover:bg-orange-50/50">
                                                            <td className="px-5 py-3 text-gray-500 font-medium">{idx + 1}</td>
                                                            <td className="px-5 py-3">
                                                                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold"
                                                                    style={{ background: '#fff7ed', color: '#c2410c', border: '1.5px solid #fdba74' }}>
                                                                    {parseFloat(k.min_nilai).toFixed(2)} – {parseFloat(k.max_nilai).toFixed(2)}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3 text-gray-700">{k.deskripsi}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
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
                                <div className="mb-5 p-4 rounded-xl flex items-start gap-3" style={{ background: '#fff7ed', border: '1.5px solid #fdba74' }}>
                                    <Info size={18} className="text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-orange-900 mb-1">Periode PTS Sedang Aktif</p>
                                        <p className="text-xs text-orange-800">Sistem otomatis menetapkan <strong>PTS = 100%</strong>. Anda tidak perlu mengatur bobot manual.</p>
                                    </div>
                                </div>
                            )}

                            {!isPTSActive && !isReadOnly && selectedMapelId && (
                                <div className="mb-5 p-4 rounded-xl flex items-start gap-3" style={{ background: '#eff6ff', border: '1.5px solid #93c5fd' }}>
                                    <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-blue-900 mb-1">Info Bobot</p>
                                        <p className="text-xs text-blue-800">
                                            Bobot <strong>0% diizinkan</strong> untuk komponen yang tidak digunakan (misal: UH3 jika mapel hanya punya UH1, UH2, UH4, UH5).
                                            <br />
                                            Total bobot harus tetap <strong>100%</strong> dan minimal ada <strong>1 komponen dengan bobot &gt; 0%</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mb-5 max-w-md">
                                <label className="block text-sm font-bold mb-2" style={{ color: '#7a3a0a' }}>Mata Pelajaran</label>
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
                                        <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-3" />
                                        <p className="text-sm text-gray-500">Memuat bobot...</p>
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
                                                        background: isPTSActive && isPTS ? '#fff7ed' : isEditable ? '#ffffff' : '#f9fafb',
                                                        border: `1.5px solid ${isPTSActive && isPTS ? '#fdba74' : isEditable ? '#fed7aa' : '#e5e7eb'}`
                                                    }}>
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                            style={{ background: isPTSActive && isPTS ? '#fed7aa' : '#fff7ed' }}>
                                                            <TrendingUp size={16} style={{ color: '#c2410c' }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm" style={{ color: '#7a3a0a' }}>{komponen?.nama_komponen || 'Komponen'}</p>
                                                            <p className="text-xs" style={{ color: '#a89a8c' }}>Komponen Penilaian</p>
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
                                                                ? 'bg-white border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                                                                : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                                                                }`}
                                                            readOnly={!isEditable} placeholder="0"
                                                        />
                                                        <span className="text-base font-bold" style={{ color: '#c2410c' }}>%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Total Bobot */}
                                        <div className="p-5 rounded-xl mt-4" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1.5px solid #fdba74' }}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fed7aa' }}>
                                                        <TrendingUp size={16} className="text-orange-700" />
                                                    </div>
                                                    <span className="font-bold text-sm" style={{ color: '#7a3a0a' }}>Total Bobot</span>
                                                </div>
                                                <span className={`text-2xl font-bold ${isBobotValid ? 'text-green-600' : 'text-red-600'}`}>
                                                    {totalBobot.toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="mt-3 h-2 rounded-full overflow-hidden bg-white/50">
                                                <div className="h-full rounded-full transition-all" style={{
                                                    width: `${Math.min(totalBobot, 100)}%`,
                                                    background: isBobotValid ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #dc2626, #ef4444)'
                                                }} />
                                            </div>
                                            <p className="text-xs mt-2" style={{ color: '#c2410c' }}>
                                                {isBobotValid ? '✓ Bobot sudah tepat 100%' : `Total harus tepat 100% (saat ini ${totalBobot.toFixed(2)}%)`}
                                            </p>
                                        </div>

                                        {/* Save Button */}
                                        {!isPTSActive && !isReadOnly && (
                                            <div className="flex justify-end pt-4 mt-4" style={{ borderTop: '1.5px solid #fed7aa' }}>
                                                <button onClick={openConfirmSaveBobot} disabled={isSavingBobot || !isBobotValid}
                                                    className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                                                    style={btnPrimary.style}>
                                                    {isSavingBobot ? (
                                                        <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>
                                                    ) : (
                                                        <><Save size={16} />Simpan Bobot</>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="py-16 text-center rounded-2xl" style={{ background: '#fff7ed', border: '2px dashed #fdba74' }}>
                                    <TrendingUp size={56} className="mx-auto mb-4" style={{ color: '#fdba74' }} />
                                    <p className="text-base font-bold" style={{ color: '#c2410c' }}>Pilih Mata Pelajaran Terlebih Dahulu</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL BATCH EDIT KOKURIKULER */}
            {showBatchEdit && (
                <div className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${batchEditClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => { if (e.target === e.currentTarget) closeBatchEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-3">
                                <Layers size={20} className="text-white" />
                                <h2 className="text-base font-bold text-white">Edit Grade Aspek Kokurikuler</h2>
                            </div>
                            <button onClick={closeBatchEdit} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
                            <div className="p-6 space-y-4">
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#fff7ed', border: '1.5px solid #fdba74' }}>
                                    <Info size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs" style={{ color: '#7a3a0a' }}><strong>💡 Tips:</strong> Isi semua grade sekaligus untuk aspek ini. Sistem akan menyimpan semua grade dalam 1 aksi.</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Grade ({batchGrades.length})</h3>
                                        <button onClick={addBatchGradeRow}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            style={{ background: '#fff7ed', border: '1.5px solid #fb923c', color: '#c2410c' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#ffedd5')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#fff7ed')}>
                                            <Plus size={14} /> Tambah Baris
                                        </button>
                                    </div>
                                    {batchGrades.map((grade, index) => (
                                        <div key={index} className="p-4 rounded-xl" style={{ background: '#fffaf6', border: '1.5px solid #fed7aa' }}>
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Grade <span className="text-red-500">*</span></label>
                                                        <input type="text" value={grade.grade || ''}
                                                            onChange={(e) => updateBatchGrade(index, 'grade', e.target.value.toUpperCase().slice(0, 1))}
                                                            className={inputCls} maxLength={1} placeholder="A" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Min <span className="text-red-500">*</span></label>
                                                        <input type="number" min="0" max="100" value={grade.min_nilai}
                                                            onChange={(e) => updateBatchGrade(index, 'min_nilai', parseInt(e.target.value) || 0)}
                                                            className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Max <span className="text-red-500">*</span></label>
                                                        <input type="number" min="0" max="100" value={grade.max_nilai}
                                                            onChange={(e) => updateBatchGrade(index, 'max_nilai', parseInt(e.target.value) || 0)}
                                                            className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Deskripsi <span className="text-red-500">*</span></label>
                                                        <input type="text" value={grade.deskripsi}
                                                            onChange={(e) => updateBatchGrade(index, 'deskripsi', e.target.value)}
                                                            className={inputCls} placeholder="Sangat Baik" />
                                                    </div>
                                                </div>
                                                {batchGrades.length > 1 && (
                                                    <button onClick={() => removeBatchGradeRow(index)}
                                                        className="mt-7 p-2 rounded-lg transition-all"
                                                        style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            {(() => {
                                                const errors: string[] = [];
                                                if (!grade.grade) errors.push('Grade kosong');
                                                if (grade.grade && grade.grade.length !== 1) errors.push('Grade harus 1 karakter');
                                                if (isNaN(grade.min_nilai) || isNaN(grade.max_nilai)) errors.push('Nilai tidak valid');
                                                else if (grade.min_nilai >= grade.max_nilai) errors.push(`Min (${grade.min_nilai}) >= Max (${grade.max_nilai})`);
                                                if (!grade.deskripsi || grade.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');
                                                if (errors.length > 0) {
                                                    return (
                                                        <div className="mt-3 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                                                            <AlertCircle size={12} /> {errors.join(' | ')}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    ))}
                                </div>
                                {(() => {
                                    const validation = validateBatchGrades();
                                    return (
                                        <div className="p-3 rounded-xl flex items-center gap-2" style={{
                                            background: validation.valid ? '#f0fdf4' : '#fff7ed',
                                            border: `1.5px solid ${validation.valid ? '#86efac' : '#fdba74'}`,
                                            color: validation.valid ? '#166534' : '#7a3a0a'
                                        }}>
                                            {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            <strong>Status:</strong> {validation.valid ? 'Semua grade valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1.5px solid #fed7aa', background: '#fffaf6' }}>
                            <BtnBatal onClick={closeBatchEdit} disabled={isSavingBatch}>Batal</BtnBatal>
                            <button onClick={openConfirmSaveBatch} disabled={isSavingBatch}
                                className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'} style={btnPrimary.style}>
                                {isSavingBatch ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>) : (<><Save size={16} />Simpan {batchGrades.length} Grade</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL BATCH EDIT AKADEMIK */}
            {showBatchEditAkademik && (
                <div className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${batchEditAkademikClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => { if (e.target === e.currentTarget) closeBatchEditAkademik(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditAkademikClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-3">
                                <BookOpen size={20} className="text-white" />
                                <h2 className="text-base font-bold text-white">Edit Kategori Akademik</h2>
                            </div>
                            <button onClick={closeBatchEditAkademik} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
                            <div className="p-6 space-y-4">
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#fff7ed', border: '1.5px solid #fdba74' }}>
                                    <Info size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs" style={{ color: '#7a3a0a' }}><strong>💡 Tips:</strong> Isi semua kategori sekaligus. Sistem akan menyimpan semua kategori dalam 1 aksi.</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Kategori ({batchAkademik.length})</h3>
                                        <button onClick={addBatchAkademikRow}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            style={{ background: '#fff7ed', border: '1.5px solid #fb923c', color: '#c2410c' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#ffedd5')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#fff7ed')}>
                                            <Plus size={14} /> Tambah Baris
                                        </button>
                                    </div>
                                    {batchAkademik.map((kategori, index) => (
                                        <div key={index} className="p-4 rounded-xl" style={{ background: '#fffaf6', border: '1.5px solid #fed7aa' }}>
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Min <span className="text-red-500">*</span></label>
                                                        <input type="number" min="0" max="100" value={kategori.min_nilai}
                                                            onChange={(e) => updateBatchAkademik(index, 'min_nilai', parseInt(e.target.value) || 0)}
                                                            className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Max <span className="text-red-500">*</span></label>
                                                        <input type="number" min="0" max="100" value={kategori.max_nilai}
                                                            onChange={(e) => updateBatchAkademik(index, 'max_nilai', parseInt(e.target.value) || 0)}
                                                            className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Deskripsi <span className="text-red-500">*</span></label>
                                                        <input type="text" value={kategori.deskripsi}
                                                            onChange={(e) => updateBatchAkademik(index, 'deskripsi', e.target.value)}
                                                            className={inputCls} placeholder="Sangat Baik" />
                                                    </div>
                                                </div>
                                                {batchAkademik.length > 1 && (
                                                    <button onClick={() => removeBatchAkademikRow(index)}
                                                        className="mt-7 p-2 rounded-lg transition-all"
                                                        style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            {(() => {
                                                const errors: string[] = [];
                                                if (isNaN(kategori.min_nilai) || isNaN(kategori.max_nilai)) errors.push('Nilai tidak valid');
                                                else if (kategori.min_nilai >= kategori.max_nilai) errors.push(`Min (${kategori.min_nilai}) >= Max (${kategori.max_nilai})`);
                                                if (!kategori.deskripsi || kategori.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');
                                                if (errors.length > 0) {
                                                    return (
                                                        <div className="mt-3 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                                                            <AlertCircle size={12} /> {errors.join(' | ')}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    ))}
                                </div>
                                {(() => {
                                    const validation = validateBatchAkademik();
                                    return (
                                        <div className="p-3 rounded-xl flex items-center gap-2" style={{
                                            background: validation.valid ? '#f0fdf4' : '#fff7ed',
                                            border: `1.5px solid ${validation.valid ? '#86efac' : '#fdba74'}`,
                                            color: validation.valid ? '#166534' : '#7a3a0a'
                                        }}>
                                            {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            <strong>Status:</strong> {validation.valid ? 'Semua kategori valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1.5px solid #fed7aa', background: '#fffaf6' }}>
                            <BtnBatal onClick={closeBatchEditAkademik} disabled={isSavingBatchAkademik}>Batal</BtnBatal>
                            <button onClick={openConfirmSaveBatchAkademik} disabled={isSavingBatchAkademik}
                                className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'} style={btnPrimary.style}>
                                {isSavingBatchAkademik ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>) : (<><Save size={16} />Simpan {batchAkademik.length} Kategori</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL BATCH EDIT DESKRIPSI RATA-RATA */}
            {showBatchEditDeskripsi && (
                <div className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${batchEditDeskripsiClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => { if (e.target === e.currentTarget) closeBatchEditDeskripsi(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditDeskripsiClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-3">
                                <BarChart3 size={20} className="text-white" />
                                <h2 className="text-base font-bold text-white">Edit Deskripsi Rata-rata</h2>
                            </div>
                            <button onClick={closeBatchEditDeskripsi} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
                            <div className="p-6 space-y-4">
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#fff7ed', border: '1.5px solid #fdba74' }}>
                                    <Info size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs" style={{ color: '#7a3a0a' }}><strong>💡 Tips:</strong> Nilai menggunakan desimal (2 digit). Contoh: 85.50</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Kategori ({batchDeskripsi.length})</h3>
                                        <button onClick={addBatchDeskripsiRow}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            style={{ background: '#fff7ed', border: '1.5px solid #fb923c', color: '#c2410c' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#ffedd5')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#fff7ed')}>
                                            <Plus size={14} /> Tambah Baris
                                        </button>
                                    </div>
                                    {batchDeskripsi.map((kategori, index) => (
                                        <div key={index} className="p-4 rounded-xl" style={{ background: '#fffaf6', border: '1.5px solid #fed7aa' }}>
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Min <span className="text-red-500">*</span></label>
                                                        <input type="number" min="0" max="100" step="0.01" value={kategori.min_nilai}
                                                            onChange={(e) => updateBatchDeskripsi(index, 'min_nilai', parseFloat(e.target.value) || 0)}
                                                            className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Max <span className="text-red-500">*</span></label>
                                                        <input type="number" min="0" max="100" step="0.01" value={kategori.max_nilai}
                                                            onChange={(e) => updateBatchDeskripsi(index, 'max_nilai', parseFloat(e.target.value) || 0)}
                                                            className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold mb-1.5" style={{ color: '#7a3a0a' }}>Deskripsi <span className="text-red-500">*</span></label>
                                                        <input type="text" value={kategori.deskripsi}
                                                            onChange={(e) => updateBatchDeskripsi(index, 'deskripsi', e.target.value)}
                                                            className={inputCls} placeholder="Sangat Baik" />
                                                    </div>
                                                </div>
                                                {batchDeskripsi.length > 1 && (
                                                    <button onClick={() => removeBatchDeskripsiRow(index)}
                                                        className="mt-7 p-2 rounded-lg transition-all"
                                                        style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            {(() => {
                                                const errors: string[] = [];
                                                if (isNaN(kategori.min_nilai) || isNaN(kategori.max_nilai)) errors.push('Nilai tidak valid');
                                                else if (kategori.min_nilai >= kategori.max_nilai) errors.push(`Min (${kategori.min_nilai}) >= Max (${kategori.max_nilai})`);
                                                if (!kategori.deskripsi || kategori.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');
                                                if (errors.length > 0) {
                                                    return (
                                                        <div className="mt-3 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                                                            <AlertCircle size={12} /> {errors.join(' | ')}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    ))}
                                </div>
                                {(() => {
                                    const validation = validateBatchDeskripsi();
                                    return (
                                        <div className="p-3 rounded-xl flex items-center gap-2" style={{
                                            background: validation.valid ? '#f0fdf4' : '#fff7ed',
                                            border: `1.5px solid ${validation.valid ? '#86efac' : '#fdba74'}`,
                                            color: validation.valid ? '#166534' : '#7a3a0a'
                                        }}>
                                            {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            <strong>Status:</strong> {validation.valid ? 'Semua kategori valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1.5px solid #fed7aa', background: '#fffaf6' }}>
                            <BtnBatal onClick={closeBatchEditDeskripsi} disabled={isSavingBatchDeskripsi}>Batal</BtnBatal>
                            <button onClick={openConfirmSaveBatchDeskripsi} disabled={isSavingBatchDeskripsi}
                                className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'} style={btnPrimary.style}>
                                {isSavingBatchDeskripsi ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>) : (<><Save size={16} />Simpan {batchDeskripsi.length} Kategori</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 ap-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 ap-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fff7ed' }}>
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
                        <div className="flex gap-3">
                            <BtnBatal onClick={() => setShowConfirmModal(false)}>Batal</BtnBatal>
                            <button onClick={() => {
                                setShowConfirmModal(false);
                                if (confirmAction === 'save-bobot') executeSaveBobot();
                                else if (confirmAction === 'save-batch') executeSaveBatch();
                                else if (confirmAction === 'save-batch-akademik') executeSaveBatchAkademik();
                                else if (confirmAction === 'save-batch-deskripsi') executeSaveBatchDeskripsi();
                            }}
                                disabled={isSavingBobot || isSavingBatch || isSavingBatchAkademik || isSavingBatchDeskripsi}
                                className={btnPrimary.base + ' flex-1 disabled:opacity-50 disabled:cursor-not-allowed'} style={btnPrimary.style}>
                                {(isSavingBobot || isSavingBatch || isSavingBatchAkademik || isSavingBatchDeskripsi) ? (
                                    <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block mr-2" />Menyimpan...</>
                                ) : (
                                    <>Ya, Simpan</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}