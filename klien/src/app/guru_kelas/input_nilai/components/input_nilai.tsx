/**
 * Nama File: input_nilai_client.tsx
 * Fungsi: Input nilai siswa per mata pelajaran untuk guru kelas
 *         Menangani input nilai komponen, perhitungan nilai rapor otomatis,
 *         dan import nilai dari Excel dengan validasi konfigurasi penilaian
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 * Update: 15 Juli 2026 - Sinkronisasi dengan template dinamis backend & pesan user yang lebih jelas
 * Update: 18 Agustus 2026 - Restyle UI mengikuti design system terbaru (warna, card, ActionButton, grid table, animasi)
 * Update: 18 Agustus 2026 - Modal konfirmasi disatukan ke NotifModal (tipe 'confirm') agar konsisten
 *         dengan sistem notifikasi di seluruh halaman lain. Tidak ada perubahan logika/validasi.
 */
'use client';

import { useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
    Eye, Pencil, X, Search, CheckCircle2, AlertCircle, WifiOff,
    ShieldAlert, LogOut, Lock, Upload, Download, Info, Save,
    ChevronLeft, ChevronRight, Users, ClipboardList,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// Konstanta API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/guru-kelas';

// Konstanta untuk kode error
const ERROR_CODES = {
    NOT_ASSIGNED: 'NOT_ASSIGNED',
    KONFIGURASI_BELUM_LENGKAP: 'KONFIGURASI_BELUM_LENGKAP',
    PERIOD_LOCKED: 'PERIOD_LOCKED',
    PERIOD_NOT_OPEN: 'PERIOD_NOT_OPEN',
};

// Types
// ✅ PERBAIKAN TAMPILAN: tambahkan tipe 'confirm' supaya popup konfirmasi
// memakai sistem notifikasi yang SAMA dengan NotifModal (bukan modal
// terpisah seperti sebelumnya). Tidak ada perubahan pada logika/validasi.
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
    nilai_rapor_pts: number | null;
    deskripsi_pts: string;
    nilai_rapor_pas: number | null;
    deskripsi_pas: string;
    nilai: Record<number, number | null>;
}

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

/* ==========================================================================
   DESIGN TOKENS — disamakan penuh dengan design system terbaru
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const labelCls = 'block text-sm font-bold mb-1.5';
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   GLOBAL STYLES — identik dengan design system terbaru
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
    .d4 { animation-delay: 0.14s; }
    .d5 { animation-delay: 0.18s; }
    .d6 { animation-delay: 0.22s; }
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
   NOTIFICATION MODAL — disamakan penuh dengan design system terbaru
   (sekarang juga menangani tipe 'confirm', menggantikan modal konfirmasi
   terpisah agar tampilannya konsisten dengan file lain)
   ========================================================================== */

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
    confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={38} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <div className="dg-scaleIn contents w-full">
                    {!isConfirm && (
                        <button
                            onClick={onClose}
                            aria-label="Tutup"
                            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                    <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>
                        {s.icon}
                    </div>
                    <div className="text-center w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                    </div>
                    {isConfirm ? (
                        <div className="flex gap-2.5 w-full mt-1">
                            <button
                                onClick={onClose}
                                className="btn-action flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors"
                                style={{ borderColor: '#e5e7eb', color: '#4b5563', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => { modal.onConfirm?.(); onClose(); }}
                                className="btn-action flex-1 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                                style={{ background: BRAND_GRADIENT, boxShadow: '0 4px 14px rgba(232,105,10,0.30)' }}
                            >
                                Lanjutkan
                            </button>
                        </div>
                    ) : (
                        <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>
                            OK, Mengerti
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ==========================================================================
   INPUT & SISTEM TOMBOL AKSI — identik dengan design system terbaru
   ========================================================================== */

const inputCls = 'w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400';
const inputDisabledCls = 'w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-400 outline-none bg-gray-100 border-gray-200 cursor-not-allowed';
const inputErrorCls = 'w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-red-100 focus:border-red-400 bg-red-50 border-red-400';

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

    // State untuk status konfigurasi penilaian
    const [kategoriStatus, setKategoriStatus] = useState<KategoriStatus | null>(null);
    const [kategoriLoading, setKategoriLoading] = useState(false);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // State Modal Detail & Edit
    const [showDetail, setShowDetail] = useState(false);
    const [detailClosing, setDetailClosing] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<SiswaNilai | null>(null);

    const [showEdit, setShowEdit] = useState(false);
    const [editClosing, setEditClosing] = useState(false);
    const [editingSiswa, setEditingSiswa] = useState<SiswaNilai | null>(null);
    const [editingNilai, setEditingNilai] = useState<Record<number, number | null>>({});
    const [editingErrors, setEditingErrors] = useState<Record<number, string>>({});
    const [saving, setSaving] = useState(false);

    // State untuk import nilai dari Excel
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNGSI CEK STATUS KONFIGURASI PENILAIAN
    // ═══════════════════════════════════════════════════════════════════════════
    const cekStatusKategori = useCallback(async (mapelId: number) => {
        setKategoriLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/nilai/cek-status-kategori?mapel_id=${mapelId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

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

    const buildKonfigurasiWarningMessage = (status: KategoriStatus): string => {
        const masalah: string[] = [];
        if (status.bobot.status !== 'lengkap') {
            masalah.push(`• Bobot komponen belum 100% (saat ini: ${status.bobot.total}%)\n  Silakan atur di menu "Atur Penilaian" > "Bobot Akademik"`);
        }
        if (!status.kategori.covered) {
            masalah.push(`• Kategori nilai rapor belum lengkap\n  Celah rentang: ${status.kategori.celah.join(', ')}\n  Silakan atur di menu "Atur Penilaian" > "Kategori Akademik"`);
        }
        return `Konfigurasi Penilaian Belum Lengkap\n\nMasalah yang ditemukan:\n${masalah.join('\n')}\n\nSolusi:\n1. Buka menu "Atur Penilaian"\n2. Atur bobot komponen agar total 100%\n3. Atur kategori nilai rapor agar rentang 0-100 tercover\n4. Setelah selesai, Anda dapat menginput nilai siswa`;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH DATA AWAL
    // ═══════════════════════════════════════════════════════════════════════════
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
                const taRes = await fetch(`${API_BASE_URL}/tahun-ajaran/aktif`, { headers });

                if (!taRes.ok) throw new Error('Gagal memuat tahun ajaran');

                const taData = await taRes.json();
                if (!taData.success) throw new Error(taData.message || 'Gagal memuat tahun ajaran');

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
                            message: 'Periode penilaian telah selesai dan data sudah dikunci.\nAnda dapat melihat nilai siswa dalam mode baca saja (read only), tetapi tidak dapat mengedit.',
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
                            message: 'Baik PTS maupun PAS belum dibuka oleh admin.\nAnda dapat melihat nilai siswa dalam mode baca saja (read only), tetapi belum dapat menginput nilai.\nSilakan hubungi admin untuk membuka periode penilaian.',
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
                    throw new Error(errData.message || 'Gagal memuat mata pelajaran');
                }

                if (!komponenRes.ok) throw new Error('Gagal memuat komponen penilaian');

                const [mapelData, komponenData] = await Promise.all([
                    mapelRes.json().catch(() => ({ data: { wajib: [], pilihan: [] } })),
                    komponenRes.json(),
                ]);

                const wajib = mapelData.data?.wajib || [];
                const pilihan = mapelData.data?.pilihan || [];
                setMapelList([...wajib, ...pilihan]);
                setKomponenList(komponenData.data || []);

            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showModal]);

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH NILAI SAAT MAPEL DIPILIH
    // ══════════════════════════════════════════════════════════════════════════
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
                        showModal({ type: 'error', title: 'Akses Ditolak', message: err.message || 'Anda tidak memiliki akses ke mata pelajaran ini.' });
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
                    nilai_rapor_pts: s.nilai_rapor_pts ?? null,
                    deskripsi_pts: s.deskripsi_pts || '',
                    nilai_rapor_pas: s.nilai_rapor_pas ?? null,
                    deskripsi_pas: s.deskripsi_pas || '',
                    nilai: s.nilai || {},
                }));

                setSiswaList(mapped);
                setFilteredSiswa(mapped);
                setKelasNama(data.kelas || '');
                setCurrentMapel(mapelList.find(m => m.mata_pelajaran_id === selectedMapelId) || null);
                setCurrentPage(1);

                // Cek status konfigurasi penilaian
                cekStatusKategori(selectedMapelId);

            } catch (err: any) {
                showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat data nilai.' });
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
                siswaList.filter(s =>
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
        const btnBase = 'min-w-[30px] h-8 px-1.5 flex items-center justify-center rounded-lg text-xs font-bold border-2 transition-colors btn-action';
        const btnActive = 'text-white border-transparent';
        const btnInactive = 'text-gray-600 border-transparent hover:bg-orange-50 bg-transparent';

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

        range.forEach(p => {
            if (p < 0) {
                pages.push(<span key={p} className="px-1 text-gray-400 text-xs">…</span>);
            } else {
                pages.push(
                    <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
                        style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}
                    >
                        {p}
                    </button>
                );
            }
        });

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
            showModal({
                type: 'warning',
                title: 'Mode Baca Saja',
                message: readOnlyReason === 'locked'
                    ? 'Periode penilaian sudah selesai dan data sudah dikunci.\nAnda tidak dapat mengedit nilai siswa.'
                    : 'Periode penilaian belum aktif.\nAnda belum dapat mengedit nilai siswa.\nSilakan tunggu admin membuka periode penilaian.',
            });
            return;
        }

        if (!currentMapel?.bisa_input) {
            showModal({ type: 'warning', title: 'Tidak Dapat Input', message: 'Mata pelajaran ini tidak dapat diinput nilainya oleh Anda.\nSilakan hubungi Administrator.' });
            return;
        }

        if (kategoriStatus && !kategoriStatus.configured) {
            showModal({ type: 'error', title: 'Konfigurasi Penilaian Belum Lengkap', message: buildKonfigurasiWarningMessage(kategoriStatus) });
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

    // ✅ VALIDASI KETAT: Hanya angka 0-100
    const validateNilai = (komponenId: number, nilai: number | null): string | null => {
        if (nilai === null) return null;
        if (typeof nilai !== 'number' || isNaN(nilai)) return 'Nilai harus berupa angka';
        if (nilai < 0) return 'Nilai tidak boleh negatif (< 0)';
        if (nilai > 100) return 'Nilai tidak boleh lebih dari 100';
        return null;
    };

    // ✅ HANYA IZINKAN ANGKA (Mencegah desimal/koma dari awal)
    const handleNilaiChange = (komponenId: number, value: string) => {
        if (value === '' || /^\d*$/.test(value)) {
            // Cegah input > 3 digit (karena max 100)
            if (value.length > 3) return;

            const newValue = value === '' ? null : parseInt(value, 10);

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
            setEditingErrors(prev => ({ ...prev, [komponenId]: error }));
            setEditingNilai(prev => ({ ...prev, [komponenId]: null }));
        } else {
            setEditingErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[komponenId];
                return newErrors;
            });
        }
    };

    // ✅ Konfirmasi sekarang memakai showModal({ type: 'confirm', ... })
    // supaya tampilannya konsisten dengan sistem notifikasi lainnya.
    // Semua validasi di bawah ini TIDAK diubah sama sekali.
    const openConfirmSimpan = () => {
        if (!editingSiswa || !selectedMapelId) return;

        const validationErrors: string[] = [];
        for (const [idStr, nilai] of Object.entries(editingNilai)) {
            if (nilai !== null) {
                const komponenId = Number(idStr);
                const error = validateNilai(komponenId, nilai);
                if (error) {
                    const nama = komponenList.find(k => k.id_komponen === komponenId)?.nama_komponen || idStr;
                    validationErrors.push(`• ${nama}: ${error}`);
                    setEditingErrors(prev => ({ ...prev, [komponenId]: error }));
                }
            }
        }

        if (validationErrors.length > 0) {
            showModal({
                type: 'error',
                title: 'Nilai Tidak Valid',
                message: `Terdapat ${validationErrors.length} nilai yang tidak valid:\n${validationErrors.join('\n')}\nSilakan perbaiki nilai yang ditandai merah.`,
            });
            return;
        }

        const hasChanged = Object.entries(editingNilai).some(([idStr, nilaiBaru]) => {
            const nilaiLama = editingSiswa.nilai[Number(idStr)] ?? null;
            return (nilaiBaru ?? null) !== (nilaiLama ?? null);
        });

        if (!hasChanged) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data yang Anda masukkan sama dengan data sebelumnya.' });
            return;
        }

        showModal({
            type: 'confirm',
            title: 'Konfirmasi Penyimpanan Nilai',
            message: `Apakah Anda yakin ingin menyimpan nilai ${editingSiswa.nama}?`,
            onConfirm: executeSimpanNilai,
        });
    };

    const executeSimpanNilai = async () => {
        if (!editingSiswa || !selectedMapelId) return;
        setSaving(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/nilai-komponen/${selectedMapelId}/${editingSiswa.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nilai: editingNilai }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Gagal menyimpan' }));
                if (err.code === ERROR_CODES.KONFIGURASI_BELUM_LENGKAP) throw new Error(err.message);
                throw new Error(err.message);
            }

            const data = await res.json();

            // ✅ Gunakan Math.round agar konsisten dengan backend
            const updated: SiswaNilai = {
                ...editingSiswa,
                nilai: editingNilai,
                nilai_rapor_pts: data.jenis_penilaian === 'PTS' ? Math.round(data.nilai_rapor ?? editingSiswa.nilai_rapor_pts ?? 0) : editingSiswa.nilai_rapor_pts,
                deskripsi_pts: data.jenis_penilaian === 'PTS' ? data.deskripsi ?? editingSiswa.deskripsi_pts : editingSiswa.deskripsi_pts,
                nilai_rapor_pas: data.jenis_penilaian === 'PAS' ? Math.round(data.nilai_rapor ?? editingSiswa.nilai_rapor_pas ?? 0) : editingSiswa.nilai_rapor_pas,
                deskripsi_pas: data.jenis_penilaian === 'PAS' ? data.deskripsi ?? editingSiswa.deskripsi_pas : editingSiswa.deskripsi_pas,
            };

            setSiswaList(prev => prev.map(s => (s.id === editingSiswa.id ? updated : s)));
            setFilteredSiswa(prev => prev.map(s => (s.id === editingSiswa.id ? updated : s)));

            setShowEdit(false);
            setEditingSiswa(null);
            setEditingErrors({});

            setTimeout(() => {
                showModal({ type: 'success', title: 'Nilai Disimpan!', message: `Nilai ${updated.nama} berhasil disimpan.` });
            }, 250);

        } catch (err: any) {
            setShowEdit(false);
            setEditingSiswa(null);
            setEditingErrors({});
            setTimeout(() => {
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Gagal menyimpan nilai.' });
            }, 250);
        } finally {
            setSaving(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // IMPORT EXCEL HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════
    const handleDownloadTemplate = async () => {
        if (!selectedMapelId) {
            showModal({ type: 'warning', title: 'Pilih Mata Pelajaran', message: 'Silakan pilih mata pelajaran terlebih dahulu sebelum download template.' });
            return;
        }
        if (kategoriStatus && !kategoriStatus.configured) {
            showModal({ type: 'error', title: 'Konfigurasi Penilaian Belum Lengkap', message: buildKonfigurasiWarningMessage(kategoriStatus) });
            return;
        }

        setDownloadingTemplate(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/nilai/import-template?mapel_id=${selectedMapelId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Gagal download template' }));
                throw new Error(err.message || 'Gagal download template');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            const periode = jenisPenilaianAktif || 'Aktif';
            a.href = url;
            a.download = `Template_Import_Nilai_${currentMapel?.nama_mapel || 'Mapel'}_Periode_${periode}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // ✅ PERBAIKAN: Pesan yang menjelaskan bahwa template hanya berisi kolom relevan
            let kolomInfo = '';
            if (jenisPenilaianAktif === 'PTS') {
                kolomInfo = 'Hanya kolom PTS yang tersedia di template ini.';
            } else if (jenisPenilaianAktif === 'PAS') {
                kolomInfo = 'Hanya kolom UH dan PAS yang tersedia di template ini.';
            } else {
                kolomInfo = 'Semua kolom komponen tersedia.';
            }

            showModal({
                type: 'success',
                title: 'Template Berhasil Diunduh',
                message: `Template Excel berhasil diunduh.\n\n⚠️ CATATAN PENTING:\n• ${kolomInfo}\n• Kolom periode lain sengaja tidak ditampilkan agar tidak membingungkan.\n\nLangkah selanjutnya:\n1. Buka file Excel\n2. Isi nilai pada kolom yang tersedia\n3. Simpan file\n4. Upload kembali melalui tombol "Import Nilai"`,
            });
        } catch (err: any) {
            showModal({ type: 'error', title: 'Gagal Mengunduh Template', message: err.message || 'Terjadi kesalahan saat mengunduh template.' });
        } finally {
            setDownloadingTemplate(false);
        }
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            showModal({ type: 'warning', title: 'Format File Tidak Valid', message: 'Silakan upload file Excel (.xlsx atau .xls)' });
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showModal({ type: 'warning', title: 'File Terlalu Besar', message: 'Ukuran file maksimal 10MB' });
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
            return;
        }

        setImportFile(file);
    };

    const openImportModal = () => {
        if (!selectedMapelId) {
            showModal({ type: 'warning', title: 'Pilih Mata Pelajaran', message: 'Silakan pilih mata pelajaran terlebih dahulu sebelum import nilai.' });
            return;
        }
        if (isReadOnly) {
            showModal({
                type: 'warning',
                title: 'Mode Baca Saja',
                message: readOnlyReason === 'locked' ? 'Periode penilaian sudah selesai dan data sudah dikunci.\nAnda tidak dapat mengimport nilai.' : 'Periode penilaian belum aktif.\nAnda tidak dapat mengimport nilai.',
            });
            return;
        }
        if (!currentMapel?.bisa_input) {
            showModal({ type: 'warning', title: 'Tidak Dapat Input', message: 'Mata pelajaran ini tidak dapat diinput nilainya oleh Anda.' });
            return;
        }
        if (kategoriStatus && !kategoriStatus.configured) {
            showModal({ type: 'error', title: 'Konfigurasi Penilaian Belum Lengkap', message: buildKonfigurasiWarningMessage(kategoriStatus) });
            return;
        }

        setImportFile(null);
        if (importFileInputRef.current) importFileInputRef.current.value = '';
        setShowImportModal(true);
    };

    const downloadErrorReport = (errors: any[], mapelName: string, kelasName: string) => {
        const headers = ['No', 'Baris', 'Kolom', 'Alasan Error'];
        const rows = errors.map((err, index) => {
            const message = err.message || '';
            const rowMatch = message.match(/Baris\s+(\d+)/i);
            const colMatch = message.match(/Kolom\s+"([^"]+)"/i);
            const escapedMessage = message.replace(/"/g, '""');
            return [index + 1, rowMatch ? rowMatch[1] : '-', colMatch ? colMatch[1] : '-', `"${escapedMessage}"`].join(',');
        });

        const BOM = '\uFEFF';
        const csvContent = BOM + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().split('T')[0];
        const safeMapelName = (mapelName || 'Mapel').replace(/[^a-z0-9]/gi, '_');
        const safeKelasName = (kelasName || 'Kelas').replace(/[^a-z0-9]/gi, '_');

        link.setAttribute('href', url);
        link.setAttribute('download', `error_import_nilai_${safeMapelName}_${safeKelasName}_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const executeImportNilai = async () => {
        if (!importFile || !selectedMapelId) {
            showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Silakan pilih file Excel yang akan diimport.' });
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
                if (data.code === ERROR_CODES.KONFIGURASI_BELUM_LENGKAP) {
                    showModal({ type: 'error', title: 'Konfigurasi Penilaian Belum Lengkap', message: errorMessage });
                } else if (errorMessage.includes('tidak ada data sama sekali')) {
                    showModal({ type: 'error', title: 'File Excel Kosong', message: errorMessage });
                } else if (errorMessage.includes('tidak ada data siswa')) {
                    showModal({ type: 'error', title: 'Data Siswa Kosong', message: errorMessage });
                } else if (errorMessage.includes('tidak ada nilai yang diisi')) {
                    showModal({ type: 'error', title: 'File Tanpa Nilai', message: errorMessage });
                } else {
                    showModal({ type: 'error', title: 'Gagal Import', message: errorMessage });
                }
                setImporting(false);
                return;
            }

            // Refresh data nilai
            const refreshRes = await fetch(`${API_BASE_URL}/nilai/${selectedMapelId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const mapped: SiswaNilai[] = (refreshData.siswaList || []).map((s: any) => ({
                    id: s.id,
                    nama: s.nama,
                    nis: s.nis || '-',
                    nisn: s.nisn || '-',
                    nilai_rapor_pts: s.nilai_rapor_pts ?? null,
                    deskripsi_pts: s.deskripsi_pts || '',
                    nilai_rapor_pas: s.nilai_rapor_pas ?? null,
                    deskripsi_pas: s.deskripsi_pas || '',
                    nilai: s.nilai || {},
                }));
                setSiswaList(mapped);
                setFilteredSiswa(mapped);
            }

            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            // Notifikasi hasil import
            const errors = data.data?.errors || [];
            const warnings = data.data?.warnings || [];
            const totalErrors = errors.length;
            const totalWarnings = warnings.length;
            const nisDuplikat = data.data?.nis_duplikat_count || 0;
            const komponenDiabaikan = data.data?.komponen_diabaikan || [];
            const komponenTidakDikenali = data.data?.komponen_tidak_dikenali || [];

            if (totalErrors > 5) {
                downloadErrorReport(errors, currentMapel?.nama_mapel || '', kelasNama);
            }

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
            if (nisDuplikat > 0) infoTambahan.push(`• ${nisDuplikat} NIS duplikat ditemukan (hanya data pertama yang diproses)`);
            if (komponenDiabaikan.length > 0) infoTambahan.push(`• Kolom [${komponenDiabaikan.join(', ')}] diabaikan karena periode ${data.data?.periode_aktif || '-'} sedang aktif`);
            if (komponenTidakDikenali.length > 0) infoTambahan.push(`• Kolom [${komponenTidakDikenali.join(', ')}] tidak dikenali sebagai komponen penilaian`);

            if (infoTambahan.length > 0) summaryLines.push(`Catatan:\n${infoTambahan.join('\n')}\n`);

            if (totalErrors > 0) {
                if (totalErrors <= 5) {
                    summaryLines.push(`Detail Error:\n${errors.slice(0, 5).map((e: any, i: number) => `${i + 1}. ${e.message}`).join('\n')}\n`);
                } else {
                    summaryLines.push(`Contoh Error (3 dari ${totalErrors}):\n${errors.slice(0, 3).map((e: any, i: number) => `${i + 1}. ${e.message}`).join('\n')}\n`);
                    summaryLines.push(`File CSV error telah diunduh otomatis!\n   (error_import_nilai_*.csv)\n`);
                }
            }

            if (totalWarnings > 0) {
                summaryLines.push(`Peringatan:\n${warnings.slice(0, 3).map((w: any, i: number) => `${i + 1}. ${w.message}`).join('\n')}`);
                if (totalWarnings > 3) summaryLines.push(`   ... dan ${totalWarnings - 3} peringatan lainnya`);
            }

            setTimeout(() => {
                showModal({
                    type: totalErrors > 0 ? 'warning' : 'success',
                    title: totalErrors > 0 ? 'Import Selesai' : 'Import Berhasil!',
                    message: summaryLines.join('\n'),
                });
            }, 250);

        } catch (err: any) {
            showModal({ type: 'error', title: 'Gagal Import', message: err.message || 'Terjadi kesalahan saat mengimport nilai.' });
        } finally {
            setImporting(false);
        }
    };

    // Komponen badge nilai
    const NilaiBadge = ({ nilai }: { nilai: number | null }) => {
        if (nilai === null || nilai === undefined) {
            return <span className="text-gray-400 text-xs">-</span>;
        }
        return (
            <span
                className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold"
                style={{ background: '#fff0e5', color: ACCENT_DARK, border: '1px solid #fde0c8' }}
            >
                {nilai}
            </span>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER UI
    // ═══════════════════════════════════════════════════════════════════════════
    if (loading) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin mx-auto mb-3" />
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
                    <div className="relative bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn" style={CARD_STYLE}>
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">Anda belum ditugaskan sebagai guru kelas di semester ini.<br />Silakan hubungi Administrator untuk penugasan kelas.</p>
                        </div>
                        <ActionButton variant="primary" fullWidth onClick={handleLogout}>
                            <LogOut size={16} /> Logout
                        </ActionButton>
                    </div>
                </div>
            </div>
        );
    }

    const canEditNilai = currentMapel?.bisa_input && !isReadOnly;
    const konfigurasiBelumLengkap = kategoriStatus && !kategoriStatus.configured;

    // Grid kolom tabel dibangun dinamis mengikuti jumlah komponen penilaian
    const GRID_COLS = [
        'minmax(48px,0.5fr)',
        'minmax(170px,2fr)',
        'minmax(70px,0.8fr)',
        'minmax(70px,0.8fr)',
        ...komponenList.map(() => 'minmax(90px,0.9fr)'),
        'minmax(90px,0.9fr)',
        'minmax(90px,0.9fr)',
        'minmax(180px,1.6fr)',
    ].join(' ');

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Banner read only */}
            {isReadOnly && (
                <div className="mb-5 rounded-2xl overflow-hidden card-flat" style={{ border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}` }}>
                    <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: readOnlyReason === 'locked' ? '#fee2e2' : '#fef3c7' }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: readOnlyReason === 'locked' ? '#fecaca' : '#fde68a' }}>
                            <Lock size={18} className={readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'} />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>Mode Baca Saja (Read Only)</p>
                            <p className={`text-xs mt-0.5 ${readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'}`}>
                                {readOnlyReason === 'locked' ? 'Periode penilaian telah selesai dan data sudah dikunci. Anda dapat melihat nilai siswa, tetapi tidak dapat mengedit.' : 'Periode penilaian belum aktif. Anda dapat melihat nilai siswa, tetapi belum dapat menginput nilai. Silakan hubungi admin untuk membuka periode penilaian.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner warning konfigurasi belum lengkap */}
            {konfigurasiBelumLengkap && !isReadOnly && selectedMapelId && (
                <div className="mb-5 rounded-2xl overflow-hidden card-flat" style={{ border: '1px solid #fecaca', background: '#fff' }}>
                    <div className="px-5 py-4">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fecaca' }}>
                                <AlertCircle size={20} className="text-red-700" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-bold text-red-900 mb-1">Konfigurasi Penilaian Belum Lengkap</h3>
                                <p className="text-sm text-red-700">{kategoriStatus?.message || 'Ada masalah pada konfigurasi penilaian'}</p>
                            </div>
                        </div>

                        <div className="rounded-xl p-4 mb-3 space-y-2" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                            {kategoriStatus?.bobot.status !== 'lengkap' && (
                                <div className="flex items-start gap-3 p-3 rounded-lg border" style={{ background: '#fff', borderColor: '#fcd34d' }}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
                                        <AlertCircle size={16} className="text-yellow-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900 mb-1">Bobot Komponen Belum 100%</p>
                                        <p className="text-xs text-gray-600">Total bobot saat ini: <strong>{kategoriStatus?.bobot.total || 0}%</strong></p>
                                        <p className="text-xs text-gray-500 mt-1">Silakan atur di menu "Atur Penilaian" &gt; "Bobot Akademik"</p>
                                    </div>
                                    <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#fef3c7', color: '#92400e' }}>Belum 100%</div>
                                </div>
                            )}
                            {!kategoriStatus?.kategori.covered && (
                                <div className="flex items-start gap-3 p-3 rounded-lg border" style={{ background: '#fff', borderColor: '#fcd34d' }}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
                                        <AlertCircle size={16} className="text-yellow-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900 mb-1">Kategori Nilai Rapor Belum Lengkap</p>
                                        <p className="text-xs text-gray-500 mb-2">Celah rentang yang belum tercover:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {kategoriStatus?.kategori.celah.map((celah, idx) => (
                                                <span key={idx} className="px-2 py-1 rounded text-xs font-semibold" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>{celah}</span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Silakan atur di menu "Atur Penilaian" &gt; "Kategori Akademik"</p>
                                    </div>
                                    <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#fef3c7', color: '#92400e' }}>Ada Celah</div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 rounded-xl" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="text-yellow-700 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-800">
                                    Tombol <strong>Edit</strong> dan <strong>Import Nilai</strong> tidak dapat digunakan sampai konfigurasi penilaian di atas dilengkapi.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner mata pelajaran belum diatur */}
            {mapelList.length === 0 && !isReadOnly && (
                <div className="mb-5 rounded-2xl overflow-hidden card-flat" style={{ border: '1px solid #fdba74' }}>
                    <div className="flex items-start gap-3 px-5 py-4" style={{ background: '#fff7ed' }}>
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <AlertCircle size={20} style={{ color: '#c2410c' }} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-sm mb-1" style={{ color: '#9a3412' }}>Mata Pelajaran Belum Diatur</h3>
                            <p className="text-xs" style={{ color: '#7c2d12' }}>Belum ada mata pelajaran yang dikonfigurasi untuk tahun ajaran ini. Silakan hubungi <strong>Administrator</strong> untuk menambahkan mata pelajaran.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Input Nilai Siswa</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola nilai komponen &amp; rapor siswa per mata pelajaran</p>
            </div>

            {/* TOOLBAR */}
            <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d2" style={CARD_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        <select
                            value={selectedMapelId === null ? '' : String(selectedMapelId)}
                            onChange={e => {
                                const val = e.target.value;
                                setSelectedMapelId(val ? Number(val) : null);
                                setSearchQuery('');
                            }}
                            className={inputCls}
                            style={{ maxWidth: '340px' }}
                        >
                            <option value="">-- Pilih Mata Pelajaran --</option>
                            {mapelList.map(mapel => (
                                <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel} ({mapel.jenis})</option>
                            ))}
                        </select>

                        {selectedMapelId && canEditNilai && (
                            <ActionButton
                                variant={konfigurasiBelumLengkap ? 'neutral' : 'info'}
                                disabled={!!konfigurasiBelumLengkap}
                                onClick={openImportModal}
                                title={konfigurasiBelumLengkap ? 'Konfigurasi penilaian belum lengkap' : ''}
                            >
                                {konfigurasiBelumLengkap ? (<><AlertCircle size={16} /> Belum Diatur</>) : (<><Upload size={16} /> Import Nilai</>)}
                            </ActionButton>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {selectedMapelId && (
                            <div className="relative w-full sm:w-56 flex-shrink-0">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari siswa..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button type="button" onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-2.5 flex items-center" style={{ color: ACCENT }}>
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {selectedMapelId && (
                            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                                <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>Tampilkan</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>data</span>
                            </div>
                        )}
                    </div>
                </div>

                {selectedMapelId && currentMapel && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-xs font-medium text-gray-500">Kelas: <strong className="text-gray-700">{kelasNama}</strong></span>
                        {currentMapel.bisa_input ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
                                <CheckCircle2 size={11} /> Dapat Input Nilai
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                                <AlertCircle size={11} /> Hanya Lihat
                            </span>
                        )}
                    </div>
                )}

                {selectedMapelId && currentMapel && (
                    <p className="text-xs mt-3 text-gray-400">
                        Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} siswa
                    </p>
                )}
            </div>

            {!selectedMapelId ? (
                <div className="card-flat bg-white rounded-2xl anim-in d3" style={CARD_STYLE}>
                    <div className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <ClipboardList size={32} className="text-gray-300" />
                            <p className="text-sm font-semibold text-gray-500">Pilih Mata Pelajaran Terlebih Dahulu</p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* TABEL — CSS grid, konsisten dengan design system terbaru */}
                    <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                        <div className="overflow-x-auto scrollbar-thin">
                            <div style={{ width: '100%', minWidth: `${640 + komponenList.length * 100}px` }}>
                                <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
                                    {['No.', 'Nama Siswa', 'NIS', 'NISN', ...komponenList.map(k => k.nama_komponen), 'Rapor PTS', 'Rapor PAS', 'Aksi'].map((h, i) => (
                                        <div key={i} className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">
                                            {h}
                                        </div>
                                    ))}
                                </div>

                                {dataLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0' }}>
                                            {Array.from({ length: 7 + komponenList.length }).map((__, j) => (
                                                <div key={j} className="px-4 py-4 flex items-center justify-center">
                                                    <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 1 ? '85%' : '55%' }} />
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                ) : currentSiswa.length === 0 ? (
                                    <div className="py-14 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={32} className="text-gray-300" />
                                            <p className="text-sm font-semibold text-gray-500">
                                                {searchQuery ? 'Siswa tidak ditemukan.' : 'Belum ada data siswa.'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    currentSiswa.map((siswa, idx) => (
                                        <div
                                            key={siswa.id}
                                            className="grid row-in row-hover border-b transition-colors"
                                            style={{
                                                gridTemplateColumns: GRID_COLS,
                                                borderColor: '#f0f0f0',
                                                background: '#fff',
                                                animationDelay: `${Math.min(idx, 8) * 0.03}s`,
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                        >
                                            <div className="px-4 py-4 flex items-center justify-center text-center text-gray-400">{startIndex + idx + 1}</div>
                                            <div className="px-4 py-4 flex items-center overflow-hidden">
                                                <p className="font-bold text-gray-900 truncate" title={siswa.nama}>{siswa.nama}</p>
                                            </div>
                                            <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600">{siswa.nis}</div>
                                            <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600">{siswa.nisn}</div>
                                            {komponenList.map(k => (
                                                <div key={`${siswa.id}-${k.id_komponen}`} className="px-4 py-4 flex items-center justify-center text-gray-700">
                                                    {siswa.nilai[k.id_komponen] !== null && siswa.nilai[k.id_komponen] !== undefined ? siswa.nilai[k.id_komponen] : <span className="text-gray-300">-</span>}
                                                </div>
                                            ))}
                                            <div className="px-4 py-4 flex items-center justify-center"><NilaiBadge nilai={siswa.nilai_rapor_pts} /></div>
                                            <div className="px-4 py-4 flex items-center justify-center"><NilaiBadge nilai={siswa.nilai_rapor_pas} /></div>
                                            <div className="px-4 py-4 flex items-center justify-center">
                                                <div className="flex justify-center gap-1.5">
                                                    <ActionButton size="sm" variant="info" onClick={() => handleDetail(siswa)}>
                                                        <Eye size={13} /> Detail
                                                    </ActionButton>
                                                    <ActionButton
                                                        size="sm"
                                                        variant="warning"
                                                        disabled={!canEditNilai || !!konfigurasiBelumLengkap}
                                                        onClick={() => handleEdit(siswa)}
                                                        title={konfigurasiBelumLengkap ? 'Konfigurasi penilaian belum lengkap' : !canEditNilai ? 'Tidak dapat input nilai' : ''}
                                                    >
                                                        {konfigurasiBelumLengkap ? (<><AlertCircle size={13} /> Belum Diatur</>) : canEditNilai ? (<><Pencil size={13} /> Edit</>) : (<><Lock size={13} /> Terkunci</>)}
                                                    </ActionButton>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {filteredSiswa.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200" style={{ background: '#fafafa' }}>
                                <span className="text-xs font-medium text-gray-500">Halaman {currentPage} dari {totalPages}</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                        style={{ color: ACCENT_DARK }}
                                    >
                                        <ChevronLeft size={14} /> Sebelumnya
                                    </button>
                                    <div className="flex items-center gap-1 mx-1">{renderPagination()}</div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                        style={{ color: ACCENT_DARK }}
                                    >
                                        Berikutnya <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modal detail */}
            {showDetail && selectedSiswa && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`} onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div>
                                <h2 className="text-lg font-bold text-white">Detail Nilai Siswa</h2>
                                <p className="text-xs text-orange-100 mt-0.5">{selectedSiswa.nama} - {kelasNama}</p>
                            </div>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                                    <p className="text-xs text-gray-500 mb-0.5">NIS</p>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{selectedSiswa.nis}</p>
                                </div>
                                <div className="p-3 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                                    <p className="text-xs text-gray-500 mb-0.5">NISN</p>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{selectedSiswa.nisn}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#7a3a0a' }}>
                                    <span className="w-1.5 h-5 rounded-full" style={{ background: ACCENT }}></span>Nilai Rapor
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: '#fdba74' }}>
                                        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#fff7ed' }}>
                                            <span className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Rapor PTS</span>
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: statusPTS === 'aktif' ? '#fed7aa' : statusPTS === 'selesai' ? '#e5e7eb' : '#fef3c7', color: statusPTS === 'aktif' ? '#c2410c' : statusPTS === 'selesai' ? '#6b7280' : '#92400e' }}>
                                                {statusPTS === 'aktif' ? 'Aktif' : statusPTS === 'selesai' ? 'Selesai' : 'Menunggu'}
                                            </span>
                                        </div>
                                        <div className="p-4 bg-white">
                                            <div className="text-center py-2">
                                                <div className="text-4xl font-bold mb-2" style={{ color: '#c2410c' }}>
                                                    {selectedSiswa.nilai_rapor_pts !== null && selectedSiswa.nilai_rapor_pts !== undefined ? selectedSiswa.nilai_rapor_pts : '-'}
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t" style={{ borderColor: '#fde0c8' }}>
                                                <p className="text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Deskripsi:</p>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    {selectedSiswa.deskripsi_pts || (<span className="text-gray-400 italic">Belum ada deskripsi</span>)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#fdba74' : '#e5e7eb' }}>
                                        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#fff7ed' : '#f3f4f6' }}>
                                            <span className="text-sm font-bold" style={{ color: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#7a3a0a' : '#9ca3af' }}>Rapor PAS</span>
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: statusPAS === 'aktif' ? '#fed7aa' : statusPAS === 'selesai' ? '#e5e7eb' : '#fef3c7', color: statusPAS === 'aktif' ? '#c2410c' : statusPAS === 'selesai' ? '#6b7280' : '#92400e' }}>
                                                {statusPAS === 'aktif' ? 'Aktif' : statusPAS === 'selesai' ? 'Selesai' : 'Menunggu'}
                                            </span>
                                        </div>
                                        <div className="p-4 bg-white">
                                            <div className="text-center py-2">
                                                <div className="text-4xl font-bold mb-2" style={{ color: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#c2410c' : '#d1d5db' }}>
                                                    {selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? selectedSiswa.nilai_rapor_pas : '-'}
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t" style={{ borderColor: '#fde0c8' }}>
                                                <p className="text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Deskripsi:</p>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    {selectedSiswa.deskripsi_pas || (<span className="text-gray-400 italic">Belum ada deskripsi</span>)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#7a3a0a' }}>
                                    <span className="w-1.5 h-5 rounded-full" style={{ background: ACCENT }}></span>Nilai Komponen Penilaian
                                </h3>
                                <div className="mb-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 rounded-full" style={{ background: '#fbbf24' }}></div>
                                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7a3a0a' }}>Ulangan Harian</p>
                                    </div>
                                    <div className="grid grid-cols-5 gap-3">
                                        {komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => {
                                            const nilai = selectedSiswa.nilai[k.id_komponen];
                                            return (
                                                <div key={k.id_komponen} className="rounded-xl p-4 text-center border-2 transition-all" style={{ background: nilai !== null && nilai !== undefined ? '#fff' : '#f9fafb', borderColor: nilai !== null && nilai !== undefined ? '#fde0c8' : '#e5e7eb' }}>
                                                    <div className="text-xs font-bold mb-2" style={{ color: '#7a3a0a' }}>{k.nama_komponen}</div>
                                                    <div className="text-2xl font-bold" style={{ color: nilai !== null && nilai !== undefined ? ACCENT_DARK : '#d1d5db' }}>
                                                        {nilai !== null && nilai !== undefined ? nilai : '-'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }}></div>
                                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7a3a0a' }}>Penilaian Tengah &amp; Akhir Semester</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {komponenList.filter(k => /PTS|PAS/i.test(k.nama_komponen)).map(k => {
                                            const nilai = selectedSiswa.nilai[k.id_komponen];
                                            return (
                                                <div key={k.id_komponen} className="rounded-xl p-5 text-center border-2" style={{ background: '#fff7ed', borderColor: '#fdba74' }}>
                                                    <div className="text-center mb-3">
                                                        <span className="text-sm font-bold uppercase tracking-wide" style={{ color: '#c2410c' }}>{k.nama_komponen}</span>
                                                    </div>
                                                    <div className="text-3xl font-bold mb-2" style={{ color: nilai !== null && nilai !== undefined ? '#c2410c' : '#d1d5db' }}>
                                                        {nilai !== null && nilai !== undefined ? nilai : '-'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <ActionButton variant="neutral" onClick={closeDetail}>Tutup</ActionButton>
                            {canEditNilai && !konfigurasiBelumLengkap && (
                                <ActionButton variant="warning" onClick={() => { handleEdit(selectedSiswa); closeDetail(); }}>
                                    <Pencil size={14} /> Edit Nilai
                                </ActionButton>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal edit */}
            {showEdit && editingSiswa && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`} onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div>
                                <h2 className="text-lg font-bold text-white">Edit Nilai Siswa</h2>
                                <p className="text-xs text-orange-100 mt-0.5">{editingSiswa.nama} - {kelasNama}</p>
                            </div>
                            <button onClick={closeEdit} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-6">
                            {jenisPenilaianAktif && (
                                <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                    <AlertCircle size={18} style={{ color: '#c2410c', flexShrink: 0 }} />
                                    <p className="text-sm" style={{ color: '#7a3a0a' }}>
                                        <strong>Periode {jenisPenilaianAktif} Aktif</strong> —
                                        {jenisPenilaianAktif === 'PTS' ? ' Hanya nilai PTS yang dapat diubah.' : ' Nilai PTS terkunci, hanya UH & PAS yang bisa diubah.'}
                                    </p>
                                </div>
                            )}
                            <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                <Info size={18} style={{ color: '#1d4ed8', flexShrink: 0 }} className="mt-0.5" />
                                <p className="text-xs" style={{ color: '#1e40af' }}>
                                    <strong>Validasi Nilai:</strong> Nilai harus berupa angka antara <strong>0-100</strong>. Jika Anda input nilai di luar rentang, sistem akan menampilkan pesan error dan nilai akan direset.
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-5 rounded-full" style={{ background: '#fbbf24' }}></div>
                                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Ulangan Harian</h3>
                                </div>
                                <div className="grid grid-cols-5 gap-3">
                                    {komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(komponen => {
                                        const isDisabled = jenisPenilaianAktif === 'PTS';
                                        const nilai = editingNilai[komponen.id_komponen];
                                        const error = editingErrors[komponen.id_komponen];
                                        return (
                                            <div key={komponen.id_komponen}>
                                                <label className="block text-xs font-bold mb-2 text-center" style={{ color: isDisabled ? '#9ca3af' : '#7a3a0a' }}>{komponen.nama_komponen}</label>
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
                                                    className={`text-center font-bold ${isDisabled ? inputDisabledCls : error ? inputErrorCls : inputCls}`}
                                                />
                                                {error && (<p className="text-xs text-red-600 mt-1 text-center font-semibold">{error}</p>)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-5 rounded-full" style={{ background: ACCENT }}></div>
                                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Penilaian Tengah &amp; Akhir Semester</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {komponenList.filter(k => /PTS|PAS/i.test(k.nama_komponen)).map(komponen => {
                                        const isPTS = /PTS/i.test(komponen.nama_komponen);
                                        const isActive = (jenisPenilaianAktif === 'PTS' && isPTS) || (jenisPenilaianAktif === 'PAS' && !isPTS);
                                        const isDisabled = !isActive;
                                        const nilai = editingNilai[komponen.id_komponen];
                                        const error = editingErrors[komponen.id_komponen];
                                        return (
                                            <div key={komponen.id_komponen} className="rounded-xl overflow-hidden border-2 transition-all" style={{ borderColor: isActive ? (error ? '#fca5a5' : '#fdba74') : '#d1d5db', opacity: isActive ? 1 : 0.6 }}>
                                                <div className="px-4 py-2.5" style={{ background: isActive ? (error ? '#fef2f2' : '#fff7ed') : '#f3f4f6' }}>
                                                    <div className="text-center">
                                                        <span className="text-sm font-bold uppercase tracking-wide" style={{ color: isActive ? (error ? '#dc2626' : '#c2410c') : '#9ca3af' }}>{komponen.nama_komponen}</span>
                                                    </div>
                                                </div>
                                                <div className="p-5" style={{ background: isActive ? '#fffaf6' : '#f9fafb' }}>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={nilai ?? ''}
                                                        onChange={e => handleNilaiChange(komponen.id_komponen, e.target.value)}
                                                        onBlur={() => handleNilaiBlur(komponen.id_komponen)}
                                                        disabled={isDisabled}
                                                        placeholder="0"
                                                        maxLength={3}
                                                        className={`text-3xl font-bold text-center ${isDisabled ? inputDisabledCls : error ? inputErrorCls : inputCls}`}
                                                        style={{ color: isDisabled ? undefined : error ? undefined : ACCENT_DARK }}
                                                    />
                                                    {error && (<p className="text-xs text-red-600 mt-2 text-center font-semibold">{error}</p>)}
                                                    {isActive && !error && (
                                                        <div className="flex items-center justify-center gap-1.5 mt-3">
                                                            <CheckCircle2 size={12} style={{ color: '#16a34a' }} />
                                                            <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>Dapat diubah</span>
                                                        </div>
                                                    )}
                                                    {isDisabled && (
                                                        <div className="flex items-center justify-center gap-1.5 mt-3">
                                                            <Lock size={12} style={{ color: '#9ca3af' }} />
                                                            <span className="text-xs font-semibold" style={{ color: '#9ca3af' }}>Terkunci</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <ActionButton variant="neutral" disabled={saving} onClick={closeEdit}>Batal</ActionButton>
                            <ActionButton variant="primary" disabled={saving} onClick={openConfirmSimpan}>
                                {saving ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Menyimpan...</>) : (<><Save size={14} /> Simpan Nilai</>)}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal import nilai dari Excel */}
            {showImportModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 dg-fadeIn" onClick={e => { if (e.target === e.currentTarget && !importing) setShowImportModal(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl w-full max-w-lg dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Upload size={16} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 leading-none mb-0.5">Data Massal</p>
                                    <h2 className="text-sm font-bold text-white leading-tight truncate">Import Nilai dari Excel</h2>
                                    <p className="text-[10px] text-white/70 mt-0.5">{currentMapel?.nama_mapel} - {kelasNama}</p>
                                </div>
                            </div>
                            <button onClick={() => { if (!importing) setShowImportModal(false); }} disabled={importing} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-5 p-4 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                <p className="text-sm text-blue-900 font-semibold mb-2 flex items-center gap-2">
                                    <Info size={16} className="text-blue-600" />
                                    Langkah-langkah Import:
                                </p>
                                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                                    <li>Download template Excel (sudah berisi daftar siswa)</li>
                                    <li>Isi nilai pada kolom komponen yang tersedia</li>
                                    <li>Simpan file Excel</li>
                                    <li>Upload file Excel yang sudah diisi</li>
                                    <li>Klik "Import Nilai" untuk memproses</li>
                                </ol>
                            </div>
                            {jenisPenilaianAktif && (
                                <div className="mb-5 p-3 rounded-xl flex items-start gap-2" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                                    <AlertCircle size={16} style={{ color: ACCENT_DARK }} className="flex-shrink-0 mt-0.5" />
                                    <p className="text-xs" style={{ color: '#7a3a0a' }}>
                                        <strong>Periode {jenisPenilaianAktif} Aktif:</strong>{' '}
                                        {jenisPenilaianAktif === 'PTS' ? 'Hanya kolom PTS yang akan diimport. Kolom UH dan PAS akan diabaikan.' : 'Kolom UH dan PAS akan diimport. Kolom PTS akan diabaikan (terkunci).'}
                                    </p>
                                </div>
                            )}
                            <div className="mb-5">
                                <ActionButton variant="warning" fullWidth disabled={downloadingTemplate} onClick={handleDownloadTemplate}>
                                    {downloadingTemplate ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Mengunduh Template...</>) : (<><Download size={16} /> Download Template Excel</>)}
                                </ActionButton>
                            </div>
                            <div className="mb-5">
                                <label className={labelCls} style={labelColor}>Upload File Excel <span className="text-red-500">*</span></label>
                                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${importFile ? 'border-green-400 bg-green-50' : 'border-orange-300 bg-orange-50 hover:bg-orange-100'}`} onClick={() => importFileInputRef.current?.click()}>
                                    <input ref={importFileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFileChange} className="hidden" />
                                    {importFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                                <CheckCircle2 size={24} className="text-green-600" />
                                            </div>
                                            <p className="text-sm font-bold text-green-900">{importFile.name}</p>
                                            <p className="text-xs text-green-700">{(importFile.size / 1024).toFixed(1)} KB - Klik untuk ganti file</p>
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
                                <ActionButton variant="neutral" fullWidth disabled={importing} onClick={() => { setShowImportModal(false); setImportFile(null); }}>Batal</ActionButton>
                                <ActionButton variant="success" fullWidth disabled={!importFile || importing} onClick={executeImportNilai}>
                                    {importing ? (<><div className="w-4 h-4 rounded-full border-2 border-current/40 border-t-current animate-spin" />Mengimport...</>) : (<><Upload size={16} /> Import Nilai</>)}
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}