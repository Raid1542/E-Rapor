'use client';
import { useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Eye, Pencil, Search, X, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Users, LogOut, Award, Lock, Upload, Download, ChevronLeft, ChevronRight, Info, User } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-kelas';

// ====== HELPER: Parse Error dari Backend ======
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
    } catch {
        return { message: 'Gagal memproses response dari server' };
    }
};

// ====== TYPES ======
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

interface EkskulItem {
    id: number;
    nama: string;
    deskripsi: string;
}

interface SiswaEkskul {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    ekskul: EkskulItem[];
    jumlah_ekskul: number;
}

interface EkskulOption {
    id_ekskul: number;
    nama_ekskul: string;
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

const GRID_COLS = 'minmax(48px,0.5fr) minmax(180px,2.4fr) minmax(90px,0.9fr) minmax(90px,0.9fr) minmax(220px,3fr) minmax(120px,1fr)';

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

// ====== MAIN COMPONENT ======
export default function EkskulClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const [siswaList, setSiswaList] = useState<SiswaEkskul[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaEkskul[]>([]);
    const [daftarEkskul, setDaftarEkskul] = useState<EkskulOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [kelasNama, setKelasNama] = useState<string>('Kelas Anda');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // ✅ KONDISI 1: Belum ditugaskan
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    // ✅ KONDISI 2: Read-Only mode (PAS belum aktif / sudah selesai)
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);

    // Modal state
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [detailClosing, setDetailClosing] = useState(false);
    const [editClosing, setEditClosing] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<SiswaEkskul | null>(null);
    const [editSiswa, setEditSiswa] = useState<SiswaEkskul | null>(null);
    const [editData, setEditData] = useState<{ ekskul_id: number; deskripsi: string }[]>([
        { ekskul_id: 0, deskripsi: '' },
        { ekskul_id: 0, deskripsi: '' },
        { ekskul_id: 0, deskripsi: '' }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    //  BARU: STATE untuk Import Ekstrakurikuler
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); setSelectedSiswa(null); }, 200);
    };

    const closeEdit = () => {
        setEditClosing(true);
        setTimeout(() => { setShowEdit(false); setEditClosing(false); setEditSiswa(null); }, 200);
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

                const res = await fetch(`${API}/ekskul`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const siswa = data.data || [];
                        setSiswaList(siswa);
                        setFilteredSiswa(siswa);
                        setDaftarEkskul(data.daftar_ekskul || []);
                        setKelasNama(data.kelas || 'Kelas Anda');

                        const pasStatus = data.pasStatus;
                        if (pasStatus === 'selesai') {
                            setIsReadOnly(true);
                            setReadOnlyReason('locked');
                            setTimeout(() => {
                                showModal({
                                    type: 'warning',
                                    title: 'PAS Sudah Selesai',
                                    message: 'Data ekstrakurikuler sudah dikunci karena PAS telah selesai.\n\nAnda dapat melihat data siswa dalam mode baca saja (read only), tetapi tidak dapat mengedit.'
                                });
                            }, 500);
                        } else if (pasStatus === 'nonaktif') {
                            setIsReadOnly(true);
                            setReadOnlyReason('not_open');
                            setTimeout(() => {
                                showModal({
                                    type: 'warning',
                                    title: 'PAS Belum Aktif',
                                    message: 'Input ekstrakurikuler hanya tersedia saat PAS aktif.\n\nAnda dapat melihat data siswa dalam mode baca saja (read only), tetapi belum dapat mengedit.\n\nSilakan hubungi admin untuk membuka periode PAS.'
                                });
                            }, 500);
                        }
                    } else {
                        showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Terjadi kesalahan' });
                    }
                } else {
                    const errData = await parseBackendError(res);

                    if (errData.code === 'NOT_ASSIGNED') {
                        setIsNotAssigned(true);
                    } else if (errData.code === 'PERIOD_NOT_OPEN') {
                        setIsReadOnly(true);
                        setReadOnlyReason('not_open');
                        setSiswaList([]);
                        setFilteredSiswa([]);
                        setTimeout(() => {
                            showModal({
                                type: 'warning',
                                title: 'PAS Belum Aktif',
                                message: errData.message || 'Input ekstrakurikuler hanya tersedia saat PAS aktif.\n\nSilakan hubungi admin untuk membuka periode PAS.'
                            });
                        }, 500);
                    } else if (errData.code === 'PERIOD_LOCKED') {
                        setIsReadOnly(true);
                        setReadOnlyReason('locked');
                        setSiswaList([]);
                        setFilteredSiswa([]);
                        setTimeout(() => {
                            showModal({
                                type: 'warning',
                                title: 'PAS Sudah Selesai',
                                message: errData.message || 'Input ekstrakurikuler sudah dikunci karena PAS telah selesai.'
                            });
                        }, 500);
                    } else {
                        showModal({ type: 'error', title: 'Gagal Memuat', message: errData.message || 'Terjadi kesalahan.' });
                    }
                }
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Tidak dapat terhubung ke server.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showModal]);

    // ====== FILTER PENCARIAN ======
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(siswaList.filter(s =>
                s.nama.toLowerCase().includes(q) ||
                s.nis.includes(q) ||
                s.nisn.includes(q)
            ));
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    const handleDetail = (siswa: SiswaEkskul) => {
        setSelectedSiswa(siswa);
        setShowDetail(true);
    };

    // ✅ Cek read-only sebelum buka modal edit
    const handleEdit = (siswa: SiswaEkskul) => {
        if (isReadOnly) {
            if (readOnlyReason === 'locked') {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message: 'PAS sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengedit data ekstrakurikuler.'
                });
            } else {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message: 'PAS belum aktif.\n\nAnda belum dapat mengedit data ekstrakurikuler.\n\nSilakan tunggu admin membuka periode PAS.'
                });
            }
            return;
        }

        setEditSiswa(siswa);

        const initialData = [
            { ekskul_id: 0, deskripsi: '' },
            { ekskul_id: 0, deskripsi: '' },
            { ekskul_id: 0, deskripsi: '' }
        ];

        siswa.ekskul.forEach((ekskul, index) => {
            if (index < 3) {
                initialData[index] = {
                    ekskul_id: ekskul.id,
                    deskripsi: ekskul.deskripsi
                };
            }
        });

        setEditData(initialData);
        setShowEdit(true);
    };

    const handleEkskulChange = (index: number, field: 'ekskul_id' | 'deskripsi', value: any) => {
        const newData = [...editData];
        newData[index] = { ...newData[index], [field]: value };

        // Jika mengubah ID ekskul, reset deskripsi agar diisi ulang
        if (field === 'ekskul_id' && Number(value) > 0) {
            newData[index].deskripsi = '';
        }

        setEditData(newData);
    };

    // ✅ Validasi + tampilkan konfirmasi (sekarang lewat showModal type 'confirm')
    const openConfirmSave = () => {
        if (!editSiswa) return;

        const validEkskul = editData.filter(e => e.ekskul_id > 0);

        if (validEkskul.length === 0 && editSiswa.ekskul.length === 0) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Tidak ada data yang diubah.'
            });
            return;
        }

        // ✅ Validasi duplikasi ekskul
        const ekskulIds = validEkskul.map(e => e.ekskul_id);
        if (new Set(ekskulIds).size !== ekskulIds.length) {
            showModal({
                type: 'warning',
                title: 'Ekskul Duplikat',
                message: 'Tidak boleh memilih ekstrakurikuler yang sama lebih dari 1 kali.\n\nSilakan pilih ekskul yang berbeda untuk setiap slot.'
            });
            return;
        }

        for (let i = 0; i < validEkskul.length; i++) {
            if (!validEkskul[i].deskripsi.trim()) {
                showModal({
                    type: 'warning',
                    title: 'Deskripsi Kosong',
                    message: `Deskripsi ekstrakurikuler ke-${i + 1} (${validEkskul[i].ekskul_id ? daftarEkskul.find(d => d.id_ekskul === validEkskul[i].ekskul_id)?.nama_ekskul : 'Pilihan'}) wajib diisi.`
                });
                return;
            }
        }

        showModal({
            type: 'confirm',
            title: 'Konfirmasi Penyimpanan',
            message: `Apakah Anda yakin ingin menyimpan data ${editSiswa.nama}?`,
            onConfirm: executeSave,
        });
    };

    // ✅ Actual save (dipanggil dari modal konfirmasi)
    const executeSave = async () => {
        if (!editSiswa) return;

        setIsSaving(true);
        const validEkskul = editData.filter(e => e.ekskul_id > 0);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
                return;
            }

            const res = await fetch(`${API}/ekskul/${editSiswa.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ekskulList: validEkskul })
            });

            if (res.ok) {
                const updatedSiswa = siswaList.map(s => {
                    if (s.id === editSiswa.id) {
                        return {
                            ...s,
                            ekskul: validEkskul.map(e => ({
                                id: e.ekskul_id,
                                nama: daftarEkskul.find(de => de.id_ekskul === e.ekskul_id)?.nama_ekskul || '',
                                deskripsi: e.deskripsi
                            })),
                            jumlah_ekskul: validEkskul.length
                        };
                    }
                    return s;
                });

                setSiswaList(updatedSiswa);
                setFilteredSiswa(updatedSiswa);

                closeEdit();

                setTimeout(() => {
                    showModal({
                        type: 'success',
                        title: 'Berhasil!',
                        message: 'Data ekstrakurikuler berhasil disimpan.'
                    });
                }, 250);
            } else {
                const errData = await parseBackendError(res);
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: errData.message });
            }
        } catch (err: any) {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Tidak dapat terhubung ke server.' });
        } finally {
            setIsSaving(false);
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // IMPORT EKSTRAKURIKULER HANDLERS
    // ═════════════════════════════════════════════════════════════════════════

    const openImportModal = () => {
        if (isReadOnly) {
            showModal({
                type: 'warning',
                title: 'Mode Baca Saja',
                message: readOnlyReason === 'locked'
                    ? 'PAS sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengimport data ekstrakurikuler.'
                    : 'PAS belum aktif.\n\nAnda tidak dapat mengimport data ekstrakurikuler.'
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
            const response = await fetch(`${API}/ekskul/import-template`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                // Coba baca error JSON dari backend, jika gagal baca pakai text biasa
                let errMsg = 'Gagal download template';
                try {
                    const errData = await response.json();
                    errMsg = errData.message || errMsg;
                } catch (e) {
                    errMsg = await response.text() || errMsg;
                }
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // ✅ Pastikan kelasNama adalah string dan ada fallback 'Kelas'
            const safeKelasNama = (kelasNama || 'Kelas').replace(/[^a-z0-9]/gi, '_');
            a.download = `Template_Ekskul_${safeKelasNama}.xlsx`;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Tutup modal import DULU
            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            // Tampilkan notifikasi success SETELAH modal import tertutup
            setTimeout(() => {
                showModal({
                    type: 'success',
                    title: 'Template Berhasil Diunduh',
                    message: 'Template Excel berhasil diunduh ke folder Downloads.\n\nLangkah selanjutnya:\n1. Buka file Excel yang sudah diunduh\n2. Pilih ekskul dari dropdown (maks 3 per siswa)\n3. Isi deskripsi aktivitas\n4. Simpan file Excel\n5. Klik tombol "Import Ekskul" untuk upload file'
                });
            }, 300);
        } catch (err: any) {
            console.error('[ERROR] Download Template:', err);

            showModal({
                type: 'error',
                title: 'Gagal Mengunduh Template',
                message: err.message || 'Terjadi kesalahan saat mengunduh template. Pastikan Anda ditugaskan di kelas.'
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

    const downloadErrorReportEkskul = (errors: any[]) => {
        const headers = ['No', 'Baris', 'NIS', 'Nama Siswa', 'Alasan Error'];

        const rows = errors.map((err, index) => {
            const message = err.message || '';
            const rowMatch = message.match(/Baris\s+(\d+)/i);
            const rowNumber = rowMatch ? rowMatch[1] : '-';

            const nisMatch = message.match(/NIS\s+"([^"]+)"/i) || message.match(/NIS\s+([0-9]+)/i);
            const nis = nisMatch ? nisMatch[1] : '-';

            const namaMatch = message.match(/siswa\s+"([^"]+)"/i) || message.match(/\(([^\)]+)\)/i);
            const namaSiswa = namaMatch ? namaMatch[1] : '-';

            const escapedMessage = message.replace(/"/g, '""');

            return [
                index + 1,
                rowNumber,
                nis,
                namaSiswa,
                `"${escapedMessage}"`
            ].join(',');
        });

        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `error_import_ekskul_${kelasNama.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.csv`;

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

            const response = await fetch(`${API}/ekskul/import`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengimport ekstrakurikuler');
            }

            // Refresh data
            const refreshRes = await fetch(`${API}/ekskul`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                if (refreshData.success) {
                    setSiswaList(refreshData.data || []);
                    setFilteredSiswa(refreshData.data || []);
                    setDaftarEkskul(refreshData.daftar_ekskul || []);
                }
            }

            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            const errors = data.data?.errors || [];
            const totalErrors = errors.length;

            if (totalErrors > 4) {
                downloadErrorReportEkskul(errors);
            }

            // Build success message
            let successMessage = data.message;

            if (totalErrors > 0) {
                if (totalErrors <= 4) {
                    successMessage += `\n\nDetail Error:\n${errors.slice(0, 4).map((e: any) => `• ${e.message}`).join('\n')}`;
                } else {
                    successMessage += `\n\nContoh Error (3 dari ${totalErrors}):\n${errors.slice(0, 3).map((e: any) => `• ${e.message}`).join('\n')}`;
                    successMessage += `\n\nFile CSV error telah diunduh otomatis!`;
                }
            }

            // ✅ Tampilkan info NIS duplikat
            if (data.data?.nis_duplikat_count && data.data.nis_duplikat_count > 0) {
                const duplikatInfo = data.data.nis_duplikat_detail
                    .map((d: any) => `Baris ${d.row} (NIS: ${d.nis}, ${d.nama})`)
                    .join(', ');
                successMessage += `\n\nDitemukan ${data.data.nis_duplikat_count} NIS duplikat: ${duplikatInfo}. Hanya data pertama yang diproses.`;
            }

            // ✅ Tampilkan pesan penting
            if (data.data?.pesan_penting) {
                successMessage += `\n\n${data.data.pesan_penting}`;
            }

            setTimeout(() => {
                showModal({
                    type: totalErrors > 0 ? 'warning' : 'success',
                    title: totalErrors > 0 ? 'Import Selesai (Ada Error)' : 'Import Berhasil!',
                    message: successMessage
                });
            }, 250);

        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Import',
                message: err.message || 'Terjadi kesalahan saat mengimport ekstrakurikuler.'
            });
        } finally {
            setImporting(false);
        }
    };

    // ====== PAGINATION LOGIC ======
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
        if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) range.push(i); }
        else {
            range.push(1);
            if (currentPage > 3) range.push(-1);
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) range.push(i);
            if (currentPage < totalPages - 2) range.push(-2);
            range.push(totalPages);
        }
        range.forEach((p) => {
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

    // ====== RENDER UTAMA ======

    // ✅ KONDISI 1: Belum Ditugaskan → Blokir Total
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

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* HEADER */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ekstrakurikuler Siswa</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola data ekstrakurikuler siswa kelas {kelasNama} (maks. 3 per siswa)</p>
            </div>

            {/* Banner read only */}
            {isReadOnly && (
                <div className="mb-5 rounded-2xl overflow-hidden card-flat anim-in d2" style={{ border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}` }}>
                    <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: readOnlyReason === 'locked' ? '#fee2e2' : '#fef3c7' }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: readOnlyReason === 'locked' ? '#fecaca' : '#fde68a' }}>
                            <Lock size={18} className={readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'} />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>Mode Baca Saja (Read Only)</p>
                            <p className={`text-xs mt-0.5 ${readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'}`}>
                                {readOnlyReason === 'locked'
                                    ? 'PAS telah selesai dan data sudah dikunci. Anda dapat melihat data siswa, tetapi tidak dapat mengedit ekstrakurikuler.'
                                    : 'PAS belum aktif. Anda dapat melihat data siswa, tetapi belum dapat mengedit ekstrakurikuler. Silakan hubungi admin untuk membuka periode PAS.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* TOOLBAR — card terpisah */}
            <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d2" style={CARD_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: ACCENT_DARK }} />
                        <span className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>Kelas {kelasNama} — {filteredSiswa.length} siswa</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {!isReadOnly && (
                            <ActionButton variant="info" onClick={openImportModal}>
                                <Upload size={16} /> Import Ekskul
                            </ActionButton>
                        )}
                        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>Tampilkan</span>
                            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200">
                                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>data</span>
                        </div>
                        <div className="relative w-full sm:w-64 flex-shrink-0">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search className="w-3.5 h-3.5" style={{ color: ACCENT }} /></div>
                            <input type="text" placeholder="Cari siswa..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400" />
                            {searchQuery && (<button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2.5 flex items-center" style={{ color: ACCENT }}><X className="w-3.5 h-3.5" /></button>)}
                        </div>
                    </div>
                </div>
                <p className="text-xs mt-3 text-gray-400">Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data</p>
            </div>

            {/* TABEL — card terpisah, CSS grid konsisten dengan design system terbaru */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                <div className="overflow-x-auto scrollbar-thin">
                    <div style={{ width: '100%', minWidth: '900px' }}>
                        <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
                            {['No.', 'Nama Siswa', 'NIS', 'NISN', 'Ekstrakurikuler', 'Aksi'].map((h, i) => (
                                <div key={i} className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">
                                    {h}
                                </div>
                            ))}
                        </div>

                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0' }}>
                                    {Array.from({ length: 6 }).map((__, j) => (
                                        <div key={j} className="px-4 py-4 flex items-center justify-center">
                                            <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 1 ? '85%' : j === 4 ? '90%' : '55%' }} />
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : currentSiswa.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Users size={32} className="text-gray-300" />
                                    <p className="text-sm font-semibold text-gray-500">{searchQuery ? 'Siswa Tidak Ditemukan' : 'Belum Ada Data Siswa'}</p>
                                    <p className="text-xs text-gray-400 max-w-md mx-auto">{searchQuery ? `Tidak ada siswa yang cocok dengan kata kunci "${searchQuery}".` : 'Belum ada siswa yang terdaftar di kelas Anda.'}</p>
                                </div>
                            </div>
                        ) : (
                            currentSiswa.map((siswa, index) => (
                                <div
                                    key={siswa.id}
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
                                    <div className="px-4 py-4 flex items-center justify-center text-center text-gray-400">{startIndex + index + 1}</div>
                                    <div className="px-4 py-4 flex items-center overflow-hidden">
                                        <p className="font-bold text-gray-900 truncate" title={siswa.nama}>{siswa.nama}</p>
                                    </div>
                                    <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600 font-mono text-xs">{siswa.nis}</div>
                                    <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600 font-mono text-xs">{siswa.nisn}</div>
                                    <div className="px-4 py-4 flex items-center overflow-hidden">
                                        {siswa.ekskul.length === 0 ? (
                                            <span className="text-gray-400 text-xs italic">Belum diisi</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {siswa.ekskul.map((ekskul, i) => (
                                                    <span key={i} title={ekskul.deskripsi}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-help"
                                                        style={{ background: '#fff0e5', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>
                                                        <Award size={10} />
                                                        {ekskul.nama}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-4 flex items-center justify-center">
                                        <div className="flex justify-center gap-1.5">
                                            <ActionButton size="sm" variant="info" onClick={() => handleDetail(siswa)}>
                                                <Eye size={13} /> Detail
                                            </ActionButton>
                                            <ActionButton size="sm" variant={isReadOnly ? 'neutral' : 'warning'} disabled={isReadOnly} onClick={() => handleEdit(siswa)}>
                                                {isReadOnly ? (<><Lock size={13} /> Terkunci</>) : (<><Pencil size={13} /> Edit</>)}
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

            {/* ====== MODAL DETAIL SISWA ====== */}
            {showDetail && selectedSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>

                        <div className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div>
                                <h2 className="text-lg font-bold text-white">Detail Ekstrakurikuler</h2>
                                <p className="text-xs text-orange-100 mt-0.5">{kelasNama}</p>
                            </div>
                            <button onClick={closeDetail}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
                                style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-5">
                            {/* Avatar + nama siswa */}
                            <div className="flex flex-col items-center gap-3 pb-5 border-b" style={{ borderColor: '#fde0c8' }}>
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center border-4"
                                    style={{ background: 'linear-gradient(135deg, #fed7aa, #fde0c8)', borderColor: '#fde0c8' }}
                                >
                                    <User size={34} style={{ color: '#c2410c' }} />
                                </div>
                                <div className="text-center">
                                    <p className="text-base sm:text-lg font-bold text-gray-900">{selectedSiswa.nama}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">NIS {selectedSiswa.nis} · NISN {selectedSiswa.nisn}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 px-0.5">Ekstrakurikuler yang Diikuti</p>

                                {selectedSiswa.ekskul.length === 0 ? (
                                    <div className="text-center py-8 rounded-xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                                        <Award size={32} className="mx-auto mb-2" style={{ color: ACCENT }} />
                                        <p className="text-sm text-gray-500">Belum mengikuti ekstrakurikuler</p>
                                    </div>
                                ) : (
                                    selectedSiswa.ekskul.map((ekskul, i) => (
                                        <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: '#fde0c8' }}>
                                            <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#fff7ed' }}>
                                                <Award size={16} style={{ color: ACCENT }} />
                                                <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{ekskul.nama}</p>
                                            </div>
                                            <div className="p-4 bg-white">
                                                <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">{ekskul.deskripsi}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <ActionButton variant="neutral" onClick={closeDetail}>Tutup</ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL EDIT SISWA ====== */}
            {showEdit && editSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>

                        <div className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div>
                                <h2 className="text-lg font-bold text-white">Edit Ekstrakurikuler</h2>
                                <p className="text-xs text-orange-100 mt-0.5">{editSiswa.nama} - {kelasNama}</p>
                            </div>
                            <button onClick={closeEdit}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
                                style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-5">
                            <div className="flex items-center gap-4 px-4 sm:px-5 py-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold text-white" style={{ background: BRAND_GRADIENT }}>
                                    {editSiswa.nama.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-gray-800">{editSiswa.nama}</p>
                                    <p className="text-xs text-gray-500">NIS: {editSiswa.nis} • NISN: {editSiswa.nisn}</p>
                                </div>
                            </div>

                            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 px-0.5">Pilih Ekstrakurikuler (Maksimal 3)</p>

                            {editData.map((item, index) => (
                                <div key={index} className="rounded-xl overflow-hidden border" style={{ borderColor: '#fde0c8' }}>
                                    <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#fff7ed' }}>
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: BRAND_GRADIENT }}>
                                            {index + 1}
                                        </div>
                                        <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Ekstrakurikuler {index + 1}</p>
                                    </div>

                                    <div className="p-4 bg-white space-y-3">
                                        <div>
                                            <label className={labelCls} style={labelColor}>Pilih Ekstrakurikuler</label>
                                            <select
                                                value={item.ekskul_id}
                                                onChange={(e) => handleEkskulChange(index, 'ekskul_id', Number(e.target.value))}
                                                className={inputCls}
                                            >
                                                <option value={0}>-- Pilih Ekstrakurikuler --</option>
                                                {daftarEkskul.map(ekskul => (
                                                    <option key={ekskul.id_ekskul} value={ekskul.id_ekskul}>
                                                        {ekskul.nama_ekskul}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className={labelCls} style={labelColor}>Deskripsi Aktivitas <span className="text-red-500">*</span></label>
                                            <textarea
                                                value={item.deskripsi}
                                                onChange={(e) => handleEkskulChange(index, 'deskripsi', e.target.value)}
                                                placeholder="Tuliskan deskripsi aktivitas siswa di ekstrakurikuler ini..."
                                                rows={3}
                                                className={`${inputCls} resize-none`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <ActionButton variant="neutral" disabled={isSaving} onClick={closeEdit}>Batal</ActionButton>
                            <ActionButton variant="primary" disabled={isSaving} onClick={openConfirmSave}>
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} /> Simpan
                                    </>
                                )}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL IMPORT EKSTRAKURIKULER ====== */}
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
                                    <h2 className="text-sm font-bold text-white leading-tight truncate">Import Ekstrakurikuler</h2>
                                    <p className="text-[10px] text-white/70 mt-0.5">Kelas {kelasNama}</p>
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
                                    <Info size={16} className="text-blue-600" />
                                    Langkah-langkah Import:
                                </p>
                                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                                    <li>Download template Excel (sudah berisi daftar siswa)</li>
                                    <li>Pilih ekskul dari dropdown (maks 3 per siswa)</li>
                                    <li>Isi deskripsi aktivitas</li>
                                    <li>Simpan file Excel</li>
                                    <li>Upload file Excel yang sudah diisi</li>
                                    <li>Klik "Import Ekskul" untuk memproses</li>
                                </ol>
                            </div>

                            <div className="mb-5 p-3 rounded-xl flex items-start gap-2" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                                <AlertCircle size={16} style={{ color: ACCENT_DARK }} className="flex-shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1" style={{ color: '#7a3a0a' }}>
                                    <p><strong>Info Import:</strong></p>
                                    <p>- Setiap siswa dapat mengikuti maksimal 3 ekstrakurikuler</p>
                                    <p>- Setiap ekskul wajib memiliki deskripsi aktivitas</p>
                                    <p>- NIS harus unik (tidak boleh duplikat)</p>
                                    <p className="mt-1"><strong>Tip:</strong> Input hanya tersedia saat PAS aktif. Data dikunci jika PAS selesai.</p>
                                </div>
                            </div>

                            <div className="mb-5">
                                <ActionButton variant="warning" fullWidth disabled={downloadingTemplate} onClick={handleDownloadTemplate}>
                                    {downloadingTemplate ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
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
                                <label className={labelCls} style={labelColor}>Upload File Excel <span className="text-red-500">*</span></label>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${importFile ? 'border-green-400 bg-green-50' : 'border-orange-300 bg-orange-50 hover:bg-orange-100'}`}
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
                                <ActionButton variant="neutral" fullWidth disabled={importing} onClick={() => { setShowImportModal(false); setImportFile(null); }}>
                                    Batal
                                </ActionButton>
                                <ActionButton variant="success" fullWidth disabled={!importFile || importing} onClick={executeImport}>
                                    {importing ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-current/40 border-t-current animate-spin" />
                                            Mengimport...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} /> Import Ekskul
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