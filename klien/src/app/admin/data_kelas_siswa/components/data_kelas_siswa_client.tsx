/**
 * Nama File: data_kelas_client.tsx
 * Fungsi: Komponen klien untuk mengelola data kelas dan wali kelas
 * UPDATE: Menyamakan desain (warna, tombol, layout, animasi) dengan
 *         data_guru_client.tsx / data_pembina_ekskul_client.tsx.
 *         Bagian yang khas untuk Data Kelas (pemilih Tahun Ajaran, banner
 *         kunci data, aksi Lihat Siswa/Hapus) ditata ulang agar tetap
 *         rapi dan konsisten dengan sistem desain yang sama.
 */

'use client';

import Link from 'next/link';
import { useState, useEffect, ChangeEvent, ReactNode, useCallback } from 'react';
import {
    Pencil, Plus, Search, X, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert,
    Users, Lock, CalendarRange, ChevronLeft, ChevronRight, RotateCcw,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

/* ==========================================================================
   INTERFACES
   ========================================================================== */

interface Kelas {
    id: number;
    nama_kelas: string;
    wali_kelas: string;
    wali_kelas_id: number | null;
    fase: string;
    jumlah_siswa: number;
}

interface TahunAjaran {
    id: number;
    tahun_ajaran: string;
    semester: string;
    is_aktif: boolean;
}

interface GuruOption {
    id: number;
    nama: string;
}

interface FormDataType {
    nama_kelas: string;
    fase: string;
    user_id: string;
}

/* ==========================================================================
   NOTIFICATION MODAL
   ========================================================================== */

type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';
interface ModalConfig { type: ModalType; title: string; message: string; onConfirm?: () => void; }

/* ==========================================================================
   DESIGN TOKENS
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

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
            .anim-in, .row-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .dg-shimmer, .btn-action, .card-flat, .row-hover {
                animation: none !important;
                transition: none !important;
            }
        }
    `}</style>
);

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <div className="dg-scaleIn contents w-full">
                    {!isConfirm && (
                        <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                    <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                    <div className="text-center w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                    </div>
                    {isConfirm ? (
                        <div className="flex gap-2.5 w-full mt-1">
                            <button onClick={onClose} className="btn-action flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors" style={{ borderColor: '#e5e7eb', color: '#4b5563', background: '#fff' }}>Batal</button>
                            <button onClick={() => { modal.onConfirm?.(); onClose(); }} className="btn-action flex-1 text-white font-bold py-2.5 rounded-xl transition-colors text-sm" style={{ background: BRAND_GRADIENT, boxShadow: '0 4px 14px rgba(232,105,10,0.30)' }}>Lanjutkan</button>
                        </div>
                    ) : (
                        <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>OK, Mengerti</button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ==========================================================================
   SHARED STYLE CONSTANTS
   ========================================================================== */

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-red-100 focus:border-red-400 bg-red-50/30 border-red-400 placeholder:text-gray-400";

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

/* Kolom grid tabel — No, Nama Kelas, Guru Kelas, Fase, Jumlah Siswa, Aksi */
const GRID_COLS = 'minmax(56px,0.5fr) minmax(130px,1.2fr) minmax(160px,1.7fr) minmax(90px,0.8fr) minmax(120px,1fr) minmax(230px,2.2fr)';

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   SISTEM TOMBOL AKSI
   ========================================================================== */

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent' | 'danger';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
    accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
    danger: { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
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

/* Versi Link (Next.js) yang tampil identik dengan ActionButton, untuk aksi navigasi seperti "Lihat Siswa" */
const LinkButton = ({ href, children, variant = 'neutral', size = 'sm', title }: {
    href: string; children: ReactNode; variant?: BtnVariant; size?: 'md' | 'sm'; title?: string;
}) => {
    const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
    return (
        <Link href={href} title={title} className={`btn-action inline-flex items-center justify-center gap-1.5 rounded-xl font-bold whitespace-nowrap ${pad}`} style={VARIANT_BASE[variant]}>
            {children}
        </Link>
    );
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function DataKelasClient() {
    const { showSessionExpired, handleLogout } = useSession();

    /* ------------------------------------------------------------------
       STATE
    ------------------------------------------------------------------ */

    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
    const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<number | null>(null);
    const [selectedTahunAjaranAktif, setSelectedTahunAjaranAktif] = useState(false);

    const [guruList, setGuruList] = useState<GuruOption[]>([]);
    const [loadingGuru, setLoadingGuru] = useState(false);

    const [isReadOnly, setIsReadOnly] = useState(false);
    const [lockedBy, setLockedBy] = useState<string | null>(null);
    const [lockedSemester, setLockedSemester] = useState<string | null>(null);

    const [formClosing, setFormClosing] = useState(false);

    const [formData, setFormData] = useState<FormDataType>({ nama_kelas: '', fase: '', user_id: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    /* ------------------------------------------------------------------
       DATA FETCHING
    ------------------------------------------------------------------ */

    const fetchTahunAjaran = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
            const res = await fetch('http://localhost:5000/api/admin/tahun-ajaran', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.success) {
                setTahunAjaranList(data.data.map((ta: any) => ({
                    id: ta.id_induk,
                    tahun_ajaran: ta.tahun_ajaran,
                    semester: ta.semester_aktif?.toLowerCase() || 'ganjil',
                    is_aktif: ta.status === 'AKTIF',
                })));
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const fetchGuruList = async () => {
        setLoadingGuru(true);
        const token = localStorage.getItem('token');
        if (!token) { setLoadingGuru(false); return; }
        try {
            const res = await fetch('http://localhost:5000/api/admin/guru-kelas', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.success) {
                const filteredGurus = data.data
                    .filter((g: any) => g.user_id != null)
                    .filter((g: any) => {
                        if (editId && g.kelas_id === editId) return true;
                        if (g.kelas_id && g.kelas_id !== editId) return false;
                        return true;
                    })
                    .map((g: any) => ({ id: g.user_id, nama: g.nama }));
                setGuruList(filteredGurus);
            } else {
                setGuruList([]);
            }
        } catch {
            setGuruList([]);
        } finally {
            setLoadingGuru(false);
        }
    };

    const fetchKelas = async (tahunAjaranId: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
            const res = await fetch(`http://localhost:5000/api/admin/kelas?tahun_ajaran_id=${tahunAjaranId}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.success) {
                setKelasList(data.data.map((k: any) => ({ ...k, wali_kelas_id: k.wali_kelas === '-' ? null : k.wali_kelas_id })));
                setIsReadOnly(data.is_read_only || false);
                setLockedBy(data.locked_by || null);
                setLockedSemester(data.locked_semester || null);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data kelas.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTahunAjaran(); fetchGuruList(); }, []);

    useEffect(() => {
        if (tahunAjaranList.length > 0 && selectedTahunAjaranId === null) {
            const savedId = localStorage.getItem('selectedTahunAjaranId');
            if (savedId) {
                const id = Number(savedId);
                const ta = tahunAjaranList.find(t => t.id === id);
                if (ta) {
                    setSelectedTahunAjaranId(id);
                    setSelectedTahunAjaranAktif(ta.is_aktif);
                    setLoading(true);
                    fetchKelas(id);
                }
            }
        }
    }, [tahunAjaranList]);

    /* ------------------------------------------------------------------
       FORM HANDLERS & ANIMASI
    ------------------------------------------------------------------ */

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleReset = () => { setFormData({ nama_kelas: '', fase: '', user_id: '' }); setErrors({}); };

    const closeForm = () => {
        setFormClosing(true);
        setTimeout(() => {
            setShowTambah(false);
            setShowEdit(false);
            setEditId(null);
            setFormClosing(false);
            handleReset();
        }, 300);
    };

    const handleEdit = (kelas: Kelas) => {
        setEditId(kelas.id);
        setFormData({ nama_kelas: kelas.nama_kelas, fase: kelas.fase, user_id: kelas.wali_kelas_id ? String(kelas.wali_kelas_id) : '' });
        setShowEdit(true);
    };

    const validate = (): boolean => {
        const ne: Record<string, string> = {};
        if (!formData.nama_kelas?.trim()) ne.nama_kelas = 'Nama kelas wajib diisi';
        if (!formData.fase?.trim()) ne.fase = 'Fase wajib diisi';
        setErrors(ne);
        if (Object.keys(ne).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
            return false;
        }
        return true;
    };

    const openConfirmModal = (action: 'add' | 'edit') => {
        if (!validate()) return;

        if (action === 'edit') {
            const ori = kelasList.find(k => k.id === editId);
            if (ori) {
                const changed =
                    ori.nama_kelas.toLowerCase().trim() !== formData.nama_kelas.toLowerCase().trim() ||
                    ori.fase.toLowerCase().trim() !== formData.fase.toLowerCase().trim() ||
                    String(ori.wali_kelas_id || '') !== String(formData.user_id || '');
                if (!changed) {
                    showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang berubah. Tidak perlu menyimpan.' });
                    return;
                }
            }
        }

        showModal({
            type: 'confirm',
            title: `Konfirmasi ${action === 'add' ? 'Penambahan' : 'Perubahan'} Data`,
            message: action === 'add' ? 'Apakah Anda yakin ingin menambahkan data kelas ini?' : 'Apakah Anda yakin ingin mengubah data kelas ini?',
            onConfirm: () => { action === 'add' ? executeTambah() : executeEdit(); },
        });
    };

    const executeTambah = async () => {
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
        try {
            const res = await fetch('http://localhost:5000/api/admin/kelas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nama_kelas: formData.nama_kelas.trim(),
                    fase: formData.fase.trim(),
                    user_id: formData.user_id && formData.user_id !== '' ? Number(formData.user_id) : null,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan kelas.' });
                return;
            }
            closeForm();
            if (selectedTahunAjaranId) fetchKelas(selectedTahunAjaranId);
            showModal({ type: 'success', title: 'Kelas Ditambahkan', message: `Kelas ${formData.nama_kelas} berhasil ditambahkan.` });
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const executeEdit = async () => {
        const token = localStorage.getItem('token');
        if (!token || !editId || !selectedTahunAjaranId) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Sesi tidak valid.' }); return; }
        try {
            const res = await fetch(`http://localhost:5000/api/admin/kelas/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nama_kelas: formData.nama_kelas.trim(),
                    fase: formData.fase.trim(),
                    user_id: formData.user_id && formData.user_id !== '' ? Number(formData.user_id) : null,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Gagal update kelas');
            }
            closeForm();
            if (selectedTahunAjaranId) fetchKelas(selectedTahunAjaranId);
            showModal({ type: 'success', title: 'Data Diperbarui', message: `Data kelas ${formData.nama_kelas} berhasil diperbarui.` });
        } catch (err: any) {
            showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan.' });
        }
    };

    const handleHapus = (kelasId: number, namaKelas: string) => {
        showModal({
            type: 'confirm',
            title: 'Konfirmasi Hapus',
            message: `Yakin ingin menghapus kelas "${namaKelas}"? Tindakan ini tidak dapat dibatalkan.`,
            onConfirm: async () => {
                const token = localStorage.getItem('token');
                if (!token || !selectedTahunAjaranId) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Sesi tidak valid.' }); return; }
                try {
                    const res = await fetch(`http://localhost:5000/api/admin/kelas/${kelasId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                    if (res.ok) {
                        fetchKelas(selectedTahunAjaranId);
                        showModal({ type: 'success', title: 'Kelas Dihapus', message: `Kelas "${namaKelas}" berhasil dihapus.` });
                    } else {
                        const err = await res.json();
                        showModal({ type: 'error', title: 'Gagal Menghapus', message: err.message || 'Terjadi kesalahan saat menghapus kelas.' });
                    }
                } catch {
                    showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
                }
            },
        });
    };

    /* ------------------------------------------------------------------
       FILTER & PAGINATION
    ------------------------------------------------------------------ */

    const filteredKelas = kelasList.filter(kelas => {
        const q = searchQuery.toLowerCase().trim();
        return !q || kelas.nama_kelas.toLowerCase().includes(q) ||
            (kelas.wali_kelas !== '-' && kelas.wali_kelas.toLowerCase().includes(q)) ||
            kelas.fase.toLowerCase().includes(q);
    });

    const totalPages = Math.max(1, Math.ceil(filteredKelas.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentKelas = filteredKelas.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "min-w-[30px] h-8 px-1.5 flex items-center justify-center rounded-lg text-xs font-bold border-2 transition-colors btn-action";
        const btnActive = "text-white border-transparent";
        const btnInactive = "text-gray-600 border-transparent hover:bg-orange-50 bg-transparent";
        const range: number[] = [];
        if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) range.push(i); }
        else {
            range.push(1);
            if (currentPage > 3) range.push(-1);
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) { if (i !== 1 && !range.includes(i)) range.push(i); }
            if (currentPage < totalPages - 2) range.push(-2);
            if (totalPages !== 1 && !range.includes(totalPages)) range.push(totalPages);
        }
        range.forEach((p, idx) => {
            if (p < 0) { pages.push(<span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-xs">…</span>); }
            else { pages.push(<button key={`page-${p}`} onClick={() => setCurrentPage(p)} className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`} style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}>{p}</button>); }
        });
        return pages;
    };

    /* ------------------------------------------------------------------
       FORM RENDER (DENGAN ANIMASI)
    ------------------------------------------------------------------ */

    const renderForm = (isEdit: boolean) => (
        <div className={`flex-1 min-h-screen p-3 sm:p-6 transition-all duration-300 ${formClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`} style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="max-w-3xl mx-auto">
                <div className="mb-4 sm:mb-5 flex items-center gap-3 anim-in d1">
                    <button
                        onClick={closeForm}
                        aria-label="Kembali"
                        className="btn-action w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2"
                        style={{ background: '#fff', borderColor: '#f0e0d0', color: ACCENT_DARK }}
                    >
                        <ChevronLeft size={19} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900">{isEdit ? 'Edit Data Kelas' : 'Tambah Data Kelas'}</h1>
                        <p className="text-xs sm:text-sm mt-0.5 text-gray-500">{isEdit ? 'Perbarui informasi kelas dan wali kelas' : 'Isi formulir untuk menambahkan kelas baru'}</p>
                    </div>
                </div>

                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d2" style={CARD_STYLE}>
                    <div className="px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                        <h2 className="text-sm sm:text-base font-bold text-white">{isEdit ? 'Ubah Data Kelas' : 'Data Kelas Baru'}</h2>
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2">
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Nama Kelas <span className="text-red-500">*</span></label>
                                <input type="text" name="nama_kelas" value={formData.nama_kelas} onChange={handleInputChange} placeholder="Contoh: 1 A" className={errors.nama_kelas ? inputErrCls : inputCls} />
                                {errors.nama_kelas && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.nama_kelas}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Fase <span className="text-red-500">*</span></label>
                                <input type="text" name="fase" value={formData.fase} onChange={handleInputChange} placeholder="A, B, atau C" className={errors.fase ? inputErrCls : inputCls} />
                                {errors.fase && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.fase}</p>}
                            </div>

                            <div className="sm:col-span-2 flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>
                                    Wali Kelas <span className="text-gray-400 font-normal text-xs">(opsional)</span>
                                </label>
                                {loadingGuru ? (
                                    <div className="dg-shimmer border rounded-xl px-3.5 py-2.5 text-sm h-[42px]" style={{ borderColor: '#e5e5e5' }} />
                                ) : (
                                    <select name="user_id" value={formData.user_id} onChange={handleInputChange} className={inputCls}>
                                        <option value="">-- Pilih Wali Kelas --</option>
                                        {guruList.map(g => (<option key={`guru-${g.id}`} value={g.id}>{g.nama}</option>))}
                                    </select>
                                )}
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {isEdit ? 'Ubah wali kelas jika diperlukan' : 'Bisa diisi sekarang atau diatur nanti melalui Edit'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-2.5 mt-6 pt-4 border-t" style={{ borderColor: '#f0e0d0' }}>
                            <ActionButton variant="neutral" onClick={closeForm}>Batal</ActionButton>
                            <ActionButton variant="info" onClick={handleReset}>
                                <RotateCcw size={15} /> Reset
                            </ActionButton>
                            <ActionButton variant="primary" onClick={() => openConfirmModal(isEdit ? 'edit' : 'add')}>
                                {isEdit ? 'Simpan Perubahan' : 'Simpan Data'}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (showTambah) return renderForm(false);
    if (showEdit) return renderForm(true);

    /* ------------------------------------------------------------------
       MAIN LIST VIEW
    ------------------------------------------------------------------ */

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Kelas</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola data kelas dan wali kelas</p>
            </div>

            {/* Card: Pemilih Tahun Ajaran — compact, jadi gerbang sebelum konten lain relevan */}
            <div className="card-flat bg-white rounded-2xl px-4 sm:px-5 py-3.5 mb-4 inline-flex items-center gap-3 anim-in d2" style={CARD_STYLE}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                    <CalendarRange size={16} style={{ color: ACCENT_DARK }} />
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm font-bold whitespace-nowrap" style={labelColor}>Tahun Ajaran</label>
                    <select
                        value={selectedTahunAjaranId ?? ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                                setSelectedTahunAjaranId(null);
                                setSelectedTahunAjaranAktif(false);
                                setLoading(false);
                                setKelasList([]);
                                setIsReadOnly(false);
                                setLockedBy(null);
                                setLockedSemester(null);
                                localStorage.removeItem('selectedTahunAjaranId');
                                return;
                            }
                            const id = Number(value);
                            const selectedTa = tahunAjaranList.find(ta => ta.id === id);
                            setSelectedTahunAjaranId(id);
                            setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false);
                            localStorage.setItem('selectedTahunAjaranId', id.toString());
                            setLoading(true);
                            fetchKelas(id);
                        }}
                        className={`${inputCls} min-w-[210px] font-semibold`}
                    >
                        <option value="">-- Pilih Tahun Ajaran --</option>
                        {tahunAjaranList.map(ta => (
                            <option key={ta.id} value={ta.id}>{ta.tahun_ajaran} {ta.is_aktif ? '(Aktif)' : ''}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedTahunAjaranId === null ? (
                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                    <div className="m-5 sm:m-6 py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                        <CalendarRange size={30} className="text-gray-300" />
                        <p className="text-sm font-bold text-gray-500">Pilih Tahun Ajaran Terlebih Dahulu</p>
                        <p className="text-xs text-gray-400">Data kelas akan tampil setelah tahun ajaran dipilih</p>
                    </div>
                </div>
            ) : (
                <>
                    {isReadOnly && (
                        <div className="mb-4 p-4 rounded-2xl flex items-start gap-3 anim-in d3" style={{ background: '#fffbeb', border: '1.5px solid #fcd34d' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
                                <Lock size={17} className="text-amber-700" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-amber-900 mb-1">Data Kelas Terkunci (Read-Only)</h3>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Penilaian <strong>{lockedBy}</strong> semester <strong>{lockedSemester}</strong> telah diarsipkan dan dikunci.
                                    Data kelas tidak dapat diubah sampai tahun ajaran berakhir. Untuk membuka kunci, silakan hubungi administrator
                                    atau gunakan halaman Arsip Rapor.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Card: Toolbar — Tambah Kelas + Tampilkan data + Search */}
                    <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d3" style={CARD_STYLE}>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                            <div className="flex-shrink-0">
                                {selectedTahunAjaranAktif && !isReadOnly ? (
                                    <ActionButton variant="primary" onClick={() => setShowTambah(true)}>
                                        <Plus size={16} /> <span className="hidden sm:inline">Tambah Kelas</span><span className="sm:hidden">Tambah</span>
                                    </ActionButton>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">
                                        {isReadOnly ? 'Data terkunci, tidak dapat menambah kelas' : 'Tahun ajaran ini tidak aktif'}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
                                <div className="relative w-full xs:w-auto sm:w-56 flex-shrink-0">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                                    </div>
                                    <input type="text" placeholder="Cari kelas, wali kelas..." value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                        className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
                                    />
                                    {searchQuery && (
                                        <button type="button" aria-label="Bersihkan pencarian" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2.5 flex items-center" style={{ color: ACCENT }}>
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                                    <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>Tampilkan</span>
                                    <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200">
                                        <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                                    </select>
                                    <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>data</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card: Tabel data kelas */}
                    <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d4" style={CARD_STYLE}>
                        <div className="overflow-x-auto">
                            <div style={{ width: '100%', minWidth: '780px' }}>
                                <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                                    <div className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Nama Kelas</div>
                                    <div className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Guru Kelas</div>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Fase</div>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Jml. Siswa</div>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Aksi</div>
                                </div>

                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0' }}>
                                            {Array.from({ length: 6 }).map((__, j) => (
                                                <div key={j} className="px-4 py-4 flex items-center justify-center">
                                                    <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 2 ? '85%' : '55%' }} />
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                ) : currentKelas.length === 0 ? (
                                    <div className="py-14 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={32} className="text-gray-300" />
                                            <p className="text-sm font-semibold text-gray-500">Tidak ada data kelas</p>
                                            {searchQuery && <p className="text-xs text-gray-400">Coba kata kunci lain</p>}
                                        </div>
                                    </div>
                                ) : currentKelas.map((kelas, index) => (
                                    <div key={kelas.id} className="grid row-in row-hover border-b transition-colors"
                                        style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0', background: '#fff', animationDelay: `${Math.min(index, 8) * 0.03}s` }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                    >
                                        <div className="px-4 py-4 flex items-center justify-center text-center text-gray-400">{startIndex + index + 1}</div>

                                        <div className="px-4 py-4 flex items-center overflow-hidden">
                                            <p className="font-bold text-gray-900 truncate" title={kelas.nama_kelas}>{kelas.nama_kelas}</p>
                                        </div>

                                        <div className="px-4 py-4 flex items-center overflow-hidden">
                                            {kelas.wali_kelas === '-' ? (
                                                <span className="text-gray-400 italic text-xs">Belum ditetapkan</span>
                                            ) : (
                                                <p className="text-gray-700 truncate" title={kelas.wali_kelas}>{kelas.wali_kelas}</p>
                                            )}
                                        </div>

                                        <div className="px-4 py-4 flex items-center justify-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap" style={{ background: '#fff5eb', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>
                                                {kelas.fase}
                                            </span>
                                        </div>

                                        <div className="px-4 py-4 flex items-center justify-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200">
                                                <Users size={11} /> {kelas.jumlah_siswa}
                                            </span>
                                        </div>

                                        <div className="px-4 py-4 flex items-center justify-center">
                                            <div className="flex justify-center flex-wrap gap-1.5">
                                                <LinkButton href={`/admin/data_kelas_siswa/${kelas.id}`} variant="info" title="Lihat daftar siswa">
                                                    <Users size={13} /> Siswa
                                                </LinkButton>

                                                {selectedTahunAjaranAktif && !isReadOnly && (
                                                    <>
                                                        <ActionButton size="sm" variant="warning" onClick={() => handleEdit(kelas)} title="Edit data">
                                                            <Pencil size={13} /> Edit
                                                        </ActionButton>
                                                        <ActionButton size="sm" variant="danger" onClick={() => handleHapus(kelas.id, kelas.nama_kelas)} title="Hapus kelas">
                                                            <Trash2 size={13} /> Hapus
                                                        </ActionButton>
                                                    </>
                                                )}

                                                {isReadOnly && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }} title="Data terkunci karena penilaian telah diarsipkan">
                                                        <Lock size={11} /> Terkunci
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200" style={{ background: '#fafafa' }}>
                            <span className="text-xs font-medium text-gray-500">
                                {filteredKelas.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredKelas.length)} dari {filteredKelas.length} data
                            </span>

                            <div className="flex items-center gap-1">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                    className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors" style={{ color: ACCENT_DARK }}>
                                    <ChevronLeft size={14} /> Sebelumnya
                                </button>
                                <div className="flex items-center gap-1 mx-1">{renderPagination()}</div>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                    className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors" style={{ color: ACCENT_DARK }}>
                                    Berikutnya <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}