'use client';
import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import {
    Pencil, Eye, X, Search, CheckCircle2, AlertCircle,
    WifiOff, ShieldAlert, LogOut, Lock, BookOpen,
    Users, GraduationCap,
    Upload, Download
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
        status: {
            aktif: { bg: '#dcfce7', text: '#166534', border: '#86efac', dot: '#22c55e' },
            selesai: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
            nonaktif: { bg: '#f3f0ed', text: '#766b62', border: '#e2d9d0', dot: '#a89a8c' },
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

interface KomponenPenilaian {
    id_komponen: number;
    nama_komponen: string;
    urutan: number;
}

interface SiswaNilai {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    nilai_rapor_pts: number;
    deskripsi_pts: string;
    nilai_rapor_pas: number;
    deskripsi_pas: string;
    nilai: Record<number, number | null>;
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
        .animate-fade-in-up {
            animation: fadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
        .delay-1 { animation-delay: 0.06s; }
        .delay-2 { animation-delay: 0.12s; }
        .scale-in { animation: scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .fade-in { animation: fadeInUp 0.2s ease; }
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
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring}`}>{s.icon}</div>
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

// ====== PERIOD NOT ACTIVE MODAL ======
const PeriodNotActiveModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 fade-in">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 scale-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 ring-4 ring-orange-100">
                        <AlertCircle size={24} className="text-orange-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">⏳ Periode Penilaian Belum Aktif</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Baik <strong>PTS</strong> maupun <strong>PAS</strong> belum dibuka oleh admin. Anda dapat melihat data siswa sebagai persiapan.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
                    <p className="text-xs text-orange-800">
                        <strong>💡 Tip:</strong> Silakan hubungi admin untuk membuka periode penilaian agar dapat menginput nilai.
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
                    style={{ background: THEME.gradients.secondary, boxShadow: THEME.shadows.md }}
                >
                    Ok
                </button>
            </div>
        </div>
    );
};

// ====== MAIN COMPONENT ======
export default function InputNilaiGBSClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
    const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [loading, setLoading] = useState(true);
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    const [showPeriodNotActiveModal, setShowPeriodNotActiveModal] = useState(false);
    const [hasShownPeriodModal, setHasShownPeriodModal] = useState(false);

    const [bobotSudahDiatur, setBobotSudahDiatur] = useState<boolean>(true);
    const [showBobotWarning, setShowBobotWarning] = useState(false);

    const [mapelList, setMapelList] = useState<MapelItem[]>([]);
    const [kelasList, setKelasList] = useState<KelasItem[]>([]);
    const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);

    const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
    const [selectedKelasId, setSelectedKelasId] = useState<number | null>(null);
    const [currentMapel, setCurrentMapel] = useState<MapelItem | null>(null);
    const [currentKelas, setCurrentKelas] = useState<KelasItem | null>(null);

    const [kelasFiltered, setKelasFiltered] = useState<KelasItem[]>([]);
    const [kelasLoading, setKelasLoading] = useState(false);

    const [siswaList, setSiswaList] = useState<SiswaNilai[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaNilai[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [dataLoading, setDataLoading] = useState(false);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [showDetail, setShowDetail] = useState(false);
    const [detailClosing, setDetailClosing] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<SiswaNilai | null>(null);

    const [showEdit, setShowEdit] = useState(false);
    const [editClosing, setEditClosing] = useState(false);
    const [editingSiswa, setEditingSiswa] = useState<SiswaNilai | null>(null);
    const [editingNilai, setEditingNilai] = useState<Record<number, number | null>>({});

    // 🆕 BARU: State untuk tracking error per komponen saat edit nilai
    const [editingErrors, setEditingErrors] = useState<Record<number, string>>({});

    const [saving, setSaving] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // 🆕 BARU: STATE untuk Import Nilai dari Excel
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    const isPeriodNotActive = statusPTS !== 'aktif' && statusPAS !== 'aktif';
    const isPeriodLocked = statusPTS === 'selesai' && statusPAS === 'selesai';
    const isReadOnly = isPeriodNotActive || isPeriodLocked;
    const readOnlyReason: 'not_open' | 'locked' | null = isPeriodLocked ? 'locked' : (isPeriodNotActive ? 'not_open' : null);

    // ═════════════════════════════════════════════════════════════════════════
    // 🆕 BARU: FUNGSI VALIDASI NILAI (0-100)
    // Dipanggil saat user selesai input (onBlur) untuk validasi real-time
    // ═════════════════════════════════════════════════════════════════════════
    const validateNilai = (komponenId: number, nilai: number | null): string | null => {
        if (nilai === null) return null; // Kosong = OK
        if (typeof nilai !== 'number' || isNaN(nilai)) {
            return 'Nilai harus berupa angka';
        }
        if (nilai < 0) {
            return 'Nilai tidak boleh negatif (< 0)';
        }
        if (nilai > 100) {
            return 'Nilai tidak boleh lebih dari 100';
        }
        return null; // Valid
    };

    // ═════════════════════════════════════════════════════════════════════════
    // 🆕 BARU: HANDLER INPUT NILAI DENGAN VALIDASI
    // Jika nilai invalid, tampilkan error inline dan reset nilai ke null
    // ═════════════════════════════════════════════════════════════════════════
    const handleNilaiChange = (komponenId: number, value: string) => {
        // Hanya izinkan angka atau kosong
        if (value === '' || /^\d+$/.test(value)) {
            const newValue = value === '' ? null : parseInt(value);
            setEditingNilai(prev => ({
                ...prev,
                [komponenId]: newValue
            }));

            // Clear error saat user mulai mengetik
            if (editingErrors[komponenId]) {
                setEditingErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[komponenId];
                    return newErrors;
                });
            }
        }
    };

    const handleNilaiBlur = (komponenId: number) => {
        const nilai = editingNilai[komponenId];
        const error = validateNilai(komponenId, nilai);

        if (error) {
            // Tampilkan error inline
            setEditingErrors(prev => ({
                ...prev,
                [komponenId]: error
            }));
            // 🆕 BARU: Reset nilai ke null (TIDAK auto-correct ke 0 atau 100)
            // User harus input ulang nilai yang valid
            setEditingNilai(prev => ({
                ...prev,
                [komponenId]: null
            }));
        } else {
            // Clear error jika valid
            setEditingErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[komponenId];
                return newErrors;
            });
        }
    };

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

                const [taRes, mapelRes, komponenRes, kelasRes] = await Promise.all([
                    fetch(`${API}/tahun-ajaran/aktif`, { headers }),
                    fetch(`${API}/atur-penilaian/mapel`, { headers }),
                    fetch(`${API}/atur-penilaian/komponen`, { headers }),
                    fetch(`${API}/atur-penilaian/kelas`, { headers }),
                ]);

                if (mapelRes.status === 403 || kelasRes.status === 403) {
                    setIsNotAssigned(true);
                    return;
                }

                if (!taRes.ok || !mapelRes.ok || !komponenRes.ok || !kelasRes.ok) {
                    throw new Error('Gagal memuat data');
                }

                const [taData, mapelData, komponenData, kelasData] = await Promise.all([
                    taRes.json(), mapelRes.json(), komponenRes.json(), kelasRes.json()
                ]);

                const { status_pts, status_pas } = taData.data;
                setStatusPTS(status_pts || 'nonaktif');
                setStatusPAS(status_pas || 'nonaktif');

                const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null;
                setJenisPenilaianAktif(jenisAktif);

                const allMapel = mapelData.data || [];
                setMapelList(allMapel);
                setKomponenList(komponenData.data || []);
                setKelasList(kelasData.data || []);

                if (allMapel.length === 0) {
                    setIsNotAssigned(true);
                    return;
                }

                const ptsStatus = status_pts || 'nonaktif';
                const pasStatus = status_pas || 'nonaktif';
                const bothNotActive = ptsStatus === 'nonaktif' && pasStatus === 'nonaktif';
                const bothFinished = ptsStatus === 'selesai' && pasStatus === 'selesai';

                if ((bothNotActive || bothFinished) && !hasShownPeriodModal) {
                    setTimeout(() => {
                        setShowPeriodNotActiveModal(true);
                        setHasShownPeriodModal(true);
                    }, 500);
                }
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showModal, hasShownPeriodModal]);

    // ====== FETCH KELAS ======
    useEffect(() => {
        if (selectedMapelId === null) {
            setKelasFiltered([]);
            setSelectedKelasId(null);
            return;
        }

        const fetchKelasByMapel = async () => {
            setKelasLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(
                    `${API}/atur-penilaian/kelas-by-mapel?mapel_id=${selectedMapelId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (res.ok) {
                    const data = await res.json();
                    const kelasData = (data.data || []).map((k: any) => ({
                        kelas_id: k.kelas_id,
                        nama_kelas: k.nama_kelas,
                    }));
                    setKelasFiltered(kelasData);

                    if (kelasData.length === 1) {
                        setSelectedKelasId(kelasData[0].kelas_id);
                    } else {
                        setSelectedKelasId(null);
                    }
                } else {
                    setKelasFiltered([]);
                    setSelectedKelasId(null);
                }
            } catch (err) {
                console.error('Error fetch kelas by mapel:', err);
                setKelasFiltered([]);
                setSelectedKelasId(null);
            } finally {
                setKelasLoading(false);
            }
        };

        fetchKelasByMapel();
    }, [selectedMapelId]);

    // ====== FETCH NILAI ======
    useEffect(() => {
        if (selectedMapelId === null || selectedKelasId === null) {
            setSiswaList([]);
            setFilteredSiswa([]);
            setCurrentMapel(null);
            setCurrentKelas(null);
            setBobotSudahDiatur(true);
            setShowBobotWarning(false);
            return;
        }

        const fetchNilai = async () => {
            setDataLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const headers = { Authorization: `Bearer ${token}` };

                const url = `${API}/nilai/${selectedMapelId}/${selectedKelasId}`;
                const res = await fetch(url, { headers });

                if (!res.ok) {
                    let errorData: any = { message: 'Gagal memuat data' };
                    try {
                        const contentType = res.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            errorData = await res.json();
                        } else {
                            const text = await res.text();
                            errorData = { message: text || `HTTP ${res.status}` };
                        }
                    } catch {
                        errorData = { message: `HTTP ${res.status}` };
                    }

                    if (res.status === 403) {
                        showModal({
                            type: 'error',
                            title: 'Akses Ditolak',
                            message: errorData.message || 'Anda tidak memiliki akses ke mata pelajaran/kelas ini.'
                        });
                        return;
                    }

                    if (res.status === 404) {
                        setSiswaList([]);
                        setFilteredSiswa([]);
                        return;
                    }

                    throw new Error(errorData.message || `Gagal memuat data`);
                }

                const data = await res.json();

                if (!data.siswaList || !Array.isArray(data.siswaList)) {
                    setSiswaList([]);
                    setFilteredSiswa([]);
                    return;
                }

                const mapped: SiswaNilai[] = data.siswaList.map((s: any) => ({
                    id: s.id,
                    nama: s.nama,
                    nis: s.nis || '-',
                    nisn: s.nisn || '-',
                    nilai_rapor_pts: s.nilai_rapor_pts ?? 0,
                    deskripsi_pts: s.deskripsi_pts ?? '',
                    nilai_rapor_pas: s.nilai_rapor_pas ?? 0,
                    deskripsi_pas: s.deskripsi_pas ?? '',
                    nilai: s.nilai || {},
                }));

                setSiswaList(mapped);
                setFilteredSiswa(mapped);
                setCurrentMapel(mapelList.find(m => m.mata_pelajaran_id === selectedMapelId) || null);
                setCurrentKelas(kelasFiltered.find(k => k.kelas_id === selectedKelasId) || null);
                setCurrentPage(1);

                const bobotStatus = data.bobot_sudah_diatur ?? true;
                setBobotSudahDiatur(bobotStatus);

                if (!bobotStatus && jenisPenilaianAktif === 'PAS' && !isReadOnly) {
                    setShowBobotWarning(true);
                } else {
                    setShowBobotWarning(false);
                }
            } catch (err: any) {
                showModal({
                    type: 'error',
                    title: 'Gagal Memuat',
                    message: err.message || 'Gagal memuat data nilai.'
                });
            } finally {
                setDataLoading(false);
            }
        };
        fetchNilai();
    }, [selectedMapelId, selectedKelasId, mapelList, kelasFiltered, showModal, jenisPenilaianAktif, isReadOnly]);

    // ====== FILTER & PAGINATION ======
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(siswaList.filter(s =>
                s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q)
            ));
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold border transition-all";
        const btnActive = "text-white border-orange-500";
        const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";

        pages.push(
            <button key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className={`${btnBase} ${btnInactive} disabled:opacity-40 disabled:cursor-not-allowed`}>«</button>
        );

        const range: number[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) range.push(i);
        } else {
            range.push(1);
            if (currentPage > 3) range.push(-1);
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) range.push(i);
            if (currentPage < totalPages - 2) range.push(-2);
            range.push(totalPages);
        }

        range.forEach((p) => {
            if (p < 0) {
                pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>);
            } else {
                pages.push(
                    <button key={p} onClick={() => setCurrentPage(p)}
                        className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
                        style={currentPage === p ? { background: THEME.gradients.secondary } : {}}
                    >{p}</button>
                );
            }
        });

        pages.push(
            <button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className={`${btnBase} ${btnInactive} disabled:opacity-40 disabled:cursor-not-allowed`}>»</button>
        );
        return pages;
    };

    // ====== HANDLERS ======
    const handleDetail = (siswa: SiswaNilai) => { setSelectedSiswa(siswa); setShowDetail(true); };
    const closeDetail = () => { setDetailClosing(true); setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200); };

    const handleEdit = (siswa: SiswaNilai) => {
        if (isReadOnly) {
            if (readOnlyReason === 'locked') {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message: 'Periode penilaian sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengedit nilai siswa.'
                });
            } else {
                showModal({
                    type: 'warning',
                    title: '⏳ Mode Baca Saja',
                    message: 'Periode penilaian belum aktif.\n\nAnda belum dapat mengedit nilai siswa.\n\nSilakan tunggu admin membuka periode penilaian.'
                });
            }
            return;
        }

        setEditingSiswa(siswa);
        setEditingNilai({ ...siswa.nilai });
        // 🆕 BARU: Reset error saat buka modal edit
        setEditingErrors({});
        setShowEdit(true);
    };
    const closeEdit = () => {
        setEditClosing(true);
        setTimeout(() => {
            setShowEdit(false);
            setEditClosing(false);
            setEditingSiswa(null);
            setEditingErrors({});
        }, 200);
    };

    const openConfirmSimpan = () => {
        if (!editingSiswa || !selectedMapelId) return;

        // 🆕 BARU: Validasi SEMUA nilai sebelum simpan
        const validationErrors: string[] = [];
        for (const [idStr, nilai] of Object.entries(editingNilai)) {
            if (nilai !== null) {
                const komponenId = Number(idStr);
                const error = validateNilai(komponenId, nilai);
                if (error) {
                    const nama = komponenList.find(k => k.id_komponen === komponenId)?.nama_komponen || idStr;
                    validationErrors.push(`• ${nama}: ${error}`);

                    // Tampilkan error inline
                    setEditingErrors(prev => ({
                        ...prev,
                        [komponenId]: error
                    }));
                }
            }
        }

        // Jika ada error validasi, tampilkan pesan error dan batal simpan
        if (validationErrors.length > 0) {
            showModal({
                type: 'error',
                title: 'Nilai Tidak Valid',
                message: `Terdapat ${validationErrors.length} nilai yang tidak valid:\n\n${validationErrors.join('\n')}\n\nSilakan perbaiki nilai yang ditandai merah.`
            });
            return;
        }

        const hasChanged = Object.entries(editingNilai).some(([idStr, nilaiBaru]) => {
            const nilaiLama = editingSiswa.nilai[Number(idStr)] ?? null;
            return nilaiBaru !== nilaiLama;
        });

        if (!hasChanged) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Data yang Anda masukkan sama dengan data sebelumnya.'
            });
            return;
        }

        if (jenisPenilaianAktif === 'PAS' && !bobotSudahDiatur) {
            showModal({
                type: 'warning',
                title: '⚠️ Bobot Penilaian Belum Diatur',
                message: `Bobot penilaian untuk mata pelajaran "${currentMapel?.nama_mapel}" belum diatur.\n\nNilai rapor akan dihitung dengan bobot default (UH, PTS, PAS sama rata).\n\n💡 Tip: Atur bobot terlebih dahulu di menu "Atur Penilaian" untuk hasil yang akurat.\n\nApakah Anda tetap ingin melanjutkan menyimpan nilai?`
            });
            setEditClosing(true);
            setTimeout(() => {
                setShowEdit(false);
                setEditClosing(false);
                setShowConfirmModal(true);
            }, 200);
            return;
        }

        setEditClosing(true);
        setTimeout(() => {
            setShowEdit(false);
            setEditClosing(false);
            setShowConfirmModal(true);
        }, 200);
    };

    const executeSimpanNilai = async () => {
        if (!editingSiswa || !selectedMapelId) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/nilai-komponen/${selectedMapelId}/${editingSiswa.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nilai: editingNilai }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Gagal menyimpan' }));
                throw new Error(err.message);
            }

            const data = await res.json();

            const updatedSiswa: SiswaNilai = {
                ...editingSiswa,
                nilai: editingNilai,
                nilai_rapor_pts: data.nilai_rapor_pts ?? data.nilai_rapor ?? editingSiswa.nilai_rapor_pts,
                deskripsi_pts: data.deskripsi_pts ?? data.deskripsi ?? editingSiswa.deskripsi_pts,
                nilai_rapor_pas: data.nilai_rapor_pas ?? editingSiswa.nilai_rapor_pas,
                deskripsi_pas: data.deskripsi_pas ?? editingSiswa.deskripsi_pas,
            };

            setSiswaList(prevList => prevList.map(siswa => siswa.id === editingSiswa.id ? updatedSiswa : siswa));
            setFilteredSiswa(prevList => prevList.map(siswa => siswa.id === editingSiswa.id ? updatedSiswa : siswa));

            setShowConfirmModal(false);
            setEditingSiswa(null);
            setEditingErrors({});

            setTimeout(() => {
                showModal({
                    type: 'success',
                    title: 'Nilai Disimpan!',
                    message: `Nilai ${editingSiswa.nama} berhasil disimpan.`
                });
            }, 250);

        } catch (err: any) {
            setShowConfirmModal(false);
            setEditingSiswa(null);
            setEditingErrors({});

            setTimeout(() => {
                showModal({
                    type: 'error',
                    title: 'Gagal Menyimpan',
                    message: err.message || 'Gagal menyimpan nilai.'
                });
            }, 250);
        } finally {
            setSaving(false);
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // 🆕 BARU: HANDLER IMPORT NILAI
    // ═════════════════════════════════════════════════════════════════════════

    const openImportModal = () => {
        if (!selectedMapelId || !selectedKelasId) {
            showModal({
                type: 'warning',
                title: 'Pilih Mapel dan Kelas',
                message: 'Silakan pilih mata pelajaran dan kelas terlebih dahulu sebelum import nilai.'
            });
            return;
        }

        if (isReadOnly) {
            showModal({
                type: 'warning',
                title: 'Mode Baca Saja',
                message: readOnlyReason === 'locked'
                    ? 'Periode penilaian sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengimport nilai.'
                    : 'Periode penilaian belum aktif.\n\nAnda tidak dapat mengimport nilai.'
            });
            return;
        }

        setImportFile(null);
        if (importFileInputRef.current) importFileInputRef.current.value = '';
        setShowImportModal(true);
    };

    const handleDownloadTemplate = async () => {
        if (!selectedMapelId || !selectedKelasId) {
            showModal({
                type: 'warning',
                title: 'Pilih Mapel dan Kelas',
                message: 'Silakan pilih mata pelajaran dan kelas terlebih dahulu.'
            });
            return;
        }

        setDownloadingTemplate(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API}/nilai/import-template?mapel_id=${selectedMapelId}&kelas_id=${selectedKelasId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Gagal download template' }));
                throw new Error(err.message || 'Gagal download template');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Template_Nilai_${currentMapel?.nama_mapel || 'Mapel'}_${currentKelas?.nama_kelas || 'Kelas'}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            setTimeout(() => {
                showModal({
                    type: 'success',
                    title: 'Template Berhasil Diunduh',
                    message: 'Template Excel berhasil diunduh.\n\n📝 Langkah selanjutnya:\n1. Buka file Excel\n2. Isi nilai pada kolom komponen (UH1-5, PTS, PAS)\n3. Simpan file\n4. Upload kembali melalui tombol "Import Nilai"'
                });
            }, 300);

        } catch (err: any) {
            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            setTimeout(() => {
                showModal({
                    type: 'error',
                    title: 'Gagal Mengunduh Template',
                    message: err.message || 'Terjadi kesalahan saat mengunduh template.'
                });
            }, 300);
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

    const executeImportNilai = async () => {
        if (!importFile || !selectedMapelId || !selectedKelasId) {
            showModal({
                type: 'warning',
                title: 'Data Belum Lengkap',
                message: 'Silakan pilih file Excel dan pastikan mapel + kelas sudah dipilih.'
            });
            return;
        }

        setImporting(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('mapel_id', String(selectedMapelId));
            formData.append('kelas_id', String(selectedKelasId));

            const response = await fetch(`${API}/nilai/import`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengimport nilai');
            }

            const refreshRes = await fetch(
                `${API}/nilai/${selectedMapelId}/${selectedKelasId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                if (refreshData.siswaList && Array.isArray(refreshData.siswaList)) {
                    const mapped: SiswaNilai[] = refreshData.siswaList.map((s: any) => ({
                        id: s.id,
                        nama: s.nama,
                        nis: s.nis || '-',
                        nisn: s.nisn || '-',
                        nilai_rapor_pts: s.nilai_rapor_pts ?? 0,
                        deskripsi_pts: s.deskripsi_pts ?? '',
                        nilai_rapor_pas: s.nilai_rapor_pas ?? 0,
                        deskripsi_pas: s.deskripsi_pas ?? '',
                        nilai: s.nilai || {},
                    }));
                    setSiswaList(mapped);
                    setFilteredSiswa(mapped);
                }
            }

            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            let successMessage = data.message;
            if (data.data?.errors && data.data.errors.length > 0) {
                successMessage += `\n\n⚠️ Detail Error (maks 20):\n${data.data.errors.slice(0, 20).map((e: any) => `• ${e.message}`).join('\n')}`;
            }
            if (data.data?.warnings && data.data.warnings.length > 0) {
                successMessage += `\n\nℹ️ Peringatan:\n${data.data.warnings.slice(0, 10).map((w: any) => `• ${w.message}`).join('\n')}`;
            }

            setTimeout(() => {
                showModal({
                    type: data.data?.errors?.length > 0 ? 'warning' : 'success',
                    title: data.data?.errors?.length > 0 ? 'Import Selesai (Ada Error)' : 'Import Berhasil!',
                    message: successMessage
                });
            }, 250);

        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Import',
                message: err.message || 'Terjadi kesalahan saat mengimport nilai.'
            });
        } finally {
            setImporting(false);
        }
    };

    const NilaiBadge = ({ nilai }: { nilai: number }) => {
        if (nilai === null || nilai === undefined) {
            return <span className="text-gray-700 text-xs">—</span>;
        }

        return (
            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{ background: '#fff0e5', color: THEME.colors.primary, border: `1px solid ${THEME.colors.border}` }}>
                {nilai}
            </span>
        );
    };

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
                            <p className="text-sm text-gray-600">Anda belum ditugaskan mengajar mata pelajaran pilihan di semester ini.</p>
                        </div>
                        <button onClick={handleLogout} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: THEME.gradients.primary }}>
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const canEditNilai = !isReadOnly;

    // ====== RENDER ======
    return (
        <div className="flex-1 p-6 min-h-screen" style={{ background: THEME.colors.background }}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <PeriodNotActiveModal
                isOpen={showPeriodNotActiveModal}
                onClose={() => setShowPeriodNotActiveModal(false)}
            />

            {/* ====== HEADER ====== */}
            <div className="mb-6 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-gray-900">Input Nilai Siswa</h1>
                <p className="text-sm mt-1" style={{ color: THEME.colors.primary }}>Kelola nilai komponen & rapor siswa per mata pelajaran</p>
            </div>

            {/* ====== STATUS BANNERS ====== */}
            {isReadOnly && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl animate-fade-in-up"
                    style={{
                        background: readOnlyReason === 'locked' ? '#fef2f2' : '#fef3c7',
                        border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}`
                    }}>
                    <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${readOnlyReason === 'locked' ? 'text-red-600' : 'text-yellow-600'}`} />
                    <div className="flex-1">
                        <p className={`text-sm font-bold mb-1 ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>
                            Mode Baca Saja (Read Only)
                        </p>
                        <p className={`text-xs ${readOnlyReason === 'locked' ? 'text-red-800' : 'text-yellow-800'}`}>
                            {readOnlyReason === 'locked'
                                ? 'Periode penilaian telah selesai dan data sudah dikunci. Anda dapat melihat nilai siswa, tetapi tidak dapat mengedit.'
                                : 'Periode penilaian belum aktif. Anda dapat melihat nilai siswa, tetapi belum dapat menginput nilai.'}
                        </p>
                    </div>
                </div>
            )}

            {showBobotWarning && jenisPenilaianAktif === 'PAS' && !isReadOnly && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl animate-fade-in-up"
                    style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-600" />
                    <div className="flex-1">
                        <p className="text-sm font-bold mb-1 text-yellow-900">
                            ⚠️ Bobot Penilaian Belum Diatur
                        </p>
                        <p className="text-xs text-yellow-800">
                            Bobot penilaian untuk mata pelajaran <strong>{currentMapel?.nama_mapel}</strong> belum diatur.
                            Nilai rapor akan dihitung dengan bobot default.
                        </p>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => {
                                    setShowBobotWarning(false);
                                    window.location.href = '/guru-bidang-studi/atur-penilaian';
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: '#fcd34d', color: '#78350f', border: '1px solid #f59e0b' }}
                            >
                                Atur Bobot Sekarang
                            </button>
                            <button
                                onClick={() => setShowBobotWarning(false)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: '#fff', color: '#78350f', border: '1px solid #fcd34d' }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MAIN CARD ====== */}
            <div className="bg-white rounded-2xl overflow-hidden animate-fade-in-up delay-1" style={{ border: `1px solid ${THEME.colors.border}`, boxShadow: THEME.shadows.sm }}>
                <div className="px-6 py-5 space-y-4" style={{ borderBottom: `1px solid ${THEME.colors.border}`, background: '#fffaf6' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                Mata Pelajaran
                            </label>
                            <select
                                value={selectedMapelId === null ? '' : String(selectedMapelId)}
                                onChange={e => {
                                    const val = e.target.value;
                                    setSelectedMapelId(val ? Number(val) : null);
                                    setSelectedKelasId(null);
                                    setSearchQuery('');
                                }}
                                className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                            >
                                <option value="">-- Pilih Mata Pelajaran --</option>
                                {mapelList.map(mapel => (
                                    <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>
                                        {mapel.nama_mapel}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedMapelId && (
                            <div>
                                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                    Kelas
                                </label>
                                <select
                                    value={selectedKelasId === null ? '' : String(selectedKelasId)}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSelectedKelasId(val ? Number(val) : null);
                                        setSearchQuery('');
                                    }}
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                                    disabled={kelasLoading || kelasFiltered.length === 0}
                                >
                                    <option value="">
                                        {kelasLoading
                                            ? '⏳ Memuat kelas...'
                                            : kelasFiltered.length === 0
                                                ? '❌ Tidak ada kelas'
                                                : '-- Pilih Kelas --'}
                                    </option>
                                    {kelasFiltered.map(kelas => (
                                        <option key={kelas.kelas_id} value={kelas.kelas_id}>
                                            {kelas.nama_kelas}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {selectedMapelId && selectedKelasId && (
                        <div className="pt-4 border-t" style={{ borderColor: THEME.colors.border }}>
                            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                <div className="relative w-full lg:w-96">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Search className="w-4 h-4" style={{ color: THEME.colors.primary }} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Cari nama, NIS, atau NISN..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full border rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white border-orange-200 placeholder:text-gray-400"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute inset-y-0 right-3 flex items-center justify-center w-6 h-6 rounded-full hover:bg-orange-100 transition-colors"
                                            style={{ color: THEME.colors.primary }}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                    {canEditNilai && (
                                        <button
                                            onClick={openImportModal}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                                            style={{
                                                background: 'linear-gradient(135deg,#10b981,#059669)',
                                                color: 'white',
                                                boxShadow: '0 3px 10px rgba(16,185,129,0.3)'
                                            }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#059669,#047857)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#10b981,#059669)'; }}
                                        >
                                            <Upload size={16} />
                                            Import Nilai
                                        </button>
                                    )}

                                    <div className="flex items-center rounded-xl px-4 py-2" style={{ background: '#fff7ed', border: '1.5px solid #fde0c8' }}>
                                        <span className="text-sm font-semibold mr-2" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                            className="text-sm font-bold outline-none cursor-pointer"
                                            style={{ background: 'transparent', color: '#c95b08', minWidth: '40px', textAlign: 'center' }}>
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                        </select>
                                        <span className="text-sm font-semibold ml-2" style={{ color: '#7a3a0a' }}>data</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs mt-3 text-center lg:text-left" style={{ color: THEME.colors.primary }}>
                                Menampilkan <strong>{filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)}</strong> dari <strong>{filteredSiswa.length}</strong> siswa
                            </p>
                        </div>
                    )}
                </div>

                {!selectedMapelId || !selectedKelasId ? (
                    <div className="m-6 text-center py-16 rounded-2xl" style={{ background: '#fff7f0', border: `2px dashed ${THEME.colors.border}` }}>
                        <GraduationCap size={64} className="mx-auto mb-4" style={{ color: THEME.colors.secondary }} />
                        <p className="text-lg font-bold" style={{ color: THEME.colors.primary }}>
                            {!selectedMapelId
                                ? 'Pilih Mata Pelajaran'
                                : 'Pilih Kelas'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto scrollbar-thin">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr style={{ background: THEME.gradients.primary }}>
                                        {['No.', 'Nama Siswa', 'NIS', 'NISN',
                                            ...komponenList.map(k => k.nama_komponen),
                                            'Rapor PTS', 'Rapor PAS', 'Aksi'
                                        ].map((h, i) => (
                                            <th key={i} className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataLoading ? (
                                        <tr>
                                            <td colSpan={7 + komponenList.length} className="py-12 text-center text-gray-400 text-sm">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                                    Memuat data nilai...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentSiswa.length === 0 ? (
                                        <tr>
                                            <td colSpan={7 + komponenList.length} className="py-12 text-center text-gray-400 text-sm">
                                                {searchQuery ? 'Siswa tidak ditemukan.' : 'Belum ada data siswa.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        currentSiswa.map((siswa, idx) => (
                                            <tr key={siswa.id} className="transition-colors"
                                                style={{ borderBottom: `1px solid ${THEME.colors.border}`, background: idx % 2 === 0 ? '#fff' : '#fffaf6' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                                onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fffaf6')}>
                                                <td className="px-4 py-3 text-center text-gray-500 font-medium">{startIndex + idx + 1}</td>
                                                <td className="px-4 py-3 font-semibold text-gray-800">{siswa.nama}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{siswa.nisn}</td>
                                                {komponenList.map(k => (
                                                    <td key={`${siswa.id}-${k.id_komponen}`} className="px-4 py-3 text-center text-gray-700">
                                                        {siswa.nilai[k.id_komponen] !== null && siswa.nilai[k.id_komponen] !== undefined
                                                            ? siswa.nilai[k.id_komponen]
                                                            : <span className="text-gray-700">—</span>}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.nilai_rapor_pts} /></td>
                                                <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.nilai_rapor_pas} /></td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleDetail(siswa)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                            style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                                                            <Eye size={13} /> Detail
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(siswa)}
                                                            disabled={!canEditNilai}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            style={{
                                                                background: canEditNilai ? '#fff0e5' : '#e5e7eb',
                                                                border: canEditNilai ? `1px solid ${THEME.colors.tertiary}` : '1px solid #d1d5db',
                                                                color: canEditNilai ? '#b35a08' : '#6b7280'
                                                            }}
                                                            onMouseEnter={e => {
                                                                if (canEditNilai) e.currentTarget.style.background = '#ffe4c8';
                                                            }}
                                                            onMouseLeave={e => {
                                                                if (canEditNilai) e.currentTarget.style.background = '#fff0e5';
                                                            }}
                                                        >
                                                            {canEditNilai ? (
                                                                <>
                                                                    <Pencil size={13} /> Edit
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Lock size={13} /> Terkunci
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredSiswa.length > 0 && (
                            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                                <span className="text-sm font-medium" style={{ color: THEME.colors.primary }}>Halaman {currentPage} dari {totalPages}</span>
                                <div className="flex items-center gap-1">{renderPagination()}</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ====== DETAIL MODAL ====== */}
            {showDetail && selectedSiswa && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={{ border: `1px solid ${THEME.colors.border}` }}>

                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: THEME.gradients.header }}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                    <BookOpen size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Detail Nilai Siswa</h2>
                                    <p className="text-xs text-white/80 mt-0.5">{selectedSiswa.nama} • {currentKelas?.nama_kelas}</p>
                                </div>
                            </div>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl px-4 py-3" style={{ background: '#fff7ed', border: `1px solid ${THEME.colors.border}` }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c95b08' }}>NIS</p>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{selectedSiswa.nis}</p>
                                </div>
                                <div className="rounded-xl px-4 py-3" style={{ background: '#fff7ed', border: `1px solid ${THEME.colors.border}` }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c95b08' }}>NISN</p>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{selectedSiswa.nisn}</p>
                                </div>
                                <div className="rounded-xl px-4 py-3" style={{ background: '#fff7ed', border: `1px solid ${THEME.colors.border}` }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c95b08' }}>Kelas</p>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{currentKelas?.nama_kelas || '-'}</p>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-5 rounded-full" style={{ background: THEME.colors.secondary }}></div>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Rapor Penilaian</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl p-5 border-2" style={{
                                        background: selectedSiswa.nilai_rapor_pts > 0 ? '#fff7ed' : '#f9fafb',
                                        borderColor: selectedSiswa.nilai_rapor_pts > 0 ? '#fdba74' : '#e5e7eb'
                                    }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                                    style={{ background: selectedSiswa.nilai_rapor_pts > 0 ? '#fed7aa' : '#e5e7eb' }}>
                                                    <span className="text-sm font-bold"
                                                        style={{ color: selectedSiswa.nilai_rapor_pts > 0 ? '#c2410c' : '#6b7280' }}>PTS</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold"
                                                        style={{ color: selectedSiswa.nilai_rapor_pts > 0 ? '#7a3a0a' : '#9ca3af' }}>
                                                        Rapor PTS
                                                    </p>
                                                    <p className="text-xs" style={{ color: '#a89a8c' }}>
                                                        {statusPTS === 'aktif' ? '● Aktif' : statusPTS === 'selesai' ? 'Selesai' : '⏳ Menunggu'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-center py-3">
                                            <div className="text-3xl font-bold mb-2" style={{ color: selectedSiswa.nilai_rapor_pts > 0 ? '#c2410c' : '#d1d5db' }}>
                                                {selectedSiswa.nilai_rapor_pts > 0 ? selectedSiswa.nilai_rapor_pts : '—'}
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t" style={{ borderColor: selectedSiswa.nilai_rapor_pts > 0 ? '#fde0c8' : '#e5e7eb' }}>
                                            <p className="text-xs font-semibold mb-2" style={{ color: selectedSiswa.nilai_rapor_pts > 0 ? '#7a3a0a' : '#9ca3af' }}>Deskripsi:</p>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                {selectedSiswa.deskripsi_pts || <span className="italic text-gray-400">Belum ada deskripsi</span>}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl p-5 border-2" style={{
                                        background: selectedSiswa.nilai_rapor_pas > 0 ? '#fff7ed' : '#f9fafb',
                                        borderColor: selectedSiswa.nilai_rapor_pas > 0 ? '#fdba74' : '#e5e7eb'
                                    }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                                    style={{ background: selectedSiswa.nilai_rapor_pas > 0 ? '#fed7aa' : '#e5e7eb' }}>
                                                    <span className="text-sm font-bold"
                                                        style={{ color: selectedSiswa.nilai_rapor_pas > 0 ? '#c2410c' : '#6b7280' }}>PAS</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold"
                                                        style={{ color: selectedSiswa.nilai_rapor_pas > 0 ? '#7a3a0a' : '#9ca3af' }}>
                                                        Rapor PAS
                                                    </p>
                                                    <p className="text-xs" style={{ color: '#a89a8c' }}>
                                                        {statusPAS === 'aktif' ? '● Aktif' : statusPAS === 'selesai' ? 'Selesai' : '⏳ Menunggu'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-center py-3">
                                            <div className="text-3xl font-bold mb-2" style={{ color: selectedSiswa.nilai_rapor_pas > 0 ? '#c2410c' : '#d1d5db' }}>
                                                {selectedSiswa.nilai_rapor_pas > 0 ? selectedSiswa.nilai_rapor_pas : '—'}
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t" style={{ borderColor: selectedSiswa.nilai_rapor_pas > 0 ? '#fde0c8' : '#e5e7eb' }}>
                                            <p className="text-xs font-semibold mb-2" style={{ color: selectedSiswa.nilai_rapor_pas > 0 ? '#7a3a0a' : '#9ca3af' }}>Deskripsi:</p>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                {selectedSiswa.deskripsi_pas || <span className="italic text-gray-400">Belum ada deskripsi</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-5 rounded-full" style={{ background: THEME.colors.secondary }}></div>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Komponen Penilaian</p>
                                </div>

                                <div className="space-y-3">
                                    {komponenList
                                        .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
                                        .sort((a, b) => {
                                            const numA = parseInt(a.nama_komponen.match(/\d+/)?.[0] || '0');
                                            const numB = parseInt(b.nama_komponen.match(/\d+/)?.[0] || '0');
                                            return numA - numB;
                                        })
                                        .map((k) => {
                                            const nilai = selectedSiswa.nilai[k.id_komponen];
                                            const hasValue = nilai !== null && nilai !== undefined;

                                            return (
                                                <div key={k.id_komponen}
                                                    className="flex items-center justify-between px-5 py-4 rounded-xl border"
                                                    style={{
                                                        background: hasValue ? '#fff' : '#f9fafb',
                                                        borderColor: hasValue ? '#fde0c8' : '#e5e7eb'
                                                    }}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                            style={{ background: '#fef3c7', color: '#92400e' }}>
                                                            <span className="text-xs font-bold">UH</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
                                                                {k.nama_komponen}
                                                            </p>
                                                            <p className="text-xs" style={{ color: '#a89a8c' }}>Ulangan Harian</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-xl font-bold ${hasValue ? '' : 'text-gray-400'}`}
                                                            style={{ color: hasValue ? THEME.colors.primary : undefined }}>
                                                            {hasValue ? nilai : '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                    {(() => {
                                        const ptsKomponen = komponenList.find(k => k.nama_komponen.toUpperCase() === 'PTS');
                                        if (!ptsKomponen) return null;
                                        const nilai = selectedSiswa.nilai[ptsKomponen.id_komponen];
                                        const hasValue = nilai !== null && nilai !== undefined;

                                        return (
                                            <div className="flex items-center justify-between px-5 py-4 rounded-xl border"
                                                style={{
                                                    background: hasValue ? '#fff7ed' : '#f9fafb',
                                                    borderColor: hasValue ? '#fdba74' : '#e5e7eb'
                                                }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                        style={{ background: hasValue ? '#fed7aa' : '#e5e7eb' }}>
                                                        <span className="text-xs font-bold" style={{ color: hasValue ? '#c2410c' : '#6b7280' }}>PTS</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold" style={{ color: hasValue ? '#7a3a0a' : '#9ca3af' }}>
                                                            Penilaian Tengah Semester
                                                        </p>
                                                        <p className="text-xs" style={{ color: '#a89a8c' }}>
                                                            {statusPTS === 'aktif' ? '● Aktif' : statusPTS === 'selesai' ? 'Selesai' : '⏳ Menunggu'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-xl font-bold ${hasValue ? '' : 'text-gray-400'}`}
                                                        style={{ color: hasValue ? '#c2410c' : undefined }}>
                                                        {hasValue ? nilai : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {(() => {
                                        const pasKomponen = komponenList.find(k => k.nama_komponen.toUpperCase() === 'PAS');
                                        if (!pasKomponen) return null;
                                        const nilai = selectedSiswa.nilai[pasKomponen.id_komponen];
                                        const hasValue = nilai !== null && nilai !== undefined;

                                        return (
                                            <div className="flex items-center justify-between px-5 py-4 rounded-xl border"
                                                style={{
                                                    background: hasValue ? '#fff7ed' : '#f9fafb',
                                                    borderColor: hasValue ? '#fdba74' : '#e5e7eb'
                                                }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                        style={{ background: hasValue ? '#fed7aa' : '#e5e7eb' }}>
                                                        <span className="text-xs font-bold" style={{ color: hasValue ? '#c2410c' : '#6b7280' }}>PAS</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold" style={{ color: hasValue ? '#7a3a0a' : '#9ca3af' }}>
                                                            Penilaian Akhir Semester
                                                        </p>
                                                        <p className="text-xs" style={{ color: '#a89a8c' }}>
                                                            {statusPAS === 'aktif' ? '● Aktif' : statusPAS === 'selesai' ? 'Selesai' : '⏳ Menunggu'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-xl font-bold ${hasValue ? '' : 'text-gray-400'}`}
                                                        style={{ color: hasValue ? '#c2410c' : undefined }}>
                                                        {hasValue ? nilai : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <button onClick={closeDetail}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                Tutup
                            </button>
                            {canEditNilai && (
                                <button onClick={() => { handleEdit(selectedSiswa); closeDetail(); }}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2"
                                    style={{ background: THEME.gradients.secondary, boxShadow: THEME.shadows.sm }}
                                    onMouseEnter={e => (e.currentTarget.style.background = THEME.gradients.primary)}
                                    onMouseLeave={e => (e.currentTarget.style.background = THEME.gradients.secondary)}>
                                    <Pencil size={14} /> Edit Nilai
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ====== EDIT MODAL (DENGAN VALIDASI 0-100) ====== */}
            {showEdit && editingSiswa && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={{ border: `1px solid ${THEME.colors.border}` }}>

                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: THEME.gradients.header }}>
                            <div className="flex items-center gap-3">
                                <div>
                                    <h2 className="text-base font-bold text-white">Edit Nilai Siswa</h2>
                                    <p className="text-xs text-white/80 mt-0.5">{editingSiswa.nama} • {currentKelas?.nama_kelas}</p>
                                </div>
                            </div>
                            <button onClick={closeEdit} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
                            {jenisPenilaianAktif && (
                                <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                                    style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                    <AlertCircle size={18} style={{ color: '#c2410c', flexShrink: 0 }} />
                                    <p className="text-sm" style={{ color: '#7a3a0a' }}>
                                        <strong>Periode {jenisPenilaianAktif} Aktif</strong> —
                                        {jenisPenilaianAktif === 'PTS'
                                            ? ' Hanya nilai PTS yang dapat diubah.'
                                            : ' Nilai PTS terkunci, hanya UH & PAS yang bisa diubah.'}
                                    </p>
                                </div>
                            )}

                            {/* 🆕 BARU: Info validasi nilai */}
                            <div className="rounded-xl px-4 py-3 flex items-start gap-3"
                                style={{ background: '#eff6ff', border: '1px solid #93c5fd' }}>
                                <AlertCircle size={18} style={{ color: '#1d4ed8', flexShrink: 0 }} className="mt-0.5" />
                                <p className="text-xs" style={{ color: '#1e40af' }}>
                                    <strong>ℹ️ Validasi Nilai:</strong> Nilai harus berupa angka antara <strong>0-100</strong>.
                                    Jika Anda input nilai di luar rentang, sistem akan menampilkan pesan error dan nilai akan direset.
                                </p>
                            </div>

                            {jenisPenilaianAktif === 'PAS' && !bobotSudahDiatur && (
                                <div className="rounded-xl px-4 py-3 flex items-start gap-3"
                                    style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
                                    <AlertCircle size={18} style={{ color: '#a16207', flexShrink: 0 }} className="mt-0.5" />
                                    <p className="text-xs" style={{ color: '#78350f' }}>
                                        <strong>⚠️ Peringatan:</strong> Bobot penilaian belum diatur. Nilai rapor akan dihitung dengan bobot default.
                                    </p>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-5 rounded-full" style={{ background: THEME.colors.secondary }}></div>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Komponen Penilaian</p>
                                </div>

                                <div className="space-y-3">
                                    {/* 1. PTS */}
                                    {(() => {
                                        const ptsKomponen = komponenList.find(k => k.nama_komponen.toUpperCase() === 'PTS');
                                        if (!ptsKomponen) return null;

                                        const isDisabled = jenisPenilaianAktif === 'PAS';
                                        const nilai = editingNilai[ptsKomponen.id_komponen];
                                        const error = editingErrors[ptsKomponen.id_komponen];

                                        return (
                                            <div key={ptsKomponen.id_komponen}
                                                className={`rounded-xl p-5 border-2 transition-all ${!isDisabled
                                                    ? error
                                                        ? 'border-red-500 bg-red-50'
                                                        : 'border-orange-400 shadow-lg'
                                                    : 'border-gray-200 bg-gray-50'
                                                    }`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                                            style={{ background: !isDisabled ? '#fed7aa' : '#e5e7eb' }}>
                                                            <span className="text-sm font-bold" style={{ color: !isDisabled ? '#c2410c' : '#6b7280' }}>PTS</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold" style={{ color: !isDisabled ? '#7a3a0a' : '#9ca3af' }}>
                                                                Penilaian Tengah Semester
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {!isDisabled ? (
                                                            <>
                                                                <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                                                                <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>Aktif</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Lock size={14} style={{ color: '#9ca3af' }} />
                                                                <span className="text-xs font-semibold" style={{ color: '#9ca3af' }}>Terkunci</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={nilai ?? ''}
                                                    onChange={e => handleNilaiChange(ptsKomponen.id_komponen, e.target.value)}
                                                    onBlur={() => handleNilaiBlur(ptsKomponen.id_komponen)}
                                                    disabled={isDisabled}
                                                    placeholder="0"
                                                    maxLength={3}
                                                    className={`w-full h-16 px-4 text-3xl font-bold text-center rounded-xl border-2 outline-none transition-all ${isDisabled
                                                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                        : error
                                                            ? 'bg-red-50 border-red-500 text-gray-800 focus:ring-2 focus:ring-red-400 focus:border-red-400'
                                                            : 'bg-white border-orange-200 text-orange-700 focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                                                        }`}
                                                    style={!isDisabled ? (error ? { boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : { boxShadow: '0 4px 12px rgba(232,105,10,0.15)' }) : {}}
                                                />
                                                {/* 🆕 BARU: Tampilkan error inline */}
                                                {error && (
                                                    <p className="text-xs text-red-600 mt-2 text-center font-semibold">
                                                        {error}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* 2. PAS */}
                                    {(() => {
                                        const pasKomponen = komponenList.find(k => k.nama_komponen.toUpperCase() === 'PAS');
                                        if (!pasKomponen) return null;

                                        const isDisabled = jenisPenilaianAktif === 'PTS';
                                        const nilai = editingNilai[pasKomponen.id_komponen];
                                        const error = editingErrors[pasKomponen.id_komponen];

                                        return (
                                            <div key={pasKomponen.id_komponen}
                                                className={`rounded-xl p-5 border-2 transition-all ${!isDisabled
                                                    ? error
                                                        ? 'border-red-500 bg-red-50'
                                                        : 'border-orange-400 shadow-lg'
                                                    : 'border-gray-200 bg-gray-50'
                                                    }`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                                            style={{ background: !isDisabled ? '#fed7aa' : '#e5e7eb' }}>
                                                            <span className="text-sm font-bold" style={{ color: !isDisabled ? '#c2410c' : '#6b7280' }}>PAS</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold" style={{ color: !isDisabled ? '#7a3a0a' : '#9ca3af' }}>
                                                                Penilaian Akhir Semester
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {!isDisabled ? (
                                                            <>
                                                                <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                                                                <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>Aktif</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Lock size={14} style={{ color: '#9ca3af' }} />
                                                                <span className="text-xs font-semibold" style={{ color: '#9ca3af' }}>Terkunci</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={nilai ?? ''}
                                                    onChange={e => handleNilaiChange(pasKomponen.id_komponen, e.target.value)}
                                                    onBlur={() => handleNilaiBlur(pasKomponen.id_komponen)}
                                                    disabled={isDisabled}
                                                    placeholder="0"
                                                    maxLength={3}
                                                    className={`w-full h-16 px-4 text-3xl font-bold text-center rounded-xl border-2 outline-none transition-all ${isDisabled
                                                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                        : error
                                                            ? 'bg-red-50 border-red-500 text-gray-800 focus:ring-2 focus:ring-red-400 focus:border-red-400'
                                                            : 'bg-white border-orange-200 text-orange-700 focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                                                        }`}
                                                    style={!isDisabled ? (error ? { boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : { boxShadow: '0 4px 12px rgba(232,105,10,0.15)' }) : {}}
                                                />
                                                {/* 🆕 BARU: Tampilkan error inline */}
                                                {error && (
                                                    <p className="text-xs text-red-600 mt-2 text-center font-semibold">
                                                        {error}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* 3. UH1 - UH5 */}
                                    {komponenList
                                        .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
                                        .sort((a, b) => {
                                            const numA = parseInt(a.nama_komponen.match(/\d+/)?.[0] || '0');
                                            const numB = parseInt(b.nama_komponen.match(/\d+/)?.[0] || '0');
                                            return numA - numB;
                                        })
                                        .map((komponen) => {
                                            const isDisabled = jenisPenilaianAktif === 'PTS';
                                            const nilai = editingNilai[komponen.id_komponen];
                                            const error = editingErrors[komponen.id_komponen];

                                            return (
                                                <div key={komponen.id_komponen}
                                                    className="flex items-center justify-between px-5 py-4 rounded-xl border"
                                                    style={{
                                                        background: isDisabled ? '#f9fafb' : error ? '#fef2f2' : '#fffaf6',
                                                        borderColor: isDisabled ? '#e5e7eb' : error ? '#fca5a5' : '#fde0c8'
                                                    }}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                            style={{ background: '#fef3c7', color: '#92400e' }}>
                                                            <span className="text-xs font-bold">UH</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold" style={{ color: isDisabled ? '#9ca3af' : '#7a3a0a' }}>
                                                                {komponen.nama_komponen}
                                                            </p>
                                                            <p className="text-xs" style={{ color: '#a89a8c' }}>Ulangan Harian</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            value={nilai ?? ''}
                                                            onChange={e => handleNilaiChange(komponen.id_komponen, e.target.value)}
                                                            onBlur={() => handleNilaiBlur(komponen.id_komponen)}
                                                            disabled={isDisabled}
                                                            placeholder="-"
                                                            maxLength={3}
                                                            className={`w-24 h-12 px-3 text-center text-lg font-bold rounded-lg border-2 outline-none transition-all ${isDisabled
                                                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                                : error
                                                                    ? 'bg-red-50 border-red-500 text-gray-800 focus:ring-2 focus:ring-red-400 focus:border-red-400'
                                                                    : 'bg-white border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                                                                }`}
                                                        />
                                                        {/* 🆕 BARU: Tampilkan error inline */}
                                                        {error && (
                                                            <p className="text-xs text-red-600 mt-1 text-center font-semibold">
                                                                {error}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <button onClick={closeEdit} disabled={saving}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#fff0e5'; }}
                                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#fff'; }}>
                                Batal
                            </button>
                            <button onClick={openConfirmSimpan} disabled={saving}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: THEME.gradients.secondary, boxShadow: THEME.shadows.sm }}
                                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = THEME.gradients.primary; }}
                                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = THEME.gradients.secondary; }}>
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        Simpan Nilai
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== CONFIRM MODAL ====== */}
            {showConfirmModal && editingSiswa && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 fade-in"
                    onClick={(e) => { if (e.target === e.currentTarget && !saving) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Konfirmasi Penyimpanan Nilai</h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6">
                            Apakah Anda yakin ingin menyimpan nilai {editingSiswa.nama}?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ borderColor: THEME.colors.border, color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeSimpanNilai}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: THEME.gradients.secondary, boxShadow: THEME.shadows.sm }}
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block mr-2" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>Simpan</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🆕 BARU: MODAL IMPORT NILAI DARI EXCEL */}
            {showImportModal && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 fade-in"
                    onClick={(e) => { if (e.target === e.currentTarget && !importing) setShowImportModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 scale-in">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                                    <Upload size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Import Nilai dari Excel</h3>
                                    <p className="text-xs text-gray-500">
                                        {currentMapel?.nama_mapel} • {currentKelas?.nama_kelas}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { if (!importing) setShowImportModal(false); }}
                                disabled={importing}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                            >
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200">
                            <p className="text-sm text-blue-900 font-semibold mb-2 flex items-center gap-2">
                                <AlertCircle size={16} className="text-blue-600" />
                                Langkah-langkah Import:
                            </p>
                            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                                <li>Download template Excel (sudah berisi daftar siswa)</li>
                                <li>Isi nilai pada kolom komponen (UH1-5, PTS, PAS)</li>
                                <li>Simpan file Excel</li>
                                <li>Upload file Excel yang sudah diisi</li>
                                <li>Klik "Import Nilai" untuk memproses</li>
                            </ol>
                        </div>

                        {jenisPenilaianAktif && (
                            <div className="mb-5 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2">
                                <AlertCircle size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-800">
                                    <strong>Periode {jenisPenilaianAktif} Aktif:</strong>{' '}
                                    {jenisPenilaianAktif === 'PTS'
                                        ? 'Hanya kolom PTS yang akan diimport. Kolom UH dan PAS akan diabaikan.'
                                        : 'Kolom UH dan PAS akan diimport. Kolom PTS akan diabaikan (terkunci).'}
                                </p>
                            </div>
                        )}

                        <div className="mb-5">
                            <button
                                onClick={handleDownloadTemplate}
                                disabled={downloadingTemplate}
                                className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 3px 10px rgba(245,158,11,0.3)' }}
                                onMouseEnter={e => { if (!downloadingTemplate) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#d97706,#b45309)'; }}
                                onMouseLeave={e => { if (!downloadingTemplate) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#f59e0b,#d97706)'; }}
                            >
                                {downloadingTemplate ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Mengunduh Template...
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        📥 Download Template Excel
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-semibold mb-2" style={{ color: '#7a3a0a' }}>
                                Upload File Excel <span className="text-red-500">*</span>
                            </label>
                            <div
                                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${importFile
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-orange-300 bg-orange-50 hover:bg-orange-100'
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
                                        <p className="text-xs text-orange-700">
                                            Format: .xlsx atau .xls (Maks 10MB)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowImportModal(false); setImportFile(null); }}
                                disabled={importing}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeImportNilai}
                                disabled={!importFile || importing}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 3px 10px rgba(16,185,129,0.3)' }}
                            >
                                {importing ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Mengimport...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Import Nilai
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}