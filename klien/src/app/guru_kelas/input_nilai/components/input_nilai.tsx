/**
 * Nama File: input_nilai_client.tsx
 * Fungsi: Input nilai siswa per mata pelajaran untuk guru kelas
 *         Menangani input nilai komponen, perhitungan nilai rapor otomatis,
 *         dan import nilai dari Excel dengan validasi konfigurasi penilaian
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 * Update: 11 Juli 2026 - Tambah validasi konfigurasi penilaian (bobot + kategori rapor)
 * Update: 11 Juli 2026 - Banner warning proaktif sebelum input/import nilai
 * Update: 11 Juli 2026 - Handle error KONFIGURASI_BELUM_LENGKAP dari backend
 */

'use client';

import { useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
    Eye, Pencil, X, Search, CheckCircle2, AlertCircle, WifiOff,
    ShieldAlert, LogOut, Lock, Upload, Download, Info,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// Konstanta API base URL
const API_BASE_URL = 'http://localhost:5000/api/guru-kelas';

// Konstanta untuk kode error
const ERROR_CODES = {
    NOT_ASSIGNED: 'NOT_ASSIGNED',
    KONFIGURASI_BELUM_LENGKAP: 'KONFIGURASI_BELUM_LENGKAP',
};

// Types
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
    bisa_input: boolean;
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

// Interface untuk status konfigurasi penilaian (BARU)
interface KategoriStatus {
    configured: boolean;
    bobot: {
        total: number;
        status: 'lengkap' | 'belum_100' | 'error';
    };
    kategori: {
        covered: boolean;
        celah: string[];
    };
    message: string;
}

// Global styles untuk animasi
const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes dg-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes dg-scaleIn {
      from { opacity: 0; transform: scale(0.93) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes dg-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    .dg-fadeIn { animation: dg-fadeIn 0.2s ease; }
    .dg-scaleIn { animation: dg-scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .dg-pulse { animation: dg-pulse 0.6s ease 0.15s; }
  `}</style>
);

// Konstanta style untuk modal notifikasi
const MODAL_STYLES: Record<
    ModalType,
    { iconBg: string; ring: string; icon: React.ReactNode; btn: string }
> = {
    success: {
        iconBg: 'bg-green-50',
        ring: 'ring-green-100',
        icon: <CheckCircle2 size={40} className="text-green-500" />,
        btn: 'bg-green-500 hover:bg-green-600',
    },
    error: {
        iconBg: 'bg-red-50',
        ring: 'ring-red-100',
        icon: <AlertCircle size={40} className="text-red-500" />,
        btn: 'bg-red-500 hover:bg-red-600',
    },
    warning: {
        iconBg: 'bg-orange-50',
        ring: 'ring-orange-100',
        icon: <ShieldAlert size={40} className="text-orange-500" />,
        btn: 'bg-orange-500 hover:bg-orange-600',
    },
    network: {
        iconBg: 'bg-slate-100',
        ring: 'ring-slate-200',
        icon: <WifiOff size={40} className="text-slate-500" />,
        btn: 'bg-slate-600 hover:bg-slate-700',
    },
};

// Komponen modal notifikasi
const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dg-scaleIn">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={18} />
                </button>
                <div
                    className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}
                >
                    {s.icon}
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">
                        {modal.message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}
                >
                    OK
                </button>
            </div>
        </div>
    );
};

// Konstanta style
const inputCls =
    'w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400';
const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = {
    border: '1px solid #fde0c8',
    boxShadow: '0 2px 16px rgba(200,80,10,0.07)',
};
const HEADER_GRAD = {
    background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)',
};
const TH_GRAD = {
    background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)',
};

const btnPrimary = {
    base:
        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all',
    style: {
        background: 'linear-gradient(135deg,#e8690a,#f5a623)',
        boxShadow: '0 3px 12px rgba(232,105,10,0.3)',
    } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => {
        (e.currentTarget as HTMLButtonElement).style.background =
            'linear-gradient(135deg,#c95b08,#e8690a)';
    },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => {
        (e.currentTarget as HTMLButtonElement).style.background =
            'linear-gradient(135deg,#e8690a,#f5a623)';
    },
};

// Komponen tombol sekunder
const BtnSecondary = ({
    onClick,
    children,
    disabled,
}: {
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => {
            if (!disabled) e.currentTarget.style.background = '#fff0e5';
        }}
        onMouseLeave={e => {
            if (!disabled) e.currentTarget.style.background = '#fff';
        }}
    >
        {children}
    </button>
);

// Komponen utama
export default function InputNilaiClient() {
    const { showSessionExpired, handleLogout } = useSession();

    // State kondisi akses
    const [isNotAssigned, setIsNotAssigned] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);
    const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);

    const [loading, setLoading] = useState(true);
    const [mapelList, setMapelList] = useState<MapelItem[]>([]);
    const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);
    const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
    const [currentMapel, setCurrentMapel] = useState<MapelItem | null>(null);
    const [kelasNama, setKelasNama] = useState('');
    const [siswaList, setSiswaList] = useState<SiswaNilai[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaNilai[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [dataLoading, setDataLoading] = useState(false);

    // BARU: State untuk status konfigurasi penilaian
    const [kategoriStatus, setKategoriStatus] = useState<KategoriStatus | null>(null);
    const [kategoriLoading, setKategoriLoading] = useState(false);

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
    const [editingErrors, setEditingErrors] = useState<Record<number, string>>({});

    const [saving, setSaving] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmSiswaNama, setConfirmSiswaNama] = useState<string>('');

    // State untuk import nilai dari Excel
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    // ═══════════════════════════════════════════════════════════════════════════
    // BARU: FUNGSI CEK STATUS KONFIGURASI PENILAIAN
    // ═══════════════════════════════════════════════════════════════════════════

    const cekStatusKategori = useCallback(async (mapelId: number) => {
        setKategoriLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(
                `${API_BASE_URL}/nilai/cek-status-kategori?mapel_id=${mapelId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setKategoriStatus(data.data);
                }
            }
        } catch (err) {
            console.error('Error cekStatusKategori:', err);
        } finally {
            setKategoriLoading(false);
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════
    // BARU: FUNGSI BANGUN PESAN WARNING KONFIGURASI
    // ═══════════════════════════════════════════════════════════════════════════

    const buildKonfigurasiWarningMessage = (status: KategoriStatus): string => {
        const masalah: string[] = [];

        if (status.bobot.status !== 'lengkap') {
            masalah.push(
                `• Bobot komponen belum 100% (saat ini: ${status.bobot.total}%)\n` +
                `  Silakan atur di menu "Atur Penilaian" > "Bobot Akademik"`
            );
        }

        if (!status.kategori.covered) {
            masalah.push(
                `• Kategori nilai rapor belum lengkap\n` +
                `  Celah rentang: ${status.kategori.celah.join(', ')}\n` +
                `  Silakan atur di menu "Atur Penilaian" > "Kategori Akademik"`
            );
        }

        return (
            `Konfigurasi Penilaian Belum Lengkap\n\n` +
            `Masalah yang ditemukan:\n${masalah.join('\n\n')}\n\n` +
            `Solusi:\n` +
            `1. Buka menu "Atur Penilaian"\n` +
            `2. Atur bobot komponen agar total 100%\n` +
            `3. Atur kategori nilai rapor agar rentang 0-100 tercover\n` +
            `4. Setelah selesai, Anda dapat menginput nilai siswa`
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH TAHUN AJARAN AKTIF
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showModal({
                        type: 'warning',
                        title: 'Sesi Tidak Valid',
                        message: 'Silakan login terlebih dahulu.',
                    });
                    setLoading(false);
                    return;
                }

                const headers = { Authorization: `Bearer ${token}` };

                const taRes = await fetch(`${API_BASE_URL}/tahun-ajaran/aktif`, { headers });
                if (!taRes.ok) {
                    throw new Error('Gagal memuat tahun ajaran');
                }

                const taData = await taRes.json();
                if (!taData.success) {
                    throw new Error(taData.message || 'Gagal memuat tahun ajaran');
                }

                const { status_pts, status_pas } = taData.data;
                setStatusPTS(status_pts || 'nonaktif');
                setStatusPAS(status_pas || 'nonaktif');

                if (status_pts === 'aktif') {
                    setJenisPenilaianAktif('PTS');
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (status_pas === 'aktif') {
                    setJenisPenilaianAktif('PAS');
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (status_pts === 'selesai' || status_pas === 'selesai') {
                    setIsReadOnly(true);
                    setReadOnlyReason('locked');
                    setJenisPenilaianAktif(status_pts === 'selesai' ? 'PTS' : 'PAS');
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: 'Periode Penilaian Selesai',
                            message:
                                'Periode penilaian telah selesai dan data sudah dikunci.\n\n' +
                                'Anda dapat melihat nilai siswa dalam mode baca saja (read only), ' +
                                'tetapi tidak dapat mengedit.',
                        });
                    }, 500);
                } else {
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                    setJenisPenilaianAktif(null);
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: 'Periode Penilaian Belum Aktif',
                            message:
                                'Baik PTS maupun PAS belum dibuka oleh admin.\n\n' +
                                'Anda dapat melihat nilai siswa dalam mode baca saja (read only), ' +
                                'tetapi belum dapat menginput nilai.\n\n' +
                                'Silakan hubungi admin untuk membuka periode penilaian.',
                        });
                    }, 500);
                }

                const [mapelRes, komponenRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/mapel`, { headers }),
                    fetch(`${API_BASE_URL}/atur-penilaian/komponen`, { headers }),
                ]);

                if (!mapelRes.ok) {
                    const errData = await mapelRes.json().catch(() => ({}));
                    if (mapelRes.status === 403 && errData.code === ERROR_CODES.NOT_ASSIGNED) {
                        setIsNotAssigned(true);
                        setLoading(false);
                        return;
                    }
                    if (mapelRes.status !== 403) {
                        throw new Error(errData.message || 'Gagal memuat mata pelajaran');
                    }
                }

                if (!komponenRes.ok) {
                    throw new Error('Gagal memuat komponen penilaian');
                }

                const [mapelData, komponenData] = await Promise.all([
                    mapelRes.json().catch(() => ({ wajib: [], pilihan: [] })),
                    komponenRes.json(),
                ]);

                const wajib = mapelData.data?.wajib || [];
                const pilihan = mapelData.data?.pilihan || [];
                setMapelList([...wajib, ...pilihan]);
                setKomponenList(komponenData.data || []);
            } catch (err: any) {
                showModal({
                    type: 'network',
                    title: 'Koneksi Gagal',
                    message: err.message || 'Gagal memuat data.',
                });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showModal]);

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH NILAI SAAT MAPEL DIPILIH
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (mapelList.length === 0 || selectedMapelId === null) {
            setSiswaList([]);
            setFilteredSiswa([]);
            setCurrentMapel(null);
            setKelasNama('');
            setKategoriStatus(null);
            return;
        }

        const fetchNilai = async () => {
            setDataLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const headers = { Authorization: `Bearer ${token}` };
                const res = await fetch(`${API_BASE_URL}/nilai/${selectedMapelId}`, { headers });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ message: 'Gagal memuat' }));
                    if (res.status === 403 && err.code === ERROR_CODES.NOT_ASSIGNED) {
                        setIsNotAssigned(true);
                        return;
                    }
                    if (res.status === 403) {
                        showModal({
                            type: 'error',
                            title: 'Akses Ditolak',
                            message: err.message || 'Anda tidak memiliki akses ke mata pelajaran ini.',
                        });
                        return;
                    }
                    throw new Error(err.message || 'Gagal memuat data');
                }

                const data = await res.json();
                const mapped: SiswaNilai[] = (data.siswaList || []).map((s: any) => ({
                    id: s.id,
                    nama: s.nama,
                    nis: s.nis || '-',
                    nisn: s.nisn || '-',
                    nilai_rapor_pts: s.nilai_rapor_pts || 0,
                    deskripsi_pts: s.deskripsi_pts || '',
                    nilai_rapor_pas: s.nilai_rapor_pas || 0,
                    deskripsi_pas: s.deskripsi_pas || '',
                    nilai: s.nilai || {},
                }));

                setSiswaList(mapped);
                setFilteredSiswa(mapped);
                setKelasNama(data.kelas || '');
                setCurrentMapel(
                    mapelList.find(m => m.mata_pelajaran_id === selectedMapelId) || null
                );
                setCurrentPage(1);

                // BARU: Cek status konfigurasi penilaian
                cekStatusKategori(selectedMapelId);
            } catch (err: any) {
                showModal({
                    type: 'error',
                    title: 'Gagal Memuat',
                    message: err.message || 'Gagal memuat data nilai.',
                });
            } finally {
                setDataLoading(false);
            }
        };
        fetchNilai();
    }, [selectedMapelId, mapelList, showModal, cekStatusKategori]);

    // ═══════════════════════════════════════════════════════════════════════════
    // FILTER & PAGINATION
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(
                siswaList.filter(
                    s =>
                        s.nama.toLowerCase().includes(q) ||
                        s.nis.includes(q) ||
                        s.nisn.includes(q)
                )
            );
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase =
            'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors';
        const btnActive = 'text-white border-orange-500';
        const btnInactive =
            'text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white';

        pages.push(
            <button
                key="prev"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`${btnBase} ${btnInactive} disabled:opacity-40`}
            >
                «
            </button>
        );

        const range: number[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) range.push(i);
        } else {
            range.push(1);
            if (currentPage > 3) range.push(-1);
            for (
                let i = Math.max(2, currentPage - 1);
                i <= Math.min(totalPages - 1, currentPage + 1);
                i++
            ) {
                range.push(i);
            }
            if (currentPage < totalPages - 2) range.push(-2);
            range.push(totalPages);
        }

        range.forEach(p => {
            if (p < 0) {
                pages.push(
                    <span key={p} className="px-1 text-gray-400 text-sm">
                        ...
                    </span>
                );
            } else {
                pages.push(
                    <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
                        style={
                            currentPage === p
                                ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' }
                                : {}
                        }
                    >
                        {p}
                    </button>
                );
            }
        });

        pages.push(
            <button
                key="next"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`${btnBase} ${btnInactive} disabled:opacity-40`}
            >
                »
            </button>
        );
        return pages;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    const handleDetail = (siswa: SiswaNilai) => {
        setSelectedSiswa(siswa);
        setShowDetail(true);
    };

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => {
            setShowDetail(false);
            setDetailClosing(false);
        }, 200);
    };

    const handleEdit = (siswa: SiswaNilai) => {
        if (isReadOnly) {
            if (readOnlyReason === 'locked') {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message:
                        'Periode penilaian sudah selesai dan data sudah dikunci.\n\n' +
                        'Anda tidak dapat mengedit nilai siswa.',
                });
            } else {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message:
                        'Periode penilaian belum aktif.\n\n' +
                        'Anda belum dapat mengedit nilai siswa.\n\n' +
                        'Silakan tunggu admin membuka periode penilaian.',
                });
            }
            return;
        }

        if (!currentMapel?.bisa_input) {
            showModal({
                type: 'warning',
                title: 'Tidak Dapat Input',
                message:
                    'Mata pelajaran ini tidak dapat diinput nilainya oleh Anda.\n\n' +
                    'Silakan hubungi Administrator.',
            });
            return;
        }

        // BARU: Cek konfigurasi penilaian sebelum edit
        if (kategoriStatus && !kategoriStatus.configured) {
            showModal({
                type: 'error',
                title: 'Konfigurasi Penilaian Belum Lengkap',
                message: buildKonfigurasiWarningMessage(kategoriStatus),
            });
            return;
        }

        setEditingSiswa(siswa);
        setEditingNilai({ ...siswa.nilai });
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

    // Fungsi validasi nilai (0-100)
    const validateNilai = (komponenId: number, nilai: number | null): string | null => {
        if (nilai === null) return null;
        if (typeof nilai !== 'number' || isNaN(nilai)) {
            return 'Nilai harus berupa angka';
        }
        if (nilai < 0) {
            return 'Nilai tidak boleh negatif (< 0)';
        }
        if (nilai > 100) {
            return 'Nilai tidak boleh lebih dari 100';
        }
        return null;
    };

    const handleNilaiChange = (komponenId: number, value: string) => {
        if (value === '' || /^\d+$/.test(value)) {
            const newValue = value === '' ? null : parseInt(value);
            setEditingNilai(prev => ({
                ...prev,
                [komponenId]: newValue,
            }));

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
            setEditingErrors(prev => ({
                ...prev,
                [komponenId]: error,
            }));
            setEditingNilai(prev => ({
                ...prev,
                [komponenId]: null,
            }));
        } else {
            setEditingErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[komponenId];
                return newErrors;
            });
        }
    };

    const openConfirmSimpan = () => {
        if (!editingSiswa || !selectedMapelId) return;

        // Validasi nilai
        const validationErrors: string[] = [];
        for (const [idStr, nilai] of Object.entries(editingNilai)) {
            if (nilai !== null) {
                const komponenId = Number(idStr);
                const error = validateNilai(komponenId, nilai);
                if (error) {
                    const nama =
                        komponenList.find(k => k.id_komponen === komponenId)?.nama_komponen || idStr;
                    validationErrors.push(`• ${nama}: ${error}`);

                    setEditingErrors(prev => ({
                        ...prev,
                        [komponenId]: error,
                    }));
                }
            }
        }

        if (validationErrors.length > 0) {
            showModal({
                type: 'error',
                title: 'Nilai Tidak Valid',
                message: `Terdapat ${validationErrors.length} nilai yang tidak valid:\n\n${validationErrors.join(
                    '\n'
                )}\n\nSilakan perbaiki nilai yang ditandai merah.`,
            });
            return;
        }

        // Cek apakah ada perubahan
        const hasChanged = Object.entries(editingNilai).some(([idStr, nilaiBaru]) => {
            const nilaiLama = editingSiswa.nilai[Number(idStr)] ?? null;
            const n1 = nilaiBaru ?? null;
            const n2 = nilaiLama ?? null;
            return n1 !== n2;
        });

        if (!hasChanged) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Data yang Anda masukkan sama dengan data sebelumnya.',
            });
            return;
        }

        setConfirmSiswaNama(editingSiswa.nama);
        setShowConfirmModal(true);
    };

    const executeSimpanNilai = async () => {
        if (!editingSiswa || !selectedMapelId) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/nilai-komponen/${selectedMapelId}/${editingSiswa.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ nilai: editingNilai }),
                }
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Gagal menyimpan' }));

                // BARU: Handle error konfigurasi belum lengkap
                if (err.code === ERROR_CODES.KONFIGURASI_BELUM_LENGKAP) {
                    throw new Error(err.message);
                }

                throw new Error(err.message);
            }

            const data = await res.json();
            const updated: SiswaNilai = {
                ...editingSiswa,
                nilai: editingNilai,
                nilai_rapor_pts:
                    data.jenis_penilaian === 'PTS'
                        ? Math.floor(data.nilai_rapor ?? editingSiswa.nilai_rapor_pts)
                        : editingSiswa.nilai_rapor_pts,
                deskripsi_pts:
                    data.jenis_penilaian === 'PTS'
                        ? data.deskripsi ?? editingSiswa.deskripsi_pts
                        : editingSiswa.deskripsi_pts,
                nilai_rapor_pas:
                    data.jenis_penilaian === 'PAS'
                        ? Math.floor(data.nilai_rapor ?? editingSiswa.nilai_rapor_pas)
                        : editingSiswa.nilai_rapor_pas,
                deskripsi_pas:
                    data.jenis_penilaian === 'PAS'
                        ? data.deskripsi ?? editingSiswa.deskripsi_pas
                        : editingSiswa.deskripsi_pas,
            };

            setSiswaList(prev => prev.map(s => (s.id === editingSiswa.id ? updated : s)));
            setFilteredSiswa(prev =>
                prev.map(s => (s.id === editingSiswa.id ? updated : s))
            );
            setShowConfirmModal(false);
            setShowEdit(false);
            setEditingSiswa(null);
            setEditingErrors({});
            setConfirmSiswaNama('');

            setTimeout(() => {
                showModal({
                    type: 'success',
                    title: 'Nilai Disimpan!',
                    message: `Nilai ${updated.nama} berhasil disimpan.`,
                });
            }, 250);
        } catch (err: any) {
            setShowConfirmModal(false);
            setShowEdit(false);
            setEditingSiswa(null);
            setEditingErrors({});
            setConfirmSiswaNama('');
            setTimeout(() => {
                showModal({
                    type: 'error',
                    title: 'Gagal Menyimpan',
                    message: err.message || 'Gagal menyimpan nilai.',
                });
            }, 250);
        } finally {
            setSaving(false);
        }
    };

    // Handler untuk download template Excel
    const handleDownloadTemplate = async () => {
        if (!selectedMapelId) {
            showModal({
                type: 'warning',
                title: 'Pilih Mata Pelajaran',
                message: 'Silakan pilih mata pelajaran terlebih dahulu sebelum download template.',
            });
            return;
        }

        // BARU: Cek konfigurasi penilaian sebelum download template
        if (kategoriStatus && !kategoriStatus.configured) {
            showModal({
                type: 'error',
                title: 'Konfigurasi Penilaian Belum Lengkap',
                message: buildKonfigurasiWarningMessage(kategoriStatus),
            });
            return;
        }

        setDownloadingTemplate(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/nilai/import-template?mapel_id=${selectedMapelId}`,
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
            a.download = `Template_Import_Nilai_${currentMapel?.nama_mapel || 'Mapel'}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showModal({
                type: 'success',
                title: 'Template Berhasil Diunduh',
                message:
                    'Template Excel berhasil diunduh.\n\n' +
                    'Langkah selanjutnya:\n' +
                    '1. Buka file Excel\n' +
                    '2. Isi nilai pada kolom komponen (UH1-5, PTS, PAS)\n' +
                    '3. Simpan file\n' +
                    '4. Upload kembali melalui tombol "Import Nilai"',
            });
        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Mengunduh Template',
                message: err.message || 'Terjadi kesalahan saat mengunduh template.',
            });
        } finally {
            setDownloadingTemplate(false);
        }
    };

    // Handler untuk pilih file Excel
    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            showModal({
                type: 'warning',
                title: 'Format File Tidak Valid',
                message: 'Silakan upload file Excel (.xlsx atau .xls)',
            });
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showModal({
                type: 'warning',
                title: 'File Terlalu Besar',
                message: 'Ukuran file maksimal 10MB',
            });
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
            return;
        }

        setImportFile(file);
    };

    // Handler untuk buka modal import
    const openImportModal = () => {
        if (!selectedMapelId) {
            showModal({
                type: 'warning',
                title: 'Pilih Mata Pelajaran',
                message: 'Silakan pilih mata pelajaran terlebih dahulu sebelum import nilai.',
            });
            return;
        }

        if (isReadOnly) {
            showModal({
                type: 'warning',
                title: 'Mode Baca Saja',
                message:
                    readOnlyReason === 'locked'
                        ? 'Periode penilaian sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengimport nilai.'
                        : 'Periode penilaian belum aktif.\n\nAnda tidak dapat mengimport nilai.',
            });
            return;
        }

        if (!currentMapel?.bisa_input) {
            showModal({
                type: 'warning',
                title: 'Tidak Dapat Input',
                message: 'Mata pelajaran ini tidak dapat diinput nilainya oleh Anda.',
            });
            return;
        }

        // BARU: Cek konfigurasi penilaian sebelum import
        if (kategoriStatus && !kategoriStatus.configured) {
            showModal({
                type: 'error',
                title: 'Konfigurasi Penilaian Belum Lengkap',
                message: buildKonfigurasiWarningMessage(kategoriStatus),
            });
            return;
        }

        setImportFile(null);
        if (importFileInputRef.current) importFileInputRef.current.value = '';
        setShowImportModal(true);
    };

    // Fungsi download error report CSV
    const downloadErrorReport = (errors: any[], mapelName: string, kelasName: string) => {
        const headers = ['No', 'Baris', 'Kolom', 'Alasan Error'];

        const rows = errors.map((err, index) => {
            const message = err.message || '';

            const rowMatch = message.match(/Baris\s+(\d+)/i);
            const rowNumber = rowMatch ? rowMatch[1] : '-';

            const colMatch = message.match(/Kolom\s+"([^"]+)"/i);
            const column = colMatch ? colMatch[1] : '-';

            const escapedMessage = message.replace(/"/g, '""');

            return [index + 1, rowNumber, column, `"${escapedMessage}"`].join(',');
        });

        const BOM = '\uFEFF';
        const csvContent = BOM + [headers.join(','), ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().split('T')[0];
        const safeMapelName = (mapelName || 'Mapel').replace(/[^a-z0-9]/gi, '_');
        const safeKelasName = (kelasName || 'Kelas').replace(/[^a-z0-9]/gi, '_');
        const filename = `error_import_nilai_${safeMapelName}_${safeKelasName}_${timestamp}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Handler untuk eksekusi import
    const executeImportNilai = async () => {
        if (!importFile || !selectedMapelId) {
            showModal({
                type: 'warning',
                title: 'File Belum Dipilih',
                message: 'Silakan pilih file Excel yang akan diimport.',
            });
            return;
        }

        setImporting(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('mapel_id', String(selectedMapelId));

            const response = await fetch(`${API_BASE_URL}/nilai/import`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.message || 'Gagal mengimport nilai';

                // BARU: Handle error konfigurasi belum lengkap
                if (data.code === ERROR_CODES.KONFIGURASI_BELUM_LENGKAP) {
                    showModal({
                        type: 'error',
                        title: 'Konfigurasi Penilaian Belum Lengkap',
                        message: errorMessage,
                    });
                    setImporting(false);
                    return;
                }

                // Handle human error prevention
                if (errorMessage.includes('tidak ada data sama sekali')) {
                    showModal({
                        type: 'error',
                        title: 'File Excel Kosong',
                        message: errorMessage,
                    });
                } else if (errorMessage.includes('tidak ada data siswa')) {
                    showModal({
                        type: 'error',
                        title: 'Data Siswa Kosong',
                        message: errorMessage,
                    });
                } else if (errorMessage.includes('tidak ada nilai yang diisi')) {
                    showModal({
                        type: 'error',
                        title: 'File Tanpa Nilai',
                        message: errorMessage,
                    });
                } else {
                    showModal({
                        type: 'error',
                        title: 'Gagal Import',
                        message: errorMessage,
                    });
                }

                setImporting(false);
                return;
            }

            // Refresh data nilai
            const refreshRes = await fetch(`${API_BASE_URL}/nilai/${selectedMapelId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const mapped: SiswaNilai[] = (refreshData.siswaList || []).map((s: any) => ({
                    id: s.id,
                    nama: s.nama,
                    nis: s.nis || '-',
                    nisn: s.nisn || '-',
                    nilai_rapor_pts: s.nilai_rapor_pts || 0,
                    deskripsi_pts: s.deskripsi_pts || '',
                    nilai_rapor_pas: s.nilai_rapor_pas || 0,
                    deskripsi_pas: s.deskripsi_pas || '',
                    nilai: s.nilai || {},
                }));
                setSiswaList(mapped);
                setFilteredSiswa(mapped);
            }

            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            // Notifikasi simpel dengan info lengkap
            const errors = data.data?.errors || [];
            const warnings = data.data?.warnings || [];
            const totalErrors = errors.length;
            const totalWarnings = warnings.length;
            const nilaiDiRound = data.data?.nilai_di_round || 0;
            const nisDuplikat = data.data?.nis_duplikat_count || 0;
            const komponenDiabaikan = data.data?.komponen_diabaikan || [];
            const komponenTidakDikenali = data.data?.komponen_tidak_dikenali || [];

            // Auto-download CSV jika error > 5
            if (totalErrors > 5) {
                downloadErrorReport(errors, currentMapel?.nama_mapel || '', kelasNama);
            }

            // Build summary message
            const summaryLines: string[] = [];

            if (totalErrors === 0) {
                summaryLines.push(`Import berhasil!\n`);
                summaryLines.push(`${data.data?.berhasil || 0} siswa berhasil diimport`);
                summaryLines.push(`${data.data?.total_nilai_disimpan || 0} nilai disimpan\n`);
            } else {
                summaryLines.push(`Import selesai dengan catatan\n`);
                summaryLines.push(`Berhasil: ${data.data?.berhasil || 0} siswa`);
                summaryLines.push(`Gagal: ${totalErrors} siswa\n`);
            }

            const infoTambahan: string[] = [];

            if (nilaiDiRound > 0) {
                infoTambahan.push(
                    `• ${nilaiDiRound} nilai desimal dibulatkan (contoh: 85.7 menjadi 86)`
                );
            }

            if (nisDuplikat > 0) {
                infoTambahan.push(
                    `• ${nisDuplikat} NIS duplikat ditemukan (hanya data pertama yang diproses)`
                );
            }

            if (komponenDiabaikan.length > 0) {
                infoTambahan.push(
                    `• Kolom [${komponenDiabaikan.join(
                        ', '
                    )}] diabaikan karena periode ${data.data?.periode_aktif || '-'} sedang aktif`
                );
            }

            if (komponenTidakDikenali.length > 0) {
                infoTambahan.push(
                    `• Kolom [${komponenTidakDikenali.join(
                        ', '
                    )}] tidak dikenali sebagai komponen penilaian`
                );
            }

            if (infoTambahan.length > 0) {
                summaryLines.push(`Catatan:\n${infoTambahan.join('\n')}\n`);
            }

            if (totalErrors > 0) {
                if (totalErrors <= 5) {
                    summaryLines.push(
                        `Detail Error:\n${errors
                            .slice(0, 5)
                            .map((e: any, i: number) => `${i + 1}. ${e.message}`)
                            .join('\n')}\n`
                    );
                } else {
                    summaryLines.push(
                        `Contoh Error (3 dari ${totalErrors}):\n${errors
                            .slice(0, 3)
                            .map((e: any, i: number) => `${i + 1}. ${e.message}`)
                            .join('\n')}\n`
                    );
                    summaryLines.push(`File CSV error telah diunduh otomatis!`);
                    summaryLines.push(`   (error_import_nilai_*.csv)\n`);
                }
            }

            if (totalWarnings > 0) {
                summaryLines.push(
                    `Peringatan:\n${warnings
                        .slice(0, 3)
                        .map((w: any, i: number) => `${i + 1}. ${w.message}`)
                        .join('\n')}`
                );
                if (totalWarnings > 3) {
                    summaryLines.push(`   ... dan ${totalWarnings - 3} peringatan lainnya`);
                }
            }

            setTimeout(() => {
                showModal({
                    type: totalErrors > 0 ? 'warning' : 'success',
                    title: totalErrors > 0 ? 'Import Selesai' : 'Import Berhasil!',
                    message: summaryLines.join('\n'),
                });
            }, 250);
        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Import',
                message: err.message || 'Terjadi kesalahan saat mengimport nilai.',
            });
        } finally {
            setImporting(false);
        }
    };

    // Komponen badge nilai
    const NilaiBadge = ({ nilai }: { nilai: number }) => {
        if (nilai === null || nilai === undefined) {
            return <span className="text-gray-700 text-xs">-</span>;
        }
        const color = { bg: '#fff0e5', text: '#c95b08', border: '#fde0c8' };
        return (
            <span
                className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold"
                style={{
                    background: color.bg,
                    color: color.text,
                    border: `1px solid ${color.border}`,
                }}
            >
                {nilai}
            </span>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div
                className="flex-1 p-6 min-h-screen flex items-center justify-center"
                style={PAGE_BG}
            >
                <GlobalStyles />
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium" style={{ color: '#c95b08' }}>
                        Memuat data...
                    </p>
                </div>
            </div>
        );
    }

    // Kondisi 1: Belum ditugaskan
    if (isNotAssigned) {
        return (
            <div
                className="flex-1 p-6 min-h-screen flex items-center justify-center"
                style={PAGE_BG}
            >
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn">
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
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                boxShadow: '0 3px 12px rgba(232,105,10,0.3)',
                            }}
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render utama
    const minTableWidth = 400 + komponenList.length * 100 + 240;
    const canEditNilai = currentMapel?.bisa_input && !isReadOnly;

    // BARU: Tentukan apakah konfigurasi belum lengkap
    const konfigurasiBelumLengkap = kategoriStatus && !kategoriStatus.configured;

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Banner read only */}
            {isReadOnly && (
                <div
                    className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{
                        background: readOnlyReason === 'locked' ? '#fef2f2' : '#fef3c7',
                        border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'
                            }`,
                    }}
                >
                    <Lock
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${readOnlyReason === 'locked' ? 'text-red-600' : 'text-yellow-600'
                            }`}
                    />
                    <div className="flex-1">
                        <p
                            className={`text-sm font-bold mb-1 ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'
                                }`}
                        >
                            Mode Baca Saja (Read Only)
                        </p>
                        <p
                            className={`text-xs ${readOnlyReason === 'locked' ? 'text-red-800' : 'text-yellow-800'
                                }`}
                        >
                            {readOnlyReason === 'locked'
                                ? 'Periode penilaian telah selesai dan data sudah dikunci. Anda dapat melihat nilai siswa, tetapi tidak dapat mengedit.'
                                : 'Periode penilaian belum aktif. Anda dapat melihat nilai siswa, tetapi belum dapat menginput nilai. Silakan hubungi admin untuk membuka periode penilaian.'}
                        </p>
                    </div>
                </div>
            )}

            {/* BARU: Banner warning konfigurasi belum lengkap */}
            {konfigurasiBelumLengkap && !isReadOnly && selectedMapelId && (
                <div
                    className="mb-5 rounded-xl overflow-hidden"
                    style={{ border: '1px solid #fca5a5', background: '#fff' }}
                >
                    <div
                        className="flex items-center gap-3 px-5 py-4"
                        style={{ background: '#fee2e2' }}
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: '#fecaca' }}
                        >
                            <AlertCircle size={20} className="text-red-700" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-900 mb-1">
                                Konfigurasi Penilaian Belum Lengkap
                            </p>
                            <p className="text-xs text-red-700">
                                {kategoriStatus?.message || 'Ada masalah pada konfigurasi penilaian'}
                            </p>
                        </div>
                    </div>
                    <div className="px-5 py-4">
                        <div className="space-y-3">
                            {/* Info bobot */}
                            {kategoriStatus?.bobot.status !== 'lengkap' && (
                                <div
                                    className="flex items-start gap-3 p-3 rounded-lg"
                                    style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}
                                >
                                    <AlertCircle
                                        size={16}
                                        className="text-yellow-600 flex-shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-yellow-900 mb-1">
                                            Bobot Komponen Belum 100%
                                        </p>
                                        <p className="text-xs text-yellow-800">
                                            Total bobot saat ini:{' '}
                                            <strong>{kategoriStatus?.bobot.total || 0}%</strong>
                                        </p>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            Silakan atur di menu "Atur Penilaian" &gt; "Bobot Akademik"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Info kategori */}
                            {!kategoriStatus?.kategori.covered && (
                                <div
                                    className="flex items-start gap-3 p-3 rounded-lg"
                                    style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}
                                >
                                    <AlertCircle
                                        size={16}
                                        className="text-yellow-600 flex-shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-yellow-900 mb-1">
                                            Kategori Nilai Rapor Belum Lengkap
                                        </p>
                                        <p className="text-xs text-yellow-800 mb-2">
                                            Celah rentang yang belum tercover:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {kategoriStatus?.kategori.celah.map((celah, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 rounded text-xs font-bold"
                                                    style={{
                                                        background: '#fcd34d',
                                                        color: '#78350f',
                                                        border: '1px solid #f59e0b',
                                                    }}
                                                >
                                                    {celah}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-yellow-700 mt-2">
                                            Silakan atur di menu "Atur Penilaian" &gt; "Kategori Akademik"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Banner mata pelajaran belum diatur */}
            {mapelList.length === 0 && !isReadOnly && (
                <div
                    className="mb-6 p-4 rounded-2xl flex items-start gap-3"
                    style={{
                        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                        border: '2px solid #fdba74',
                        boxShadow: '0 2px 8px rgba(253,186,116,0.2)',
                    }}
                >
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={20} style={{ color: '#c2410c' }} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-sm mb-1" style={{ color: '#9a3412' }}>
                            Mata Pelajaran Belum Diatur
                        </h3>
                        <p className="text-xs" style={{ color: '#7c2d12' }}>
                            Belum ada mata pelajaran yang dikonfigurasi untuk tahun ajaran ini.
                            Silakan hubungi <strong>Administrator</strong> untuk menambahkan mata
                            pelajaran.
                        </p>
                    </div>
                </div>
            )}

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Input Nilai Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelola nilai komponen & rapor siswa per mata pelajaran
                </p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                <div
                    className="px-5 py-4"
                    style={{
                        borderBottom: '1px solid #fde0c8',
                        background: '#fffaf6',
                    }}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                            <label
                                className="text-sm font-semibold whitespace-nowrap"
                                style={{ color: '#7a3a0a' }}
                            >
                                Mata Pelajaran
                            </label>
                            <select
                                value={selectedMapelId === null ? '' : String(selectedMapelId)}
                                onChange={e => {
                                    const val = e.target.value;
                                    setSelectedMapelId(val ? Number(val) : null);
                                    setSearchQuery('');
                                }}
                                className={inputCls}
                                style={{ maxWidth: '400px' }}
                            >
                                <option value="">-- Pilih Mata Pelajaran --</option>
                                {mapelList.map(mapel => (
                                    <option
                                        key={mapel.mata_pelajaran_id}
                                        value={mapel.mata_pelajaran_id}
                                    >
                                        {mapel.nama_mapel} ({mapel.jenis})
                                    </option>
                                ))}
                            </select>

                            {/* Tombol import nilai */}
                            {selectedMapelId && canEditNilai && (
                                <button
                                    onClick={konfigurasiBelumLengkap ? undefined : openImportModal}
                                    disabled={!!konfigurasiBelumLengkap}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: konfigurasiBelumLengkap
                                            ? '#d1d5db'
                                            : 'linear-gradient(135deg,#10b981,#059669)',
                                        color: 'white',
                                        boxShadow: konfigurasiBelumLengkap
                                            ? 'none'
                                            : '0 3px 10px rgba(16,185,129,0.3)',
                                    }}
                                    onMouseEnter={e => {
                                        if (!konfigurasiBelumLengkap) {
                                            (e.currentTarget as HTMLButtonElement).style.background =
                                                'linear-gradient(135deg,#059669,#047857)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!konfigurasiBelumLengkap) {
                                            (e.currentTarget as HTMLButtonElement).style.background =
                                                'linear-gradient(135deg,#10b981,#059669)';
                                        }
                                    }}
                                    title={
                                        konfigurasiBelumLengkap
                                            ? 'Konfigurasi penilaian belum lengkap'
                                            : ''
                                    }
                                >
                                    {konfigurasiBelumLengkap ? (
                                        <>
                                            <AlertCircle size={16} />
                                            Belum Diatur
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} />
                                            Import Nilai
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {selectedMapelId && (
                            <div className="relative min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari siswa..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
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

                    {selectedMapelId && currentMapel && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
                                Kelas: <strong>{kelasNama}</strong>
                            </span>
                            {currentMapel.bisa_input ? (
                                <span
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                                    style={{
                                        background: '#eaf7ef',
                                        color: '#1a7a3a',
                                        border: '1px solid #b6e8c8',
                                    }}
                                >
                                    <CheckCircle2 size={11} /> Dapat Input Nilai
                                </span>
                            ) : (
                                <span
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                                    style={{
                                        background: '#fef2f2',
                                        color: '#dc2626',
                                        border: '1px solid #fca5a5',
                                    }}
                                >
                                    <AlertCircle size={11} /> Hanya Lihat
                                </span>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
                                    Tampilkan
                                </span>
                                <select
                                    value={itemsPerPage}
                                    onChange={e => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
                                    data
                                </span>
                            </div>
                        </div>
                    )}

                    {selectedMapelId && currentMapel && (
                        <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                            Menampilkan{' '}
                            {filteredSiswa.length === 0 ? 0 : startIndex + 1}–
                            {Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length}{' '}
                            siswa
                        </p>
                    )}
                </div>

                {!selectedMapelId ? (
                    <div
                        className="m-6 text-center py-10 rounded-2xl"
                        style={{ background: '#fff7f0', border: '2px dashed #fde0c8' }}
                    >
                        <p className="font-bold" style={{ color: '#c95b08' }}>
                            Pilih Mata Pelajaran Terlebih Dahulu
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table
                                className="w-full text-sm border-collapse"
                                style={{ minWidth: `${minTableWidth}px` }}
                            >
                                <thead>
                                    <tr style={TH_GRAD}>
                                        {[
                                            'No.',
                                            'Nama Siswa',
                                            'NIS',
                                            'NISN',
                                            ...komponenList.map(k => k.nama_komponen),
                                            'Rapor PTS',
                                            'Rapor PAS',
                                            'Aksi',
                                        ].map((h, i) => (
                                            <th
                                                key={i}
                                                className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataLoading ? (
                                        <tr>
                                            <td
                                                colSpan={7 + komponenList.length}
                                                className="py-12 text-center text-gray-400 text-sm"
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                                    Memuat data nilai...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentSiswa.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7 + komponenList.length}
                                                className="py-12 text-center text-gray-400 text-sm"
                                            >
                                                {searchQuery
                                                    ? 'Siswa tidak ditemukan.'
                                                    : 'Belum ada data siswa.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        currentSiswa.map((siswa, idx) => (
                                            <tr
                                                key={siswa.id}
                                                className="transition-colors"
                                                style={{
                                                    borderBottom: '1px solid #fde0c8',
                                                    background: idx % 2 === 0 ? '#fff' : '#fffaf6',
                                                }}
                                                onMouseEnter={e =>
                                                    (e.currentTarget.style.background = '#fff0e5')
                                                }
                                                onMouseLeave={e =>
                                                (e.currentTarget.style.background =
                                                    idx % 2 === 0 ? '#fff' : '#fffaf6')
                                                }
                                            >
                                                <td className="px-4 py-3 text-center text-gray-500 font-medium">
                                                    {startIndex + idx + 1}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-800">
                                                    {siswa.nama}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-600">
                                                    {siswa.nis}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-600">
                                                    {siswa.nisn}
                                                </td>
                                                {komponenList.map(k => (
                                                    <td
                                                        key={`${siswa.id}-${k.id_komponen}`}
                                                        className="px-4 py-3 text-center text-gray-700"
                                                    >
                                                        {siswa.nilai[k.id_komponen] !== null &&
                                                            siswa.nilai[k.id_komponen] !== undefined
                                                            ? siswa.nilai[k.id_komponen]
                                                            : <span className="text-gray-700">-</span>}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3 text-center">
                                                    <NilaiBadge nilai={siswa.nilai_rapor_pts} />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <NilaiBadge nilai={siswa.nilai_rapor_pas} />
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleDetail(siswa)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                            style={{
                                                                background: '#eaf7ef',
                                                                border: '1px solid #b6e8c8',
                                                                color: '#1a7a3a',
                                                            }}
                                                            onMouseEnter={e =>
                                                                (e.currentTarget.style.background = '#d4f0de')
                                                            }
                                                            onMouseLeave={e =>
                                                                (e.currentTarget.style.background = '#eaf7ef')
                                                            }
                                                        >
                                                            <Eye size={13} /> Detail
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(siswa)}
                                                            disabled={!canEditNilai || !!konfigurasiBelumLengkap}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            style={{
                                                                background:
                                                                    canEditNilai && !konfigurasiBelumLengkap
                                                                        ? '#fff0e5'
                                                                        : '#e5e7eb',
                                                                border:
                                                                    canEditNilai && !konfigurasiBelumLengkap
                                                                        ? '1px solid #f5a623'
                                                                        : '1px solid #d1d5db',
                                                                color:
                                                                    canEditNilai && !konfigurasiBelumLengkap
                                                                        ? '#b35a08'
                                                                        : '#6b7280',
                                                            }}
                                                            onMouseEnter={e => {
                                                                if (canEditNilai && !konfigurasiBelumLengkap) {
                                                                    e.currentTarget.style.background = '#ffe4c8';
                                                                }
                                                            }}
                                                            onMouseLeave={e => {
                                                                if (canEditNilai && !konfigurasiBelumLengkap) {
                                                                    e.currentTarget.style.background = '#fff0e5';
                                                                }
                                                            }}
                                                            title={
                                                                konfigurasiBelumLengkap
                                                                    ? 'Konfigurasi penilaian belum lengkap'
                                                                    : !canEditNilai
                                                                        ? 'Tidak dapat input nilai'
                                                                        : ''
                                                            }
                                                        >
                                                            {konfigurasiBelumLengkap ? (
                                                                <>
                                                                    <AlertCircle size={13} /> Belum Diatur
                                                                </>
                                                            ) : canEditNilai ? (
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
                            <div
                                className="flex items-center justify-between px-5 py-3"
                                style={{ borderTop: '1px solid #fde0c8' }}
                            >
                                <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                                    Halaman {currentPage} dari {totalPages}
                                </span>
                                <div className="flex items-center gap-1">{renderPagination()}</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal detail */}
            {showDetail && selectedSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'
                        }`}
                    onClick={e => {
                        if (e.target === e.currentTarget) closeDetail();
                    }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}
                        style={CARD_STYLE}
                    >
                        <div
                            className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 rounded-t-2xl"
                            style={HEADER_GRAD}
                        >
                            <div>
                                <h2 className="text-lg font-bold text-white">Detail Nilai Siswa</h2>
                                <p className="text-xs text-orange-100 mt-0.5">
                                    {selectedSiswa.nama} - {kelasNama}
                                </p>
                            </div>
                            <button
                                onClick={closeDetail}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    className="p-4 rounded-xl"
                                    style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}
                                >
                                    <p className="text-xs text-gray-500 mb-1">NIS</p>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                                        {selectedSiswa.nis}
                                    </p>
                                </div>
                                <div
                                    className="p-4 rounded-xl"
                                    style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}
                                >
                                    <p className="text-xs text-gray-500 mb-1">NISN</p>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                                        {selectedSiswa.nisn}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3
                                    className="text-sm font-bold mb-3 flex items-center gap-2"
                                    style={{ color: '#7a3a0a' }}
                                >
                                    <span
                                        className="w-1 h-5 rounded-full"
                                        style={{ background: '#e8690a' }}
                                    ></span>
                                    Nilai Rapor
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        className="rounded-xl p-5 border-2"
                                        style={{
                                            background: '#fff7ed',
                                            borderColor: '#fdba74',
                                            boxShadow: '0 2px 8px rgba(232,105,10,0.1)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{ background: '#fed7aa' }}
                                                >
                                                    <span
                                                        className="text-xs font-bold"
                                                        style={{ color: '#c2410c' }}
                                                    >
                                                        PTS
                                                    </span>
                                                </div>
                                                <span
                                                    className="text-sm font-bold"
                                                    style={{ color: '#7a3a0a' }}
                                                >
                                                    Rapor PTS
                                                </span>
                                            </div>
                                            <span
                                                className="px-2.5 py-1 rounded-full text-xs font-bold"
                                                style={{
                                                    background:
                                                        statusPTS === 'aktif'
                                                            ? '#fed7aa'
                                                            : statusPTS === 'selesai'
                                                                ? '#e5e7eb'
                                                                : '#fef3c7',
                                                    color:
                                                        statusPTS === 'aktif'
                                                            ? '#c2410c'
                                                            : statusPTS === 'selesai'
                                                                ? '#6b7280'
                                                                : '#92400e',
                                                }}
                                            >
                                                {statusPTS === 'aktif'
                                                    ? 'Aktif'
                                                    : statusPTS === 'selesai'
                                                        ? 'Selesai'
                                                        : 'Menunggu'}
                                            </span>
                                        </div>
                                        <div className="text-center py-3">
                                            <div
                                                className="text-4xl font-bold mb-2"
                                                style={{ color: '#c2410c' }}
                                            >
                                                {selectedSiswa.nilai_rapor_pts !== null &&
                                                    selectedSiswa.nilai_rapor_pts !== undefined
                                                    ? selectedSiswa.nilai_rapor_pts
                                                    : '-'}
                                            </div>
                                        </div>
                                        <div
                                            className="pt-3 border-t"
                                            style={{ borderColor: '#fde0c8' }}
                                        >
                                            <p
                                                className="text-xs font-semibold mb-1"
                                                style={{ color: '#7a3a0a' }}
                                            >
                                                Deskripsi:
                                            </p>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                {selectedSiswa.deskripsi_pts || (
                                                    <span className="text-gray-400 italic">
                                                        Belum ada deskripsi
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className="rounded-xl p-5 border-2"
                                        style={{
                                            background:
                                                selectedSiswa.nilai_rapor_pas !== null &&
                                                    selectedSiswa.nilai_rapor_pas !== undefined &&
                                                    selectedSiswa.nilai_rapor_pas > 0
                                                    ? '#fff7ed'
                                                    : '#f9fafb',
                                            borderColor:
                                                selectedSiswa.nilai_rapor_pas !== null &&
                                                    selectedSiswa.nilai_rapor_pas !== undefined &&
                                                    selectedSiswa.nilai_rapor_pas > 0
                                                    ? '#fdba74'
                                                    : '#e5e7eb',
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{
                                                        background:
                                                            selectedSiswa.nilai_rapor_pas !== null &&
                                                                selectedSiswa.nilai_rapor_pas !== undefined &&
                                                                selectedSiswa.nilai_rapor_pas > 0
                                                                ? '#fed7aa'
                                                                : '#e5e7eb',
                                                    }}
                                                >
                                                    <span
                                                        className="text-xs font-bold"
                                                        style={{
                                                            color:
                                                                selectedSiswa.nilai_rapor_pas !== null &&
                                                                    selectedSiswa.nilai_rapor_pas !== undefined &&
                                                                    selectedSiswa.nilai_rapor_pas > 0
                                                                    ? '#c2410c'
                                                                    : '#6b7280',
                                                        }}
                                                    >
                                                        PAS
                                                    </span>
                                                </div>
                                                <span
                                                    className="text-sm font-bold"
                                                    style={{
                                                        color:
                                                            selectedSiswa.nilai_rapor_pas !== null &&
                                                                selectedSiswa.nilai_rapor_pas !== undefined &&
                                                                selectedSiswa.nilai_rapor_pas > 0
                                                                ? '#7a3a0a'
                                                                : '#9ca3af',
                                                    }}
                                                >
                                                    Rapor PAS
                                                </span>
                                            </div>
                                            <span
                                                className="px-2.5 py-1 rounded-full text-xs font-bold"
                                                style={{
                                                    background:
                                                        statusPAS === 'aktif'
                                                            ? '#fed7aa'
                                                            : statusPAS === 'selesai'
                                                                ? '#e5e7eb'
                                                                : '#fef3c7',
                                                    color:
                                                        statusPAS === 'aktif'
                                                            ? '#c2410c'
                                                            : statusPAS === 'selesai'
                                                                ? '#6b7280'
                                                                : '#92400e',
                                                }}
                                            >
                                                {statusPAS === 'aktif'
                                                    ? 'Aktif'
                                                    : statusPAS === 'selesai'
                                                        ? 'Selesai'
                                                        : 'Menunggu'}
                                            </span>
                                        </div>
                                        <div className="text-center py-3">
                                            <div
                                                className="text-4xl font-bold mb-2"
                                                style={{
                                                    color:
                                                        selectedSiswa.nilai_rapor_pas !== null &&
                                                            selectedSiswa.nilai_rapor_pas !== undefined &&
                                                            selectedSiswa.nilai_rapor_pas > 0
                                                            ? '#c2410c'
                                                            : '#d1d5db',
                                                }}
                                            >
                                                {selectedSiswa.nilai_rapor_pas !== null &&
                                                    selectedSiswa.nilai_rapor_pas !== undefined &&
                                                    selectedSiswa.nilai_rapor_pas > 0
                                                    ? selectedSiswa.nilai_rapor_pas
                                                    : '-'}
                                            </div>
                                        </div>
                                        <div
                                            className="pt-3 border-t"
                                            style={{ borderColor: '#fde0c8' }}
                                        >
                                            <p
                                                className="text-xs font-semibold mb-1"
                                                style={{ color: '#7a3a0a' }}
                                            >
                                                Deskripsi:
                                            </p>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                {selectedSiswa.deskripsi_pas || (
                                                    <span className="text-gray-400 italic">
                                                        Belum ada deskripsi
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3
                                    className="text-sm font-bold mb-4 flex items-center gap-2"
                                    style={{ color: '#7a3a0a' }}
                                >
                                    <span
                                        className="w-1 h-5 rounded-full"
                                        style={{ background: '#e8690a' }}
                                    ></span>
                                    Nilai Komponen Penilaian
                                </h3>
                                <div className="mb-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div
                                            className="w-1 h-4 rounded-full"
                                            style={{ background: '#fbbf24' }}
                                        ></div>
                                        <p
                                            className="text-xs font-bold uppercase tracking-wide"
                                            style={{ color: '#7a3a0a' }}
                                        >
                                            Ulangan Harian
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-5 gap-3">
                                        {komponenList
                                            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
                                            .map(k => {
                                                const nilai = selectedSiswa.nilai[k.id_komponen];
                                                return (
                                                    <div
                                                        key={k.id_komponen}
                                                        className="rounded-xl p-4 text-center border-2 transition-all"
                                                        style={{
                                                            background:
                                                                nilai !== null && nilai !== undefined
                                                                    ? '#fff'
                                                                    : '#f9fafb',
                                                            borderColor:
                                                                nilai !== null && nilai !== undefined
                                                                    ? '#fde0c8'
                                                                    : '#e5e7eb',
                                                            boxShadow:
                                                                nilai !== null && nilai !== undefined
                                                                    ? '0 2px 8px rgba(232,105,10,0.08)'
                                                                    : 'none',
                                                        }}
                                                    >
                                                        <div
                                                            className="text-xs font-bold mb-2"
                                                            style={{ color: '#7a3a0a' }}
                                                        >
                                                            {k.nama_komponen}
                                                        </div>
                                                        <div
                                                            className="text-2xl font-bold"
                                                            style={{
                                                                color:
                                                                    nilai !== null && nilai !== undefined
                                                                        ? '#c95b08'
                                                                        : '#d1d5db',
                                                            }}
                                                        >
                                                            {nilai !== null && nilai !== undefined ? nilai : '-'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div
                                            className="w-1 h-4 rounded-full"
                                            style={{ background: '#e8690a' }}
                                        ></div>
                                        <p
                                            className="text-xs font-bold uppercase tracking-wide"
                                            style={{ color: '#7a3a0a' }}
                                        >
                                            Penilaian Tengah & Akhir Semester
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {komponenList
                                            .filter(k => /PTS|PAS/i.test(k.nama_komponen))
                                            .map(k => {
                                                const nilai = selectedSiswa.nilai[k.id_komponen];
                                                return (
                                                    <div
                                                        key={k.id_komponen}
                                                        className="rounded-xl p-5 text-center border-2 relative overflow-hidden"
                                                        style={{
                                                            background: '#fff7ed',
                                                            borderColor: '#fdba74',
                                                            boxShadow: '0 2px 8px rgba(232,105,10,0.1)',
                                                        }}
                                                    >
                                                        <div className="relative">
                                                            <div className="text-center mb-3">
                                                                <span
                                                                    className="text-sm font-bold uppercase tracking-wide"
                                                                    style={{ color: '#c2410c' }}
                                                                >
                                                                    {k.nama_komponen}
                                                                </span>
                                                            </div>
                                                            <div
                                                                className="text-3xl font-bold mb-2"
                                                                style={{
                                                                    color:
                                                                        nilai !== null && nilai !== undefined
                                                                            ? '#c2410c'
                                                                            : '#d1d5db',
                                                                }}
                                                            >
                                                                {nilai !== null && nilai !== undefined ? nilai : '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            className="flex justify-end gap-3 px-6 py-4 border-t"
                            style={{ borderColor: '#fde0c8', background: '#fffaf6' }}
                        >
                            <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                            {canEditNilai && !konfigurasiBelumLengkap && (
                                <button
                                    onClick={() => {
                                        handleEdit(selectedSiswa);
                                        closeDetail();
                                    }}
                                    className={btnPrimary.base}
                                    style={btnPrimary.style}
                                    onMouseEnter={btnPrimary.hover}
                                    onMouseLeave={btnPrimary.leave}
                                >
                                    <Pencil size={14} /> Edit Nilai
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal edit */}
            {showEdit && editingSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'
                        }`}
                    onClick={e => {
                        if (e.target === e.currentTarget) closeEdit();
                    }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}
                        style={CARD_STYLE}
                    >
                        <div
                            className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 rounded-t-2xl"
                            style={HEADER_GRAD}
                        >
                            <div>
                                <h2 className="text-lg font-bold text-white">Edit Nilai Siswa</h2>
                                <p className="text-xs text-orange-100 mt-0.5">
                                    {editingSiswa.nama} - {kelasNama}
                                </p>
                            </div>
                            <button
                                onClick={closeEdit}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {jenisPenilaianAktif && (
                                <div
                                    className="rounded-xl px-4 py-3 flex items-center gap-3"
                                    style={{ background: '#fff7ed', border: '1px solid #fdba74' }}
                                >
                                    <AlertCircle
                                        size={18}
                                        style={{ color: '#c2410c', flexShrink: 0 }}
                                    />
                                    <p className="text-sm" style={{ color: '#7a3a0a' }}>
                                        <strong>Periode {jenisPenilaianAktif} Aktif</strong> —
                                        {jenisPenilaianAktif === 'PTS'
                                            ? ' Hanya nilai PTS yang dapat diubah.'
                                            : ' Nilai PTS terkunci, hanya UH & PAS yang bisa diubah.'}
                                    </p>
                                </div>
                            )}

                            {/* Info validasi nilai */}
                            <div
                                className="rounded-xl px-4 py-3 flex items-start gap-3"
                                style={{ background: '#eff6ff', border: '1px solid #93c5fd' }}
                            >
                                <AlertCircle
                                    size={18}
                                    style={{ color: '#1d4ed8', flexShrink: 0 }}
                                    className="mt-0.5"
                                />
                                <p className="text-xs" style={{ color: '#1e40af' }}>
                                    <strong>Validasi Nilai:</strong> Nilai harus berupa angka antara{' '}
                                    <strong>0-100</strong>. Jika Anda input nilai di luar rentang,
                                    sistem akan menampilkan pesan error dan nilai akan direset.
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div
                                        className="w-1 h-5 rounded-full"
                                        style={{ background: '#fbbf24' }}
                                    ></div>
                                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                                        Ulangan Harian
                                    </h3>
                                </div>
                                <div className="grid grid-cols-5 gap-3">
                                    {komponenList
                                        .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
                                        .map(komponen => {
                                            const isDisabled = jenisPenilaianAktif === 'PTS';
                                            const nilai = editingNilai[komponen.id_komponen];
                                            const error = editingErrors[komponen.id_komponen];
                                            return (
                                                <div key={komponen.id_komponen}>
                                                    <label
                                                        className="block text-xs font-bold mb-2 text-center"
                                                        style={{
                                                            color: isDisabled ? '#9ca3af' : '#7a3a0a',
                                                        }}
                                                    >
                                                        {komponen.nama_komponen}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={nilai ?? ''}
                                                        onChange={e =>
                                                            handleNilaiChange(komponen.id_komponen, e.target.value)
                                                        }
                                                        onBlur={() => handleNilaiBlur(komponen.id_komponen)}
                                                        disabled={isDisabled}
                                                        placeholder="-"
                                                        maxLength={3}
                                                        className={`w-full px-3 py-3 rounded-xl text-center font-bold transition-all border-2 ${isDisabled
                                                            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                                                            : error
                                                                ? 'bg-red-50 border-red-500 text-gray-800 focus:ring-2 focus:ring-red-400 focus:border-red-400'
                                                                : 'bg-white border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                                                            }`}
                                                        style={
                                                            isDisabled
                                                                ? {}
                                                                : error
                                                                    ? {
                                                                        boxShadow:
                                                                            '0 0 0 3px rgba(239, 68, 68, 0.1)',
                                                                    }
                                                                    : {
                                                                        boxShadow:
                                                                            '0 2px 8px rgba(232,105,10,0.08)',
                                                                    }
                                                        }
                                                    />
                                                    {error && (
                                                        <p className="text-xs text-red-600 mt-1 text-center font-semibold">
                                                            {error}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div
                                        className="w-1 h-5 rounded-full"
                                        style={{ background: '#e8690a' }}
                                    ></div>
                                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                                        Penilaian Tengah & Akhir Semester
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {komponenList
                                        .filter(k => /PTS|PAS/i.test(k.nama_komponen))
                                        .map(komponen => {
                                            const isPTS = /PTS/i.test(komponen.nama_komponen);
                                            const isActive =
                                                (jenisPenilaianAktif === 'PTS' && isPTS) ||
                                                (jenisPenilaianAktif === 'PAS' && !isPTS);
                                            const isDisabled = !isActive;
                                            const nilai = editingNilai[komponen.id_komponen];
                                            const error = editingErrors[komponen.id_komponen];
                                            return (
                                                <div
                                                    key={komponen.id_komponen}
                                                    className={`rounded-xl p-5 border-2 transition-all relative overflow-hidden ${isActive
                                                        ? error
                                                            ? 'border-red-500 bg-red-50'
                                                            : 'border-orange-400 shadow-lg'
                                                        : 'border-gray-200 bg-gray-50'
                                                        }`}
                                                >
                                                    {isActive && !error && (
                                                        <div
                                                            className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
                                                            style={{
                                                                background: '#e8690a',
                                                                transform: 'translate(30%, -30%)',
                                                            }}
                                                        ></div>
                                                    )}
                                                    <div className="relative">
                                                        <div className="text-center mb-4">
                                                            <span
                                                                className="text-base font-bold uppercase tracking-wide"
                                                                style={{
                                                                    color: isActive
                                                                        ? error
                                                                            ? '#dc2626'
                                                                            : '#c2410c'
                                                                        : '#9ca3af',
                                                                }}
                                                            >
                                                                {komponen.nama_komponen}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            value={nilai ?? ''}
                                                            onChange={e =>
                                                                handleNilaiChange(
                                                                    komponen.id_komponen,
                                                                    e.target.value
                                                                )
                                                            }
                                                            onBlur={() =>
                                                                handleNilaiBlur(komponen.id_komponen)
                                                            }
                                                            disabled={isDisabled}
                                                            placeholder="0"
                                                            maxLength={3}
                                                            className={`w-full px-4 py-4 rounded-xl text-3xl font-bold text-center transition-all border-2 ${isDisabled
                                                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                                : error
                                                                    ? 'bg-red-50 border-red-500 text-gray-800 focus:ring-2 focus:ring-red-400 focus:border-red-400'
                                                                    : 'bg-white border-orange-200 text-orange-700 focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                                                                }`}
                                                            style={
                                                                isActive
                                                                    ? error
                                                                        ? {
                                                                            boxShadow:
                                                                                '0 0 0 3px rgba(239, 68, 68, 0.1)',
                                                                        }
                                                                        : {
                                                                            boxShadow:
                                                                                '0 4px 12px rgba(232,105,10,0.15)',
                                                                        }
                                                                    : {}
                                                            }
                                                        />
                                                        {error && (
                                                            <p className="text-xs text-red-600 mt-2 text-center font-semibold">
                                                                {error}
                                                            </p>
                                                        )}
                                                        {isActive && !error && (
                                                            <div className="flex items-center justify-center gap-1.5 mt-3">
                                                                <CheckCircle2
                                                                    size={12}
                                                                    style={{ color: '#16a34a' }}
                                                                />
                                                                <span
                                                                    className="text-xs font-semibold"
                                                                    style={{ color: '#16a34a' }}
                                                                >
                                                                    Dapat diubah
                                                                </span>
                                                            </div>
                                                        )}
                                                        {isDisabled && (
                                                            <div className="flex items-center justify-center gap-1.5 mt-3">
                                                                <Lock size={12} style={{ color: '#9ca3af' }} />
                                                                <span
                                                                    className="text-xs font-semibold"
                                                                    style={{ color: '#9ca3af' }}
                                                                >
                                                                    Terkunci
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>

                        <div
                            className="flex justify-end gap-3 px-6 py-4 border-t"
                            style={{ borderColor: '#fde0c8', background: '#fffaf6' }}
                        >
                            <BtnSecondary onClick={closeEdit} disabled={saving}>
                                Batal
                            </BtnSecondary>
                            <button
                                onClick={openConfirmSimpan}
                                disabled={saving}
                                className={`px-6 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                style={btnPrimary.style}
                                onMouseEnter={e => {
                                    if (!saving) btnPrimary.hover(e);
                                }}
                                onMouseLeave={e => {
                                    if (!saving) btnPrimary.leave(e);
                                }}
                            >
                                {saving ? (
                                    <>
                                        <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>Simpan Nilai</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal konfirmasi */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={e => {
                        if (e.target === e.currentTarget && !saving) {
                            setShowConfirmModal(false);
                        }
                    }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                                Konfirmasi Penyimpanan Nilai
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
                            Apakah Anda yakin ingin menyimpan nilai {confirmSiswaNama}?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    borderColor: '#fde0c8',
                                    color: '#7a3a0a',
                                    background: '#fff',
                                }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeSimpanNilai}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                    boxShadow: '0 3px 10px rgba(232,105,10,0.3)',
                                }}
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

            {/* Modal import nilai dari Excel */}
            {showImportModal && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={e => {
                        if (e.target === e.currentTarget && !importing) {
                            setShowImportModal(false);
                        }
                    }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                                    <Upload size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        Import Nilai dari Excel
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {currentMapel?.nama_mapel} - {kelasNama}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (!importing) setShowImportModal(false);
                                }}
                                disabled={importing}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                            >
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Info box */}
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

                        {/* Info periode */}
                        {jenisPenilaianAktif && (
                            <div className="mb-5 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2">
                                <AlertCircle
                                    size={16}
                                    className="text-orange-600 flex-shrink-0 mt-0.5"
                                />
                                <p className="text-xs text-orange-800">
                                    <strong>Periode {jenisPenilaianAktif} Aktif:</strong>{' '}
                                    {jenisPenilaianAktif === 'PTS'
                                        ? 'Hanya kolom PTS yang akan diimport. Kolom UH dan PAS akan diabaikan.'
                                        : 'Kolom UH dan PAS akan diimport. Kolom PTS akan diabaikan (terkunci).'}
                                </p>
                            </div>
                        )}

                        {/* Tombol download template */}
                        <div className="mb-5">
                            <button
                                onClick={handleDownloadTemplate}
                                disabled={downloadingTemplate}
                                className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                                    boxShadow: '0 3px 10px rgba(245,158,11,0.3)',
                                }}
                                onMouseEnter={e => {
                                    if (!downloadingTemplate) {
                                        (e.currentTarget as HTMLButtonElement).style.background =
                                            'linear-gradient(135deg,#d97706,#b45309)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!downloadingTemplate) {
                                        (e.currentTarget as HTMLButtonElement).style.background =
                                            'linear-gradient(135deg,#f59e0b,#d97706)';
                                    }
                                }}
                            >
                                {downloadingTemplate ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Mengunduh Template...
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Download Template Excel
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Upload area */}
                        <div className="mb-5">
                            <label
                                className="block text-sm font-semibold mb-2"
                                style={{ color: '#7a3a0a' }}
                            >
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
                                        <p className="text-sm font-bold text-green-900">
                                            {importFile.name}
                                        </p>
                                        <p className="text-xs text-green-700">
                                            {(importFile.size / 1024).toFixed(1)} KB - Klik untuk ganti
                                            file
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload size={32} className="text-orange-400" />
                                        <p className="text-sm font-bold text-orange-900">
                                            Klik untuk pilih file Excel
                                        </p>
                                        <p className="text-xs text-orange-700">
                                            Format: .xlsx atau .xls (Maks 10MB)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportFile(null);
                                }}
                                disabled={importing}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    borderColor: '#fde0c8',
                                    color: '#7a3a0a',
                                    background: '#fff',
                                }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeImportNilai}
                                disabled={!importFile || importing}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg,#10b981,#059669)',
                                    boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                                }}
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