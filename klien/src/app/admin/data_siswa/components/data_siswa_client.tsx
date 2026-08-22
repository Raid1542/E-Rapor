'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import {
    Eye, Pencil, Upload, X, Plus, Search, Filter,
    CheckCircle2, AlertCircle, WifiOff, ShieldAlert,
    ChevronLeft, ChevronRight, Download, RotateCcw, FileSpreadsheet,
    Users, GraduationCap, MapPin, Calendar, IdCard,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ✅ PERUBAHAN 1: Tambahkan konstanta API_BASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* ==========================================================================
   NOTIFICATION MODAL TYPES
   ========================================================================== */

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

/* ==========================================================================
   DESIGN TOKENS — sama persis dengan Data Guru / Data Admin.
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

/* ==========================================================================
   NOTIFICATION MODAL
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <div className="dg-scaleIn contents w-full">
                    <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <X size={18} />
                    </button>
                    <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                    <div className="text-center w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                    </div>
                    <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>OK, Mengerti</button>
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

/* Kolom grid tabel — sama persis strukturnya dengan Data Guru (7 kolom). */
const GRID_COLS = 'minmax(56px,0.5fr) minmax(220px,3fr) minmax(110px,1.2fr) minmax(110px,1.2fr) minmax(100px,1.1fr) minmax(110px,1.1fr) minmax(180px,1.6fr)';

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   SISTEM TOMBOL AKSI — identik dengan Data Guru
   ========================================================================== */

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'accent';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
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

/* ==========================================================================
   HELPERS
   ========================================================================== */

const formatTanggalIndonesia = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()];
    return `${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

/** Badge status siswa — 4 kondisi (beda dari Guru/Admin yang hanya Aktif/Nonaktif) */
const STATUS_BADGE: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
    aktif: { bg: '#dcfce7', color: '#166534', border: '#86efac', dot: '#22c55e', label: 'Aktif' },
    lulus: { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', dot: '#eab308', label: 'Lulus' },
    pindah: { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db', dot: '#6b7280', label: 'Pindah' },
    'drop-out': { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', dot: '#ef4444', label: 'Drop Out' },
};

const StatusBadge = ({ status, size = 'sm' }: { status?: string; size?: 'sm' | 'md' }) => {
    const s = STATUS_BADGE[(status || 'aktif').toLowerCase()] || STATUS_BADGE.aktif;
    const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap ${pad}`} style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.dot }} />{s.label}
        </span>
    );
};

/* ==========================================================================
   INTERFACES
   ========================================================================== */

interface Siswa {
    id_siswa: number;
    nis: string;
    nisn: string;
    nama_lengkap: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    jenis_kelamin: string;
    alamat: string;
    status: string;
}

interface FormDataType {
    nis: string;
    nisn: string;
    nama_lengkap: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    jenis_kelamin: string;
    alamat: string;
    status: string;
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function DataSiswaClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const formatGender = (g?: string | null) => {
        if (!g) return '-';
        const s = String(g).trim().toLowerCase();
        if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l') return 'Laki-laki';
        if (s === 'perempuan' || s === 'p') return 'Perempuan';
        return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
    };

    /* ------------------------------------------------------------------
       STATE  (tidak diubah)
    ------------------------------------------------------------------ */

    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [detailClosing, setDetailClosing] = useState(false);
    const [importClosing, setImportClosing] = useState(false);
    const [filterClosing, setFilterClosing] = useState(false);
    const [formClosing, setFormClosing] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [filterValues, setFilterValues] = useState({ jenisKelamin: '', status: '' });
    const [tempFilterValues, setTempFilterValues] = useState({ jenisKelamin: '', status: '' });

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'add' | 'edit' | null>(null);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    /* ------------------------------------------------------------------
       FETCH — DIPERBAIKI: loop mengambil SEMUA halaman dari server,
       bukan cuma satu request dengan limit tetap. Jadi jumlah data
       yang bisa ditampilkan tidak lagi terpotong di 100 — mau 109,
       2000, atau 20000 data, semuanya tetap ke-load. Dropdown
       "Tampilkan X data" (itemsPerPage) tetap hanya mengatur berapa
       baris ditampilkan PER HALAMAN di tabel, itu logika terpisah
       dan tidak berubah.
    ------------------------------------------------------------------ */

    const fetchSiswa = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                return;
            }

            const PAGE_SIZE = 100; // ukuran per request ke server (bukan batas total data)
            let page = 1;
            let allData: Siswa[] = [];

            while (true) {
                const res = await fetch(
                    `${API_BASE_URL}/api/admin/siswa-master?page=${page}&limit=${PAGE_SIZE}&status=semua`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const data = await res.json();

                if (!res.ok) {
                    showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message });
                    return;
                }

                const chunk: Siswa[] = Array.isArray(data.data) ? data.data : [];
                allData = allData.concat(chunk);

                // Kalau chunk yang didapat lebih kecil dari PAGE_SIZE, berarti
                // ini halaman terakhir dari server — berhenti loop.
                if (chunk.length < PAGE_SIZE) break;

                page += 1;
            }

            setSiswaList(allData);
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

    useEffect(() => { fetchSiswa(); }, [fetchSiswa]);

    const [formData, setFormData] = useState<FormDataType>({
        nis: '', nisn: '', nama_lengkap: '', tempat_lahir: '', tanggal_lahir: '',
        jenis_kelamin: '', alamat: '', status: 'aktif',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    /* ------------------------------------------------------------------
       FORM HANDLERS & ANIMASI
    ------------------------------------------------------------------ */

    const handleDetail = (siswa: Siswa) => {
        setSelectedSiswa(siswa);
        setShowDetail(true);
    };

    const handleEdit = (siswa: Siswa) => {
        setEditId(siswa.id_siswa);
        setFormData({
            nis: siswa.nis || '',
            nisn: siswa.nisn || '',
            nama_lengkap: siswa.nama_lengkap || '',
            tempat_lahir: siswa.tempat_lahir || '',
            tanggal_lahir: siswa.tanggal_lahir || '',
            jenis_kelamin: siswa.jenis_kelamin || '',
            alamat: siswa.alamat || '',
            status: siswa.status || 'aktif',
        });
        setShowEdit(true);
    };

    const closeForm = () => {
        setFormClosing(true);
        setTimeout(() => {
            setShowTambah(false);
            setShowEdit(false);
            setFormClosing(false);
            handleReset();
        }, 300);
    };

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 300);
    };

    const closeImport = () => {
        setImportClosing(true);
        setTimeout(() => { setShowImport(false); setImportClosing(false); }, 300);
    };

    const closeFilterModal = () => {
        setFilterClosing(true);
        setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 300);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = (isEdit: boolean): boolean => {
        const ne: Record<string, string> = {};
        if (!formData.nis?.trim()) ne.nis = 'NIS wajib diisi';
        if (!formData.nama_lengkap?.trim()) ne.nama_lengkap = 'Nama lengkap wajib diisi';
        if (!formData.jenis_kelamin) ne.jenis_kelamin = 'Pilih jenis kelamin';
        if (!formData.status) ne.status = 'Status wajib dipilih';

        setErrors(ne);
        if (Object.keys(ne).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
            return false;
        }
        return true;
    };

    const openConfirmModal = (action: 'add' | 'edit') => {
        if (action === 'edit') {
            const originalData = siswaList.find(s => s.id_siswa === editId);
            if (!originalData) return;
            const normalize = (str?: string | null) => (str || '').trim().toLowerCase();
            const hasChanged =
                formData.nis !== (originalData.nis || '') ||
                formData.nisn !== (originalData.nisn || '') ||
                formData.nama_lengkap !== (originalData.nama_lengkap || '') ||
                formData.tempat_lahir !== (originalData.tempat_lahir || '') ||
                formData.tanggal_lahir !== (originalData.tanggal_lahir || '') ||
                normalize(formData.jenis_kelamin) !== normalize(originalData.jenis_kelamin) ||
                formData.alamat !== (originalData.alamat || '') ||
                formData.status !== (originalData.status || 'aktif');
            if (!hasChanged) {
                showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
                return;
            }
        }
        if (!validate(action === 'edit')) return;
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    const executeTambah = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/siswa-master`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nis: formData.nis,
                    nisn: formData.nisn || null,
                    nama_lengkap: formData.nama_lengkap,
                    tempat_lahir: formData.tempat_lahir || null,
                    tanggal_lahir: formData.tanggal_lahir || null,
                    jenis_kelamin: formData.jenis_kelamin,
                    alamat: formData.alamat || null,
                }),
            });
            if (res.ok) {
                closeForm();
                await fetchSiswa();
                showModal({ type: 'success', title: 'Data Ditambahkan!', message: `Data siswa ${formData.nama_lengkap} berhasil ditambahkan.` });
            } else {
                const err = await res.json();
                const isDuplicate = err.code === 'DUPLICATE_NIS' || err.code === 'DUPLICATE_NISN' || err.message?.includes('sudah terdaftar');
                showModal({ type: 'error', title: isDuplicate ? 'Data Sudah Ada' : 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan data siswa.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        }
    };

    const executeEdit = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/siswa-master/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nis: formData.nis,
                    nisn: formData.nisn || null,
                    nama_lengkap: formData.nama_lengkap,
                    tempat_lahir: formData.tempat_lahir || null,
                    tanggal_lahir: formData.tanggal_lahir || null,
                    jenis_kelamin: formData.jenis_kelamin,
                    alamat: formData.alamat || null,
                    status: formData.status,
                }),
            });
            if (res.ok) {
                closeForm();
                await fetchSiswa();
                showModal({ type: 'success', title: 'Data Diperbarui!', message: `Data siswa ${formData.nama_lengkap} berhasil diperbarui.` });
            } else {
                const err = await res.json();
                const isDuplicate = err.code === 'DUPLICATE_NIS' || err.code === 'DUPLICATE_NISN' || err.message?.includes('sudah terdaftar');
                showModal({ type: 'error', title: isDuplicate ? 'Data Sudah Ada' : 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui data siswa.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        }
    };

    const handleReset = () => {
        setFormData({ nis: '', nisn: '', nama_lengkap: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: '', alamat: '', status: 'aktif' });
        setErrors({});
    };

    const downloadErrorReport = (skipped: any[]) => {
        const csvContent = [
            ['No', 'Baris', 'Nama', 'NIS', 'NISN', 'Alasan Error'].join(','),
            ...skipped.map((d, index) => [
                index + 1, d.row, `"${d.nama}"`, d.nis || '-', d.nisn || '-', `"${d.reason}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `error_import_siswa_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportExcel = async () => {
        if (!importFile) {
            showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file Excel terlebih dahulu.' });
            return;
        }

        const fd = new FormData();
        fd.append('file', importFile);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/siswa-master/import`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });

            const result = await res.json();

            if (res.ok) {
                closeImport();
                setImportFile(null);
                await fetchSiswa();

                if (result.skipped && result.skipped.length > 0) {
                    const skippedCount = result.skipped.length;

                    if (skippedCount > 5) {
                        downloadErrorReport(result.skipped);
                    }

                    const summaryLines = [
                        `Berhasil: ${result.total} siswa`,
                        `Dilewati: ${skippedCount} siswa (duplikat)`,
                        '',
                        skippedCount <= 5 ? 'Data yang dilewati:' : `Contoh error (3 dari ${skippedCount}):`,
                        ...result.skipped.slice(0, skippedCount <= 5 ? skippedCount : 3).map((d: any, i: number) =>
                            `${i + 1}. Baris ${d.row}: ${d.nama} - ${d.reason}`
                        ),
                        ...(skippedCount > 5 ? [`\n... dan ${skippedCount - 3} data lainnya`] : []),
                        '',
                        skippedCount > 5 ? 'File CSV error telah diunduh otomatis.' : ''
                    ];

                    showModal({ type: 'warning', title: 'Import Selesai', message: summaryLines.join('\n') });
                } else {
                    showModal({ type: 'success', title: 'Import Berhasil', message: `Berhasil mengimport ${result.total} data siswa.` });
                }
            } else {
                showModal({ type: 'error', title: 'Import Gagal', message: result.message });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    /* ------------------------------------------------------------------
       FILTER & PAGINATION  (tidak diubah — ini murni paginasi tampilan
       di sisi client, jalan di atas siswaList yang sekarang sudah berisi
       SEMUA data)
    ------------------------------------------------------------------ */

    const filteredSiswa = siswaList.filter((siswa) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = !query ||
            siswa.nama_lengkap?.toLowerCase().includes(query) ||
            siswa.nis?.includes(query) ||
            siswa.nisn?.includes(query) ||
            siswa.tempat_lahir?.toLowerCase().includes(query);

        const matchesGender = !filterValues.jenisKelamin ||
            siswa.jenis_kelamin?.toLowerCase() === filterValues.jenisKelamin.toLowerCase();

        const matchesStatus = !filterValues.status ||
            siswa.status?.toLowerCase() === filterValues.status.toLowerCase();

        return matchesSearch && matchesGender && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);
    const activeFilterCount = Object.values(filterValues).filter(Boolean).length;

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
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) range.push(i);
            if (currentPage < totalPages - 2) range.push(-2);
            range.push(totalPages);
        }
        range.forEach(p => {
            if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-xs">…</span>); }
            else { pages.push(<button key={p} onClick={() => setCurrentPage(p)} className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`} style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}>{p}</button>); }
        });
        return pages;
    };

    const resetFilter = () => {
        const e = { jenisKelamin: '', status: '' };
        setFilterValues(e);
        setTempFilterValues(e);
    };

    const openFilterModal = () => {
        setTempFilterValues(filterValues);
        setShowFilter(true);
    };

    const applyFilter = () => {
        setFilterValues(tempFilterValues);
        setFilterClosing(true);
        setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 300);
    };

    /* ------------------------------------------------------------------
       FORM RENDER (DENGAN ANIMASI) — sama persis pola Data Guru
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
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                            {isEdit ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
                        </h1>
                        <p className="text-xs sm:text-sm mt-0.5 text-gray-500">
                            {isEdit ? 'Perbarui informasi data siswa' : 'Isi formulir untuk menambahkan siswa baru'}
                        </p>
                    </div>
                </div>

                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d2" style={CARD_STYLE}>
                    <div className="px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                        <h2 className="text-sm sm:text-base font-bold text-white">{isEdit ? 'Ubah Data Siswa' : 'Data Siswa Baru'}</h2>
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2">
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className={labelCls} style={labelColor}>Nama Lengkap <span className="text-red-500">*</span></label>
                                <input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleInputChange} placeholder="Masukkan nama lengkap" className={errors.nama_lengkap ? inputErrCls : inputCls} />
                                {errors.nama_lengkap && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.nama_lengkap}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>NIS <span className="text-red-500">*</span></label>
                                <input type="text" name="nis" value={formData.nis} onChange={handleInputChange} placeholder="Nomor Induk Siswa" className={errors.nis ? inputErrCls : inputCls} />
                                {errors.nis && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.nis}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>NISN</label>
                                <input type="text" name="nisn" value={formData.nisn} onChange={handleInputChange} placeholder="Nomor Induk Siswa Nasional" className={inputCls} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Tempat Lahir</label>
                                <input type="text" name="tempat_lahir" value={formData.tempat_lahir} onChange={handleInputChange} placeholder="Kota/Kabupaten" className={inputCls} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Tanggal Lahir</label>
                                <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleInputChange} className={inputCls} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                                <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleInputChange} className={errors.jenis_kelamin ? inputErrCls : inputCls}>
                                    <option value="">-- Pilih --</option>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                                {errors.jenis_kelamin && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.jenis_kelamin}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Status Siswa <span className="text-red-500">*</span></label>
                                <select name="status" value={formData.status} onChange={handleInputChange} className={errors.status ? inputErrCls : inputCls}>
                                    <option value="">-- Pilih --</option>
                                    <option value="aktif">Aktif</option>
                                    <option value="lulus">Lulus</option>
                                    <option value="pindah">Pindah</option>
                                    <option value="drop-out">Drop Out</option>
                                </select>
                                {errors.status && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.status}</p>}
                            </div>

                            <div className="sm:col-span-2 flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Alamat</label>
                                <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} placeholder="Jalan, Kelurahan, Kecamatan, Kota" rows={3} className={inputCls} />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-2.5 mt-6 pt-4 border-t" style={{ borderColor: '#f0e0d0' }}>
                            <ActionButton variant="neutral" onClick={closeForm}>
                                Batal
                            </ActionButton>
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

            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn" onClick={e => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={22} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Konfirmasi {confirmAction === 'add' ? 'Penambahan' : 'Perubahan'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-5">
                            {confirmAction === 'add' ? 'Apakah Anda yakin ingin menambahkan data siswa ini?' : 'Apakah Anda yakin ingin menyimpan perubahan data siswa ini?'}
                        </p>
                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmModal(false)}>Batal</ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={() => { setShowConfirmModal(false); confirmAction === 'add' ? executeTambah() : executeEdit(); }}>
                                {confirmAction === 'add' ? 'Tambahkan' : 'Simpan'}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Siswa</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola data siswa</p>
            </div>

            <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d2" style={CARD_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex-shrink-0">
                        <ActionButton variant="primary" onClick={() => setShowTambah(true)}>
                            <Plus size={16} /> <span className="hidden sm:inline">Tambah Siswa</span><span className="sm:hidden">Tambah</span>
                        </ActionButton>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
                        <div className="relative w-full xs:w-auto sm:w-56 flex-shrink-0">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                            </div>
                            <input type="text" placeholder="Cari nama, NIS, NISN..." value={searchQuery}
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

                        <ActionButton variant="accent" onClick={openFilterModal}>
                            <Filter size={15} /> <span className="hidden sm:inline">Filter</span>{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                        </ActionButton>
                        <ActionButton variant="info" onClick={() => setShowImport(true)}>
                            <Upload size={15} /> <span className="hidden sm:inline">Import</span>
                        </ActionButton>
                    </div>
                </div>
            </div>

            {/* Table card — grid-based, sama persis strukturnya dengan Data Guru */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                <div className="overflow-x-auto">
                    <div style={{ width: '100%', minWidth: '850px' }}>
                        <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                            <div className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Nama</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NIS</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NISN</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Kelamin</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Status</div>
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
                        ) : currentSiswa.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <GraduationCap size={32} className="text-gray-300" />
                                    <p className="text-sm font-semibold text-gray-500">Tidak ada data siswa</p>
                                    {searchQuery && <p className="text-xs text-gray-400">Coba kata kunci lain</p>}
                                </div>
                            </div>
                        ) : currentSiswa.map((siswa, index) => (
                            <div key={siswa.id_siswa} className="grid row-in row-hover border-b transition-colors"
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
                                    <p className="font-bold text-gray-900 truncate" title={siswa.nama_lengkap}>{siswa.nama_lengkap}</p>
                                </div>

                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">{siswa.nis || '-'}</div>
                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">{siswa.nisn || '-'}</div>
                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600 whitespace-nowrap">{formatGender(siswa.jenis_kelamin)}</div>

                                <div className="px-4 py-4 flex items-center justify-center">
                                    <StatusBadge status={siswa.status} />
                                </div>

                                <div className="px-4 py-4 flex items-center justify-center">
                                    <div className="flex justify-center gap-1.5">
                                        <ActionButton size="sm" variant="info" onClick={() => handleDetail(siswa)} title="Lihat detail">
                                            <Eye size={13} /> Detail
                                        </ActionButton>
                                        <ActionButton size="sm" variant="warning" onClick={() => handleEdit(siswa)} title="Edit data">
                                            <Pencil size={13} /> Edit
                                        </ActionButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200" style={{ background: '#fafafa' }}>
                    <span className="text-xs font-medium text-gray-500">
                        {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
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

            {/* ================================================================
                MODAL DETAIL — untuk Siswa: tanpa email/NIY/NUPTK/role (memang
                tidak ada di data siswa), status 4 kondisi. Lingkaran ikon topi
                wisuda DIHAPUS total — identitas siswa langsung ditampilkan
                berupa nama, NIS, dan badge status tanpa avatar/ikon generik
                apa pun, supaya modal lebih ringkas dan tidak menampilkan
                elemen visual yang sebenarnya tidak merepresentasikan data.
            ================================================================ */}
            {showDetail && selectedSiswa && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${detailClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${detailClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeDetail} />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 overflow-hidden ${detailClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                            <h2 className="text-lg sm:text-xl font-bold text-white">Detail Data Siswa</h2>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={18} className="text-white" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                            {/* Identitas siswa: nama + NIS + badge status, tanpa ikon/avatar lingkaran */}
                            <div className="flex flex-col items-center justify-center gap-2 mb-6 pb-4 border-b" style={{ borderColor: '#fde0c8' }}>
                                <h3 className="text-xl font-bold text-gray-900 text-center">{selectedSiswa.nama_lengkap}</h3>
                                <p className="text-xs text-gray-400 font-mono">NIS: {selectedSiswa.nis || '-'}</p>
                                <div className="mt-1">
                                    <StatusBadge status={selectedSiswa.status} size="md" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><IdCard size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>NIS</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 font-mono">{selectedSiswa.nis || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><IdCard size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>NISN</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 font-mono">{selectedSiswa.nisn || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Users size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Jenis Kelamin</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{formatGender(selectedSiswa.jenis_kelamin)}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Calendar size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Tempat, Tanggal Lahir</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedSiswa.tempat_lahir || '-'}, {formatTanggalIndonesia(selectedSiswa.tanggal_lahir)}</p>
                                </div>
                                <div className="sm:col-span-2 p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><MapPin size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Alamat</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedSiswa.alamat || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <ActionButton variant="neutral" onClick={closeDetail}>Tutup</ActionButton>
                            <ActionButton variant="warning" onClick={() => { handleEdit(selectedSiswa); closeDetail(); }}>
                                <Pencil size={16} /> Edit Data
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Import dengan Animasi */}
            {showImport && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${importClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${importClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeImport} />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 ${importClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Upload size={16} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 leading-none mb-0.5">Data Massal</p>
                                    <h2 className="text-sm font-bold text-white leading-tight truncate">Import Data Siswa</h2>
                                </div>
                            </div>
                            <button onClick={closeImport} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
                                <FileSpreadsheet size={19} className="mt-0.5 flex-shrink-0" style={{ color: ACCENT }} />
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>Format file: <strong>.xlsx</strong> atau <strong>.xls</strong></p>
                                    <a href={`${API_BASE_URL}/templates/template_import_siswa.xlsx`} download className="text-sm font-bold flex items-center gap-1.5 hover:underline mt-1.5" style={{ color: ACCENT }}>
                                        <Download size={13} /> Unduh template Excel
                                    </a>
                                </div>
                            </div>
                            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer transition-colors" style={{ border: '2px dashed #e5e5e5', background: '#fafafa' }} onMouseEnter={e => (e.currentTarget.style.background = '#fff5eb')} onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}>
                                <Upload className="w-7 h-7 mb-2" style={{ color: ACCENT }} />
                                <p className="text-sm">
                                    {importFile ? <span className="font-bold" style={{ color: ACCENT_DARK }}>{importFile.name}</span> : <span className="text-gray-400 font-medium">Klik untuk pilih file</span>}
                                </p>
                                <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                            </label>
                            <div className="flex gap-2.5 mt-5">
                                <ActionButton variant="neutral" fullWidth onClick={closeImport}>Batal</ActionButton>
                                <ActionButton variant="primary" fullWidth disabled={!importFile} onClick={handleImportExcel}>
                                    <Upload size={15} /> Import Sekarang
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Filter dengan Animasi */}
            {showFilter && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${filterClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${filterClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeFilterModal} />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-300 ${filterClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Filter size={15} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 leading-none mb-0.5">Penyaringan Data</p>
                                    <h2 className="text-sm font-bold text-white leading-tight truncate">Filter Siswa</h2>
                                </div>
                            </div>
                            <button onClick={closeFilterModal} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3.5">
                            {[
                                { label: 'Jenis Kelamin', name: 'jenisKelamin', options: [{ v: '', l: 'Semua' }, { v: 'Laki-laki', l: 'Laki-laki' }, { v: 'Perempuan', l: 'Perempuan' }] },
                                { label: 'Status', name: 'status', options: [{ v: '', l: 'Semua Status' }, { v: 'aktif', l: 'Aktif' }, { v: 'lulus', l: 'Lulus' }, { v: 'pindah', l: 'Pindah' }, { v: 'drop-out', l: 'Drop Out' }] },
                            ].map(f => (
                                <div key={f.name} className="flex flex-col gap-1">
                                    <label className={labelCls} style={labelColor}>{f.label}</label>
                                    <select value={(tempFilterValues as any)[f.name]} onChange={e => setTempFilterValues(p => ({ ...p, [f.name]: e.target.value }))} className={inputCls}>
                                        {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                    </select>
                                </div>
                            ))}
                            <div className="pt-2 flex gap-2.5 border-t" style={{ borderColor: '#f0f0f0' }}>
                                <ActionButton variant="neutral" onClick={resetFilter}>
                                    <RotateCcw size={14} /> Reset
                                </ActionButton>
                                <ActionButton variant="primary" fullWidth onClick={applyFilter}>
                                    Terapkan Filter
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}